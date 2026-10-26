import { useSyncExternalStore } from 'react';
import type { MediaAsset } from '@/types/project';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/uiStore';
import { mediaRegistry } from './mediaRegistry';
import { importFile, ImportError } from './importMedia';

export const ASSET_MIME = 'application/x-framewright-asset';
export const ACCEPT = 'video/*,audio/*,image/*,.mkv,.mov,.m4a,.flac';

export function useMediaRegistryVersion(): number {
  return useSyncExternalStore(mediaRegistry.subscribe, () => mediaRegistry.version, () => 0);
}

/** Imports files into the current project. Shared by the library panel and timeline drops. */
export async function importFilesIntoProject(files: File[], onAsset?: (asset: MediaAsset) => void): Promise<MediaAsset[]> {
  const store = useProjectStore.getState();
  const added: MediaAsset[] = [];
  for (const file of files) {
    try {
      const { asset, waveform } = await importFile(file);
      store.addAsset(asset);
      added.push(asset);
      onAsset?.(asset);
      void waveform.then((w) => {
        if (!w) return;
        const patch: Partial<MediaAsset> = { waveform: w };
        if (asset.kind === 'video' && w.some((v) => v > 0)) patch.hasAudio = true;
        useProjectStore.getState().updateAsset(asset.id, patch);
      });
    } catch (e) {
      const message = e instanceof ImportError ? e.message : e instanceof Error ? `Import failed: ${e.message}` : 'Import failed';
      toast(message, 'error');
    }
  }
  if (added.length) toast(`Imported ${added.length} file${added.length > 1 ? 's' : ''}`, 'success');
  return added;
}

