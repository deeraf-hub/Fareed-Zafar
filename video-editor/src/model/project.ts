import type {
  AspectRatio,
  AudioClip,
  AudioProps,
  Clip,
  ColorAdjust,
  ImageClip,
  MediaAsset,
  Project,
  ProjectSettings,
  ProjectSummary,
  TextClip,
  TextPreset,
  TextStyle,
  Track,
  Transform,
  Transition,
  VideoClip,
} from '@/types/project';
import { newId } from '@/lib/id';

export const ASPECT_PRESETS: Record<AspectRatio, { width: number; height: number; label: string; hint: string }> = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape 16:9', hint: 'YouTube, presentations' },
  '9:16': { width: 1080, height: 1920, label: 'Portrait 9:16', hint: 'Reels, TikTok, Shorts' },
  '1:1': { width: 1080, height: 1080, label: 'Square 1:1', hint: 'Instagram feed' },
};

export const DEFAULT_FPS = 30;

export function defaultTransform(): Transform {
  return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
}

export function defaultAdjust(): ColorAdjust {
  return { brightness: 1, contrast: 1, saturation: 1, preset: 'none' };
}

export function noTransition(): Transition {
  return { type: 'none', duration: 0.5 };
}

export function defaultAudio(): AudioProps {
  return { volume: 1, fadeIn: 0, fadeOut: 0, muted: false };
}

export function makeSettings(aspect: AspectRatio, fps = DEFAULT_FPS): ProjectSettings {
  const p = ASPECT_PRESETS[aspect];
  return { aspect, width: p.width, height: p.height, fps, background: '#000000' };
}

export function makeTrack(kind: Track['kind'], name: string): Track {
  return { id: newId('trk'), kind, name, muted: false, hidden: false, locked: false };
}

