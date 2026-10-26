import { create } from 'zustand';
import type {
  AspectRatio,
  Clip,
  MediaAsset,
  Project,
  TextPreset,
  Track,
} from '@/types/project';
import {
  clipEnd,
  makeClipFromAsset,
  makeTextClip,
  makeTrack,
  sequenceDuration,
  withAspect,
} from '@/model/project';
import {
  canPlaceOnTrack,
  closeGaps as closeGapsOnTrack,
  deleteClips,
  duplicateClips,
  findFreePosition,
  hasCollision,
  moveClip,
  rippleDelete,
  moveClips,
  splitAt,
  trimClipEnd,
  trimClipStart,
} from '@/model/timelineOps';
import { LIMITS } from '@/config/limits';
import { clamp, roundTo } from '@/lib/time';

interface HistoryEntry {
  tracks: Track[];
  clips: Clip[];
}

const HISTORY_LIMIT = 60;

/** `history: false` is used during drag gestures (call `beginGesture` first). */
export interface CommitOpts {
  history?: boolean;
}

export interface ProjectState {
  project: Project | null;
  /** Set when the loaded project could not be found / parsed. */
  loadError: string | null;
  selectedClipIds: string[];
  playhead: number;
  isPlaying: boolean;
  /** Timeline pixels per second. */
  zoom: number;
  snapping: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Incremented on every persisted-data change; autosave watches this. */
  revision: number;

  // lifecycle
  loadProject(project: Project): void;
  closeProject(): void;
  setLoadError(message: string | null): void;

  // playback / view
  setPlayhead(time: number): void;
  setPlaying(playing: boolean): void;
  setZoom(zoom: number): void;
  toggleSnapping(): void;
  select(ids: string[], additive?: boolean): void;
  clearSelection(): void;

  // project level
  rename(name: string): void;
  setAspect(aspect: AspectRatio): void;
  setFps(fps: number): void;
  setBackground(color: string): void;

  // assets
  addAsset(asset: MediaAsset): void;
  removeAsset(assetId: string): void;
  updateAsset(assetId: string, patch: Partial<MediaAsset>): void;

  // tracks
  addTrack(kind: Track['kind']): Track;
  removeTrack(trackId: string): void;
  updateTrack(trackId: string, patch: Partial<Track>): void;

  // clips
  addClipFromAsset(asset: MediaAsset, opts?: { trackId?: string; start?: number }): Clip | null;
  addTextClip(preset: TextPreset, opts?: { trackId?: string; start?: number; text?: string }): Clip | null;
  updateClip<T extends Clip>(clipId: string, patch: Partial<T> | ((clip: T) => Partial<T>), opts?: CommitOpts): void;
  moveClip(clipId: string, trackId: string, start: number, opts?: CommitOpts): void;
  moveSelected(delta: number): void;
  trimStart(clipId: string, newStart: number, opts?: CommitOpts): void;
  trimEnd(clipId: string, newEnd: number, opts?: CommitOpts): void;
  splitAtPlayhead(): void;
  duplicateSelected(): void;
  deleteSelected(): void;
  /** Delete the selection and close the holes it leaves on each track. */
  rippleDeleteSelected(): void;
  /** Remove gaps on the given tracks (default: tracks of the selection, or every unlocked track). */
  closeGaps(trackIds?: string[]): void;
  setClipSpeed(clipId: string, speed: number): void;

  // history
  undo(): void;
  redo(): void;
  /** Call before a drag so the whole gesture becomes a single undo step. */
  beginGesture(): void;
}

function touch(project: Project, patch: Partial<Project>): Project {
  return { ...project, ...patch, updatedAt: Date.now() };
}

