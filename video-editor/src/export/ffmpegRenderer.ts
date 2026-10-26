/**
 * Portable path: frames are composited to JPEG and encoded inside
 * FFmpeg.wasm (libx264 for MP4, libvpx-vp9 for WebM) in segments so memory
 * stays bounded; segments are concatenated (stream copy) and the audio
 * mixdown is muxed in. GIFs are rendered in one pass with a generated
 * palette.
 */
import type { Project } from '@/types/project';
import { renderAudioMix } from '@/engine/audioMix';
import { ExportFrameSource } from './frameSource';
import { getFfmpeg, muxAudioInto, safeDelete, setFfmpegSinks, terminateFfmpeg } from './ffmpegClient';
import { audioBufferToWav } from './wav';
import {
  FORMAT_INFO,
  RenderCancelled,
  throwIfAborted,
  type ExportFormat,
  type RenderOptions,
  type RenderResult,
  type Renderer,
} from './renderer';

const SEGMENT_FRAMES = 90;

async function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas, quality: number): Promise<Uint8Array> {
  let blob: Blob;
  if ('convertToBlob' in canvas) {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  } else {
    blob = await new Promise<Blob>((resolve, reject) =>
      (canvas as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
    );
  }
  return new Uint8Array(await blob.arrayBuffer());
}

function videoArgs(format: ExportFormat, bitrate: number, fps: number, W: number, H: number): string[] {
  if (format === 'webm') {
    return [
      '-c:v', 'libvpx-vp9',
      '-b:v', String(Math.round(bitrate)),
      '-deadline', 'realtime',
      '-cpu-used', '8',
      '-row-mt', '1',
      '-pix_fmt', 'yuv420p',
      '-g', String(fps * 2),
      '-vf', `scale=${W}:${H}`,
      '-r', String(fps),
    ];
  }
  const crf = bitrate >= 12_000_000 ? '18' : bitrate >= 6_000_000 ? '20' : '23';
  return [
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', crf,
    '-pix_fmt', 'yuv420p',
    '-g', String(fps * 2),
    '-vf', `scale=${W}:${H}`,
    '-r', String(fps),
  ];
}

export class FfmpegRenderer implements Renderer {
  readonly id = 'ffmpeg';
  readonly label = 'Software (FFmpeg.wasm)';
  readonly description = 'Works in any modern browser. Slower, but encodes MP4, WebM and GIF everywhere.';

  async isSupported(): Promise<boolean> {
    return typeof WebAssembly !== 'undefined';
  }

  async supportsFormat(_format: ExportFormat): Promise<boolean> {
    return typeof WebAssembly !== 'undefined';
  }

  async render(project: Project, options: RenderOptions): Promise<RenderResult> {
    const started = performance.now();
    const { format, width, height, startTime, duration, signal, onProgress } = options;
    const fps = FORMAT_INFO[format].fps ?? options.fps;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const even = (n: number) => (n % 2 === 0 ? n : n - 1);
    const W = even(width);
    const H = even(height);
    const ext = FORMAT_INFO[format].extension;

    onProgress({ phase: 'preparing', fraction: 0, message: 'Loading FFmpeg…' });
    const ff = await getFfmpeg((m) => onProgress({ phase: 'preparing', fraction: 0, message: m }));
    throwIfAborted(signal);
    const source = new ExportFrameSource(project, W, H);
    const segmentFiles: string[] = [];
    const onAbort = () => terminateFfmpeg();
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      await source.prepare(startTime, duration);
      let bytes: Uint8Array;

      if (format === 'gif') {
        // Single pass: frames → palette → GIF.
        const names: string[] = [];
        for (let i = 0; i < totalFrames; i++) {
          throwIfAborted(signal);
          await source.renderFrame(startTime + i / fps);
          const name = `f_${String(i).padStart(5, '0')}.jpg`;
          await ff.writeFile(name, await canvasToJpeg(source.canvas, 0.9));
          names.push(name);
          if (i % 2 === 0) onProgress({ phase: 'rendering', fraction: 0.03 + (i / totalFrames) * 0.6, frame: i + 1, totalFrames });
        }
        onProgress({ phase: 'muxing', fraction: 0.65, message: 'Building palette and GIF…' });
        setFfmpegSinks(null, null);
        const code = await ff.exec([
          '-y',
          '-framerate', String(fps),
          '-i', 'f_%05d.jpg',
          '-vf', `fps=${fps},scale=${W}:${H}:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
          '-loop', '0',
          'out.gif',
        ]);
        for (const n of names) await safeDelete(ff, n);
        if (code !== 0) throw new Error(`FFmpeg GIF encoding failed (exit ${code})`);
        bytes = (await ff.readFile('out.gif')) as Uint8Array;
        await safeDelete(ff, 'out.gif');
      } else {
        let encodedFrames = 0;
        const segments = Math.ceil(totalFrames / SEGMENT_FRAMES);
        for (let s = 0; s < segments; s++) {
          const from = s * SEGMENT_FRAMES;
          const to = Math.min(totalFrames, from + SEGMENT_FRAMES);
          const names: string[] = [];
          for (let i = from; i < to; i++) {
            throwIfAborted(signal);
            await source.renderFrame(startTime + i / fps);
            const name = `f_${String(i - from).padStart(5, '0')}.jpg`;
            await ff.writeFile(name, await canvasToJpeg(source.canvas, 0.92));
            names.push(name);
            encodedFrames++;
            if (i % 2 === 0) {
              onProgress({ phase: 'rendering', fraction: 0.03 + (encodedFrames / totalFrames) * 0.72, frame: encodedFrames, totalFrames });
            }
          }
          throwIfAborted(signal);
          const seg = `seg_${String(s).padStart(3, '0')}.${ext}`;
          onProgress({
            phase: 'rendering',
            fraction: 0.03 + (encodedFrames / totalFrames) * 0.72,
            frame: encodedFrames,
            totalFrames,
            message: `Encoding segment ${s + 1}/${segments}…`,
          });
          setFfmpegSinks(null, null);
          const code = await ff.exec([
            '-y',
            '-framerate', String(fps),
            '-i', 'f_%05d.jpg',
            '-frames:v', String(to - from),
            ...videoArgs(format, options.videoBitrate, fps, W, H),
            seg,
          ]);
          for (const n of names) await safeDelete(ff, n);
          if (code !== 0) throw new Error(`FFmpeg encoding failed (exit ${code})`);
          segmentFiles.push(seg);
        }
        throwIfAborted(signal);

        // Concatenate segments without re-encoding.
        onProgress({ phase: 'muxing', fraction: 0.78, message: 'Joining segments…' });
        let videoFile = segmentFiles[0];
        if (segmentFiles.length > 1) {
          const list = segmentFiles.map((f) => `file '${f}'`).join('\n');
          await ff.writeFile('list.txt', new TextEncoder().encode(list));
          const joined = `video.${ext}`;
          const code = await ff.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', joined]);
          await safeDelete(ff, 'list.txt');
          if (code !== 0) throw new Error(`FFmpeg concat failed (exit ${code})`);
          videoFile = joined;
        }

        let audioBuffer: AudioBuffer | null = null;
        if (options.includeAudio) {
          onProgress({ phase: 'audio', fraction: 0.82, message: 'Mixing audio…' });
          audioBuffer = await renderAudioMix(project, { startTime, duration, sampleRate: 48000, signal });
        }
        throwIfAborted(signal);
        const outName = `out.${ext}`;
        if (audioBuffer) {
          onProgress({ phase: 'muxing', fraction: 0.9, message: 'Encoding audio & muxing…' });
          await ff.writeFile('audio.wav', new Uint8Array(await audioBufferToWav(audioBuffer).arrayBuffer()));
          bytes = await muxAudioInto(ff, videoFile, 'audio.wav', outName, format);
          await safeDelete(ff, 'audio.wav');
          await safeDelete(ff, outName);
        } else {
          const finalArgs = format === 'mp4' ? ['-movflags', '+faststart'] : [];
          const code = await ff.exec(['-y', '-i', videoFile, '-c', 'copy', ...finalArgs, outName]);
          if (code !== 0) throw new Error(`FFmpeg finalize failed (exit ${code})`);
          bytes = (await ff.readFile(outName)) as Uint8Array;
          await safeDelete(ff, outName);
        }
      }

      onProgress({ phase: 'finalizing', fraction: 1 });
      return {
        blob: new Blob([bytes as BlobPart], { type: FORMAT_INFO[format].mimeType }),
        mimeType: FORMAT_INFO[format].mimeType,
        width: W,
        height: H,
        durationSeconds: duration,
        rendererId: this.id,
        elapsedSeconds: (performance.now() - started) / 1000,
      };
    } catch (e) {
      if (signal.aborted) throw new RenderCancelled();
      throw e;
    } finally {
      signal.removeEventListener('abort', onAbort);
      source.dispose();
      if (!signal.aborted) {
        for (const f of segmentFiles) await safeDelete(ff, f);
        await safeDelete(ff, `video.${ext}`);
      }
    }
  }
}
