"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Copy,
  ImagePlus,
  MessageSquare,
  PenLine,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, Field, Modal } from "@/components/ui";
import { ChannelAvatar } from "@/components/ui/Provider";
import { AI_IDEAS, PROVIDER_MAP, makeId } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Channel, Post, PostPart } from "@/lib/types";
import { cn, formatDateTime, toLocalInputValue } from "@/lib/utils";
import { PostPreview } from "./Preview";

const STOCK = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&q=80",
];

function emptyPart(): PostPart {
  return { id: makeId("pt"), content: "", media: [] };
}

export function Composer({
  open,
  onClose,
  post,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  post: Post | null;
  initialDate: Date | null;
}) {
  const { state, upsertPost, deletePost, duplicatePost, addComment, toast } = useStore();
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [parts, setParts] = useState<PostPart[]>([emptyPart()]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [when, setWhen] = useState("");
  const [repeatDays, setRepeatDays] = useState(0);
  const [tags, setTags] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [aiFor, setAiFor] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [comment, setComment] = useState("");
  const [customer, setCustomer] = useState<string>("all");

  // (Re)initialise when opened.
  useEffect(() => {
    if (!open) return;
    if (post) {
      setChannelIds(post.channelIds);
      setParts(post.parts.length ? post.parts : [emptyPart()]);
      setOverrides(post.overrides ?? {});
      setWhen(toLocalInputValue(post.scheduledAt));
      setRepeatDays(post.repeatDays ?? 0);
      setTags(post.tags.join(", "));
      setPreviewId(post.channelIds[0] ?? null);
    } else {
      const preferred = state.channels.filter((c) => c.preferred && !c.disabled).map((c) => c.id);
      setChannelIds(preferred);
      const sig = state.signatures.find((s) => s.autoAdd);
      setParts([{ ...emptyPart(), content: sig ? `\n\n${sig.content}` : "" }]);
      setOverrides({});
      const d = initialDate ?? new Date(Date.now() + 3600_000);
      setWhen(toLocalInputValue(d.toISOString()));
      setRepeatDays(0);
      setTags("");
      setPreviewId(preferred[0] ?? null);
    }
    setCustomizing(false);
    setMediaFor(null);
    setAiFor(null);
    setComment("");
    setCustomer("all");
  }, [open, post, initialDate, state.channels, state.signatures]);

  const visibleChannels = state.channels.filter((c) => !c.disabled && (customer === "all" || c.customer === customer));
  const selected = channelIds.map((id) => state.channels.find((c) => c.id === id)).filter(Boolean) as Channel[];
  const previewChannel = selected.find((c) => c.id === previewId) ?? selected[0] ?? null;

  const maxChars = useMemo(() => (selected.length ? Math.min(...selected.map((c) => PROVIDER_MAP[c.provider].maxChars)) : 0), [selected]);
  const tightest = selected.find((c) => PROVIDER_MAP[c.provider].maxChars === maxChars);
  const firstLen = parts[0]?.content.length ?? 0;
  const over = maxChars > 0 && firstLen > maxChars;
  const canThread = selected.length === 0 || selected.every((c) => PROVIDER_MAP[c.provider].threads);

  const toggleChannel = (id: string) => {
    setChannelIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      if (!next.includes(previewId ?? "")) setPreviewId(next[0] ?? null);
      return next;
    });
  };

  const updatePart = (id: string, patch: Partial<PostPart>) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePart = (id: string) => setParts((ps) => (ps.length > 1 ? ps.filter((p) => p.id !== id) : ps));

  const insertSignature = (partId: string, text: string) => {
    const p = parts.find((x) => x.id === partId);
    if (!p) return;
    updatePart(partId, { content: `${p.content.trimEnd()}\n\n${text}` });
  };

  const runAi = (partId: string) => {
    const topic = aiTopic.trim() || "your product";
    const idea = AI_IDEAS[Math.floor(Math.random() * AI_IDEAS.length)].replace("{topic}", topic);
    updatePart(partId, { content: idea });
    setAiFor(null);
    setAiTopic("");
    toast("AI Copilot drafted a post (demo)", "info");
  };

  const build = (status: Post["status"]): Post | null => {
    if (channelIds.length === 0) {
      toast("Select at least one channel", "error");
      return null;
    }
    if (!parts[0]?.content.trim() && parts[0]?.media.length === 0) {
      toast("Write something first", "error");
      return null;
    }
    if (over) {
      toast(`Too long for ${tightest ? PROVIDER_MAP[tightest.provider].name : "a channel"} (${maxChars} max)`, "error");
      return null;
    }
    const scheduledAt = status === "published" ? new Date().toISOString() : new Date(when || Date.now()).toISOString();
    return {
      id: post?.id ?? makeId("post"),
      channelIds,
      parts,
      overrides,
      scheduledAt,
      status,
      createdAt: post?.createdAt ?? new Date().toISOString(),
      comments: post?.comments ?? [],
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      repeatDays,
    };
  };

  const save = (status: Post["status"]) => {
    const p = build(status);
    if (!p) return;
    upsertPost(p);
    toast(status === "draft" ? "Draft saved" : status === "published" ? `Published to ${channelIds.length} channel${channelIds.length > 1 ? "s" : ""}` : `Scheduled for ${formatDateTime(p.scheduledAt)}`);
    onClose();
  };

  const title = post ? (
    <span className="flex items-center gap-2">
      Edit post <Badge tone={post.status === "published" ? "success" : post.status === "error" ? "danger" : post.status === "draft" ? "neutral" : "primary"}>{post.status}</Badge>
    </span>
  ) : (
    "Create post"
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="grid lg:grid-cols-[1fr_380px]">
        {/* -------- editor -------- */}
        <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium text-muted">Select channels</div>
            {state.customers.length > 0 && (
              <select className="input h-8 w-auto py-0 text-xs" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="all">All customers</option>
                {state.customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {visibleChannels.map((c) => {
              const on = channelIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleChannel(c.id)} title={`${c.name} · ${PROVIDER_MAP[c.provider].name}`} className={cn("rounded-full ring-2 ring-offset-2 ring-offset-surface transition", on ? "ring-primary" : "ring-transparent opacity-50 hover:opacity-90")}>
                  <ChannelAvatar channel={c} size={40} />
                </button>
              );
            })}
            {visibleChannels.length === 0 && <span className="text-xs text-faint">No channels yet. Add one from the sidebar.</span>}
          </div>

          <div className="mt-5 space-y-3">
            {parts.map((part, idx) => (
              <div key={part.id} className="rounded-xl border border-border bg-surface-2">
                {idx > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-faint">
                    <span>{canThread ? `Thread · part ${idx + 1}` : `Comment ${idx}`}</span>
                    <button onClick={() => removePart(part.id)} className="text-faint hover:text-danger" aria-label="Remove part">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <textarea
                  className="min-h-[120px] w-full resize-y bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-faint"
                  placeholder={idx === 0 ? "What do you want to share?" : "Continue the thread…"}
                  value={part.content}
                  onChange={(e) => updatePart(part.id, { content: e.target.value })}
                />
                {part.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    {part.media.map((m) => (
                      <div key={m} className="relative h-16 w-24 overflow-hidden rounded-md bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => updatePart(part.id, { media: part.media.filter((x) => x !== m) })} className="absolute -right-1.5 -top-1.5 rounded-full bg-base p-0.5 text-muted hover:text-danger" aria-label="Remove image">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5">
                  <ToolbarButton icon={<ImagePlus size={15} />} label="Media" onClick={() => setMediaFor(mediaFor === part.id ? null : part.id)} active={mediaFor === part.id} />
                  <ToolbarButton icon={<Sparkles size={15} />} label="AI Copilot" onClick={() => setAiFor(aiFor === part.id ? null : part.id)} active={aiFor === part.id} />
                  {state.signatures.length > 0 && (
                    <select className="h-7 rounded-md border border-border bg-transparent px-1.5 text-xs text-muted" value="" onChange={(e) => e.target.value && insertSignature(part.id, e.target.value)}>
                      <option value="">Signature…</option>
                      {state.signatures.map((s) => (
                        <option key={s.id} value={s.content}>
                          {s.content.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                  )}
                  {idx === 0 && state.sets.length > 0 && !post && (
                    <select
                      className="h-7 rounded-md border border-border bg-transparent px-1.5 text-xs text-muted"
                      value=""
                      onChange={(e) => {
                        const set = state.sets.find((s) => s.id === e.target.value);
                        if (!set) return;
                        setChannelIds(set.channelIds.filter((id) => state.channels.some((c) => c.id === id)));
                        updatePart(part.id, { content: set.content });
                        setPreviewId(set.channelIds[0] ?? null);
                      }}
                    >
                      <option value="">Use a set…</option>
                      {state.sets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="ml-auto text-[11px] tabular-nums">
                    {idx === 0 && maxChars > 0 ? (
                      <span className={over ? "text-danger" : "text-faint"}>
                        {firstLen}/{maxChars}
                        {tightest && <span className="ml-1 text-faint">({PROVIDER_MAP[tightest.provider].name})</span>}
                      </span>
                    ) : (
                      <span className="text-faint">{part.content.length}</span>
                    )}
                  </span>
                </div>
                {mediaFor === part.id && (
                  <div className="border-t border-border p-3">
                    <div className="mb-2 text-[11px] text-faint">Pick a demo image, or paste an image URL.</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {STOCK.map((s) => (
                        <button key={s} onClick={() => updatePart(part.id, { media: [...part.media, s] })} className="aspect-video overflow-hidden rounded-md border border-border bg-surface hover:border-primary" aria-label="Add demo image">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <input
                      className="input mt-2"
                      placeholder="https://…/image.jpg  (press Enter)"
                      onKeyDown={(e) => {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (e.key === "Enter" && v) {
                          updatePart(part.id, { media: [...part.media, v] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                )}
                {aiFor === part.id && (
                  <div className="border-t border-border p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-accent">
                      <Sparkles size={12} /> AI Copilot (demo) — describe the topic and we draft a post
                    </div>
                    <div className="flex gap-2">
                      <input className="input" placeholder="e.g. our new analytics dashboard" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAi(part.id)} autoFocus />
                      <Button size="sm" onClick={() => runAi(part.id)}>
                        Generate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setParts((ps) => [...ps, emptyPart()])} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
              <Plus size={14} /> {canThread ? "Add to thread" : "Add a comment"}
            </button>
          </div>

          {post && (
            <div className="mt-6 rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted">
                <MessageSquare size={14} /> Team comments ({post.comments.length})
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto p-3">
                {post.comments.length === 0 && <div className="text-xs text-faint">No comments yet. Ask a teammate for feedback.</div>}
                {post.comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-medium">{c.author}</span> <span className="text-faint">· {formatDateTime(c.at)}</span>
                    <p className="mt-0.5 text-muted">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-border p-2">
                <input className="input h-8" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!comment.trim()) return;
                    addComment(post.id, comment.trim());
                    setComment("");
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* -------- preview -------- */}
        <div className="flex flex-col bg-base/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-medium text-muted">Preview</div>
            {previewChannel && (
              <button onClick={() => setCustomizing((v) => !v)} className={cn("flex items-center gap-1 text-[11px]", customizing ? "text-accent" : "text-faint hover:text-text")}>
                <PenLine size={12} /> {customizing ? "Editing this channel" : "Customize for this channel"}
              </button>
            )}
          </div>
          {selected.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selected.map((c) => (
                <button key={c.id} onClick={() => setPreviewId(c.id)} className={cn("rounded-full ring-2 ring-offset-2 ring-offset-base transition", previewChannel?.id === c.id ? "ring-primary" : "ring-transparent opacity-60 hover:opacity-100")}>
                  <ChannelAvatar channel={c} size={28} />
                </button>
              ))}
            </div>
          )}
          {previewChannel ? (
            <>
              {customizing && (
                <div className="mb-3">
                  <textarea
                    className="input min-h-[90px] resize-y"
                    placeholder={`Custom text for ${previewChannel.name} (leave empty to use the main text)`}
                    value={overrides[previewChannel.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOverrides((o) => {
                        const next = { ...o };
                        if (v) next[previewChannel.id] = v;
                        else delete next[previewChannel.id];
                        return next;
                      });
                    }}
                  />
                  <div className="mt-1 text-[11px] text-faint">
                    {(overrides[previewChannel.id] ?? "").length}/{PROVIDER_MAP[previewChannel.provider].maxChars}
                  </div>
                </div>
              )}
              <PostPreview channel={previewChannel} parts={parts} override={overrides[previewChannel.id]} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-xs text-faint">Select a channel to see how your post will look.</div>
          )}
        </div>
      </div>

      {/* -------- footer -------- */}
      <div className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Field label="Schedule for">
            <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Repeat">
            <select className="input" value={repeatDays} onChange={(e) => setRepeatDays(Number(e.target.value))}>
              <option value={0}>Don’t repeat</option>
              <option value={1}>Every day</option>
              <option value={7}>Every week</option>
              <option value={14}>Every 2 weeks</option>
              <option value={30}>Every month</option>
            </select>
          </Field>
          <Field label="Tags">
            <input className="input" placeholder="launch, evergreen" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {post && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  duplicatePost(post.id);
                  toast("Post duplicated as a draft for tomorrow");
                  onClose();
                }}
              >
                <Copy size={14} /> Duplicate
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  deletePost(post.id);
                  toast("Post deleted", "info");
                  onClose();
                }}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button variant="secondary" onClick={() => save("published")}>
            <Send size={14} /> Post now
          </Button>
          <Button onClick={() => save("scheduled")}>
            <CalendarClock size={14} /> {post && post.status !== "draft" ? "Update" : "Add to calendar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ToolbarButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition", active ? "bg-primary/20 text-accent" : "text-muted hover:bg-white/5 hover:text-text")}>
      {icon} {label}
    </button>
  );
}
