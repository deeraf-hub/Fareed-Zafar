import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, Lock, LockOpen, Volume2, VolumeX } from 'lucide-react';
import type { Clip, Track } from '@/types/project';
import { useProjectStore, selectDuration } from '@/store/projectStore';
import { canPlaceOnTrack, snapPoints, snapTime } from '@/model/timelineOps';
import { clipEnd } from '@/model/project';
import { toast } from '@/store/uiStore';
import type { PlaybackControls } from '@/hooks/usePlayer';
import { ASSET_MIME, importFilesIntoProject } from '@/media/importFlow';
import { TimelineToolbar } from './TimelineToolbar';
import { TimeRuler } from './TimeRuler';
import { ClipView, type GestureKind } from './ClipView';
import { HEADER_WIDTH, RULER_HEIGHT, SNAP_PX, TAIL_SECONDS, trackHeight, xToTime } from './timelineUtils';

interface Gesture {
  kind: GestureKind | 'scrub';
  pointerId: number;
  clipId?: string;
  startX: number;
  startY: number;
  origStart: number;
  origEnd: number;
  origTrackId: string;
  moved: boolean;
  multi: boolean;
  appliedDelta: number;
  trackRects: { id: string; top: number; bottom: number }[];
}

export function Timeline({ height, controls }: { height: number; controls: PlaybackControls }) {
  const project = useProjectStore((s) => s.project!);
  const zoom = useProjectStore((s) => s.zoom);
  const playhead = useProjectStore((s) => s.playhead);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const snapping = useProjectStore((s) => s.snapping);
  const selectedIds = useProjectStore((s) => s.selectedClipIds);
  const duration = useProjectStore(selectDuration);
  const store = useProjectStore;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const gestureRef = useRef<Gesture | null>(null);
  const [dropTrack, setDropTrack] = useState<string | null>(null);

  const contentWidth = Math.max(viewportWidth - HEADER_WIDTH, (duration + TAIL_SECONDS) * zoom) + HEADER_WIDTH;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Ctrl+wheel zoom (needs a non-passive listener to preventDefault).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const s = store.getState();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - HEADER_WIDTH + el.scrollLeft;
      const tAtPointer = x / s.zoom;
      const nextZoom = Math.max(4, Math.min(600, s.zoom * factor));
      s.setZoom(nextZoom);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, tAtPointer * nextZoom - (e.clientX - rect.left - HEADER_WIDTH));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [store]);

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isPlaying) return;
    const px = playhead * zoom;
    const visibleW = el.clientWidth - HEADER_WIDTH;
    if (px < el.scrollLeft || px > el.scrollLeft + visibleW - 40) {
      el.scrollLeft = Math.max(0, px - 80);
    }
  }, [playhead, zoom, isPlaying]);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollRef.current!;
      const rect = el.getBoundingClientRect();
      return xToTime(clientX - rect.left - HEADER_WIDTH + el.scrollLeft, zoom);
    },
    [zoom],
  );

  const maybeSnap = useCallback(
    (time: number, excludeIds: string[]) => {
      if (!snapping) return time;
      const pts = snapPoints(store.getState().project!.clips, store.getState().playhead, excludeIds);
      return snapTime(time, pts, SNAP_PX / zoom).time;
    },
    [snapping, zoom, store],
  );

  const trackRects = () => {
    const el = scrollRef.current!;
    return Array.from(el.querySelectorAll<HTMLElement>('[data-track-lane]')).map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.dataset.trackLane!, top: r.top, bottom: r.bottom };
    });
  };

  // ----- Scrubbing -----
  const onScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (controls.player.isPlaying) controls.pause();
    const t = timeFromClientX(e.clientX);
    controls.seek(t);
    gestureRef.current = {
      kind: 'scrub',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origStart: 0,
      origEnd: 0,
      origTrackId: '',
      moved: false,
      multi: false,
      appliedDelta: 0,
      trackRects: [],
    };
    scrollRef.current?.setPointerCapture(e.pointerId);
  };

  // ----- Clip gestures -----
  const onClipPointerDown = (e: React.PointerEvent, clip: Clip, kind: GestureKind) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = store.getState();
    const track = project.tracks.find((t) => t.id === clip.trackId);
    if (e.shiftKey) s.select([clip.id], true);
    else if (!s.selectedClipIds.includes(clip.id)) s.select([clip.id]);
    if (track?.locked) return;
    const multi = kind === 'move' && store.getState().selectedClipIds.length > 1 && store.getState().selectedClipIds.includes(clip.id);
    gestureRef.current = {
      kind,
      pointerId: e.pointerId,
      clipId: clip.id,
      startX: e.clientX,
      startY: e.clientY,
      origStart: clip.start,
      origEnd: clipEnd(clip),
      origTrackId: clip.trackId,
      moved: false,
      multi,
      appliedDelta: 0,
      trackRects: trackRects(),
    };
    scrollRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const s = store.getState();
    if (g.kind === 'scrub') {
      controls.seek(timeFromClientX(e.clientX));
      return;
    }
    const dx = e.clientX - g.startX;
    if (!g.moved) {
      if (Math.abs(dx) < 3 && Math.abs(e.clientY - g.startY) < 3) return;
      g.moved = true;
      s.beginGesture();
    }
    const dt = dx / zoom;
    const clip = s.project!.clips.find((c) => c.id === g.clipId);
    if (!clip) return;
    if (g.kind === 'move') {
      if (g.multi) {
        const ids = s.selectedClipIds;
        const target = maybeSnap(g.origStart + dt, ids);
        const delta = target - g.origStart;
        const applied = delta - g.appliedDelta;
        if (Math.abs(applied) > 1e-6) {
          s.moveSelected(applied);
          const after = s.project!.clips.find((c) => c.id === g.clipId)!;
          g.appliedDelta = after.start - g.origStart;
        }
        return;
      }
      let start = g.origStart + dt;
      // Snap either edge.
      const snappedStart = maybeSnap(start, [clip.id]);
      const snappedEnd = maybeSnap(start + clip.duration, [clip.id]) - clip.duration;
      if (Math.abs(snappedStart - start) <= Math.abs(snappedEnd - start)) start = snappedStart;
      else start = snappedEnd;
      start = Math.max(0, start);
      let trackId = g.origTrackId;
      const hit = g.trackRects.find((r) => e.clientY >= r.top && e.clientY < r.bottom);
      if (hit) {
        const track = s.project!.tracks.find((t) => t.id === hit.id);
        if (track && canPlaceOnTrack(clip, track)) trackId = track.id;
      }
      s.moveClip(clip.id, trackId, start, { history: false });
    } else if (g.kind === 'trim-start') {
      s.trimStart(clip.id, maybeSnap(g.origStart + dt, [clip.id]), { history: false });
    } else {
      s.trimEnd(clip.id, maybeSnap(g.origEnd + dt, [clip.id]), { history: false });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    try {
      scrollRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // ----- Empty lane click: move playhead + clear selection -----
  const onLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    store.getState().clearSelection();
    onScrubStart(e);
  };

  // ----- Drops from the media library / OS -----
  const onLaneDragOver = (e: React.DragEvent, track: Track) => {
    const types = e.dataTransfer.types;
    if (!types.includes(ASSET_MIME) && !types.includes('Files')) return;
    if (track.locked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dropTrack !== track.id) setDropTrack(track.id);
  };
  const onLaneDrop = async (e: React.DragEvent, track: Track) => {
    e.preventDefault();
    setDropTrack(null);
    const time = maybeSnap(timeFromClientX(e.clientX), []);
    const s = store.getState();
    const assetId = e.dataTransfer.getData(ASSET_MIME);
    if (assetId) {
      const asset = s.project!.assets.find((a) => a.id === assetId);
      if (!asset) return;
      const kind = asset.kind === 'audio' ? 'audio' : 'video';
      const clip = s.addClipFromAsset(asset, { trackId: track.kind === kind ? track.id : undefined, start: time });
      if (!clip) toast('No room for this clip at the drop position.', 'warning');
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      let cursor = time;
      await importFilesIntoProject(files, (asset) => {
        const kind = asset.kind === 'audio' ? 'audio' : 'video';
        const clip = store.getState().addClipFromAsset(asset, { trackId: track.kind === kind ? track.id : undefined, start: cursor });
        if (clip) cursor = clipEnd(clip);
      });
    }
  };

  const assetsById = new Map(project.assets.map((a) => [a.id, a]));
  const tracksTotalHeight = project.tracks.reduce((h, t) => h + trackHeight(t.kind), 0);

  return (
    <section className="flex shrink-0 flex-col bg-ink-950" style={{ height }} aria-label="Timeline" data-testid="timeline">
      <TimelineToolbar viewportWidth={viewportWidth - HEADER_WIDTH} />
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto"
        onScroll={(e) => setScrollLeft((e.target as HTMLDivElement).scrollLeft)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="timeline-scroll"
      >
        <div style={{ width: contentWidth, minHeight: RULER_HEIGHT + tracksTotalHeight }} className="relative">
          {/* Ruler row */}
          <div className="sticky top-0 z-20 flex">
            <div className="sticky left-0 z-30 shrink-0 border-b border-r border-ink-700 bg-ink-900" style={{ width: HEADER_WIDTH, height: RULER_HEIGHT }} />
            <TimeRuler zoom={zoom} scrollLeft={scrollLeft} viewportWidth={Math.max(0, viewportWidth - HEADER_WIDTH)} contentWidth={contentWidth - HEADER_WIDTH} onScrubStart={onScrubStart} />
          </div>
          {/* Tracks */}
          {project.tracks.map((track) => {
            const h = trackHeight(track.kind);
            return (
              <div key={track.id} className="flex" style={{ height: h }}>
                <TrackHeader track={track} height={h} />
                <div
                  data-track-lane={track.id}
                  className={clsx(
                    'timeline-grid relative shrink-0 border-b border-ink-800',
                    track.kind === 'audio' ? 'bg-ink-900/60' : 'bg-ink-900/30',
                    dropTrack === track.id && 'bg-accent-500/10',
                    track.locked && 'opacity-60',
                  )}
                  style={{ width: contentWidth - HEADER_WIDTH, height: h, backgroundSize: `${zoom}px 100%` }}
                  onPointerDown={onLanePointerDown}
                  onDragOver={(e) => onLaneDragOver(e, track)}
                  onDragLeave={() => setDropTrack((d) => (d === track.id ? null : d))}
                  onDrop={(e) => void onLaneDrop(e, track)}
                  data-testid="track-lane"
                  data-track-kind={track.kind}
                >
                  {project.clips
                    .filter((c) => c.trackId === track.id)
                    .map((clip) => (
                      <ClipView
                        key={clip.id}
                        clip={clip}
                        asset={'assetId' in clip ? assetsById.get(clip.assetId) : undefined}
                        zoom={zoom}
                        height={h}
                        selected={selectedIds.includes(clip.id)}
                        locked={track.locked}
                        onPointerDown={onClipPointerDown}
                      />
                    ))}
                </div>
              </div>
            );
          })}
          {/* Playhead */}
          <div
            className="pointer-events-none absolute z-40"
            style={{ left: HEADER_WIDTH + playhead * zoom, top: 0, height: RULER_HEIGHT + tracksTotalHeight }}
            data-testid="playhead"
          >
            <div className="absolute -left-[5px] top-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
            <div className="absolute left-0 top-0 h-full w-px bg-red-500" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackHeader({ track, height }: { track: Track; height: number }) {
  const updateTrack = useProjectStore((s) => s.updateTrack);
  return (
    <div
      className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-b border-r border-ink-700 bg-ink-900 px-2"
      style={{ width: HEADER_WIDTH, height }}
      data-testid="track-header"
    >
      <span className={clsx('h-6 w-1 rounded-full', track.kind === 'video' ? 'bg-clip-video' : 'bg-clip-audio')} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-200" title={track.name}>
        {track.name}
      </span>
      {track.kind === 'video' && (
        <button type="button" className={clsx('rounded p-1 hover:bg-ink-700', track.hidden ? 'text-amber-300' : 'text-ink-400')} onClick={() => updateTrack(track.id, { hidden: !track.hidden })} aria-label={track.hidden ? 'Show track' : 'Hide track'} aria-pressed={track.hidden}>
          {track.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
      <button type="button" className={clsx('rounded p-1 hover:bg-ink-700', track.muted ? 'text-amber-300' : 'text-ink-400')} onClick={() => updateTrack(track.id, { muted: !track.muted })} aria-label={track.muted ? 'Unmute track' : 'Mute track'} aria-pressed={track.muted}>
        {track.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <button type="button" className={clsx('rounded p-1 hover:bg-ink-700', track.locked ? 'text-amber-300' : 'text-ink-400')} onClick={() => updateTrack(track.id, { locked: !track.locked })} aria-label={track.locked ? 'Unlock track' : 'Lock track'} aria-pressed={track.locked}>
        {track.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
