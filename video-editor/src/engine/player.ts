/**
 * Real-time preview player. Drives media elements in sync with a master
 * clock, mixes their audio through Web Audio (per-clip gain for volume and
 * fades) and paints frames with the shared compositor.
 */
import type { AudioClip, ImageClip, Project, VideoClip } from '@/types/project';
import { activeAudibleClips, clipGainAt, clipSourceTime, isActive } from '@/model/clipMath';
import { sequenceDuration } from '@/model/project';
import { mediaRegistry } from '@/media/mediaRegistry';
import { drawFrame, type FrameSources } from './compositor';
import { MediaPool, seekElement, type PooledVideo } from './mediaPool';

interface AudioOnly {
  el: HTMLAudioElement;
  assetId: string;
  node?: MediaElementAudioSourceNode;
  gain?: GainNode;
}

export interface PlayerCallbacks {
  onTime(time: number): void;
  onEnded(): void;
}

const DRIFT_TOLERANCE = 0.08;

export class Player implements FrameSources {
  private project: Project | null = null;
  private pool = new MediaPool({ muted: false });
  private audioEls = new Map<string, AudioOnly>();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private playing = false;
  private startWall = 0;
  private startTime = 0;
  private time = 0;
  private raf = 0;
  private canvas: HTMLCanvasElement | null = null;
  private seekToken = 0;
  private disposed = false;
  volume = 1;

