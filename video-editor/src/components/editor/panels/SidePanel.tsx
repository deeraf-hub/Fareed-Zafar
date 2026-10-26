import clsx from 'clsx';
import { Film, Type } from 'lucide-react';
import { useUIStore, type SidePanelTab } from '@/store/uiStore';
import { MediaPanel } from './MediaPanel';
import { TextPanel } from './TextPanel';

const TABS: { id: SidePanelTab; label: string; icon: typeof Film }[] = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'text', label: 'Text', icon: Type },
];

export function SidePanel() {
  const tab = useUIStore((s) => s.sideTab);
  const setTab = useUIStore((s) => s.setSideTab);
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-ink-700 bg-ink-900" aria-label="Library">
      <div className="flex border-b border-ink-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              tab === t.id ? 'border-b-2 border-accent-500 text-ink-100' : 'text-ink-300 hover:text-ink-100',
            )}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{tab === 'media' ? <MediaPanel /> : <TextPanel />}</div>
    </aside>
  );
}
