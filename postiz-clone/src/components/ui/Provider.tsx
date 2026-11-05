import { PROVIDER_MAP } from "@/lib/data";
import type { Channel, ProviderId } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

/** Round brand badge with a monogram. Used wherever the real product shows a provider logo. */
export function ProviderBadge({ id, size = 20, className }: { id: ProviderId; size?: number; className?: string }) {
  const p = PROVIDER_MAP[id];
  const font = Math.max(8, Math.round(size * (p.mono.length > 2 ? 0.34 : p.mono.length === 2 ? 0.42 : 0.5)));
  return (
    <span
      title={p.name}
      aria-label={p.name}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none ring-1 ring-white/15", className)}
      style={{ width: size, height: size, background: p.color, color: p.fg, fontSize: font }}
    >
      {p.mono}
    </span>
  );
}

/** Channel avatar: coloured circle with initials and the provider badge in the corner (just like the app). */
export function ChannelAvatar({
  channel,
  size = 36,
  className,
  dimmed,
}: {
  channel: Channel;
  size?: number;
  className?: string;
  dimmed?: boolean;
}) {
  const badge = Math.max(12, Math.round(size * 0.42));
  return (
    <span className={cn("relative inline-block shrink-0", dimmed && "opacity-40 grayscale", className)} style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-base"
        style={{ background: channel.avatarColor, fontSize: Math.round(size * 0.36) }}
      >
        {initials(channel.name)}
      </span>
      <ProviderBadge id={channel.provider} size={badge} className="absolute -right-1 -bottom-1 ring-2 ring-base" />
    </span>
  );
}
