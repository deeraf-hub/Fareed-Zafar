import type { Project } from '@/types/project';

/**
 * Rendering abstraction. Today both implementations run entirely in the
 * browser; a server-side renderer can implement the same interface later
 * (upload project JSON + media, poll progress, download the file).
 */
export type RenderPhase = 'preparing' | 'rendering' | 'audio' | 'muxing' | 'finalizing';

export type ExportFormat = 'mp4' | 'webm' | 'gif';

export interface FormatInfo {
  label: string;
  mimeType: string;
  extension: string;
  /** Whether the container carries audio. */
  audio: boolean;
  /** Hard cap for this format (GIFs get big fast). */
  maxSeconds?: number;
  /** Forced frame rate, if the format wants one. */
  fps?: number;
}

export const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  mp4: { label: 'MP4 · H.264 + AAC', mimeType: 'video/mp4', extension: 'mp4', audio: true },
  webm: { label: 'WebM · VP9 + Opus', mimeType: 'video/webm', extension: 'webm', audio: true },
  gif: { label: 'GIF · animated, no audio', mimeType: 'image/gif', extension: 'gif', audio: false, maxSeconds: 30, fps: 15 },
};

export interface RenderProgress {
  phase: RenderPhase;
  /** 0..1 overall. */
  fraction: number;
  /** Frames rendered so far (rendering phase). */
  frame?: number;
  totalFrames?: number;
  message?: string;
}

export interface RenderOptions {
  format: ExportFormat;
  width: number;
  height: number;
  fps: number;
  /** Timeline range to export. */
  startTime: number;
  duration: number;
  /** Target video bitrate in bits per second. */
  videoBitrate: number;
  includeAudio: boolean;
  signal: AbortSignal;
  onProgress: (progress: RenderProgress) => void;
}

export interface RenderResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number;
  rendererId: string;
  /** Wall-clock seconds the render took. */
  elapsedSeconds: number;
}

export interface Renderer {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  isSupported(): Promise<boolean>;
  supportsFormat(format: ExportFormat): Promise<boolean>;
  render(project: Project, options: RenderOptions): Promise<RenderResult>;
}

export class RenderCancelled extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'RenderCancelled';
  }
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new RenderCancelled();
}
