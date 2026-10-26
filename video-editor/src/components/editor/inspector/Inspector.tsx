import { useRef } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Diamond, Eye, EyeOff, FoldHorizontal, Italic, Lock, LockOpen, Plus, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import type {
  AspectRatio,
  AudibleClip,
  Clip,
  KeyframeProperty,
  TextAnimation,
  TextClip,
  TextPreset,
  Track,
  TransitionType,
  VideoClip,
  ImageClip,
  VisualClip,
} from '@/types/project';
import { hasAdjust, hasSpeed, isAudibleClip, isVisualClip } from '@/types/project';
import { ASPECT_PRESETS, clipEnd, defaultAdjust, defaultTransform, textStyleForPreset } from '@/model/project';
import { hasKeyframes, keyframeAt, previousAdjacentClip, transformAt, withKeyframe, withoutKeyframe } from '@/model/clipMath';
import { clamp } from '@/lib/time';
import { FILTER_PRESETS } from '@/engine/filters';
import { useProjectStore, selectSelectedClip, type CommitOpts } from '@/store/projectStore';
import { Section, Field } from '@/components/ui/Field';
import { Slider } from '@/components/ui/Slider';
import { Input, Select, TextArea } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { formatTime } from '@/lib/time';

const FONTS = ['Inter, Arial, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Times New Roman, serif', 'Courier New, monospace'];
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const TRANSITIONS_IN: { id: TransitionType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'crossfade', label: 'Crossfade (from previous clip)' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
];
const TRANSITIONS_OUT = TRANSITIONS_IN.filter((t) => t.id !== 'crossfade');
const ANIMATIONS: { id: TextAnimation; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide-up', label: 'Slide up' },
  { id: 'pop', label: 'Pop' },
  { id: 'typewriter', label: 'Typewriter' },
];

/** Groups rapid slider changes into one undo step. */
function useGesture(clipId: string) {
  const active = useRef(false);
  const beginGesture = useProjectStore((s) => s.beginGesture);
  const updateClip = useProjectStore((s) => s.updateClip);
  const update = <T extends Clip>(patch: Partial<T> | ((c: T) => Partial<T>)) => {
    const opts: CommitOpts = { history: false };
    if (!active.current) {
      beginGesture();
      active.current = true;
    }
    updateClip<T>(clipId, patch, opts);
  };
  const commit = () => {
    active.current = false;
  };
  return { update, commit };
}

export function Inspector() {
  const clip = useProjectStore(selectSelectedClip);
  const count = useProjectStore((s) => s.selectedClipIds.length);
  return (
    <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-ink-700 bg-ink-900" aria-label="Inspector" data-testid="inspector">
      {clip ? <ClipInspector clip={clip} /> : count > 1 ? <MultiSelection count={count} /> : <ProjectInspector />}
    </aside>
  );
}

function MultiSelection({ count }: { count: number }) {
  const del = useProjectStore((s) => s.deleteSelected);
  const dup = useProjectStore((s) => s.duplicateSelected);
  return (
    <div className="p-4 text-sm text-ink-300">
      <p>{count} clips selected</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={dup}>
          Duplicate
        </Button>
        <Button size="sm" variant="danger" onClick={del}>
          Delete
        </Button>
      </div>
    </div>
  );
}

function ClipInspector({ clip }: { clip: Clip }) {
  const updateClip = useProjectStore((s) => s.updateClip);
  const del = useProjectStore((s) => s.deleteSelected);
  const assets = useProjectStore((s) => s.project?.assets ?? []);
  const asset = 'assetId' in clip ? assets.find((a) => a.id === clip.assetId) : undefined;
  const labels: Record<Clip['kind'], string> = { video: 'Video clip', image: 'Image', audio: 'Audio clip', text: 'Text' };
  return (
    <div data-testid="clip-inspector" data-kind={clip.kind}>
      <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2.5">
        <span className={clsx('h-2.5 w-2.5 rounded-full', `bg-clip-${clip.kind}`)} />
        <div className="min-w-0 flex-1">
          <Input
            className="!border-transparent !bg-transparent !px-1 !py-0.5 text-sm font-medium hover:!border-ink-600"
            value={clip.name}
            onChange={(e) => updateClip(clip.id, { name: e.target.value }, { history: false })}
            aria-label="Clip name"
          />
          <p className="px-1 text-[11px] text-ink-400">
            {labels[clip.kind]} · {formatTime(clip.start)} → {formatTime(clipEnd(clip))} ({clip.duration.toFixed(2)}s)
          </p>
        </div>
        <IconButton label="Delete clip" size="sm" className="text-red-300" onClick={del}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
      {clip.kind === 'text' && <TextSection clip={clip} />}
      {isVisualClip(clip) && <TransformSection clip={clip} />}
      {hasAdjust(clip) && <AdjustSection clip={clip} />}
      {hasSpeed(clip) && <SpeedSection clip={clip} />}
      {isAudibleClip(clip) && (clip.kind === 'audio' || asset?.hasAudio !== false) && <AudioSection clip={clip} />}
      {isVisualClip(clip) && <TransitionSection clip={clip} />}
    </div>
  );
}