export const useProjectStore = create<ProjectState>((set, get) => {
  /** Apply a timeline mutation and push an undo entry. */
  const commit = (mutate: (p: Project) => Partial<Project> | null, opts: { history?: boolean } = {}) => {
    const { project, past } = get();
    if (!project) return;
    const patch = mutate(project);
    if (!patch) return;
    const next = touch(project, patch);
    const history = opts.history ?? true;
    set({
      project: next,
      revision: get().revision + 1,
      ...(history
        ? {
            past: [...past.slice(-(HISTORY_LIMIT - 1)), { tracks: project.tracks, clips: project.clips }],
            future: [],
          }
        : {}),
    });
  };

  /**
   * Choose a track for a new clip. An explicit track wins; otherwise the
   * first unlocked track of the right kind that has room at `start` is used
   * (video: bottom layer upwards, audio: top down), falling back to the
   * default layer where the clip is then placed at the nearest free spot.
   */
  const pickTrack = (
    project: Project,
    kind: Track['kind'],
    preferredId: string | undefined,
    start: number,
    duration: number,
    order: 'bottom-up' | 'top-down' = 'bottom-up',
  ): Track | undefined => {
    if (preferredId) {
      const t = project.tracks.find((x) => x.id === preferredId);
      if (t && t.kind === kind && !t.locked) return t;
    }
    const list = project.tracks.filter((t) => t.kind === kind && !t.locked);
    const ordered = kind === 'video' && order === 'bottom-up' ? [...list].reverse() : list;
    return ordered.find((t) => !hasCollision(project.clips, t.id, start, duration)) ?? ordered[0];
  };

  return {
    project: null,
    loadError: null,
    selectedClipIds: [],
    playhead: 0,
    isPlaying: false,
    zoom: 60,
    snapping: true,
    past: [],
    future: [],
    revision: 0,

    loadProject(project) {
      set({
        project,
        loadError: null,
        selectedClipIds: [],
        playhead: 0,
        isPlaying: false,
        past: [],
        future: [],
        revision: 0,
      });
    },
    closeProject() {
      set({ project: null, selectedClipIds: [], playhead: 0, isPlaying: false, past: [], future: [], revision: 0 });
    },
    setLoadError(message) {
      set({ loadError: message });
    },

    setPlayhead(time) {
      const { project } = get();
      const max = project ? Math.max(sequenceDuration(project.clips), 0) : 0;
      set({ playhead: clamp(time, 0, Math.max(max, 0)) });
    },
    setPlaying(playing) {
      set({ isPlaying: playing });
    },
    setZoom(zoom) {
      set({ zoom: clamp(zoom, 4, 600) });
    },
    toggleSnapping() {
      set((s) => ({ snapping: !s.snapping }));
    },
    select(ids, additive = false) {
      set((s) => {
        if (!additive) return { selectedClipIds: ids };
        const merged = new Set(s.selectedClipIds);
        for (const id of ids) {
          if (merged.has(id)) merged.delete(id);
          else merged.add(id);
        }
        return { selectedClipIds: [...merged] };
      });
    },
    clearSelection() {
      set({ selectedClipIds: [] });
    },

    rename(name) {
      commit(() => ({ name: name.trim() || 'Untitled project' }), { history: false });
    },
    setAspect(aspect) {
      commit((p) => ({ settings: withAspect(p, aspect).settings }), { history: false });
    },
    setFps(fps) {
      commit((p) => ({ settings: { ...p.settings, fps: clamp(Math.round(fps), 15, 60) } }), { history: false });
    },
    setBackground(color) {
      commit((p) => ({ settings: { ...p.settings, background: color } }), { history: false });
    },

    addAsset(asset) {
      commit(
        (p) => {
          if (p.assets.some((a) => a.id === asset.id)) return null;
          if (p.assets.length >= LIMITS.maxAssetsPerProject) throw new Error('Asset limit reached for this project');
          return { assets: [...p.assets, asset] };
        },
        { history: false },
      );
    },
    removeAsset(assetId) {
      commit((p) => ({
        assets: p.assets.filter((a) => a.id !== assetId),
        clips: p.clips.filter((c) => !('assetId' in c) || c.assetId !== assetId),
      }));
      set((s) => ({ selectedClipIds: s.selectedClipIds.filter((id) => get().project?.clips.some((c) => c.id === id)) }));
    },
    updateAsset(assetId, patch) {
      commit((p) => ({ assets: p.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)) }), { history: false });
    },

    addTrack(kind) {
      const { project } = get();
      const count = project ? project.tracks.filter((t) => t.kind === kind).length : 0;
      const track = makeTrack(kind, kind === 'video' ? `Video ${count + 1}` : `Audio ${count + 1}`);
      commit((p) => {
        // New video tracks go on top (start of list), audio tracks at the bottom.
        if (kind === 'video') return { tracks: [track, ...p.tracks] };
        return { tracks: [...p.tracks, track] };
      });
      return track;
    },
    removeTrack(trackId) {
      commit((p) => {
        const track = p.tracks.find((t) => t.id === trackId);
        if (!track) return null;
        const sameKind = p.tracks.filter((t) => t.kind === track.kind);
        if (sameKind.length <= 1) return null; // keep at least one of each kind
        return {
          tracks: p.tracks.filter((t) => t.id !== trackId),
          clips: p.clips.filter((c) => c.trackId !== trackId),
        };
      });
    },
    updateTrack(trackId, patch) {
      commit((p) => ({ tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) }), {
        history: false,
      });
    },

    addClipFromAsset(asset, opts = {}) {
      const { project, playhead } = get();
      if (!project) return null;
      if (project.clips.length >= LIMITS.maxClipsPerProject) throw new Error('Clip limit reached for this project');
      const kind: Track['kind'] = asset.kind === 'audio' ? 'audio' : 'video';
      const wantStart = opts.start ?? playhead;
      const probe = makeClipFromAsset(asset, 'probe', wantStart);
      let track = pickTrack(project, kind, opts.trackId, wantStart, probe.duration);
      if (!track) {
        track = get().addTrack(kind);
      }
      const draft = makeClipFromAsset(asset, track.id, wantStart);
      const start = findFreePosition(get().project!.clips, track.id, draft.start, draft.duration);
      if (start === null) return null;
      const clip = { ...draft, start: roundTo(start) } as Clip;
      commit((p) => ({ clips: [...p.clips, clip] }));
      set({ selectedClipIds: [clip.id] });
      return clip;
    },

    addTextClip(preset, opts = {}) {
      const { project, playhead } = get();
      if (!project) return null;
      // Text prefers the top-most video track with room at the playhead.
      const wantStart = opts.start ?? playhead;
      const probe = makeTextClip('probe', wantStart, preset, project.settings, opts.text);
      let track = pickTrack(project, 'video', opts.trackId, wantStart, probe.duration, 'top-down');
      if (!track) track = get().addTrack('video');
      const draft = makeTextClip(track.id, wantStart, preset, project.settings, opts.text);
      const start = findFreePosition(get().project!.clips, track.id, draft.start, draft.duration);
      if (start === null) return null;
      const clip: Clip = { ...draft, start: roundTo(start) };
      commit((p) => ({ clips: [...p.clips, clip] }));
      set({ selectedClipIds: [clip.id] });
      return clip;
    },

    updateClip(clipId, patch, opts) {
      commit((p) => {
        const idx = p.clips.findIndex((c) => c.id === clipId);
        if (idx < 0) return null;
        const clip = p.clips[idx];
        const resolved = typeof patch === 'function' ? patch(clip as never) : patch;
        const next = { ...clip, ...resolved } as Clip;
        const clips = [...p.clips];
        clips[idx] = next;
        return { clips };
      }, opts);
    },

    moveClip(clipId, trackId, start, opts) {
      commit((p) => {
        const clip = p.clips.find((c) => c.id === clipId);
        const track = p.tracks.find((t) => t.id === trackId);
        if (!clip || !track || !canPlaceOnTrack(clip, track)) return null;
        const clips = moveClip(p.clips, clipId, trackId, start);
        return clips === p.clips ? null : { clips };
      }, opts);
    },
    moveSelected(delta) {
      const ids = get().selectedClipIds;
      if (ids.length === 0) return;
      commit((p) => {
        const clips = moveClips(p.clips, ids, delta);
        return clips === p.clips ? null : { clips };
      });
    },
    trimStart(clipId, newStart, opts) {
      commit((p) => ({ clips: trimClipStart(p.clips, clipId, newStart) }), opts);
    },
    trimEnd(clipId, newEnd, opts) {
      commit((p) => ({ clips: trimClipEnd(p.clips, clipId, newEnd, p.assets) }), opts);
    },
    splitAtPlayhead() {
      const { playhead, selectedClipIds } = get();
      let newIds: string[] = [];
      commit((p) => {
        const locked = new Set(p.tracks.filter((t) => t.locked).map((t) => t.id));
        const eligible = p.clips.filter((c) => !locked.has(c.trackId)).map((c) => c.id);
        const only = selectedClipIds.length > 0 ? selectedClipIds.filter((id) => eligible.includes(id)) : eligible;
        const r = splitAt(p.clips, playhead, only);
        newIds = r.newIds;
        return r.clips === p.clips ? null : { clips: r.clips };
      });
      if (newIds.length > 0) set({ selectedClipIds: newIds });
    },
    duplicateSelected() {
      const ids = get().selectedClipIds;
      if (ids.length === 0) return;
      let newIds: string[] = [];
      commit((p) => {
        const r = duplicateClips(p.clips, ids);
        newIds = r.newIds;
        return r.newIds.length ? { clips: r.clips } : null;
      });
      if (newIds.length > 0) set({ selectedClipIds: newIds });
    },
    deleteSelected() {
      const ids = get().selectedClipIds;
      if (ids.length === 0) return;
      commit((p) => ({ clips: deleteClips(p.clips, ids) }));
      set({ selectedClipIds: [] });
    },
    rippleDeleteSelected() {
      const ids = get().selectedClipIds;
      if (ids.length === 0) return;
      commit((p) => ({ clips: rippleDelete(p.clips, ids) }));
      set({ selectedClipIds: [] });
    },
    closeGaps(trackIds) {
      commit((p) => {
        const locked = new Set(p.tracks.filter((t) => t.locked).map((t) => t.id));
        let targets = trackIds;
        if (!targets || targets.length === 0) {
          const sel = get().selectedClipIds;
          targets = sel.length
            ? [...new Set(p.clips.filter((c) => sel.includes(c.id)).map((c) => c.trackId))]
            : p.tracks.map((t) => t.id);
        }
        let clips = p.clips;
        for (const id of targets) if (!locked.has(id)) clips = closeGapsOnTrack(clips, id);
        return clips === p.clips || clips.every((c, i) => c === p.clips[i]) ? null : { clips };
      });
    },
    setClipSpeed(clipId, speed) {
      commit((p) => {
        const clip = p.clips.find((c) => c.id === clipId);
        if (!clip || !('speed' in clip)) return null;
        const asset = p.assets.find((a) => a.id === clip.assetId);
        const s = clamp(speed, 0.25, 4);
        const sourceLen = clip.duration * clip.speed;
        let duration = roundTo(sourceLen / s);
        if (asset) duration = Math.min(duration, roundTo((asset.duration - clip.trimStart) / s));
        // Do not run into the next clip on the same track.
        const next = p.clips
          .filter((c) => c.trackId === clip.trackId && c.id !== clip.id && c.start >= clipEnd(clip) - 1e-3)
          .sort((a, b) => a.start - b.start)[0];
        if (next) duration = Math.min(duration, roundTo(next.start - clip.start));
        return { clips: p.clips.map((c) => (c.id === clipId ? ({ ...c, speed: s, duration } as Clip) : c)) };
      });
    },

    undo() {
      const { project, past, future } = get();
      if (!project || past.length === 0) return;
      const entry = past[past.length - 1];
      set({
        project: touch(project, { tracks: entry.tracks, clips: entry.clips }),
        past: past.slice(0, -1),
        future: [{ tracks: project.tracks, clips: project.clips }, ...future].slice(0, HISTORY_LIMIT),
        revision: get().revision + 1,
        selectedClipIds: get().selectedClipIds.filter((id) => entry.clips.some((c) => c.id === id)),
      });
    },
    redo() {
      const { project, past, future } = get();
      if (!project || future.length === 0) return;
      const entry = future[0];
      set({
        project: touch(project, { tracks: entry.tracks, clips: entry.clips }),
        past: [...past, { tracks: project.tracks, clips: project.clips }].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        revision: get().revision + 1,
        selectedClipIds: get().selectedClipIds.filter((id) => entry.clips.some((c) => c.id === id)),
      });
    },
    beginGesture() {
      const { project, past } = get();
      if (!project) return;
      set({ past: [...past.slice(-(HISTORY_LIMIT - 1)), { tracks: project.tracks, clips: project.clips }], future: [] });
    },
  };
});

/** Convenience selectors. */
export const selectProject = (s: ProjectState) => s.project;
export const selectDuration = (s: ProjectState) => (s.project ? sequenceDuration(s.project.clips) : 0);
export const selectSelectedClip = (s: ProjectState): Clip | null => {
  if (!s.project || s.selectedClipIds.length !== 1) return null;
  return s.project.clips.find((c) => c.id === s.selectedClipIds[0]) ?? null;
};
