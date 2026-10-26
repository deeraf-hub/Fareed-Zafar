import { Link, useParams } from 'react-router-dom';
import { useProjectLoader } from '@/hooks/useProjectLoader';
import { useAutosave } from '@/hooks/useAutosave';
import { useProjectStore } from '@/store/projectStore';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { loading, error } = useProjectLoader(projectId);
  const hasProject = useProjectStore((s) => s.project !== null);
  const saveNow = useAutosave(hasProject && !loading);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-medium">Could not open project</p>
        <p className="text-sm text-ink-400">{error}</p>
        <Link to="/projects">
          <Button>Back to projects</Button>
        </Link>
      </div>
    );
  }
  if (loading || !hasProject) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-ink-300">
        <Spinner /> Loading project…
      </div>
    );
  }
  return <EditorLayout onSave={saveNow} />;
}
