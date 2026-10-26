import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, XCircle } from 'lucide-react';
import { useProjectStore, selectDuration } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { LIMITS } from '@/config/limits';
import {
  EXPORT_PRESETS,
  RENDERERS,
  RenderCancelled,
  availableRenderers,
  downloadBlob,
  exportDimensions,
  type RenderProgress,
  type RenderResult,
  type Renderer,
} from '@/export';
import { audibleClips } from '@/engine/audioMix';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { formatBytes, formatDuration, formatTime } from '@/lib/time';

type Phase = 'idle' | 'running' | 'done' | 'error';

const PHASE_LABEL: Record<RenderProgress['phase'], string> = {
  preparing: 'Preparing',
  rendering: 'Rendering frames',
  audio: 'Mixing audio',
  muxing: 'Writing file',
  finalizing: 'Finishing',
};

export function ExportDialog() {
  const open = useUIStore((s) => s.exportOpen);
  const setOpen = useUIStore((s) => s.setExportOpen);
  const project = useProjectStore((s) => s.project);
  const duration = useProjectStore(selectDuration);
  const [presetId, setPresetId] = useState('1080p');
  const [rendererId, setRendererId] = useState('auto');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [available, setAvailable] = useState<Renderer[] | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void availableRenderers().then((r) => alive && setAvailable(r));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const preset = EXPORT_PRESETS.find((p) => p.id === presetId) ?? EXPORT_PRESETS[0];
  const dims = useMemo(
    () => (project ? exportDimensions(project.settings.width, project.settings.height, preset.shortSide) : { width: 0, height: 0 }),
    [project, preset],
  );
  const hasAudio = project ? audibleClips(project).length > 0 : false;
  const tooLong = duration > LIMITS.maxExportSeconds;
  const estimateBytes = ((preset.bitrate + (includeAudio && hasAudio ? 192_000 : 0)) * duration) / 8;

  const reset = () => {
    setPhase('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
  };

  const close = () => {
    if (phase === 'running') abortRef.current?.abort();
    reset();
    setOpen(false);
  };

  const start = async () => {
    if (!project || duration <= 0) return;
    const renderers = available ?? [];
    const renderer = rendererId === 'auto' ? renderers[0] : renderers.find((r) => r.id === rendererId);
    if (!renderer) {
      setError('No export engine is available in this browser.');
      setPhase('error');
      return;
    }
    reset();
    setPhase('running');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await renderer.render(project, {
        width: dims.width,
        height: dims.height,
        fps: project.settings.fps,
        startTime: 0,
        duration,
        videoBitrate: preset.bitrate,
        includeAudio: includeAudio && hasAudio,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(res);
      setResultUrl(URL.createObjectURL(res.blob));
      setPhase('done');
    } catch (e) {
      if (e instanceof RenderCancelled || controller.signal.aborted) {
        reset();
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  };

  const filename = `${(project?.name || 'export').replace(/[\\/:*?"<>|]+/g, '_')}.mp4`;

  return (
    <Modal open={open} onClose={close} title="Export video" closable={phase !== 'running'}>
      {phase === 'idle' || phase === 'error' ? (
        <div className="space-y-4" data-testid="export-form">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Resolution">
              <Select value={presetId} onChange={(e) => setPresetId(e.target.value)} data-testid="export-preset">
                {EXPORT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Engine">
              <Select value={rendererId} onChange={(e) => setRendererId(e.target.value)} data-testid="export-engine">
                <option value="auto">Automatic (fastest available)</option>
                {RENDERERS.map((r) => {
                  const ok = available?.some((a) => a.id === r.id) ?? false;
                  return (
                    <option key={r.id} value={r.id} disabled={!ok}>
                      {r.label}
                      {ok ? '' : ' – not available here'}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm">
            <div>
              <p className="font-medium">Include audio</p>
              <p className="text-xs text-ink-400">{hasAudio ? 'Mixes all unmuted audio and video clips.' : 'This project has no audible clips.'}</p>
            </div>
            <Toggle label="Include audio" checked={includeAudio && hasAudio} onChange={setIncludeAudio} disabled={!hasAudio} />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs text-ink-300">
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Output</dt>
              <dd className="font-medium text-ink-100">
                {dims.width}×{dims.height} · {project?.settings.fps} fps
              </dd>
            </div>
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Duration</dt>
              <dd className="font-medium text-ink-100">{formatTime(duration)}</dd>
            </div>
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Est. size</dt>
              <dd className="font-medium text-ink-100">~{formatBytes(estimateBytes)}</dd>
            </div>
          </dl>
          <p className="text-xs text-ink-400">
            H.264 MP4, rendered entirely on this computer. {available === null ? 'Checking available engines…' : available.length ? `Engine: ${rendererId === 'auto' ? available[0].label : available.find((a) => a.id === rendererId)?.label ?? '—'}.` : 'No engine available.'}
          </p>
          {tooLong && (
            <p className="rounded-md border border-amber-700/60 bg-amber-950/40 p-2 text-xs text-amber-200">
              Exports are limited to {formatDuration(LIMITS.maxExportSeconds)} per file. Trim the sequence to continue.
            </p>
          )}
          {phase === 'error' && (
            <p className="flex items-start gap-2 rounded-md border border-red-800 bg-red-950/50 p-3 text-sm text-red-200" role="alert" data-testid="export-error">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={() => void start()} disabled={duration <= 0 || tooLong || available === null || available.length === 0} data-testid="start-export">
              {phase === 'error' ? 'Try again' : 'Export MP4'}
            </Button>
          </div>
        </div>
      ) : phase === 'running' ? (
        <div className="space-y-4" data-testid="export-progress">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>{progress ? PHASE_LABEL[progress.phase] : 'Starting…'}</span>
              <span className="tabular-nums text-ink-300">{Math.round((progress?.fraction ?? 0) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full bg-accent-500 transition-[width] duration-150" style={{ width: `${Math.round((progress?.fraction ?? 0) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              {progress?.frame !== undefined && progress.totalFrames ? `Frame ${progress.frame} / ${progress.totalFrames}` : ''}
              {progress?.message ? ` ${progress.message}` : ''}
            </p>
          </div>
          <p className="text-xs text-ink-400">Keep this tab open while exporting. Rendering happens entirely in your browser.</p>
          <div className="flex justify-end">
            <Button variant="danger" onClick={() => abortRef.current?.abort()} data-testid="cancel-export">
              Cancel export
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="export-done">
          <div className="flex items-start gap-2 rounded-md border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Export complete</p>
              <p className="text-xs text-emerald-200/80">
                {result && `${result.width}×${result.height} · ${formatBytes(result.blob.size)} · ${result.elapsedSeconds.toFixed(1)}s · ${result.rendererId === 'webcodecs' ? 'WebCodecs' : 'FFmpeg.wasm'}`}
              </p>
            </div>
          </div>
          {resultUrl && <video src={resultUrl} controls className="max-h-64 w-full rounded-md bg-black" data-testid="export-preview" />}
          <div className="flex justify-end gap-2">
            <Button onClick={reset}>Export again</Button>
            <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => result && downloadBlob(result.blob, filename)} data-testid="download-export">
              Download {filename}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
