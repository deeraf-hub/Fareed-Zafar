"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { Badge, Button, Field, Modal, SectionTitle, Toggle } from "@/components/ui";
import { ChannelAvatar } from "@/components/ui/Provider";
import { AddChannelModal } from "@/components/app/AddChannelModal";
import { PROVIDER_MAP } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { TeamMember } from "@/lib/types";
import { cn, formatCompact } from "@/lib/utils";

const TABS = [
  { id: "channels", label: "Channels" },
  { id: "team", label: "Team" },
  { id: "webhooks", label: "Webhooks" },
  { id: "autopost", label: "Auto post" },
  { id: "signatures", label: "Signatures" },
  { id: "sets", label: "Sets" },
  { id: "api", label: "Public API" },
  { id: "danger", label: "Danger zone" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = (params.get("tab") as Tab) || "channels";
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initial) ? initial : "channels");
  const go = (t: Tab) => {
    setTab(t);
    router.replace(`/settings?tab=${t}`);
  };
  return (
    <div className="space-y-5">
      <SectionTitle title="Settings" description="Channels, team, automations and developer access for this workspace." />
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 text-xs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 transition", tab === t.id ? "bg-primary text-white" : "text-muted hover:text-text", t.id === "danger" && tab !== t.id && "text-[#ff8a8e]/80")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "channels" && <ChannelsTab />}
      {tab === "team" && <TeamTab />}
      {tab === "webhooks" && <WebhooksTab />}
      {tab === "autopost" && <AutopostTab />}
      {tab === "signatures" && <SignaturesTab />}
      {tab === "sets" && <SetsTab />}
      {tab === "api" && <ApiTab />}
      {tab === "danger" && <DangerTab />}
    </div>
  );
}

function ChannelPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { state } = useStore();
  return (
    <div className="flex flex-wrap gap-2">
      {state.channels.map((c) => {
        const on = value.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])} className={cn("rounded-full ring-2 ring-offset-2 ring-offset-surface", on ? "ring-primary" : "ring-transparent opacity-50")} title={c.name}>
            <ChannelAvatar channel={c} size={30} />
          </button>
        );
      })}
    </div>
  );
}

