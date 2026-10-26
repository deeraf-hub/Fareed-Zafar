import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard, LogOut, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { AspectRatio, ProjectSummary } from '@/types/project';
import { ASPECT_PRESETS, createProject } from '@/model/project';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { localDb } from '@/persistence/localDb';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { IconButton } from '@/components/ui/IconButton';
import { formatDuration, formatRelative } from '@/lib/time';

function AspectIcon({ aspect }: { aspect: AspectRatio }) {
  const cls = aspect === '16:9' ? 'h-9 w-16' : aspect === '9:16' ? 'h-16 w-9' : 'h-12 w-12';
  return <div className={clsx('rounded-sm border border-ink-500 bg-ink-800', cls)} aria-hidden />;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { mode, user, signOut } = useAuthStore();
  const repoFactory = useAuthStore((s) => s.repository);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAspect, setNewAspect] = useState<AspectRatio>('16:9');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await repoFactory().list();
      setProjects(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load projects');
      setProjects([]);
    }
  }, [repoFactory]);

  useEffect(() => {
    // Deferred so the effect body itself does not set state synchronously.
    void Promise.resolve().then(refresh);
  }, [refresh, user?.id]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const project = createProject(newName || 'Untitled project', newAspect);
      await repoFactory().save(project);
      await localDb.putProject(project);
      setCreating(false);
      setNewName('');
      navigate(`/editor/${project.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create project', 'error');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!renaming) return;
    setBusy(true);
    try {
      await repoFactory().rename(renaming.id, renameValue.trim() || renaming.name);
      const local = await localDb.getProject(renaming.id);
      if (local) await localDb.putProject({ ...local.data, name: renameValue.trim() || renaming.name });
      setRenaming(null);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rename failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await repoFactory().delete(deleting.id);
      await localDb.deleteProject(deleting.id).catch(() => undefined);
      setDeleting(null);
      toast('Project deleted', 'success');
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full" onClick={() => setMenuFor(null)}>
      <header className="border-b border-ink-700 bg-ink-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            {mode === 'cloud' ? (
              <>
                <span className="text-ink-300" data-testid="user-email">{user?.email}</span>
                <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <span className="rounded-full border border-amber-700/50 bg-amber-900/30 px-2.5 py-0.5 text-xs text-amber-200">
                Local mode: projects are stored in this browser
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Your projects</h1>
            <p className="text-sm text-ink-400">Media files stay on this computer; only project settings are saved.</p>
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)} data-testid="new-project">
            New project
          </Button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}

        {projects === null ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-600 p-14 text-center">
            <Clapperboard className="mx-auto h-8 w-8 text-ink-400" />
            <h2 className="mt-3 font-medium">No projects yet</h2>
            <p className="mt-1 text-sm text-ink-400">Create your first project to start editing.</p>
            <Button className="mt-5" variant="primary" onClick={() => setCreating(true)}>
              Create project
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="project-list">
            {projects.map((p) => (
              <li key={p.id} className="group relative rounded-xl border border-ink-700 bg-ink-900 transition-colors hover:border-ink-500">
                <Link to={`/editor/${p.id}`} className="block p-4" data-testid="project-card">
                  <div className="flex h-24 items-center justify-center rounded-lg bg-ink-850">
                    <AspectIcon aspect={p.aspect} />
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium" title={p.name}>{p.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {p.aspect} · {formatDuration(p.durationSeconds)} · {p.clipCount} clip{p.clipCount === 1 ? '' : 's'} · {formatRelative(p.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="absolute right-3 top-3">
                  <IconButton
                    label="Project actions"
                    size="sm"
                    className="bg-ink-900/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === p.id ? null : p.id);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </IconButton>
                  {menuFor === p.id && (
                    <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-md border border-ink-600 bg-ink-800 shadow-xl" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenaming(p);
                          setRenameValue(p.name);
                          setMenuFor(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 hover:bg-ink-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(p);
                          setMenuFor(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title="New project">
        <form onSubmit={create} className="space-y-4" id="new-project-form">
          <Field label="Project name">
            <Input autoFocus placeholder="My video" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="project-name-input" />
          </Field>
          <div>
            <span className="label mb-2 block">Aspect ratio</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setNewAspect(a)}
                  className={clsx(
                    'flex flex-col items-center gap-2 rounded-lg border p-3 text-xs transition-colors',
                    newAspect === a ? 'border-accent-500 bg-accent-500/10 text-ink-100' : 'border-ink-600 text-ink-300 hover:border-ink-500',
                  )}
                  data-testid={`aspect-${a}`}
                >
                  <div className="flex h-16 items-center">
                    <AspectIcon aspect={a} />
                  </div>
                  <span className="font-medium">{a}</span>
                  <span className="text-[11px] text-ink-400">{ASPECT_PRESETS[a].hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy} data-testid="create-project">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename project" width="sm">
        <form onSubmit={rename} className="space-y-4">
          <Input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} data-testid="rename-input" />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete project" width="sm">
        <p className="text-sm text-ink-200">
          Delete <strong>{deleting?.name}</strong>? This removes the project and its timeline. Your original media files
          on disk are not affected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={() => void remove()} data-testid="confirm-delete">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
