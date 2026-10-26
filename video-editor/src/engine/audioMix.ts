/**
 * Offline audio mixdown for export. Decodes every audible asset, schedules
 * each clip on an OfflineAudioContext with volume/fade automation and
 * returns the rendered AudioBuffer.
 */
import type { AudibleClip, Project } from '@/types/project';
import { mediaRegistry } from '@/media/mediaRegistry';
import { decodeAudio } from '@/media/audioDecode';
import { clipEnd } from '@/model/project';
import { duckingFactor } from '@/model/clipMath';

export interface MixOptions {
  startTime: number;
  duration: number;
  sampleRate?: number;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

export function audibleClips(project: Project): AudibleClip[] {
  const mutedTracks = new Set(project.tracks.filter((t) => t.muted).map((t) => t.id));
  return project.clips.filter(
    (c): c is AudibleClip =>
      (c.kind === 'video' || c.kind === 'audio') && !c.audio.muted && !mutedTracks.has(c.trackId) && c.audio.volume > 0,
  );
}

export async function renderAudioMix(project: Project, opts: MixOptions): Promise<AudioBuffer | null> {
  const clips = audibleClips(project).filter(
    (c) => clipEnd(c) > opts.startTime && c.start < opts.startTime + opts.duration,
  );
  if (clips.length === 0) return null;
  const sampleRate = opts.sampleRate ?? 48000;
  const length = Math.max(1, Math.ceil(opts.duration * sampleRate));
  const offline = new OfflineAudioContext(2, length, sampleRate);

  const buffers = new Map<string, AudioBuffer>();
  let i = 0;
  for (const assetId of new Set(clips.map((c) => c.assetId))) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const media = mediaRegistry.get(assetId);
    if (!media) continue;
    const buf = await decodeAudio(assetId, media.blob);
    if (buf) buffers.set(assetId, buf);
    opts.onProgress?.((++i / (clips.length + 1)) * 0.5);
  }
  let scheduled = 0;
  for (const clip of clips) {
    const buffer = buffers.get(clip.assetId);
    if (!buffer) continue;
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = clip.speed;
    const gain = offline.createGain();
    source.connect(gain);
    gain.connect(offline.destination);

    // Timeline window of this clip inside the export range.
    const clipStartInMix = clip.start - opts.startTime;
    const playFrom = Math.max(0, clipStartInMix);
    const skipped = playFrom - clipStartInMix; // seconds of the clip we skip because export starts later
    const sourceOffset = clip.trimStart + skipped * clip.speed;
    const remainingTimeline = Math.min(clip.duration - skipped, opts.duration - playFrom);
    if (remainingTimeline <= 0) continue;

    const vol = clip.audio.volume;
    const g = gain.gain;
    g.setValueAtTime(0, 0);
    g.setValueAtTime(vol, playFrom);
    if (clip.audio.fadeIn > 0) {
      const fadeEnd = Math.min(clip.audio.fadeIn, clip.duration);
      // Portion of the fade still ahead of us when the export starts.
      if (skipped < fadeEnd) {
        g.setValueAtTime((skipped / fadeEnd) * vol, playFrom);
        g.linearRampToValueAtTime(vol, playFrom + (fadeEnd - skipped));
      }
    }
    if (clip.audio.fadeOut > 0) {
      const fadeLen = Math.min(clip.audio.fadeOut, clip.duration);
      const fadeStartTimeline = clip.duration - fadeLen; // relative to clip start
      const fadeStartMix = clipStartInMix + fadeStartTimeline;
      const fadeEndMix = clipStartInMix + clip.duration;
      if (fadeEndMix > playFrom) {
        const s = Math.max(fadeStartMix, playFrom);
        const startVal = vol * (1 - (s - fadeStartMix) / fadeLen);
        g.setValueAtTime(startVal, s);
        g.linearRampToValueAtTime(0, fadeEndMix);
      }
    }
    // Ducking: sample the envelope and apply it through a second gain stage.
    const track = project.tracks.find((t) => t.id === clip.trackId);
    if (track?.duck) {
      const duck = offline.createGain();
      gain.disconnect();
      gain.connect(duck);
      duck.connect(offline.destination);
      const stepS = 0.05;
      const n = Math.max(2, Math.ceil(remainingTimeline / stepS) + 1);
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const tl = clip.start + skipped + Math.min(remainingTimeline, i * stepS);
        curve[i] = duckingFactor(project, track, tl);
      }
      duck.gain.setValueCurveAtTime(curve, playFrom, Math.max(0.001, remainingTimeline));
    }
    source.start(playFrom, Math.min(sourceOffset, Math.max(0, buffer.duration - 0.001)), remainingTimeline * clip.speed);
    scheduled++;
  }
  if (scheduled === 0) return null;
  opts.onProgress?.(0.6);
  const rendered = await offline.startRendering();
  opts.onProgress?.(1);
  return rendered;
}
