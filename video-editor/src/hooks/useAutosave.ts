import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { localDb } from '@/persistence/localDb';

const DEBOUNCE_MS = 1200;

/**
 * Persists the open project shortly after every change. The local copy is
 * written first (instant recovery after a reload); in cloud mode the same
 * JSON is then pushed to Supabase.
 */
export function useAutosave(enabled: boolean) {
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const lastSavedRevision = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const setStatus = useUIStore.getState().setSaveStatus;

    const flush = async () => {
      const { project, revision } = useProjectStore.getState();
      if (!project) return;
      if (revision === lastSavedRevision.current) return;
      const repo = useAuthStore.getState().repository();
      const run = (async () => {
        setStatus('saving');
        try {
          await localDb.putProject(project, { dirty: repo.kind === 'cloud', ownerId: useAuthStore.getState().user?.id ?? null });
          if (repo.kind === 'cloud') {
            await repo.save(project);
            await localDb.markClean(project.id);
            setStatus('saved');
          } else {
            setStatus('local');
          }
          lastSavedRevision.current = revision;
        } catch (e) {
          setStatus('error', e instanceof Error ? e.message : 'Save failed');
        }
      })();
      inflight.current = run;
      await run;
      inflight.current = null;
      // Changes made while saving → save again.
      if (useProjectStore.getState().revision !== lastSavedRevision.current) schedule();
    };

    const schedule = () => {
      setStatus('unsaved');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    };

    const unsub = useProjectStore.subscribe((s, prev) => {
      if (s.project && s.revision !== prev.revision) schedule();
    });
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        if (timer.current) window.clearTimeout(timer.current);
        void flush();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      const { revision } = useProjectStore.getState();
      if (revision !== lastSavedRevision.current || inflight.current) {
        void flush();
        e.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onUnload);
    // Mark the initially loaded revision as saved, unless the local draft
    // still has changes the cloud never received (recovered after a crash).
    lastSavedRevision.current = useProjectStore.getState().revision;
    const repoKind = useAuthStore.getState().repository().kind;
    setStatus(repoKind === 'cloud' ? 'saved' : 'local');
    const openId = useProjectStore.getState().project?.id;
    if (repoKind === 'cloud' && openId) {
      void localDb.getProject(openId).then((row) => {
        if (row?.dirty) {
          lastSavedRevision.current = -1;
          schedule();
        }
      });
    }

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onUnload);
      if (timer.current) window.clearTimeout(timer.current);
      void flush();
    };
  }, [enabled]);

  /** Manual save (Ctrl+S). */
  return async () => {
    if (timer.current) window.clearTimeout(timer.current);
    const { project } = useProjectStore.getState();
    if (!project) return;
    const repo = useAuthStore.getState().repository();
    const setStatus = useUIStore.getState().setSaveStatus;
    setStatus('saving');
    try {
      await localDb.putProject(project, { dirty: repo.kind === 'cloud' });
      if (repo.kind === 'cloud') {
        await repo.save(project);
        await localDb.markClean(project.id);
      }
      lastSavedRevision.current = useProjectStore.getState().revision;
      setStatus(repo.kind === 'cloud' ? 'saved' : 'local');
    } catch (e) {
      setStatus('error', e instanceof Error ? e.message : 'Save failed');
    }
  };
}