function TransformSection({ clip }: { clip: VisualClip }) {
  const { update, commit } = useGesture(clip.id);
  const updateClip = useProjectStore((s) => s.updateClip);
  const W = useProjectStore((s) => s.project?.settings.width ?? 1920);
  const H = useProjectStore((s) => s.project?.settings.height ?? 1080);
  const fps = useProjectStore((s) => s.project?.settings.fps ?? 30);
  const playhead = useProjectStore((s) => s.playhead);
  const local = clamp(playhead - clip.start, 0, clip.duration);
  const tolerance = 0.5 / fps;
  // Values shown are the animated values at the playhead.
  const t = transformAt(clip, clip.start + local);
  const set = (prop: KeyframeProperty, v: number) =>
    update<VisualClip>((c) =>
      hasKeyframes(c, prop)
        ? { keyframes: withKeyframe(c.keyframes, prop, local, v, tolerance) }
        : { transform: { ...c.transform, [prop]: v } },
    );
  const toggleKeyframe = (prop: KeyframeProperty) => {
    updateClip<VisualClip>(clip.id, (c) => {
      const existing = keyframeAt(c.keyframes, prop, local, tolerance);
      if (existing) return { keyframes: withoutKeyframe(c.keyframes, prop, local, tolerance) };
      return { keyframes: withKeyframe(c.keyframes, prop, local, transformAt(c, c.start + local)[prop], tolerance) };
    });
  };
  const kfButton = (prop: KeyframeProperty, label: string) => {
    const has = hasKeyframes(clip, prop);
    const at = Boolean(keyframeAt(clip.keyframes, prop, local, tolerance));
    return (
      <button
        type="button"
        onClick={() => toggleKeyframe(prop)}
        title={at ? `Remove ${label} keyframe at the playhead` : `Add ${label} keyframe at the playhead`}
        aria-label={`${label} keyframe`}
        aria-pressed={at}
        className={clsx('flex h-5 w-5 shrink-0 items-center justify-center rounded', at ? 'text-accent-400' : has ? 'text-accent-400/60' : 'text-ink-500 hover:text-ink-200')}
        data-testid={`kf-${prop}`}
      >
        <Diamond className="h-3 w-3" fill={at ? 'currentColor' : 'none'} />
      </button>
    );
  };
  return (
    <Section
      title="Transform"
      actions={
        <IconButton label="Reset transform and keyframes" size="sm" onClick={() => updateClip<VisualClip>(clip.id, { transform: defaultTransform(), keyframes: undefined })}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      }
    >
      <Slider leading={kfButton('x', 'Position X')} label="Position X" value={t.x} min={-W} max={W} step={1} decimals={0} unit="px" onChange={(v) => set('x', v)} onCommit={commit} />
      <Slider leading={kfButton('y', 'Position Y')} label="Position Y" value={t.y} min={-H} max={H} step={1} decimals={0} unit="px" onChange={(v) => set('y', v)} onCommit={commit} />
      <Slider leading={kfButton('scale', 'Scale')} label="Scale" value={t.scale} min={0.05} max={4} step={0.01} onChange={(v) => set('scale', v)} onCommit={commit} />
      <Slider leading={kfButton('rotation', 'Rotation')} label="Rotation" value={t.rotation} min={-180} max={180} step={1} decimals={0} unit="°" onChange={(v) => set('rotation', v)} onCommit={commit} />
      <Slider leading={kfButton('opacity', 'Opacity')} label="Opacity" value={t.opacity} min={0} max={1} step={0.01} onChange={(v) => set('opacity', v)} onCommit={commit} />
      <p className="text-[11px] text-ink-400">
        Click a diamond to add a keyframe at the playhead. Once a property has keyframes, changing it at another time adds a keyframe there and the value animates between them.
      </p>
    </Section>
  );
}