  constructor(private readonly callbacks: PlayerCallbacks) {}

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.disposed = false;
  }

  setProject(project: Project): void {
    const prev = this.project;
    this.project = project;
    const live = new Set(project.clips.map((c) => c.id));
    this.pool.prune(live);
    for (const id of [...this.audioEls.keys()]) if (!live.has(id)) this.releaseAudio(id);
    if (prev && !this.playing) void this.renderAt(this.time);
  }

  get currentTime(): number {
    return this.time;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Called by the compositor to fetch a drawable for a media clip. */
  getVisual(clip: VideoClip | ImageClip, _time: number): CanvasImageSource | null {
    if (clip.kind === 'image') return this.pool.image(clip);
    const v = this.pool.video(clip);
    if (!v || v.el.readyState < 2) return null;
    return v.el;
  }

  private ensureAudioGraph(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private wireVideoAudio(v: PooledVideo): void {
    if (v.audioNode || !this.ctx || !this.master) return;
    try {
      v.audioNode = this.ctx.createMediaElementSource(v.el);
      v.gain = this.ctx.createGain();
      v.audioNode.connect(v.gain);
      v.gain.connect(this.master);
    } catch {
      /* element already connected elsewhere */
    }
  }

  private audioFor(clip: AudioClip): AudioOnly | null {
    const existing = this.audioEls.get(clip.id);
    if (existing && existing.assetId === clip.assetId) return existing;
    if (existing) this.releaseAudio(clip.id);
    const media = mediaRegistry.get(clip.assetId);
    if (!media) return null;
    const el = document.createElement('audio');
    el.src = media.url;
    el.preload = 'auto';
    el.load();
    const entry: AudioOnly = { el, assetId: clip.assetId };
    this.audioEls.set(clip.id, entry);
    return entry;
  }

  private releaseAudio(clipId: string): void {
    const a = this.audioEls.get(clipId);
    if (!a) return;
    a.el.pause();
    try {
      a.node?.disconnect();
      a.gain?.disconnect();
    } catch {
      /* ignore */
    }
    a.el.removeAttribute('src');
    a.el.load();
    this.audioEls.delete(clipId);
  }

  async play(): Promise<void> {
    if (!this.project || this.playing) return;
    const duration = sequenceDuration(this.project.clips);
    if (duration <= 0) return;
    if (this.time >= duration - 0.01) this.time = 0;
    this.ensureAudioGraph();
    if (this.ctx?.state === 'suspended') await this.ctx.resume().catch(() => undefined);
    this.playing = true;
    this.startWall = performance.now();
    this.startTime = this.time;
    this.tick();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    for (const v of this.pool.allVideos()) v.el.pause();
    for (const a of this.audioEls.values()) a.el.pause();
  }

  async seek(time: number): Promise<void> {
    if (!this.project) return;
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.time = Math.max(0, time);
    this.callbacks.onTime(this.time);
    await this.renderAt(this.time);
    if (wasPlaying) void this.play();
  }

  /** Draw a single frame at `time` with every media element seeked accurately. */
  async renderAt(time: number): Promise<void> {
    if (!this.project || !this.canvas) return;
    const token = ++this.seekToken;
    const project = this.project;
    const seeks: Promise<void>[] = [];
    for (const clip of project.clips) {
      if (clip.kind === 'video' && isActive(clip, time)) {
        const v = this.pool.video(clip);
        if (v) {
          v.el.pause();
          seeks.push(seekElement(v.el, clipSourceTime(clip, time)));
        }
      } else if (clip.kind === 'image' && isActive(clip, time)) {
        seeks.push(this.pool.ensureImage(clip).then(() => undefined));
      }
    }
    if (seeks.length) await Promise.all(seeks);
    if (token !== this.seekToken || this.disposed) return;
    this.paint(time);
  }

  private paint(time: number): void {
    if (!this.canvas || !this.project) return;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    drawFrame(ctx, this.project, time, this, { width: this.canvas.width, height: this.canvas.height });
  }

  private tick = (): void => {
    if (!this.playing || !this.project) return;
    const project = this.project;
    const duration = sequenceDuration(project.clips);
    const now = performance.now();
    this.time = this.startTime + (now - this.startWall) / 1000;
    if (this.time >= duration) {
      this.time = duration;
      this.paint(this.time);
      this.callbacks.onTime(this.time);
      this.pause();
      this.callbacks.onEnded();
      return;
    }
    const t = this.time;

    // --- Visual media elements ---
    const activeVideoIds = new Set<string>();
    for (const clip of project.clips) {
      if (clip.kind === 'video' && isActive(clip, t)) {
        const track = project.tracks.find((x) => x.id === clip.trackId);
        if (track?.hidden) continue;
        activeVideoIds.add(clip.id);
        const v = this.pool.video(clip);
        if (!v) continue;
        this.wireVideoAudio(v);
        const want = clipSourceTime(clip, t);
        if (v.el.playbackRate !== clip.speed) {
          try {
            v.el.playbackRate = clip.speed;
          } catch {
            /* unsupported rate */
          }
        }
        if (v.el.paused && v.el.readyState >= 2) {
          v.el.currentTime = want;
          void v.el.play().catch(() => undefined);
        } else if (Math.abs(v.el.currentTime - want) > DRIFT_TOLERANCE && !v.el.seeking) {
          v.el.currentTime = want;
        }
        if (v.gain) v.gain.gain.value = clipGainAt(clip, track, t);
      } else if (clip.kind === 'image' && isActive(clip, t)) {
        void this.pool.ensureImage(clip);
      }
    }
    for (const [clipId, v] of this.pool.videoEntries()) {
      if (!activeVideoIds.has(clipId) && !v.el.paused) v.el.pause();
    }

    // --- Audio-only clips ---
    const audible = activeAudibleClips(project, t);
    const activeAudioIds = new Set<string>();
    for (const clip of audible) {
      if (clip.kind !== 'audio') continue;
      activeAudioIds.add(clip.id);
      const a = this.audioFor(clip);
      if (!a) continue;
      if (!a.node && this.ctx && this.master) {
        try {
          a.node = this.ctx.createMediaElementSource(a.el);
          a.gain = this.ctx.createGain();
          a.node.connect(a.gain);
          a.gain.connect(this.master);
        } catch {
          /* ignore */
        }
      }
      const want = clipSourceTime(clip, t);
      if (a.el.playbackRate !== clip.speed) a.el.playbackRate = clip.speed;
      if (a.el.paused && a.el.readyState >= 2) {
        a.el.currentTime = want;
        void a.el.play().catch(() => undefined);
      } else if (Math.abs(a.el.currentTime - want) > DRIFT_TOLERANCE && !a.el.seeking) {
        a.el.currentTime = want;
      }
      const track = project.tracks.find((x) => x.id === clip.trackId);
      const g = clipGainAt(clip, track, t);
      if (a.gain) a.gain.gain.value = g;
      else a.el.volume = Math.min(1, g);
    }
    for (const [id, a] of this.audioEls) if (!activeAudioIds.has(id) && !a.el.paused) a.el.pause();

    this.paint(t);
    this.callbacks.onTime(t);
    this.raf = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.disposed = true;
    this.pause();
    this.pool.dispose();
    for (const id of [...this.audioEls.keys()]) this.releaseAudio(id);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
