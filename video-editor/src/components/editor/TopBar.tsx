import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Cloud, CloudOff, Download, HardDrive, Keyboard, Loader2, LogOut, Redo2, Undo2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { AspectRatio } from '@/types/project';
import { ASPECT_PRESETS } from '@/model/project';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Input';

function SaveIndicator() {
  const status = useUIStore((s) => s.saveStatus);
  const error = useUIStore((s) => s.saveError);
  const map = {
    idle: { icon: HardDrive, text: '', cls: 'text-ink-400' },
    unsaved: { icon: Cloud, text: 'Unsaved changes', cls: 'text-ink-300' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-ink-300' },
    saved: { icon: Check, text: 'Saved to cloud', cls: 'text-emerald-300' },
    local: { icon: HardDrive, text: 'Saved in this browser', cls: 'text-ink-300' },
    error: { icon: CloudOff, text: `Save failed${error ? `: ${error}` : ''}`, cls: 'text-red-300' },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs', m.cls)} data-testid="save-status" data-status={status} title={m.text}>
      <Icon className={clsx('h-3.5 w-3.5', status === 'saving' && 'animate-spin')} />
      <span className="hidden max-w-[220px] truncate lg:inline">{m.text}</span>
    </span>
  );
}

export function TopBar({ onSave }: { onSave: () => Promise<void> | void }) {
  const name = useProjectStore((s) => s.project?.name ?? '');
  const aspect = useProjectStore((s) => s.project?.settings.aspect ?? '16:9');
  const rename = useProjectStore((s) => s.rename);
  const setAspect = useProjectStore((s) => s.setAspect);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const hasClips = useProjectStore((s) => (s.project?.clips.length ?? 0) > 0);
  const setExportOpen = useUIStore((s) => s.setExportOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const { mode, user, signOut } = useAuthStore();
  const [draft, setDraft] = useState(name);
  const [lastName, setLastName] = useState(name);
  if (name !== lastName) {
    // Project renamed elsewhere (dashboard / inspector): resync the draft.
    setLastName(name);
    setDraft(name);
  }

  const commitName = () => {
    if (draft.trim() && draft !== name) rename(draft);
    else setDraft(name);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-900 px-3">
      <Link to="/projects" className="flex items-center gap-1 text-ink-300 hover:text-ink-100" aria-label="Back to projects">
        <ArrowLeft className="h-4 w-4" />
        <img src="/favicon.svg" alt="" className="h-5 w-5" />
      </Link>
      <input
        className="h-8 w-56 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-ink-100 hover:border-ink-600 focus:border-accent-500 focus:bg-ink-800"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label="Project name"
        data-testid="project-title"
      />
      <button type="button" onClick={() => void onSave()} className="rounded px-1 hover:bg-ink-800" title="Save now (Ctrl+S)">
        <SaveIndicator />
      </button>

      <div className="mx-auto flex items-center gap-1">
        <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} data-testid="undo">
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} data-testid="redo">
          <Redo2 className="h-4 w-4" />
        </IconButton>
      </div>

      <Select
        aria-label="Aspect ratio"
        className="!w-auto !py-1 text-xs"
        value={aspect}
        onChange={(e) => setAspect(e.target.value as AspectRatio)}
        data-testid="aspect-select"
      >
        {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => (
          <option key={a} value={a}>
            {a} · {ASPECT_PRESETS[a].width}×{ASPECT_PRESETS[a].height}
          </option>
        ))}
      </Select>
      <IconButton label="Keyboard shortcuts (?)" onClick={() => setShortcutsOpen(true)}>
        <Keyboard className="h-4 w-4" />
      </IconButton>
      <Button variant="primary" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)} disabled={!hasClips} data-testid="export-button">
        Export
      </Button>
      {mode === 'cloud' ? (
        <div className="flex items-center gap-1 pl-1 text-xs text-ink-300">
          <span className="hidden max-w-[160px] truncate xl:inline">{user?.email}</span>
          <IconButton label="Sign out" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      ) : (
        <span className="hidden items-center gap-1 rounded-full border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-200 xl:inline-flex" title="Supabase is not configured; projects are stored in this browser only.">
          <AlertCircle className="h-3 w-3" /> Local mode
        </span>
      )}
    </header>
  );
}
