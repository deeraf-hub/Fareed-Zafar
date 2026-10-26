/**
 * Fast path: WebCodecs VideoEncoder + a JavaScript muxer (mp4-muxer for MP4,
 * webm-muxer for WebM). Audio is encoded with WebCodecs (AAC / Opus) when
 * the platform has an encoder; otherwise the video-only file is muxed with a
 * WAV mixdown through FFmpeg.wasm (audio transcoded, video stream copied).
 */
import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';
import type { Project } from '@/types/project';
import { renderAudioMix } from '@/engine/audioMix';
import { ExportFrameSource } from './frameSource';
import { getFfmpeg, muxAudioInto, safeDelete } from './ffmpegClient';
import { audioBufferToWav, interleave } from './wav';
import {
  FORMAT_INFO,
  RenderCancelled,
  throwIfAborted,
  type ExportFormat,
  type RenderOptions,
  type RenderResult,
  type Renderer,
} from './renderer';

const H264_CANDIDATES = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];
const VP9_CANDIDATES = ['vp09.00.10.08', 'vp09.00.31.08', 'vp09.00.40.08'];

interface VideoCodecChoice {
  codec: string;
  /** Muxer codec id: 'avc' for MP4, 'V_VP9' / 'V_VP8' for WebM. */
  muxCodec: 'avc' | 'V_VP9' | 'V_VP8';
}

async function pickVideoCodec(format: ExportFormat, width: number, height: number, fps: number, bitrate: number): Promise<VideoCodecChoice | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  const candidates: VideoCodecChoice[] =
    format === 'mp4'
      ? H264_CANDIDATES.map((codec) => ({ codec, muxCodec: 'avc' as const }))
      : [...VP9_CANDIDATES.map((codec) => ({ codec, muxCodec: 'V_VP9' as const })), { codec: 'vp8', muxCodec: 'V_VP8' as const }];
  for (const choice of candidates) {
    try {
      const config: VideoEncoderConfig = { codec: choice.codec, width, height, framerate: fps, bitrate };
      if (choice.muxCodec === 'avc') config.avc = { format: 'avc' };
      const { supported } = await VideoEncoder.isConfigSupported(config);
      if (supported) return choice;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function audioEncoderSupported(codec: 'mp4a.40.2' | 'opus', sampleRate: number, channels: number): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') return false;
  try {
    const { supported } = await AudioEncoder.isConfigSupported({ codec, sampleRate, numberOfChannels: channels, bitrate: codec === 'opus' ? 128_000 : 192_000 });
    return Boolean(supported);
  } catch {
    return false;
  }
}

/** Minimal common surface of mp4-muxer and webm-muxer. */
interface MuxerAdapter {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): void;
  finalize(): Uint8Array;
}

function createMuxer(
  format: ExportFormat,
  choice: VideoCodecChoice,
  width: number,
  height: number,
  fps: number,
  audio: { sampleRate: number; channels: number } | null,
): MuxerAdapter {
  if (format === 'mp4') {
    const target = new Mp4Target();
    const muxer = new Mp4Muxer({
      target,
      video: { codec: 'avc', width, height, frameRate: fps },
      audio: audio ? { codec: 'aac', numberOfChannels: audio.channels, sampleRate: audio.sampleRate } : undefined,
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });
    return {
      addVideoChunk: (c, m) => muxer.addVideoChunk(c, m),
      addAudioChunk: (c, m) => muxer.addAudioChunk(c, m),
      finalize: () => {
        muxer.finalize();
        return new Uint8Array(target.buffer);
      },
    };
  }
  const target = new WebmTarget();
  const muxer = new WebmMuxer({
    target,
    video: { codec: choice.muxCodec, width, height, frameRate: fps },
    audio: audio ? { codec: 'A_OPUS', numberOfChannels: audio.channels, sampleRate: audio.sampleRate } : undefined,
    firstTimestampBehavior: 'offset',
  });
  return {
    addVideoChunk: (c, m) => muxer.addVideoChunk(c, m),
    addAudioChunk: (c, m) => muxer.addAudioChunk(c, m),
    finalize: () => {
      muxer.finalize();
      return new Uint8Array(target.buffer);
    },
  };
}

export class WebCodecsRenderer implements Renderer {
  readonly id = 'webcodecs';
  readonly label = 'Hardware (WebCodecs)';
  readonly description = 'Fast encoding with the browser’s built-in encoders (H.264 for MP4, VP9 for WebM). Chrome 94+.';

  async isSupported(): Promise<boolean> {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false;
    return (await this.supportsFormat('mp4')) || (await this.supportsFormat('webm'));
  }

  async supportsFormat(format: ExportFormat): Promise<boolean> {
    if (format === 'gif') return false;
    return (await pickVideoCodec(format, 1280, 720, 30, 5_000_000)) !== null;
  }

