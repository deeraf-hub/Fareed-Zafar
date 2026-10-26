import { memo } from 'react';
import { formatTime } from '@/lib/time';
import { RULER_HEIGHT, tickInterval } from './timelineUtils';

interface Props {
  zoom: number;
  scrollLeft: number;
  viewportWidth: number;
  contentWidth: number;
  onScrubStart: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const TimeRuler = memo(function TimeRuler({ zoom, scrollLeft, viewportWidth, contentWidth, onScrubStart }: Props) {
  const { major, minor } = tickInterval(zoom);
  const start = Math.max(0, Math.floor(scrollLeft / zoom / minor) * minor - minor);
  const end = (scrollLeft + viewportWidth) / zoom + minor;
  const ticks: { t: number; major: boolean }[] = [];
  for (let t = start; t <= end; t = Math.round((t + minor) * 1e6) / 1e6) {
    const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
    ticks.push({ t, major: isMajor });
  }
  return (
    <div
      className="relative shrink-0 cursor-col-resize select-none border-b border-ink-700 bg-ink-900"
      style={{ height: RULER_HEIGHT, width: contentWidth }}
      onPointerDown={onScrubStart}
      data-testid="time-ruler"
      role="slider"
      aria-label="Timeline ruler"
    >
      {ticks.map(({ t, major: m }) => (
        <div key={t} className="absolute bottom-0" style={{ left: t * zoom }}>
          <div className={m ? 'h-3 w-px bg-ink-400' : 'h-1.5 w-px bg-ink-600'} />
          {m && (
            <span className="absolute bottom-3.5 left-1 whitespace-nowrap font-mono text-[10px] text-ink-300">
              {formatTime(t, { showMs: false })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});
