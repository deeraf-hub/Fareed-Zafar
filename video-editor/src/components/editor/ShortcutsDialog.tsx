import { Modal } from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/Kbd';
import { useUIStore } from '@/store/uiStore';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export function ShortcutsDialog() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" width="sm">
      <ul className="divide-y divide-ink-700 text-sm">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between py-2">
            <span className="text-ink-200">{s.action}</span>
            <span className="flex gap-1">
              {s.keys.split(' / ').map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
