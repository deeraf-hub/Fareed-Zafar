import { create } from 'zustand';
import { newId } from '@/lib/id';

export type ToastKind = 'info' | 'success' | 'error' | 'warning';
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  timeout: number;
}

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'local';
export type SidePanelTab = 'media' | 'text';

interface UIState {
  toasts: Toast[];
  saveStatus: SaveStatus;
  saveError: string | null;
  sideTab: SidePanelTab;
  exportOpen: boolean;
  shortcutsOpen: boolean;
  toast(message: string, kind?: ToastKind, timeout?: number): void;
  dismissToast(id: string): void;
  setSaveStatus(status: SaveStatus, error?: string | null): void;
  setSideTab(tab: SidePanelTab): void;
  setExportOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  saveStatus: 'idle',
  saveError: null,
  sideTab: 'media',
  exportOpen: false,
  shortcutsOpen: false,

  toast(message, kind = 'info', timeout = kind === 'error' ? 7000 : 3500) {
    const id = newId('toast');
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, timeout }] }));
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  setSaveStatus(status, error = null) {
    set({ saveStatus: status, saveError: error });
  },
  setSideTab(tab) {
    set({ sideTab: tab });
  },
  setExportOpen(open) {
    set({ exportOpen: open });
  },
  setShortcutsOpen(open) {
    set({ shortcutsOpen: open });
  },
}));

export function toast(message: string, kind: ToastKind = 'info'): void {
  useUIStore.getState().toast(message, kind);
}
