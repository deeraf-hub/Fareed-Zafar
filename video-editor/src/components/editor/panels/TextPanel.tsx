import { Heading1, Subtitles, Type } from 'lucide-react';
import type { TextPreset } from '@/types/project';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/uiStore';

const PRESETS: { id: TextPreset; label: string; hint: string; icon: typeof Type }[] = [
  { id: 'title', label: 'Title', hint: 'Large centred heading with fade-in', icon: Heading1 },
  { id: 'subtitle', label: 'Subtitle', hint: 'Caption bar at the bottom', icon: Subtitles },
  { id: 'body', label: 'Text', hint: 'Plain text with outline', icon: Type },
];

export function TextPanel() {
  const addTextClip = useProjectStore((s) => s.addTextClip);
  const add = (preset: TextPreset) => {
    const clip = addTextClip(preset);
    if (!clip) toast('No room at the playhead on the top video track. Move the playhead and try again.', 'warning');
  };
  return (
    <div className="p-3">
      <p className="mb-3 text-xs text-ink-400">Text is added at the playhead on the top-most video track. Edit it in the inspector.</p>
      <div className="space-y-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => add(p.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-ink-700 bg-ink-850 p-3 text-left transition-colors hover:border-ink-500 hover:bg-ink-800"
            data-testid={`add-text-${p.id}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-clip-text/20 text-clip-text">
              <p.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-ink-400">{p.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
