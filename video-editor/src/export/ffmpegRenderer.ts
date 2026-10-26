/**
 * Portable path: frames are composited to JPEG and encoded with libx264
 * inside FFmpeg.wasm, in segments so memory stays bounded; segments are then
 * concatenated (stream copy) and the audio mixdown is muxed in as AAC.
 */
import type { Project } from '@/types/project';
import { renderAudioMix } from '@/engine/audioMix';
import { ExportFrameSource } from './frameSource';
import { getFfmpeg, muxAudioIntoMp4, safeDelete, setFfmpegSinks, terminateFfmpeg } from './ffmpegClient';
import { audioBufferToWav } from './wav';
import { RenderCancelled, throwIfAborted, type RenderOptions, type RenderResult, type Renderer } from './renderer';

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

export class FfmpegRenderer implements Renderer {
  readonly id = 'ffmpeg';
  readonly label = 'Software (FFmpeg.wasm)';
  readonly description = 'Works in any modern browser. Slower, but produces standard H.264 MP4 everywhere.';

  async isSupported(): Promise<boolean> {
    return typeof WebAssembly !== 'undefined';
  }

  async render(project: Project, options: RenderOptions): Promise<RenderResult> {
    const started = performance.now();
    const { width, height, fps, startTime, duration, signal, onProgress } = options;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const even = (n: number) => (n % 2 === 0 ? n : n - 1);
    const W = even(width);
    const H = even(height);

    onProgress({ phase: 'preparing', fraction: 0, message: 'Loading FFmpeg…' });
    const ff = await getFfmpeg((m) => onProgress({ phase: 'preparing', fraction: 0, message: m }));
    throwIfAborted(signal);
    const source = new ExportFrameSource(project, W, H);
    const segmentFiles: string[] = [];
    const onAbort = () => terminateFfmpeg();
    signal.addEventListener('abort', onAbort, { once: true });
    const crf = options.videoBitrate >= 12_000_000 ? '18' : options.videoBitrate >= 6_000_000 ? '20' : '23';

    try {
      await source.prepare(startTime, duration);
      let encodedFrames = 0;
      const segments = Math.ceil(totalFrames / SEGMENT_FRAMES);
      for (let s = 0; s < segments; s++) {
        const from = s * SEGMENT_FRAMES;
        const to = Math.min(totalFrames, from + SEGMENT_FRAMES);
        const names: string[] = [];
        for (let i = from; i < to; i++) {
          throwIfAborted(signal);
          await source.renderFrame(startTime + i / fps);
          const jpeg = await canvasToJpeg(source.canvas, 0.92);
          const name = `f_${String(i - from).padStart(5, '0')}.jpg`;
          await ff.writeFile(name, jpeg);
          names.push(name);
          encodedFrames++;
          if (i % 2 === 0) {
            onProgress({
              phase: 'rendering',
              fraction: 0.03 + (encodedFrames / totalFrames) * 0.72,
              frame: encodedFrames,
              totalFrames,
            });
          }
        }
        throwIfAborted(signal);
        const seg = `seg_${String(s).padStart(3, '0')}.mp4`;
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
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', crf,
          '-pix_fmt', 'yuv420p',
          '-g', String(fps * 2),
          '-vf', `scale=${W}:${H}`,
          '-r', String(fps),
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
        const code = await ff.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'video.mp4']);
        await safeDelete(ff, 'list.txt');
        if (code !== 0) throw new Error(`FFmpeg concat failed (exit ${code})`);
        videoFile = 'video.mp4';
      }

      let bytes: Uint8Array;
      let audioBuffer: AudioBuffer | null = null;
      if (options.includeAudio) {
        onProgress({ phase: 'audio', fraction: 0.82, message: 'Mixing audio…' });
        audioBuffer = await renderAudioMix(project, { startTime, duration, sampleRate: 48000, signal });
      }
      throwIfAborted(signal);
      if (audioBuffer) {
        onProgress({ phase: 'muxing', fraction: 0.9, message: 'Encoding audio & muxing…' });
        await ff.writeFile('audio.wav', new Uint8Array(await audioBufferToWav(audioBuffer).arrayBuffer()));
        bytes = await muxAudioIntoMp4(ff, videoFile, 'audio.wav', 'out.mp4');
        await safeDelete(ff, 'audio.wav');
        await safeDelete(ff, 'out.mp4');
      } else {
        const code = await ff.exec(['-y', '-i', videoFile, '-c', 'copy', '-movflags', '+faststart', 'out.mp4']);
        if (code !== 0) throw new Error(`FFmpeg finalize failed (exit ${code})`);
        bytes = (await ff.readFile('out.mp4')) as Uint8Array;
        await safeDelete(ff, 'out.mp4');
      }
      onProgress({ phase: 'finalizing', fraction: 1 });
      return {
        blob: new Blob([bytes as BlobPart], { type: 'video/mp4' }),
        mimeType: 'video/mp4',
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
        await safeDelete(ff, 'video.mp4');
      }
    }
  }
}