function ChannelsTab() {
  const { state, removeChannel, updateChannel, addCustomer, toast } = useStore();
  const [add, setAdd] = useState(false);
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="text-sm font-semibold">Connected channels ({state.channels.length})</div>
        <Button size="sm" onClick={() => setAdd(true)}>
          <Plus size={14} /> Add channel
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {state.channels.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-3 text-sm">
            <ChannelAvatar channel={c} size={36} dimmed={c.disabled} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                {c.preferred && (
                  <Badge tone="primary">
                    <Star size={10} /> preferred
                  </Badge>
                )}
                {c.disabled && <Badge tone="warning">disabled</Badge>}
              </div>
              <div className="text-xs text-muted">
                {PROVIDER_MAP[c.provider].name} · {c.handle} · {formatCompact(c.followers)} followers
              </div>
            </div>
            <input
              className="input h-8 w-36 text-xs"
              placeholder="Customer"
              defaultValue={c.customer ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateChannel(c.id, { customer: v || undefined });
                if (v) addCustomer(v);
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => updateChannel(c.id, { preferred: !c.preferred })} title="Preselect in the editor">
              <Star size={14} className={c.preferred ? "fill-accent text-accent" : ""} />
            </Button>
            <Toggle checked={!c.disabled} label="Enabled" onChange={(v) => updateChannel(c.id, { disabled: !v })} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Disconnect ${c.name}? Posts that only target this channel will be removed.`)) {
                  removeChannel(c.id);
                  toast("Channel disconnected", "info");
                }
              }}
              aria-label="Disconnect"
            >
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ul>
      <AddChannelModal open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

function TeamTab() {
  const { state, inviteMember, removeMember, toast } = useStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("editor");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Members ({state.team.length})</div>
        <ul className="divide-y divide-border">
          {state.team.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">{m.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted">{m.email}</div>
              </div>
              <Badge tone={m.status === "invited" ? "warning" : "neutral"}>{m.status === "invited" ? "invited" : m.role}</Badge>
              {m.role !== "admin" && (
                <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)} aria-label="Remove">
                  <Trash2 size={14} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          inviteMember({ name: email.split("@")[0], email, role });
          toast(`Invitation sent to ${email}`);
          setEmail("");
        }}
      >
        <div className="text-sm font-semibold">Invite a teammate</div>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
        </Field>
        <Field label="Role" hint="Admins manage billing; editors create and schedule; viewers comment only.">
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as TeamMember["role"])}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <Button type="submit" className="w-full">
          Send invite
        </Button>
      </form>
    </div>
  );
}

function WebhooksTab() {
  const { state, addWebhook, removeWebhook, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [chs, setChs] = useState<string[]>([]);
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <div className="text-sm font-semibold">Webhooks</div>
          <div className="text-xs text-muted">We call your URL when a post is published or fails, so n8n, Make or your own code can react.</div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add webhook
        </Button>
      </div>
      {state.webhooks.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-faint">No webhooks yet.</div>
      ) : (
        <ul className="divide-y divide-border">
          {state.webhooks.map((w) => (
            <li key={w.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{w.name}</div>
                <div className="truncate font-mono text-xs text-muted">{w.url}</div>
              </div>
              <span className="flex -space-x-2">
                {w.channelIds.map((id) => {
                  const c = state.channels.find((x) => x.id === id);
                  return c ? <ChannelAvatar key={id} channel={c} size={22} /> : null;
                })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeWebhook(w.id)} aria-label="Delete">
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add webhook" size="sm">
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !url) return;
            addWebhook({ name, url, channelIds: chs });
            toast("Webhook added");
            setOpen(false);
            setName("");
            setUrl("");
            setChs([]);
          }}
        >
          <Field label="Name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Slack notifier" />
          </Field>
          <Field label="URL">
            <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/…" />
          </Field>
          <Field label="Channels (empty = all)">
            <ChannelPicker value={chs} onChange={setChs} />
          </Field>
          <Button type="submit" className="w-full">
            Save webhook
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function AutopostTab() {
  const { state, addFeed, removeFeed, toggleFeed, toast } = useStore();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [chs, setChs] = useState<string[]>([]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="border-b border-border px-5 py-3">
          <div className="text-sm font-semibold">RSS auto-posting</div>
          <div className="text-xs text-muted">Every new item in a feed becomes a post on the selected channels.</div>
        </div>
        {state.feeds.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-faint">No feeds yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {state.feeds.map((f) => (
              <li key={f.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{f.name}</div>
                  <div className="truncate font-mono text-xs text-muted">{f.url}</div>
                </div>
                <span className="flex -space-x-2">
                  {f.channelIds.map((id) => {
                    const c = state.channels.find((x) => x.id === id);
                    return c ? <ChannelAvatar key={id} channel={c} size={22} /> : null;
                  })}
                </span>
                <Toggle checked={f.enabled} onChange={() => toggleFeed(f.id)} label="Enabled" />
                <Button variant="ghost" size="sm" onClick={() => removeFeed(f.id)} aria-label="Delete">
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url) return;
          addFeed({ name: name || new URL(url).hostname, url, channelIds: chs, enabled: true });
          toast("Feed added");
          setName("");
          setUrl("");
          setChs([]);
        }}
      >
        <div className="text-sm font-semibold">Add a feed</div>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company blog" />
        </Field>
        <Field label="Feed URL">
          <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://blog.example.com/rss.xml" />
        </Field>
        <Field label="Post to">
          <ChannelPicker value={chs} onChange={setChs} />
        </Field>
        <Button type="submit" className="w-full">
          Add feed
        </Button>
      </form>
    </div>
  );
}

function SignaturesTab() {
  const { state, addSignature, removeSignature, toggleSignatureAuto, toast } = useStore();
  const [content, setContent] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="border-b border-border px-5 py-3">
          <div className="text-sm font-semibold">Signatures</div>
          <div className="text-xs text-muted">Reusable sign-offs you can insert into any post. One can be added automatically.</div>
        </div>
        <ul className="divide-y divide-border">
          {state.signatures.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-muted">{s.content}</p>
              <label className="flex items-center gap-2 text-xs text-faint">
                auto-add <Toggle checked={s.autoAdd} onChange={() => toggleSignatureAuto(s.id)} label="Auto add" />
              </label>
              <Button variant="ghost" size="sm" onClick={() => removeSignature(s.id)} aria-label="Delete">
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!content.trim()) return;
          addSignature({ content: content.trim(), autoAdd: false });
          toast("Signature saved");
          setContent("");
        }}
      >
        <div className="text-sm font-semibold">New signature</div>
        <textarea className="input min-h-[100px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="— Follow us for more: @brand" />
        <Button type="submit" className="w-full">
          Save signature
        </Button>
      </form>
    </div>
  );
}

function SetsTab() {
  const { state, addSet, removeSet, toast } = useStore();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [chs, setChs] = useState<string[]>([]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="border-b border-border px-5 py-3">
          <div className="text-sm font-semibold">Sets</div>
          <div className="text-xs text-muted">Templates that preselect channels and prefill text. Load one from the editor toolbar.</div>
        </div>
        <ul className="divide-y divide-border">
          {state.sets.map((s) => (
            <li key={s.id} className="flex items-start gap-4 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.name}</div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted">{s.content}</p>
              </div>
              <span className="flex -space-x-2">
                {s.channelIds.map((id) => {
                  const c = state.channels.find((x) => x.id === id);
                  return c ? <ChannelAvatar key={id} channel={c} size={22} /> : null;
                })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeSet(s.id)} aria-label="Delete">
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addSet({ name: name.trim(), content, channelIds: chs });
          toast("Set saved");
          setName("");
          setContent("");
          setChs([]);
        }}
      >
        <div className="text-sm font-semibold">New set</div>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly tip" />
        </Field>
        <Field label="Template text">
          <textarea className="input min-h-[90px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="💡 Tip of the week: …" />
        </Field>
        <Field label="Channels">
          <ChannelPicker value={chs} onChange={setChs} />
        </Field>
        <Button type="submit" className="w-full">
          Save set
        </Button>
      </form>
    </div>
  );
}

function ApiTab() {
  const { state, regenerateApiKey, toast } = useStore();
  const [show, setShow] = useState(false);
  const masked = `${state.apiKey.slice(0, 12)}${"•".repeat(20)}`;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <div className="text-sm font-semibold">API key</div>
        <p className="mt-1 text-xs text-muted">Use it as the Authorization header against the public API, or paste it into the n8n / Make / Zapier integrations.</p>
        <div className="mt-4 flex items-center gap-2">
          <code className="input flex-1 truncate font-mono text-xs">{show ? state.apiKey : masked}</code>
          <Button variant="secondary" size="sm" onClick={() => setShow((v) => !v)} aria-label="Toggle visibility">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(state.apiKey);
              toast("API key copied");
            }}
            aria-label="Copy"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm("Regenerate the key? Existing integrations will stop working.")) {
                regenerateApiKey();
                toast("New API key generated", "info");
              }
            }}
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>
      <div className="card p-5">
        <div className="text-sm font-semibold">Quick start</div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-base p-4 text-xs leading-relaxed text-muted">
          {`curl -X POST https://api.postio.app/public/v1/posts \\
  -H "Authorization: ${show ? state.apiKey : "<your-api-key>"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "schedule",
    "date": "2026-11-12T09:00:00Z",
    "posts": [{
      "integration": { "id": "${state.channels[0]?.id ?? "<channel-id>"}" },
      "value": [{ "content": "Hello from the API 👋" }]
    }]
  }'`}
        </pre>
        <div className="mt-3 text-xs text-muted">
          Agents: connect through the MCP server at <code className="font-mono">https://api.postio.app/mcp/{"<key>"}</code> and ask Claude or ChatGPT to schedule for you.
        </div>
      </div>
    </div>
  );
}

function DangerTab() {
  const { resetDemo, toast } = useStore();
  return (
    <div className="card border-danger/40 p-5">
      <div className="text-sm font-semibold text-[#ff8a8e]">Reset demo data</div>
      <p className="mt-1 text-xs text-muted">Restores the sample channels, posts and settings. Your login stays. Everything in this demo lives in your browser&apos;s local storage.</p>
      <Button
        variant="danger"
        className="mt-4"
        onClick={() => {
          if (window.confirm("Reset all demo data?")) {
            resetDemo();
            toast("Demo data reset", "info");
          }
        }}
      >
        Reset workspace
      </Button>
    </div>
  );
}
