import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { TopBar } from './TopBar';
import { SidePanel } from './panels/SidePanel';
import { PreviewPanel } from './preview/PreviewPanel';
import { Inspector } from './inspector/Inspector';
import { Timeline } from './timeline/Timeline';
import { ExportDialog } from './export/ExportDialog';
import { ShortcutsDialog } from './ShortcutsDialog';

const MIN_TIMELINE = 160;
const MAX_TIMELINE = 600;

export function EditorLayout({ onSave }: { onSave: () => Promise<void> | void }) {
  const controls = usePlayer();
  const exportOpen = useUIStore((s) => s.exportOpen);
  const [timelineHeight, setTimelineHeight] = useState(280);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const handlers = useMemo(
    () => ({
      togglePlay: controls.togglePlay,
      stepFrames: controls.stepFrames,
      goToStart: controls.goToStart,
      goToEnd: controls.goToEnd,
      save: () => void onSave(),
    }),
    [controls, onSave],
  );
  useKeyboardShortcuts(handlers);

  // Pause playback while the export dialog is open.
  useEffect(() => {
    if (exportOpen && controls.player.isPlaying) controls.pause();
  }, [exportOpen, controls]);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = { startY: e.clientY, startH: timelineHeight };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [timelineHeight],
  );
  const onResizeMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const h = dragRef.current.startH - (e.clientY - dragRef.current.startY);
    setTimelineHeight(Math.max(MIN_TIMELINE, Math.min(MAX_TIMELINE, h)));
  };
  const onResizeEnd = () => {
    dragRef.current = null;
  };

  const projectName = useProjectStore((s) => s.project?.name ?? '');
  useEffect(() => {
    document.title = projectName ? `${projectName} · Framewright` : 'Framewright';
    return () => {
      document.title = 'Framewright';
    };
  }, [projectName]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950 text-ink-100" data-testid="editor">
      <TopBar onSave={onSave} />
      <div className="flex min-h-0 flex-1">
        <SidePanel />
        <PreviewPanel controls={controls} />
        <Inspector />
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        className="h-1.5 shrink-0 cursor-row-resize border-y border-ink-700 bg-ink-850 hover:bg-accent-500/40"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
      />
      <Timeline height={timelineHeight} controls={controls} />
      <ExportDialog />
      <ShortcutsDialog />
    </div>
  );
}