  async render(project: Project, options: RenderOptions): Promise<RenderResult> {
    const started = performance.now();
    const { format, width, height, fps, startTime, duration, signal, onProgress } = options;
    if (format === 'gif') throw new Error('GIF export needs the FFmpeg engine');
    const choice = await pickVideoCodec(format, width, height, fps, options.videoBitrate);
    if (!choice) throw new Error(`No supported ${format === 'mp4' ? 'H.264' : 'VP9/VP8'} encoder configuration for this size`);

    onProgress({ phase: 'preparing', fraction: 0, message: 'Preparing media…' });
    const source = new ExportFrameSource(project, width, height);
    try {
      await source.prepare(startTime, duration);
      throwIfAborted(signal);

      // --- Audio first so we know whether to declare an audio track in the muxer ---
      let audioBuffer: AudioBuffer | null = null;
      if (options.includeAudio && FORMAT_INFO[format].audio) {
        onProgress({ phase: 'audio', fraction: 0.02, message: 'Mixing audio…' });
        audioBuffer = await renderAudioMix(project, { startTime, duration, sampleRate: 48000, signal });
        throwIfAborted(signal);
      }
      const audioCodec = format === 'mp4' ? 'mp4a.40.2' : 'opus';
      const useWebCodecsAudio = audioBuffer ? await audioEncoderSupported(audioCodec, audioBuffer.sampleRate, 2) : false;

      const muxer = createMuxer(
        format,
        choice,
        width,
        height,
        fps,
        useWebCodecsAudio && audioBuffer ? { sampleRate: audioBuffer.sampleRate, channels: 2 } : null,
      );

      let encodeError: Error | null = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          encodeError = e instanceof Error ? e : new Error(String(e));
        },
      });
      const config: VideoEncoderConfig = {
        codec: choice.codec,
        width,
        height,
        bitrate: options.videoBitrate,
        framerate: fps,
        latencyMode: 'quality',
      };
      if (choice.muxCodec === 'avc') config.avc = { format: 'avc' };
      encoder.configure(config);

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
        // Back-pressure: do not let the encoder queue grow unbounded. Bail out
        // if the encoder stops draining (error or stalled platform encoder).
        const waitStart = performance.now();
        while (encoder.encodeQueueSize > 4) {
          await new Promise((r) => setTimeout(r, 2));
          throwIfAborted(signal);
          if (encodeError) throw encodeError;
          if (performance.now() - waitStart > 30_000) throw new Error('Video encoder stalled');
        }
        if (i % 3 === 0 || i === totalFrames - 1) {
          onProgress({ phase: 'rendering', fraction: 0.05 + (i / totalFrames) * 0.8, frame: i + 1, totalFrames });
        }
      }
      await encoder.flush();
      encoder.close();
      if (encodeError) throw encodeError;

      if (audioBuffer && useWebCodecsAudio) {
        onProgress({ phase: 'audio', fraction: 0.87, message: 'Encoding audio…' });
        await encodeAudioInto(muxer, audioBuffer, audioCodec, signal);
      }
      onProgress({ phase: 'muxing', fraction: 0.92, message: `Writing ${format.toUpperCase()}…` });
      let bytes = muxer.finalize();

      if (audioBuffer && !useWebCodecsAudio) {
        // No platform audio encoder: transcode WAV → AAC/Opus with FFmpeg.wasm, video copied.
        onProgress({ phase: 'muxing', fraction: 0.93, message: 'Adding audio track…' });
        const ff = await getFfmpeg((m) => onProgress({ phase: 'muxing', fraction: 0.93, message: m }));
        throwIfAborted(signal);
        const videoName = `video.${format}`;
        const outName = `out.${format}`;
        await ff.writeFile(videoName, bytes);
        await ff.writeFile('audio.wav', new Uint8Array(await audioBufferToWav(audioBuffer).arrayBuffer()));
        try {
          bytes = await muxAudioInto(ff, videoName, 'audio.wav', outName, format);
        } finally {
          await safeDelete(ff, videoName);
          await safeDelete(ff, 'audio.wav');
          await safeDelete(ff, outName);
        }
      }
      onProgress({ phase: 'finalizing', fraction: 1 });
      return {
        blob: new Blob([bytes as BlobPart], { type: FORMAT_INFO[format].mimeType }),
        mimeType: FORMAT_INFO[format].mimeType,
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

async function encodeAudioInto(muxer: MuxerAdapter, buffer: AudioBuffer, codec: 'mp4a.40.2' | 'opus', signal: AbortSignal): Promise<void> {
  const channels = 2;
  let err: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      err = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({ codec, sampleRate: buffer.sampleRate, numberOfChannels: channels, bitrate: codec === 'opus' ? 128_000 : 192_000 });
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
