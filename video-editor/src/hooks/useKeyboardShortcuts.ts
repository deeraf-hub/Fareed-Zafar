import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';

export interface ShortcutHandlers {
  togglePlay: () => void;
  stepFrames: (delta: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  save: () => void;
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Play / pause' },
  { keys: 'S', action: 'Split clip(s) at playhead' },
  { keys: 'Delete / Backspace', action: 'Delete selected clips' },
  { keys: 'Ctrl + D', action: 'Duplicate selected clips' },
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Shift + Z / Ctrl + Y', action: 'Redo' },
  { keys: 'Ctrl + S', action: 'Save now' },
  { keys: '← / →', action: 'Step one frame' },
  { keys: 'Shift + ← / →', action: 'Step one second' },
  { keys: 'Home / End', action: 'Go to start / end' },
  { keys: '+ / -', action: 'Zoom timeline' },
  { keys: 'N', action: 'Toggle snapping' },
  { keys: 'Esc', action: 'Clear selection' },
  { keys: '?', action: 'Show shortcuts' },
];

export function useKeyboardShortcuts(h: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const s = useProjectStore.getState();
      const ui = useUIStore.getState();
      if (ui.exportOpen) return;
      const mod = e.ctrlKey || e.metaKey;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          h.togglePlay();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          if (mod) h.save();
          else s.splitAtPlayhead();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.deleteSelected();
          break;
        case 'd':
        case 'D':
          if (mod) {
            e.preventDefault();
            s.duplicateSelected();
          }
          break;
        case 'z':
        case 'Z':
          if (mod) {
            e.preventDefault();
            if (e.shiftKey) s.redo();
            else s.undo();
          }
          break;
        case 'y':
        case 'Y':
          if (mod) {
            e.preventDefault();
            s.redo();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.altKey && s.selectedClipIds.length) s.moveSelected(-(e.shiftKey ? 1 : 1 / (s.project?.settings.fps ?? 30)));
          else h.stepFrames(e.shiftKey ? -(s.project?.settings.fps ?? 30) : -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.altKey && s.selectedClipIds.length) s.moveSelected(e.shiftKey ? 1 : 1 / (s.project?.settings.fps ?? 30));
          else h.stepFrames(e.shiftKey ? s.project?.settings.fps ?? 30 : 1);
          break;
        case 'Home':
          e.preventDefault();
          h.goToStart();
          break;
        case 'End':
          e.preventDefault();
          h.goToEnd();
          break;
        case '+':
        case '=':
          s.setZoom(s.zoom * 1.25);
          break;
        case '-':
        case '_':
          s.setZoom(s.zoom / 1.25);
          break;
        case 'n':
        case 'N':
          s.toggleSnapping();
          break;
        case 'Escape':
          s.clearSelection();
          break;
        case '?':
          ui.setShortcutsOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h]);
}
