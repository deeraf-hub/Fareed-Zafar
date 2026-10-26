import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileAudio, FileImage, FileVideo, Link2, Plus, Trash2, Upload } from 'lucide-react';
import clsx from 'clsx';
import type { MediaAsset } from '@/types/project';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/uiStore';
import { mediaRegistry } from '@/media/mediaRegistry';
import { importFile } from '@/media/importMedia';
import { ACCEPT, ASSET_MIME, importFilesIntoProject, useMediaRegistryVersion } from '@/media/importFlow';
import { localDb } from '@/persistence/localDb';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { formatBytes, formatDuration } from '@/lib/time';

function AssetIcon({ kind }: { kind: MediaAsset['kind'] }) {
  const Icon = kind === 'video' ? FileVideo : kind === 'audio' ? FileAudio : FileImage;
  return <Icon className="h-6 w-6 text-ink-400" />;
}

export function MediaPanel() {
  const assets = useProjectStore((s) => s.project?.assets ?? []);
  const clips = useProjectStore((s) => s.project?.clips ?? []);
  const addClipFromAsset = useProjectStore((s) => s.addClipFromAsset);
  const removeAsset = useProjectStore((s) => s.removeAsset);
  const updateAsset = useProjectStore((s) => s.updateAsset);
  useMediaRegistryVersion();
  const inputRef = useRef<HTMLInputElement>(null);
  const relinkRef = useRef<HTMLInputElement>(null);
  const [relinkId, setRelinkId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(0);

  const doImport = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setImporting(files.length);
    try {
      await importFilesIntoProject(files);
    } finally {
      setImporting(0);
    }
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void doImport(Array.from(e.dataTransfer.files));
  };

  const addToTimeline = (asset: MediaAsset) => {
    try {
      const clip = addClipFromAsset(asset);
      if (!clip) toast('Could not find room on the timeline at the playhead.', 'warning');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add clip', 'error');
    }
  };

  const remove = (asset: MediaAsset) => {
    const used = clips.filter((c) => 'assetId' in c && c.assetId === asset.id).length;
    removeAsset(asset.id);
    mediaRegistry.release(asset.id);
    void localDb.deleteMedia(asset.id);
    toast(used ? `Removed "${asset.name}" and ${used} clip${used > 1 ? 's' : ''}` : `Removed "${asset.name}"`, 'info');
  };

  const relink = async (file: File) => {
    if (!relinkId) return;
    try {
      const { asset, waveform } = await importFile(file, { existingId: relinkId });
      updateAsset(relinkId, { ...asset, id: relinkId });
      void waveform.then((w) => w && updateAsset(relinkId, { waveform: w }));
      toast(`Relinked "${file.name}"`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Relink failed', 'error');
    } finally {
      setRelinkId(null);
    }
  };

  return (
    <div
      className={clsx('flex h-full flex-col', dragOver && 'bg-accent-500/5')}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="p-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          data-testid="file-input"
          onChange={(e) => {
            void doImport(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <input
          ref={relinkRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          data-testid="relink-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void relink(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="primary"
          className="w-full"
          icon={<Upload className="h-4 w-4" />}
          loading={importing > 0}
          onClick={() => inputRef.current?.click()}
          data-testid="import-button"
        >
          {importing ? `Importing ${importing}…` : 'Import media'}
        </Button>
        <p className="mt-2 text-center text-[11px] text-ink-400">
          Video, audio and images. Files stay on this computer.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className={clsx('m-3 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center', dragOver ? 'border-accent-500' : 'border-ink-600')}>
          <Upload className="h-6 w-6 text-ink-400" />
          <p className="mt-2 text-sm text-ink-300">Drop files here</p>
          <p className="text-xs text-ink-500">MP4, WebM, MOV, MP3, WAV, PNG, JPG…</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 px-3 pb-3" data-testid="asset-list">
          {assets.map((asset) => {
            const missing = !mediaRegistry.has(asset.id);
            return (
              <li
                key={asset.id}
                draggable={!missing}
                onDragStart={(e) => {
                  e.dataTransfer.setData(ASSET_MIME, asset.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={clsx(
                  'group relative overflow-hidden rounded-lg border bg-ink-850 transition-colors',
                  missing ? 'border-amber-700/60' : 'border-ink-700 hover:border-ink-500',
                )}
                data-testid="asset-item"
                data-asset-kind={asset.kind}
                title={`${asset.name}\n${formatBytes(asset.size)}${asset.width ? ` · ${asset.width}×${asset.height}` : ''}`}
              >
                <div className="relative flex aspect-video items-center justify-center bg-ink-800">
                  {asset.thumbnail ? (
                    <img src={asset.thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <AssetIcon kind={asset.kind} />
                  )}
                  {asset.kind !== 'image' && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] tabular-nums text-ink-100">
                      {formatDuration(asset.duration)}
                    </span>
                  )}
                  {missing && (
                    <span className="absolute left-1 top-1 rounded bg-amber-600 px-1 text-[10px] font-medium text-white">Missing</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {missing ? (
                      <IconButton
                        label="Relink file"
                        size="sm"
                        className="bg-ink-800"
                        onClick={() => {
                          setRelinkId(asset.id);
                          relinkRef.current?.click();
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </IconButton>
                    ) : (
                      <IconButton label="Add to timeline" size="sm" className="bg-ink-800" onClick={() => addToTimeline(asset)} data-testid="add-asset">
                        <Plus className="h-4 w-4" />
                      </IconButton>
                    )}
                    <IconButton label="Remove from library" size="sm" className="bg-ink-800 text-red-300" onClick={() => remove(asset)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium">{asset.name}</p>
                  <p className="text-[10px] text-ink-400">
                    {asset.kind}
                    {asset.width ? ` · ${asset.width}×${asset.height}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
