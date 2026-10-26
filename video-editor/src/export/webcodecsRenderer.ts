/**
 * Fast path: WebCodecs VideoEncoder (H.264) + mp4-muxer. Audio is encoded
 * with WebCodecs AAC when the platform supports it, otherwise the video-only
 * MP4 is muxed with a WAV mixdown through FFmpeg.wasm (audio → AAC, video
 * stream copied).
 */
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { Project } from '@/types/project';
import { renderAudioMix } from '@/engine/audioMix';
import { ExportFrameSource } from './frameSource';
import { getFfmpeg, muxAudioIntoMp4, safeDelete } from './ffmpegClient';
import { audioBufferToWav, interleave } from './wav';
import { RenderCancelled, throwIfAborted, type RenderOptions, type RenderResult, type Renderer } from './renderer';

const H264_CANDIDATES = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];

async function pickVideoCodec(width: number, height: number, fps: number, bitrate: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  for (const codec of H264_CANDIDATES) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        framerate: fps,
        bitrate,
        avc: { format: 'avc' },
      });
      if (supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function aacSupported(sampleRate: number, channels: number): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') return false;
  try {
    const { supported } = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels: channels,
      bitrate: 192_000,
    });
    return Boolean(supported);
  } catch {
    return false;
  }
}

export class WebCodecsRenderer implements Renderer {
  readonly id = 'webcodecs';
  readonly label = 'Hardware (WebCodecs)';
  readonly description = 'Fast H.264 encoding using the browser’s built-in encoder. Chrome 94+.';

  async isSupported(): Promise<boolean> {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false;
    return (await pickVideoCodec(1280, 720, 30, 5_000_000)) !== null;
  }

  async render(project: Project, options: RenderOptions): Promise<RenderResult> {
    const started = performance.now();
    const { width, height, fps, startTime, duration, signal, onProgress } = options;
    const codec = await pickVideoCodec(width, height, fps, options.videoBitrate);
    if (!codec) throw new Error('No supported H.264 encoder configuration for this size');

    onProgress({ phase: 'preparing', fraction: 0, message: 'Preparing media…' });
    const source = new ExportFrameSource(project, width, height);
    try {
      await source.prepare(startTime, duration);
      throwIfAborted(signal);

      // --- Audio first so we know whether to declare an AAC track in the muxer ---
      let audioBuffer: AudioBuffer | null = null;
      if (options.includeAudio) {
        onProgress({ phase: 'audio', fraction: 0.02, message: 'Mixing audio…' });
        audioBuffer = await renderAudioMix(project, { startTime, duration, sampleRate: 48000, signal });
        throwIfAborted(signal);
      }
      const useAac = audioBuffer ? await aacSupported(audioBuffer.sampleRate, 2) : false;

      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: 'avc', width, height, frameRate: fps },
        audio: useAac && audioBuffer ? { codec: 'aac', numberOfChannels: 2, sampleRate: audioBuffer.sampleRate } : undefined,
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset',
      });

      let encodeError: Error | null = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          encodeError = e instanceof Error ? e : new Error(String(e));
        },
      });
      encoder.configure({
        codec,
        width,
        height,
        bitrate: options.videoBitrate,
        framerate: fps,
        avc: { format: 'avc' },
        latencyMode: 'quality',
      });

      const totalFrames = Math.max(1, Math.round(duration * fps));
      const frameUs = Math.round(1_000_000 / fps);
      for (let i = 0; i < totalFrames; i++) {
        throwIfAborted(signal);
        if (encodeError) throw encodeError;
        const t = startTime + i / fps;
        await source.renderFrame(t);
        const frame = new VideoFrame(source.canvas as unknown as CanvasImageSource, {
          timestamp: i * frameUs,
          duration: frameUs,
        });
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();
        // Back-pressure: do not let the encoder queue grow unbounded.
        while (encoder.encodeQueueSize > 4) {
          await new Promise((r) => setTimeout(r, 2));
          throwIfAborted(signal);
        }
        if (i % 3 === 0 || i === totalFrames - 1) {
          onProgress({
            phase: 'rendering',
            fraction: 0.05 + (i / totalFrames) * 0.8,
            frame: i + 1,
            totalFrames,
          });
        }
      }
      await encoder.flush();
      encoder.close();
      if (encodeError) throw encodeError;

      if (audioBuffer && useAac) {
        onProgress({ phase: 'audio', fraction: 0.87, message: 'Encoding audio…' });
        await encodeAacInto(muxer, audioBuffer, signal);
      }
      onProgress({ phase: 'muxing', fraction: 0.92, message: 'Writing MP4…' });
      muxer.finalize();
      let bytes: Uint8Array = new Uint8Array(target.buffer);

      if (audioBuffer && !useAac) {
        // Platform has no AAC encoder: mux WAV → AAC with FFmpeg.wasm.
        onProgress({ phase: 'muxing', fraction: 0.93, message: 'Adding audio track…' });
        const ff = await getFfmpeg((m) => onProgress({ phase: 'muxing', fraction: 0.93, message: m }));
        throwIfAborted(signal);
        await ff.writeFile('video.mp4', bytes);
        await ff.writeFile('audio.wav', new Uint8Array(await audioBufferToWav(audioBuffer).arrayBuffer()));
        try {
          bytes = await muxAudioIntoMp4(ff, 'video.mp4', 'audio.wav', 'out.mp4');
        } finally {
          await safeDelete(ff, 'video.mp4');
          await safeDelete(ff, 'audio.wav');
          await safeDelete(ff, 'out.mp4');
        }
      }
      onProgress({ phase: 'finalizing', fraction: 1 });
      return {
        blob: new Blob([bytes as BlobPart], { type: 'video/mp4' }),
        mimeType: 'video/mp4',
        width,
        height,
        durationSeconds: duration,
        rendererId: this.id,
        elapsedSeconds: (performance.now() - started) / 1000,
      };
    } catch (e) {
      if (signal.aborted) throw new RenderCancelled();
      throw e;
    } finally {
      source.dispose();
    }
  }
}

async function encodeAacInto(muxer: Muxer<ArrayBufferTarget>, buffer: AudioBuffer, signal: AbortSignal): Promise<void> {
  const channels = 2;
  let err: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      err = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({ codec: 'mp4a.40.2', sampleRate: buffer.sampleRate, numberOfChannels: channels, bitrate: 192_000 });
  const chunkFrames = 4096;
  for (let offset = 0; offset < buffer.length; offset += chunkFrames) {
    throwIfAborted(signal);
    const frames = Math.min(chunkFrames, buffer.length - offset);
    const slice = new AudioBuffer({ length: frames, numberOfChannels: channels, sampleRate: buffer.sampleRate });
    for (let c = 0; c < channels; c++) {
      slice.copyToChannel(buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1)).subarray(offset, offset + frames), c);
    }
    const data = new AudioData({
      format: 'f32',
      sampleRate: buffer.sampleRate,
      numberOfFrames: frames,
      numberOfChannels: channels,
      timestamp: Math.round((offset / buffer.sampleRate) * 1_000_000),
      data: interleave(slice, channels),
    });
    encoder.encode(data);
    data.close();
    if (err) throw err;
  }
  await encoder.flush();
  encoder.close();
  if (err) throw err;
}
