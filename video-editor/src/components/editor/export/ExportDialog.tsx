import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useProjectStore, selectDuration } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { LIMITS } from '@/config/limits';
import {
  EXPORT_PRESETS,
  FORMAT_INFO,
  RENDERERS,
  RenderCancelled,
  availableRenderers,
  downloadBlob,
  exportDimensions,
  type ExportFormat,
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
import { formatBytes, formatDuration, formatTime, roundTo } from '@/lib/time';

type Phase = 'idle' | 'running' | 'done' | 'error';

const PHASE_LABEL: Record<RenderProgress['phase'], string> = {
  preparing: 'Preparing',
  rendering: 'Rendering frames',
  audio: 'Mixing audio',
  muxing: 'Writing file',
  finalizing: 'Finishing',
};

const FORMATS = Object.keys(FORMAT_INFO) as ExportFormat[];

export function ExportDialog() {
  const open = useUIStore((s) => s.exportOpen);
  const setOpen = useUIStore((s) => s.setExportOpen);
  const project = useProjectStore((s) => s.project);
  const duration = useProjectStore(selectDuration);
  const playhead = useProjectStore((s) => s.playhead);
  const [presetId, setPresetId] = useState('1080p');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [rendererId, setRendererId] = useState('auto');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [availableFor, setAvailableFor] = useState<{ format: ExportFormat; list: Renderer[] } | null>(null);
  const available = availableFor?.format === format ? availableFor.list : null;
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Engines that can produce the chosen format (re-queried per format).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void availableRenderers(format).then((list) => alive && setAvailableFor({ format, list }));
    return () => {
      alive = false;
    };
  }, [open, format]);

  // Default the custom range to the whole sequence when the dialog opens.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setRangeStart(0);
      setRangeEnd(roundTo(duration, 2));
    }
  }

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const info = FORMAT_INFO[format];
  const preset = EXPORT_PRESETS.find((p) => p.id === presetId) ?? EXPORT_PRESETS[0];
  const dims = useMemo(
    () => (project ? exportDimensions(project.settings.width, project.settings.height, preset.shortSide) : { width: 0, height: 0 }),
    [project, preset],
  );
  const hasAudio = project ? audibleClips(project).length > 0 : false;
  const audioOn = includeAudio && hasAudio && info.audio;
  const fps = info.fps ?? project?.settings.fps ?? 30;

  const start = rangeMode === 'custom' ? rangeStart : 0;
  const end = rangeMode === 'custom' ? rangeEnd : duration;
  const exportDuration = roundTo(Math.max(0, end - start), 3);
  const maxSeconds = Math.min(LIMITS.maxExportSeconds, info.maxSeconds ?? Infinity);
  let rangeError: string | null = null;
  if (rangeMode === 'custom' && (start < 0 || end > duration + 1e-3 || end <= start)) rangeError = 'Choose a start before the end, inside the sequence.';
  else if (exportDuration > maxSeconds) rangeError = `${info.label.split(' ·')[0]} exports are limited to ${formatDuration(maxSeconds)}. Shorten the range to continue.`;
  else if (exportDuration <= 0) rangeError = 'Nothing to export.';

  const estimateBytes = ((preset.bitrate + (audioOn ? 192_000 : 0)) * exportDuration) / 8;
  const engine = rendererId === 'auto' ? available?.[0] : available?.find((r) => r.id === rendererId);

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

  const run = async () => {
    if (!project || rangeError) return;
    if (!engine) {
      setError(`No export engine in this browser can produce ${info.label}.`);
      setPhase('error');
      return;
    }
    reset();
    setPhase('running');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await engine.render(project, {
        format,
        width: dims.width,
        height: dims.height,
        fps,
        startTime: start,
        duration: exportDuration,
        videoBitrate: preset.bitrate,
        includeAudio: audioOn,
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

  const filename = `${(project?.name || 'export').replace(/[\\/:*?"<>|]+/g, '_')}.${info.extension}`;

  return (
    <Modal open={open} onClose={close} title="Export" closable={phase !== 'running'}>
      {phase === 'idle' || phase === 'error' ? (
        <div className="space-y-4" data-testid="export-form">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Format">
              <Select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} data-testid="export-format">
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_INFO[f].label}
                  </option>
                ))}
              </Select>
            </Field>
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
                      {ok ? '' : ` – cannot make ${format.toUpperCase()} here`}
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field label="Range">
              <Select value={rangeMode} onChange={(e) => setRangeMode(e.target.value as 'all' | 'custom')} data-testid="export-range-mode">
                <option value="all">Whole sequence ({formatTime(duration, { showMs: false })})</option>
                <option value="custom">Custom range</option>
              </Select>
            </Field>
          </div>
          {rangeMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-ink-700 bg-ink-850 p-3">
              <RangeInput label="Start" value={rangeStart} max={duration} onChange={setRangeStart} onPlayhead={() => setRangeStart(roundTo(playhead, 2))} testId="export-range-start" />
              <RangeInput label="End" value={rangeEnd} max={duration} onChange={setRangeEnd} onPlayhead={() => setRangeEnd(roundTo(playhead, 2))} testId="export-range-end" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm">
            <div>
              <p className="font-medium">Include audio</p>
              <p className="text-xs text-ink-400">
                {!info.audio ? 'This format has no audio track.' : hasAudio ? 'Mixes all unmuted audio and video clips.' : 'This project has no audible clips.'}
              </p>
            </div>
            <Toggle label="Include audio" checked={audioOn} onChange={setIncludeAudio} disabled={!hasAudio || !info.audio} />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs text-ink-300">
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Output</dt>
              <dd className="font-medium text-ink-100">
                {dims.width}×{dims.height} · {fps} fps
              </dd>
            </div>
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Duration</dt>
              <dd className="font-medium text-ink-100" data-testid="export-duration">{formatTime(exportDuration)}</dd>
            </div>
            <div className="rounded-md bg-ink-850 p-2">
              <dt className="text-ink-500">Est. size</dt>
              <dd className="font-medium text-ink-100">~{formatBytes(estimateBytes)}</dd>
            </div>
          </dl>
          <p className="text-xs text-ink-400">
            Rendered entirely on this computer.{' '}
            {available === null ? 'Checking available engines…' : engine ? `Engine: ${engine.label}.` : 'No engine available for this format.'}
          </p>
          {rangeError && (
            <p className="rounded-md border border-amber-700/60 bg-amber-950/40 p-2 text-xs text-amber-200" data-testid="export-range-error">
              {rangeError}
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
            <Button variant="primary" onClick={() => void run()} disabled={Boolean(rangeError) || available === null || !engine} data-testid="start-export">
              {phase === 'error' ? 'Try again' : `Export ${format.toUpperCase()}`}
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
                {result &&
                  `${result.width}×${result.height} · ${formatBytes(result.blob.size)} · ${result.elapsedSeconds.toFixed(1)}s · ${result.rendererId === 'webcodecs' ? 'WebCodecs' : 'FFmpeg.wasm'}`}
              </p>
            </div>
          </div>
          {resultUrl &&
            (result?.mimeType === 'image/gif' ? (
              <img src={resultUrl} alt="Exported GIF" className="max-h-64 w-full rounded-md bg-black object-contain" data-testid="export-preview" />
            ) : (
              <video src={resultUrl} controls className="max-h-64 w-full rounded-md bg-black" data-testid="export-preview" />
            ))}
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

function RangeInput({
  label,
  value,
  max,
  onChange,
  onPlayhead,
  testId,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  onPlayhead: () => void;
  testId: string;
}) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label} (seconds)</span>
      <div className="flex gap-1">
        <input
          type="number"
          min={0}
          max={roundTo(max, 2)}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={clsx('field-input tabular-nums')}
          data-testid={testId}
        />
        <Button size="sm" variant="ghost" className="h-auto shrink-0 whitespace-nowrap" onClick={onPlayhead} title="Use the playhead position">
          Playhead
        </Button>
      </div>
    </label>
  );
}
