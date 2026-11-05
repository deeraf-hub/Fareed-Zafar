"use client";

import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { PROVIDER_MAP } from "@/lib/data";
import type { Channel, PostPart } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/Provider";

/** A platform-flavoured preview card, like the right-hand pane of the real editor. */
export function PostPreview({ channel, parts, override }: { channel: Channel; parts: PostPart[]; override?: string }) {
  const provider = PROVIDER_MAP[channel.provider];
  const first = { ...parts[0], content: override ?? parts[0]?.content ?? "" };
  const rest = parts.slice(1);
  const isVisual = channel.provider === "instagram" || channel.provider === "pinterest" || channel.provider === "tiktok" || channel.provider === "youtube";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0f0e17] text-sm">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted">
        <ProviderBadge id={channel.provider} size={14} /> {provider.name} preview
      </div>
      <div className="p-4">
        {isVisual && (
          <div className={cn("mb-3 overflow-hidden rounded-lg border border-border bg-surface-2", channel.provider === "pinterest" || channel.provider === "tiktok" ? "aspect-[4/5]" : "aspect-video")}>
            {first.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={first.media[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-faint">Add an image or video to preview</div>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ background: channel.avatarColor }}>
            {initials(channel.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
              <span className="font-semibold">{channel.name}</span>
              <span className="text-faint">{channel.handle}</span>
              <span className="text-faint">· now</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-text/90">{first.content || <span className="text-faint">Your post will appear here…</span>}</p>
            {!isVisual && first.media.length > 0 && (
              <div className={cn("mt-3 grid gap-1 overflow-hidden rounded-xl border border-border", first.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {first.media.slice(0, 4).map((m) => (
                  <div key={m} className="aspect-video w-full bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between pr-6 text-faint">
              <MessageCircle size={16} />
              <Repeat2 size={16} />
              <Heart size={16} />
              <Share size={16} />
            </div>
          </div>
        </div>
        {rest.map((part, i) => (
          <div key={part.id} className="mt-3 flex gap-3 border-t border-border pt-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: channel.avatarColor }}>
              {initials(channel.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-faint">
                {channel.name} · {provider.threads ? `reply ${i + 1}` : "comment"}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-text/90">{part.content || <span className="text-faint">Empty</span>}</p>
              {part.media.length > 0 && (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={part.media[0]} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
