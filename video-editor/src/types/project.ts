/**
 * Core project model. Everything in here is plain JSON-serialisable data:
 * this is exactly what gets persisted (IndexedDB locally, Supabase in the
 * cloud). Media *content* is never part of a project; assets only reference
 * the file by id/name/size.
 */

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type MediaKind = 'video' | 'audio' | 'image';
export type ClipKind = 'video' | 'audio' | 'image' | 'text';
export type TrackKind = 'video' | 'audio';

export interface ProjectSettings {
  aspect: AspectRatio;
  width: number;
  height: number;
  fps: number;
  /** CSS colour drawn behind every frame. */
  background: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  /** Seconds. 0 for images. */
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Small JPEG data URL used in the library and on timeline clips. */
  thumbnail?: string;
  /** Normalised peak values (0..1) sampled evenly across the file. */
  waveform?: number[];
  addedAt: number;
}

export interface Transform {
  /** Offset from canvas centre, in project pixels. */
  x: number;
  y: number;
  /** 1 = fit inside the frame (contain). */
  scale: number;
  /** Degrees. */
  rotation: number;
  /** 0..1 */
  opacity: number;
}

export type FilterPreset =
  | 'none'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'noir'
  | 'faded'
  | 'cinematic'
  | 'sunset'
  | 'cyber'
  | 'pastel'
  | 'dramatic'
  | 'chrome';

export interface ColorAdjust {
  /** 1 = unchanged. Range 0..2 */
  brightness: number;
  contrast: number;
  saturation: number;
  /** Degrees, -180..180. */
  hue: number;
  /** Blur radius in project pixels (0 = off). */
  blur: number;
  /** Edge darkening strength 0..1. */
  vignette: number;
  /** Film grain strength 0..1. */
  grain: number;
  preset: FilterPreset;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'push'
  | 'wipe'
  | 'wipe-left'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'spin'
  | 'flip'
  | 'circle'
  | 'blinds'
  | 'blocks'
  | 'clock'
  | 'blur'
  | 'flash';

export type MotionInOut =
  | 'none'
  | 'fade'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'spin'
  | 'bounce'
  | 'flip'
  | 'drop';

export type MotionLoop =
  | 'none'
  | 'ken-burns'
  | 'ken-burns-out'
  | 'pan-left'
  | 'pan-right'
  | 'pulse'
  | 'shake'
  | 'float'
  | 'spin'
  | 'swing'
  | 'flicker';

/** Per-clip motion presets, layered on top of the transform and keyframes. */
export interface Motion {
  in: MotionInOut;
  /** Seconds. */
  inDuration: number;
  out: MotionInOut;
  outDuration: number;
  loop: MotionLoop;
  /** Cycles per second for oscillating loops; multiplier for spins. */
  loopSpeed: number;
  /** 0..1 */
  loopStrength: number;
}

export interface Transition {
  type: TransitionType;
  /** Seconds. */
  duration: number;
}

export interface AudioProps {
  /** Linear gain, 0..2. */
  volume: number;
  /** Seconds. */
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
}

export type TextPreset = 'title' | 'subtitle' | 'body';
export type TextAnimation = 'none' | 'fade' | 'slide-up' | 'pop' | 'typewriter';

export interface TextStyle {
  fontFamily: string;
  /** Pixels in project space. */
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  /** Background box behind the text; empty string disables it. */
  background: string;
  backgroundOpacity: number;
  /** Outline colour; empty string disables it. */
  stroke: string;
  strokeWidth: number;
  shadow: boolean;
  /** Fraction of project width used for word wrapping. */
  maxWidth: number;
  lineHeight: number;
}

interface ClipBase {
  id: string;
  trackId: string;
  name: string;
  /** Timeline position, seconds. */
  start: number;
  /** Timeline length, seconds (already divided by speed for media clips). */
  duration: number;
}

export type KeyframeProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

export interface Keyframe {
  /** Seconds from the clip's start on the timeline. */
  time: number;
  value: number;
}

export type Keyframes = Partial<Record<KeyframeProperty, Keyframe[]>>;

export interface VisualProps {
  transform: Transform;
  transitionIn: Transition;
  transitionOut: Transition;
  /** Per-property keyframes; a property without keyframes uses `transform`. */
  keyframes?: Keyframes;
  motion?: Motion;
}

export interface VideoClip extends ClipBase, VisualProps {
  kind: 'video';
  assetId: string;
  /** Source offset in seconds. */
  trimStart: number;
  /** Playback rate; source seconds consumed per timeline second. */
  speed: number;
  adjust: ColorAdjust;
  audio: AudioProps;
}

export interface ImageClip extends ClipBase, VisualProps {
  kind: 'image';
  assetId: string;
  adjust: ColorAdjust;
}

export interface AudioClip extends ClipBase {
  kind: 'audio';
  assetId: string;
  trimStart: number;
  speed: number;
  audio: AudioProps;
}

export interface TextClip extends ClipBase, VisualProps {
  kind: 'text';
  text: string;
  preset: TextPreset;
  style: TextStyle;
  animation: TextAnimation;
}

export type Clip = VideoClip | ImageClip | AudioClip | TextClip;
export type VisualClip = VideoClip | ImageClip | TextClip;
export type MediaClip = VideoClip | ImageClip | AudioClip;
export type AudibleClip = VideoClip | AudioClip;

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface Project {
  id: string;
  /** Schema version for future migrations. */
  version: 1;
  name: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  /**
   * Ordered top-to-bottom as displayed. Video tracks render in reverse
   * order (the first video track is the top-most layer).
   */
  tracks: Track[];
  clips: Clip[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  aspect: AspectRatio;
  durationSeconds: number;
  clipCount: number;
  createdAt: number;
  updatedAt: number;
}

export function isVisualClip(clip: Clip): clip is VisualClip {
  return clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'text';
}

export function isMediaClip(clip: Clip): clip is MediaClip {
  return clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'audio';
}

export function isAudibleClip(clip: Clip): clip is AudibleClip {
  return clip.kind === 'video' || clip.kind === 'audio';
}

export function hasAdjust(clip: Clip): clip is VideoClip | ImageClip {
  return clip.kind === 'video' || clip.kind === 'image';
}

export function hasSpeed(clip: Clip): clip is VideoClip | AudioClip {
  return clip.kind === 'video' || clip.kind === 'audio';
}
