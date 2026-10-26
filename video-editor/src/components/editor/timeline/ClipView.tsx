import { memo } from 'react';
import clsx from 'clsx';
import { Film, Image as ImageIcon, Music, Type } from 'lucide-react';
import type { Clip, MediaAsset } from '@/types/project';
import { keyframeTimes } from '@/model/clipMath';
import { WaveformCanvas } from './WaveformCanvas';

export type GestureKind = 'move' | 'trim-start' | 'trim-end';

interface Props {
  clip: Clip;
  asset?: MediaAsset;
  zoom: number;
  height: number;
  selected: boolean;
  locked: boolean;
  onPointerDown: (e: React.PointerEvent, clip: Clip, kind: GestureKind) => void;
}

const ICONS = { video: Film, image: ImageIcon, audio: Music, text: Type } as const;

export const ClipView = memo(function ClipView({ clip, asset, zoom, height, selected, locked, onPointerDown }: Props) {
  const left = clip.start * zoom;
  const width = Math.max(2, clip.duration * zoom);
  const Icon = ICONS[clip.kind];
  const speed = 'speed' in clip ? clip.speed : 1;
  const trimStart = 'trimStart' in clip ? clip.trimStart : 0;
  const srcLen = asset?.duration || 0;
  const from = srcLen ? trimStart / srcLen : 0;
  const to = srcLen ? Math.min(1, (trimStart + clip.duration * speed) / srcLen) : 1;
  const hasWave = Boolean(asset?.waveform?.length) && (clip.kind === 'audio' || (clip.kind === 'video' && asset?.hasAudio));
  const fades = 'audio' in clip ? clip.audio : null;
  const label = clip.kind === 'text' ? clip.text.split('\n')[0] || 'Text' : clip.name;
  const kfTimes = 'keyframes' in clip ? keyframeTimes(clip.keyframes) : [];

  return (
    <div
      className={clsx(
        'absolute top-1 select-none overflow-hidden rounded-md border text-[11px] text-white shadow-sm',
        `clip-${clip.kind}`,
        selected ? 'ring-2 ring-white/90' : 'hover:brightness-110',
        locked ? 'cursor-not-allowed opacity-70' : 'cursor-grab active:cursor-grabbing',
      )}
      style={{ left, width, height: height - 8 }}
      onPointerDown={(e) => onPointerDown(e, clip, 'move')}
      data-testid="clip"
      data-clip-id={clip.id}
      data-clip-kind={clip.kind}
      title={`${clip.name}\n${clip.start.toFixed(2)}s – ${(clip.start + clip.duration).toFixed(2)}s`}
    >
      {/* thumbnail strip */}
      {(clip.kind === 'video' || clip.kind === 'image') && asset?.thumbnail && (
        <div
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: `url(${asset.thumbnail})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x' }}
        />
      )}
      {hasWave && asset?.waveform && (
        <div className={clsx('absolute inset-x-0', clip.kind === 'video' ? 'bottom-0 h-1/3' : 'inset-y-0')}>
          <WaveformCanvas peaks={asset.waveform} from={from} to={to} width={width} height={clip.kind === 'video' ? (height - 8) / 3 : height - 8} />
        </div>
      )}
      {fades && (fades.fadeIn > 0 || fades.fadeOut > 0) && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} 10`} aria-hidden>
          {fades.fadeIn > 0 && <path d={`M0,10 L${fades.fadeIn * zoom},0`} stroke="rgba(255,255,255,0.8)" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />}
          {fades.fadeOut > 0 && <path d={`M${width - fades.fadeOut * zoom},0 L${width},10`} stroke="rgba(255,255,255,0.8)" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />}
        </svg>
      )}
      {/* keyframe markers */}
      {kfTimes.map((t) => (
        <span
          key={t}
          className="pointer-events-none absolute bottom-1 h-1.5 w-1.5 rotate-45 border border-ink-900 bg-white"
          style={{ left: t * zoom - 3 }}
          data-testid="keyframe-marker"
        />
      ))}
      {/* transition markers */}
      {'transitionIn' in clip && clip.transitionIn.type !== 'none' && (
        <div className="absolute left-0 top-0 h-full bg-white/20" style={{ width: clip.transitionIn.duration * zoom }} />
      )}
      {'transitionOut' in clip && clip.transitionOut.type !== 'none' && (
        <div className="absolute right-0 top-0 h-full bg-white/20" style={{ width: clip.transitionOut.duration * zoom }} />
      )}
      <div className="relative flex items-center gap-1 px-1.5 py-0.5">
        <Icon className="h-3 w-3 shrink-0 opacity-90" />
        <span className="truncate font-medium drop-shadow">{label}</span>
        {speed !== 1 && <span className="ml-auto shrink-0 rounded bg-black/40 px-1 text-[10px]">{speed}×</span>}
      </div>
      {!locked && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-white/30"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown(e, clip, 'trim-start');
            }}
            data-testid="trim-start"
          />
          <div
            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-white/30"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown(e, clip, 'trim-end');
            }}
            data-testid="trim-end"
          />
        </>
      )}
    </div>
  );
});