function AdjustSection({ clip }: { clip: VideoClip | ImageClip }) {
  const { update, commit } = useGesture(clip.id);
  const updateClip = useProjectStore((s) => s.updateClip);
  const set = (patch: Partial<VideoClip['adjust']>) => update<VideoClip | ImageClip>((c) => ({ adjust: { ...c.adjust, ...patch } }));
  const a = clip.adjust;
  return (
    <Section
      title="Adjust & filters"
      actions={
        <IconButton label="Reset adjustments" size="sm" onClick={() => updateClip<VideoClip | ImageClip>(clip.id, { adjust: defaultAdjust() })}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      }
    >
      <Slider label="Brightness" value={a.brightness} min={0} max={2} onChange={(v) => set({ brightness: v })} onCommit={commit} />
      <Slider label="Contrast" value={a.contrast} min={0} max={2} onChange={(v) => set({ contrast: v })} onCommit={commit} />
      <Slider label="Saturation" value={a.saturation} min={0} max={2} onChange={(v) => set({ saturation: v })} onCommit={commit} />
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => updateClip<VideoClip | ImageClip>(clip.id, { adjust: { ...a, preset: p.id } })}
            className={clsx(
              'rounded-md border px-1 py-1.5 text-[11px] transition-colors',
              a.preset === p.id ? 'border-accent-500 bg-accent-500/15 text-ink-100' : 'border-ink-600 text-ink-300 hover:border-ink-500',
            )}
            data-testid={`filter-${p.id}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function SpeedSection({ clip }: { clip: VideoClip | AudibleClip }) {
  const setClipSpeed = useProjectStore((s) => s.setClipSpeed);
  const speed = 'speed' in clip ? clip.speed : 1;
  return (
    <Section title="Speed">
      <div className="flex flex-wrap gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setClipSpeed(clip.id, s)}
            className={clsx(
              'rounded-md border px-2 py-1 text-xs tabular-nums transition-colors',
              Math.abs(speed - s) < 1e-6 ? 'border-accent-500 bg-accent-500/15 text-ink-100' : 'border-ink-600 text-ink-300 hover:border-ink-500',
            )}
            data-testid={`speed-${s}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-400">Changing speed shortens or lengthens the clip on the timeline.</p>
    </Section>
  );
}

