import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward, Volume2, VolumeX } from 'lucide-react';
import type { ImageClip, VideoClip, VisualClip } from '@/types/project';
import { useProjectStore, selectDuration, selectSelectedClip } from '@/store/projectStore';
import { isVisualClip } from '@/types/project';
import { clipBounds } from '@/engine/compositor';
import { hasKeyframes, isActive, transformAt, withKeyframe } from '@/model/clipMath';
import type { PlaybackControls } from '@/hooks/usePlayer';
import { IconButton } from '@/components/ui/IconButton';
import { formatTime } from '@/lib/time';

const MAX_CANVAS_WIDTH = 1920;

export function PreviewPanel({ controls }: { controls: PlaybackControls }) {
  const { player } = controls;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const duration = useProjectStore(selectDuration);
  const selected = useProjectStore(selectSelectedClip);
  const updateClip = useProjectStore((s) => s.updateClip);
  const beginGesture = useProjectStore((s) => s.beginGesture);
  const [cssSize, setCssSize] = useState({ w: 0, h: 0 });
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const aspectW = project?.settings.width ?? 16;
  const aspectH = project?.settings.height ?? 9;

  // Fit the canvas into the container keeping the project aspect ratio.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 24;
      const cw = Math.max(0, el.clientWidth - pad * 2);
      const ch = Math.max(0, el.clientHeight - pad * 2);
      const scale = Math.min(cw / aspectW, ch / aspectH);
      setCssSize({ w: Math.floor(aspectW * scale), h: Math.floor(aspectH * scale) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectW, aspectH]);

  // Size the drawing buffer and attach the player.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssSize.w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(MAX_CANVAS_WIDTH, Math.round(cssSize.w * dpr));
    const h = Math.round((w * aspectH) / aspectW);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    player.attach(canvas);
    void player.renderAt(useProjectStore.getState().playhead);
  }, [cssSize, aspectW, aspectH, player]);

  useEffect(() => {
    if (project) player.setProject(project);
  }, [project, player]);

  // Scrubbing from the timeline: re-render when paused.
  useEffect(() => {
    if (!player.isPlaying && Math.abs(player.currentTime - playhead) > 1e-6) void player.seek(playhead);
  }, [playhead, player]);

  useEffect(() => {
    player.setVolume(muted ? 0 : volume);
  }, [volume, muted, player]);

  // --- Selection overlay & drag-to-move for the selected visual clip ---
  const overlayClip = selected && isVisualClip(selected) && isActive(selected, playhead) ? (selected as VisualClip) : null;
  const [measureCtx] = useState(() => (typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null));
  const sizeFor = useCallback(
    (clip: VideoClip | ImageClip) => {
      const src = player.getVisual(clip, playhead);
      if (!src) return null;
      if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
      if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
      return null;
    },
    [player, playhead],
  );
  const bounds = overlayClip && project ? clipBounds(project, overlayClip, playhead, sizeFor, measureCtx ?? undefined) : null;
  const overlayTransform = overlayClip ? transformAt(overlayClip, playhead) : null;
  const pxPerUnit = project ? cssSize.w / project.settings.width : 1;
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; started: boolean } | null>(null);

  const onOverlayDown = (e: React.PointerEvent) => {
    if (!overlayClip) return;
    e.preventDefault();
    const tr = transformAt(overlayClip, useProjectStore.getState().playhead);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: tr.x, oy: tr.y, started: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onOverlayMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !overlayClip) return;
    const dx = (e.clientX - d.x) / pxPerUnit;
    const dy = (e.clientY - d.y) / pxPerUnit;
    if (!d.started) {
      if (Math.hypot(dx, dy) < 2) return;
      d.started = true;
      beginGesture();
    }
    const nx = Math.round(d.ox + dx);
    const ny = Math.round(d.oy + dy);
    const local = useProjectStore.getState().playhead - overlayClip.start;
    const tolerance = 0.5 / (project?.settings.fps ?? 30);
    updateClip<VisualClip>(
      overlayClip.id,
      (c) => {
        let keyframes = c.keyframes;
        const transform = { ...c.transform };
        if (hasKeyframes(c, 'x')) keyframes = withKeyframe(keyframes, 'x', local, nx, tolerance);
        else transform.x = nx;
        if (hasKeyframes(c, 'y')) keyframes = withKeyframe(keyframes, 'y', local, ny, tolerance);
        else transform.y = ny;
        return { transform, keyframes };
      },
      { history: false },
    );
  };
  const onOverlayUp = () => {
    dragRef.current = null;
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-ink-950" aria-label="Preview">
      <div ref={containerRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="relative shadow-2xl" style={{ width: cssSize.w, height: cssSize.h }}>
          <canvas ref={canvasRef} className="block h-full w-full bg-black" data-testid="preview-canvas" />
          {bounds && (
            <div
              role="button"
              aria-label="Move selected clip"
              tabIndex={-1}
              className="absolute cursor-move border border-accent-400 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
              style={{
                left: bounds.x * pxPerUnit,
                top: bounds.y * pxPerUnit,
                width: bounds.w * pxPerUnit,
                height: bounds.h * pxPerUnit,
                transform: `rotate(${overlayTransform?.rotation ?? 0}deg)`,
              }}
              onPointerDown={onOverlayDown}
              onPointerMove={onOverlayMove}
              onPointerUp={onOverlayUp}
              onPointerCancel={onOverlayUp}
            >
              {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((pos) => (
                <span key={pos} className={`absolute ${pos} h-2 w-2 rounded-sm border border-accent-400 bg-ink-900`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex h-11 shrink-0 items-center gap-2 border-t border-ink-700 bg-ink-900 px-3">
        <span className="w-[150px] font-mono text-xs tabular-nums text-ink-200" data-testid="time-display">
          {formatTime(playhead, { fps: project?.settings.fps })}
          <span className="text-ink-500"> / {formatTime(duration, { fps: project?.settings.fps })}</span>
        </span>
        <div className="mx-auto flex items-center gap-1">
          <IconButton label="Go to start (Home)" onClick={controls.goToStart}>
            <SkipBack className="h-4 w-4" />
          </IconButton>
          <IconButton label="Previous frame (←)" onClick={() => controls.stepFrames(-1)}>
            <StepBack className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="!h-9 !w-9 bg-ink-700 hover:bg-ink-600"
            onClick={controls.togglePlay}
            disabled={duration <= 0}
            data-testid="play-toggle"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
          </IconButton>
          <IconButton label="Next frame (→)" onClick={() => controls.stepFrames(1)}>
            <StepForward className="h-4 w-4" />
          </IconButton>
          <IconButton label="Go to end (End)" onClick={controls.goToEnd}>
            <SkipForward className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex w-[150px] items-center justify-end gap-2">
          <IconButton label={muted ? 'Unmute' : 'Mute'} size="sm" onClick={() => setMuted((m) => !m)}>
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </IconButton>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setMuted(false);
              setVolume(parseFloat(e.target.value));
            }}
            className="w-20"
            aria-label="Preview volume"
          />
        </div>
      </div>
    </section>
  );
}