export function createProject(name: string, aspect: AspectRatio = '16:9'): Project {
  const now = Date.now();
  return {
    id: newId('prj'),
    version: 1,
    name: name.trim() || 'Untitled project',
    settings: makeSettings(aspect),
    assets: [],
    tracks: [makeTrack('video', 'Overlay'), makeTrack('video', 'Video 1'), makeTrack('audio', 'Audio 1')],
    clips: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function textStyleForPreset(preset: TextPreset, settings: ProjectSettings): TextStyle {
  const base = Math.min(settings.width, settings.height);
  switch (preset) {
    case 'title':
      return {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: Math.round(base * 0.1),
        color: '#ffffff',
        bold: true,
        italic: false,
        align: 'center',
        background: '',
        backgroundOpacity: 0.6,
        stroke: '',
        strokeWidth: 0,
        shadow: true,
        maxWidth: 0.85,
        lineHeight: 1.15,
      };
    case 'subtitle':
      return {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: Math.round(base * 0.05),
        color: '#ffffff',
        bold: false,
        italic: false,
        align: 'center',
        background: '#000000',
        backgroundOpacity: 0.55,
        stroke: '',
        strokeWidth: 0,
        shadow: false,
        maxWidth: 0.8,
        lineHeight: 1.25,
      };
    default:
      return {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: Math.round(base * 0.06),
        color: '#ffffff',
        bold: false,
        italic: false,
        align: 'center',
        background: '',
        backgroundOpacity: 0.6,
        stroke: '#000000',
        strokeWidth: Math.max(1, Math.round(base * 0.003)),
        shadow: false,
        maxWidth: 0.8,
        lineHeight: 1.2,
      };
  }
}

export function makeTextClip(
  trackId: string,
  start: number,
  preset: TextPreset,
  settings: ProjectSettings,
  text?: string,
): TextClip {
  const transform = defaultTransform();
  if (preset === 'subtitle') transform.y = Math.round(settings.height * 0.38);
  const labels: Record<TextPreset, string> = { title: 'Title', subtitle: 'Subtitle', body: 'Text' };
  return {
    id: newId('clip'),
    kind: 'text',
    trackId,
    name: labels[preset],
    start,
    duration: preset === 'subtitle' ? 3 : 4,
    text: text ?? (preset === 'title' ? 'Your title' : preset === 'subtitle' ? 'Subtitle text' : 'Add text'),
    preset,
    style: textStyleForPreset(preset, settings),
    animation: preset === 'title' ? 'fade' : 'none',
    transform,
    transitionIn: noTransition(),
    transitionOut: noTransition(),
  };
}

export function makeClipFromAsset(asset: MediaAsset, trackId: string, start: number): Clip {
  const common = { id: newId('clip'), trackId, name: asset.name, start };
  if (asset.kind === 'video') {
    const clip: VideoClip = {
      ...common,
      kind: 'video',
      assetId: asset.id,
      duration: asset.duration,
      trimStart: 0,
      speed: 1,
      transform: defaultTransform(),
      adjust: defaultAdjust(),
      transitionIn: noTransition(),
      transitionOut: noTransition(),
      audio: defaultAudio(),
    };
    return clip;
  }
  if (asset.kind === 'audio') {
    const clip: AudioClip = {
      ...common,
      kind: 'audio',
      assetId: asset.id,
      duration: asset.duration,
      trimStart: 0,
      speed: 1,
      audio: defaultAudio(),
    };
    return clip;
  }
  const clip: ImageClip = {
    ...common,
    kind: 'image',
    assetId: asset.id,
    duration: 5,
    transform: defaultTransform(),
    adjust: defaultAdjust(),
    transitionIn: noTransition(),
    transitionOut: noTransition(),
  };
  return clip;
}

export function clipEnd(clip: Pick<Clip, 'start' | 'duration'>): number {
  return clip.start + clip.duration;
}

export function sequenceDuration(clips: Clip[]): number {
  let end = 0;
  for (const c of clips) end = Math.max(end, clipEnd(c));
  return end;
}

export function summarize(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    aspect: project.settings.aspect,
    durationSeconds: sequenceDuration(project.clips),
    clipCount: project.clips.length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/** Change aspect ratio while keeping fps/background; clip transforms are kept as-is. */
export function withAspect(project: Project, aspect: AspectRatio): Project {
  const p = ASPECT_PRESETS[aspect];
  return {
    ...project,
    settings: { ...project.settings, aspect, width: p.width, height: p.height },
  };
}

/**
 * Validate and normalise a project loaded from storage. Throws on
 * structurally invalid data; fills in defaults for optional fields so older
 * saves keep opening.
 */
export function normalizeProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new Error('Project data is not an object');
  const p = raw as Partial<Project>;
  if (typeof p.id !== 'string' || !p.settings || !Array.isArray(p.tracks) || !Array.isArray(p.clips)) {
    throw new Error('Project data is missing required fields');
  }
  const aspect: AspectRatio = (['16:9', '9:16', '1:1'] as AspectRatio[]).includes(p.settings.aspect)
    ? p.settings.aspect
    : '16:9';
  const settings: ProjectSettings = {
    ...makeSettings(aspect, p.settings.fps || DEFAULT_FPS),
    ...p.settings,
    aspect,
  };
  const clips = p.clips.map((c) => normalizeClip(c, settings));
  return {
    id: p.id,
    version: 1,
    name: typeof p.name === 'string' ? p.name : 'Untitled project',
    settings,
    assets: Array.isArray(p.assets) ? p.assets : [],
    tracks: p.tracks,
    clips,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
  };
}

function normalizeClip(c: Clip, settings: ProjectSettings): Clip {
  switch (c.kind) {
    case 'video':
      return {
        ...c,
        trimStart: c.trimStart ?? 0,
        speed: c.speed || 1,
        transform: { ...defaultTransform(), ...c.transform },
        adjust: { ...defaultAdjust(), ...c.adjust },
        transitionIn: c.transitionIn ?? noTransition(),
        transitionOut: c.transitionOut ?? noTransition(),
        audio: { ...defaultAudio(), ...c.audio },
      };
    case 'image':
      return {
        ...c,
        transform: { ...defaultTransform(), ...c.transform },
        adjust: { ...defaultAdjust(), ...c.adjust },
        transitionIn: c.transitionIn ?? noTransition(),
        transitionOut: c.transitionOut ?? noTransition(),
      };
    case 'audio':
      return { ...c, trimStart: c.trimStart ?? 0, speed: c.speed || 1, audio: { ...defaultAudio(), ...c.audio } };
    case 'text':
      return {
        ...c,
        preset: c.preset ?? 'body',
        style: { ...textStyleForPreset(c.preset ?? 'body', settings), ...c.style },
        animation: c.animation ?? 'none',
        transform: { ...defaultTransform(), ...c.transform },
        transitionIn: c.transitionIn ?? noTransition(),
        transitionOut: c.transitionOut ?? noTransition(),
      };
    default:
      throw new Error(`Unknown clip kind ${(c as Clip).kind}`);
  }
}