function AudioSection({ clip }: { clip: AudibleClip }) {
  const { update, commit } = useGesture(clip.id);
  const updateClip = useProjectStore((s) => s.updateClip);
  const set = (patch: Partial<AudibleClip['audio']>) => update<AudibleClip>((c) => ({ audio: { ...c.audio, ...patch } }));
  const a = clip.audio;
  const maxFade = Math.max(0.1, Math.min(10, clip.duration / 2));
  return (
    <Section
      title="Audio"
      actions={
        <IconButton label={a.muted ? 'Unmute clip' : 'Mute clip'} size="sm" active={a.muted} onClick={() => updateClip<AudibleClip>(clip.id, { audio: { ...a, muted: !a.muted } })} data-testid="clip-mute">
          {a.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </IconButton>
      }
    >
      <Slider label="Volume" value={a.volume} min={0} max={2} step={0.01} onChange={(v) => set({ volume: v })} onCommit={commit} disabled={a.muted} />
      <Slider label="Fade in" value={a.fadeIn} min={0} max={maxFade} step={0.05} unit="s" onChange={(v) => set({ fadeIn: v })} onCommit={commit} disabled={a.muted} />
      <Slider label="Fade out" value={a.fadeOut} min={0} max={maxFade} step={0.05} unit="s" onChange={(v) => set({ fadeOut: v })} onCommit={commit} disabled={a.muted} />
    </Section>
  );
}

function TransitionSection({ clip }: { clip: VisualClip }) {
  const { update, commit } = useGesture(clip.id);
  const updateClip = useProjectStore((s) => s.updateClip);
  const project = useProjectStore((s) => s.project);
  const hasPrev = project ? Boolean(previousAdjacentClip(project, clip)) : false;
  const maxDur = Math.max(0.1, Math.min(3, clip.duration));
  return (
    <Section title="Transitions">
      <Field label="In">
        <Select
          value={clip.transitionIn.type}
          onChange={(e) => updateClip<VisualClip>(clip.id, { transitionIn: { ...clip.transitionIn, type: e.target.value as TransitionType } })}
          data-testid="transition-in"
        >
          {TRANSITIONS_IN.map((t) => (
            <option key={t.id} value={t.id} disabled={t.id === 'crossfade' && !hasPrev}>
              {t.label}
              {t.id === 'crossfade' && !hasPrev ? ' – needs an adjacent clip' : ''}
            </option>
          ))}
        </Select>
      </Field>
      {clip.transitionIn.type !== 'none' && (
        <Slider label="Duration" value={clip.transitionIn.duration} min={0.1} max={maxDur} step={0.05} unit="s" onChange={(v) => update<VisualClip>((c) => ({ transitionIn: { ...c.transitionIn, duration: v } }))} onCommit={commit} />
      )}
      <Field label="Out">
        <Select
          value={clip.transitionOut.type}
          onChange={(e) => updateClip<VisualClip>(clip.id, { transitionOut: { ...clip.transitionOut, type: e.target.value as TransitionType } })}
          data-testid="transition-out"
        >
          {TRANSITIONS_OUT.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      {clip.transitionOut.type !== 'none' && (
        <Slider label="Duration" value={clip.transitionOut.duration} min={0.1} max={maxDur} step={0.05} unit="s" onChange={(v) => update<VisualClip>((c) => ({ transitionOut: { ...c.transitionOut, duration: v } }))} onCommit={commit} />
      )}
    </Section>
  );
}

function TextSection({ clip }: { clip: TextClip }) {
  const { update, commit } = useGesture(clip.id);
  const updateClip = useProjectStore((s) => s.updateClip);
  const settings = useProjectStore((s) => s.project!.settings);
  const st = clip.style;
  const setStyle = (patch: Partial<TextClip['style']>, history = true) =>
    history ? updateClip<TextClip>(clip.id, { style: { ...st, ...patch } }) : update<TextClip>((c) => ({ style: { ...c.style, ...patch } }));
  return (
    <Section title="Text">
      <TextArea
        value={clip.text}
        onChange={(e) => updateClip<TextClip>(clip.id, { text: e.target.value }, { history: false })}
        onBlur={() => useProjectStore.getState().beginGesture()}
        aria-label="Text content"
        data-testid="text-content"
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Style preset">
          <Select
            value={clip.preset}
            onChange={(e) => {
              const preset = e.target.value as TextPreset;
              updateClip<TextClip>(clip.id, { preset, style: textStyleForPreset(preset, settings) });
            }}
          >
            <option value="title">Title</option>
            <option value="subtitle">Subtitle</option>
            <option value="body">Text</option>
          </Select>
        </Field>
        <Field label="Animation">
          <Select value={clip.animation} onChange={(e) => updateClip<TextClip>(clip.id, { animation: e.target.value as TextAnimation })} data-testid="text-animation">
            {ANIMATIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Font">
        <Select value={st.fontFamily} onChange={(e) => setStyle({ fontFamily: e.target.value })}>
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f.split(',')[0]}
            </option>
          ))}
        </Select>
      </Field>
      <Slider label="Size" value={st.fontSize} min={8} max={Math.round(Math.min(settings.width, settings.height) * 0.4)} step={1} decimals={0} unit="px" onChange={(v) => setStyle({ fontSize: v }, false)} onCommit={commit} />
      <div className="flex items-center gap-1.5">
        <IconButton label="Bold" size="sm" active={st.bold} onClick={() => setStyle({ bold: !st.bold })}>
          <Bold className="h-4 w-4" />
        </IconButton>
        <IconButton label="Italic" size="sm" active={st.italic} onClick={() => setStyle({ italic: !st.italic })}>
          <Italic className="h-4 w-4" />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        {(['left', 'center', 'right'] as const).map((a) => {
          const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
          return (
            <IconButton key={a} label={`Align ${a}`} size="sm" active={st.align === a} onClick={() => setStyle({ align: a })}>
              <Icon className="h-4 w-4" />
            </IconButton>
          );
        })}
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <label className="flex items-center gap-1.5 text-xs text-ink-300">
          Colour
          <input type="color" value={st.color} onChange={(e) => setStyle({ color: e.target.value }, false)} onBlur={commit} aria-label="Text colour" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-300">Background box</span>
        <div className="flex items-center gap-2">
          <input type="color" value={st.background || '#000000'} disabled={!st.background} onChange={(e) => setStyle({ background: e.target.value }, false)} onBlur={commit} aria-label="Background colour" />
          <Toggle label="Background box" checked={Boolean(st.background)} onChange={(v) => setStyle({ background: v ? '#000000' : '' })} />
        </div>
      </div>
      {st.background && <Slider label="Box opacity" value={st.backgroundOpacity} min={0} max={1} onChange={(v) => setStyle({ backgroundOpacity: v }, false)} onCommit={commit} />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-300">Outline</span>
        <div className="flex items-center gap-2">
          <input type="color" value={st.stroke || '#000000'} disabled={!st.stroke} onChange={(e) => setStyle({ stroke: e.target.value }, false)} onBlur={commit} aria-label="Outline colour" />
          <Toggle label="Outline" checked={Boolean(st.stroke)} onChange={(v) => setStyle({ stroke: v ? '#000000' : '', strokeWidth: v ? Math.max(1, st.strokeWidth || 3) : 0 })} />
        </div>
      </div>
      {st.stroke && <Slider label="Outline width" value={st.strokeWidth} min={1} max={40} step={1} decimals={0} unit="px" onChange={(v) => setStyle({ strokeWidth: v }, false)} onCommit={commit} />}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-300">Drop shadow</span>
        <Toggle label="Drop shadow" checked={st.shadow} onChange={(v) => setStyle({ shadow: v })} />
      </div>
      <Slider label="Max width" value={st.maxWidth} min={0.2} max={1} step={0.05} onChange={(v) => setStyle({ maxWidth: v }, false)} onCommit={commit} />
    </Section>
  );
}

