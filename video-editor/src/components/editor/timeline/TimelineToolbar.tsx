import { ArrowLeftToLine, Copy, FoldHorizontal, Magnet, Maximize2, Minus, Plus, Redo2, Scissors, Trash2, Undo2 } from 'lucide-react';
import { useProjectStore, selectDuration } from '@/store/projectStore';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/lib/time';

export function TimelineToolbar({ viewportWidth }: { viewportWidth: number }) {
  const s = useProjectStore();
  const duration = useProjectStore(selectDuration);
  const hasSelection = s.selectedClipIds.length > 0;
  const fit = () => {
    if (duration <= 0 || viewportWidth <= 0) return;
    s.setZoom((viewportWidth - 40) / (duration + 1));
  };
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-ink-700 bg-ink-900 px-2">
      <IconButton label="Split at playhead (S)" size="sm" onClick={s.splitAtPlayhead} data-testid="split">
        <Scissors className="h-4 w-4" />
      </IconButton>
      <IconButton label="Duplicate (Ctrl+D)" size="sm" onClick={s.duplicateSelected} disabled={!hasSelection} data-testid="duplicate">
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton label="Delete (Del)" size="sm" onClick={s.deleteSelected} disabled={!hasSelection} data-testid="delete">
        <Trash2 className="h-4 w-4" />
      </IconButton>
      <IconButton label="Ripple delete: remove and close the gap (Shift+Del)" size="sm" onClick={s.rippleDeleteSelected} disabled={!hasSelection} data-testid="ripple-delete">
        <ArrowLeftToLine className="h-4 w-4" />
      </IconButton>
      <IconButton label={hasSelection ? 'Close gaps on the selected tracks' : 'Close gaps on all tracks'} size="sm" onClick={() => s.closeGaps()} data-testid="close-gaps">
        <FoldHorizontal className="h-4 w-4" />
      </IconButton>
      <span className="mx-1 h-5 w-px bg-ink-700" />
      <IconButton label="Undo (Ctrl+Z)" size="sm" onClick={s.undo} disabled={s.past.length === 0}>
        <Undo2 className="h-4 w-4" />
      </IconButton>
      <IconButton label="Redo (Ctrl+Shift+Z)" size="sm" onClick={s.redo} disabled={s.future.length === 0}>
        <Redo2 className="h-4 w-4" />
      </IconButton>
      <span className="mx-1 h-5 w-px bg-ink-700" />
      <IconButton label={s.snapping ? 'Snapping on (N)' : 'Snapping off (N)'} size="sm" active={s.snapping} onClick={s.toggleSnapping} data-testid="snap-toggle">
        <Magnet className="h-4 w-4" />
      </IconButton>
      <span className="mx-1 h-5 w-px bg-ink-700" />
      <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => s.addTrack('video')}>
        Video track
      </Button>
      <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => s.addTrack('audio')}>
        Audio track
      </Button>
      <span className="ml-auto font-mono text-xs text-ink-300" data-testid="sequence-duration">
        {formatTime(duration, { fps: s.project?.settings.fps })}
      </span>
      <span className="mx-1 h-5 w-px bg-ink-700" />
      <IconButton label="Zoom out (-)" size="sm" onClick={() => s.setZoom(s.zoom / 1.25)}>
        <Minus className="h-4 w-4" />
      </IconButton>
      <input
        type="range"
        aria-label="Timeline zoom"
        min={Math.log(4)}
        max={Math.log(600)}
        step={0.01}
        value={Math.log(s.zoom)}
        onChange={(e) => s.setZoom(Math.exp(parseFloat(e.target.value)))}
        className="w-24"
      />
      <IconButton label="Zoom in (+)" size="sm" onClick={() => s.setZoom(s.zoom * 1.25)}>
        <Plus className="h-4 w-4" />
      </IconButton>
      <IconButton label="Fit sequence" size="sm" onClick={fit}>
        <Maximize2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
