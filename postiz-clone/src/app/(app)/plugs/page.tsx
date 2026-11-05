"use client";

import { useState } from "react";
import { Plug2 } from "lucide-react";
import { EmptyState, Field, SectionTitle, Toggle } from "@/components/ui";
import { ChannelAvatar } from "@/components/ui/Provider";
import { PLUG_DEFINITIONS, PROVIDER_MAP, makeId } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Channel, Plug, PlugDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PlugsPage() {
  const { state } = useStore();
  const eligible = state.channels.filter((c) => PLUG_DEFINITIONS.some((d) => d.providers.includes(c.provider)));
  const [active, setActive] = useState<string>(eligible[0]?.id ?? "");
  const channel = eligible.find((c) => c.id === active) ?? eligible[0];

  return (
    <div className="space-y-5">
      <SectionTitle title="Plugs" description="Small automations that run after a post is published: auto-repost winners, add a follow-up comment, or cross-post." />
      {eligible.length === 0 ? (
        <EmptyState icon={<Plug2 size={28} />} title="No channels support Plugs yet" description="Connect X, LinkedIn, Threads, Bluesky or Mastodon to start automating engagement." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="card p-2">
            {eligible.map((c) => {
              const count = state.plugs.filter((p) => p.channelId === c.id && p.enabled).length;
              return (
                <button key={c.id} onClick={() => setActive(c.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition", channel?.id === c.id ? "bg-primary/15 text-text" : "text-muted hover:bg-white/5")}>
                  <ChannelAvatar channel={c} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    <span className="block text-[11px] text-faint">{PROVIDER_MAP[c.provider].name}</span>
                  </span>
                  {count > 0 && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-accent">{count} on</span>}
                </button>
              );
            })}
          </div>
          {channel && <PlugList channel={channel} />}
        </div>
      )}
    </div>
  );
}

function PlugList({ channel }: { channel: Channel }) {
  const { state, upsertPlug, toast } = useStore();
  const defs = PLUG_DEFINITIONS.filter((d) => d.providers.includes(channel.provider));
  return (
    <div className="space-y-3">
      {defs.map((def) => {
        const existing = state.plugs.find((p) => p.channelId === channel.id && p.type === def.type);
        return <PlugCard key={def.type} def={def} channel={channel} plug={existing} onChange={(p) => upsertPlug(p)} onToggle={(on) => toast(on ? `${def.title} enabled for ${channel.name}` : `${def.title} disabled`, "info")} />;
      })}
    </div>
  );
}

function PlugCard({ def, channel, plug, onChange, onToggle }: { def: PlugDefinition; channel: Channel; plug?: Plug; onChange: (p: Plug) => void; onToggle: (on: boolean) => void }) {
  const current: Plug = plug ?? { id: makeId("pl"), channelId: channel.id, type: def.type, enabled: false, config: {} };
  return (
    <div className={cn("card p-5 transition", current.enabled && "border-primary/50")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plug2 size={16} className={current.enabled ? "text-accent" : "text-faint"} /> {def.title}
          </div>
          <p className="mt-1 text-xs text-muted">{def.description}</p>
        </div>
        <Toggle
          checked={current.enabled}
          label={def.title}
          onChange={(v) => {
            onChange({ ...current, enabled: v });
            onToggle(v);
          }}
        />
      </div>
      <div className={cn("mt-4 grid gap-3 sm:grid-cols-2", !current.enabled && "opacity-50")}>
        {def.fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input type={f.type} className="input" placeholder={f.placeholder} value={current.config[f.key] ?? ""} disabled={!current.enabled} onChange={(e) => onChange({ ...current, config: { ...current.config, [f.key]: e.target.value } })} />
          </Field>
        ))}
      </div>
    </div>
  );
}