function ProjectInspector() {
  const project = useProjectStore((s) => s.project!);
  const rename = useProjectStore((s) => s.rename);
  const setAspect = useProjectStore((s) => s.setAspect);
  const setFps = useProjectStore((s) => s.setFps);
  const setBackground = useProjectStore((s) => s.setBackground);
  const addTrack = useProjectStore((s) => s.addTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const closeGaps = useProjectStore((s) => s.closeGaps);
  return (
    <div data-testid="project-inspector">
      <Section title="Project">
        <Field label="Name">
          <Input value={project.name} onChange={(e) => rename(e.target.value)} />
        </Field>
        <div>
          <span className="label mb-1 block">Aspect ratio</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAspect(a)}
                className={clsx(
                  'rounded-md border px-2 py-1.5 text-xs transition-colors',
                  project.settings.aspect === a ? 'border-accent-500 bg-accent-500/15 text-ink-100' : 'border-ink-600 text-ink-300 hover:border-ink-500',
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            {project.settings.width}×{project.settings.height}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Frame rate">
            <Select value={project.settings.fps} onChange={(e) => setFps(Number(e.target.value))}>
              {[24, 25, 30, 50, 60].map((f) => (
                <option key={f} value={f}>
                  {f} fps
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Background">
            <input type="color" value={project.settings.background} onChange={(e) => setBackground(e.target.value)} aria-label="Background colour" className="!h-9 !w-full" />
          </Field>
        </div>
      </Section>
      <Section
        title="Tracks"
        actions={
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addTrack('video')} data-testid="add-video-track">
              Video
            </Button>
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addTrack('audio')} data-testid="add-audio-track">
              Audio
            </Button>
          </div>
        }
      >
        <ul className="space-y-1">
          {project.tracks.map((t) => (
            <TrackRowItem key={t.id} track={t} onUpdate={(p) => updateTrack(t.id, p)} onRemove={() => removeTrack(t.id)} onCloseGaps={() => closeGaps([t.id])} canRemove={project.tracks.filter((x) => x.kind === t.kind).length > 1} />
          ))}
        </ul>
      </Section>
      <div className="px-3 py-3 text-[11px] leading-relaxed text-ink-400">
        Select a clip on the timeline to edit its transform, filters, speed, audio and transitions. Drag clips to move them; drag their edges to trim.
      </div>
    </div>
  );
}

function TrackRowItem({ track, onUpdate, onRemove, onCloseGaps, canRemove }: { track: Track; onUpdate: (p: Partial<Track>) => void; onRemove: () => void; onCloseGaps: () => void; canRemove: boolean }) {
  return (
    <li className="flex items-center gap-1 rounded-md border border-ink-700 bg-ink-850 px-2 py-1">
      <Input className="!border-transparent !bg-transparent !px-1 !py-0.5 text-xs" value={track.name} onChange={(e) => onUpdate({ name: e.target.value })} aria-label="Track name" />
      {track.kind === 'video' && (
        <IconButton label={track.hidden ? 'Show track' : 'Hide track'} size="sm" active={track.hidden} onClick={() => onUpdate({ hidden: !track.hidden })}>
          {track.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </IconButton>
      )}
      <IconButton label={track.muted ? 'Unmute track' : 'Mute track'} size="sm" active={track.muted} onClick={() => onUpdate({ muted: !track.muted })}>
        {track.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </IconButton>
      <IconButton label={track.locked ? 'Unlock track' : 'Lock track'} size="sm" active={track.locked} onClick={() => onUpdate({ locked: !track.locked })}>
        {track.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </IconButton>
      <IconButton label="Close gaps on this track" size="sm" disabled={track.locked} onClick={onCloseGaps}>
        <FoldHorizontal className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Remove track" size="sm" className="text-red-300" disabled={!canRemove} onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </li>
  );
}
