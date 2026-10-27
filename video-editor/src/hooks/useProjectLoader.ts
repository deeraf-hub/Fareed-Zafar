import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { localDb } from '@/persistence/localDb';
import { normalizeProject } from '@/model/project';
import { restoreProjectMedia } from '@/media/importMedia';
import { toast } from '@/store/uiStore';

export interface LoaderState {
  loading: boolean;
  error: string | null;
  missingAssetIds: string[];
}

/** Loads a project (cloud or local), preferring a newer unsaved local draft, and restores its media. */
export function useProjectLoader(projectId: string | undefined): LoaderState {
  const [state, setState] = useState<LoaderState>({ loading: true, error: null, missingAssetIds: [] });
  const [loadedFor, setLoadedFor] = useState(projectId);
  if (loadedFor !== projectId) {
    setLoadedFor(projectId);
    setState({ loading: true, error: null, missingAssetIds: [] });
  }
  const ready = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!projectId || !ready) return;
    let cancelled = false;
    (async () => {
      try {
        const repo = useAuthStore.getState().repository();
        const [remote, local] = await Promise.all([
          repo.kind === 'cloud' ? repo.get(projectId) : Promise.resolve(null),
          localDb.getProject(projectId),
        ]);
        let project = remote ?? (local ? normalizeProject(local.data) : null);
        let recovered = false;
        if (remote && local && local.dirty && local.updatedAt > remote.updatedAt) {
          project = normalizeProject(local.data);
          recovered = true;
        }
        if (!remote && repo.kind === 'local' && local) project = normalizeProject(local.data);
        if (!project) throw new Error('Project not found');
        const missing = await restoreProjectMedia(project.assets.map((a) => a.id));
        if (cancelled) return;
        useProjectStore.getState().loadProject(project);
        if (recovered) {
          toast('Recovered unsaved changes from this browser.', 'info');
          // Force an autosave so the cloud copy catches up.
          useProjectStore.setState((s) => ({ revision: s.revision + 1 }));
        }
        if (missing.length) {
          toast(`${missing.length} media file${missing.length > 1 ? 's are' : ' is'} missing on this device. Re-import to relink.`, 'warning');
        }
        setState({ loading: false, error: null, missingAssetIds: missing });
      } catch (e) {
        if (cancelled) return;
        setState({ loading: false, error: e instanceof Error ? e.message : 'Failed to load project', missingAssetIds: [] });
      }
    })();
    return () => {
      cancelled = true;
      useProjectStore.getState().closeProject();
    };
  }, [projectId, ready, userId]);

  return state;
}
