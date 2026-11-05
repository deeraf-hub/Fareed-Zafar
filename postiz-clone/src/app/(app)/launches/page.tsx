"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/app/Calendar";
import { Composer } from "@/components/app/Composer";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEGEND: { status: Post["status"]; label: string; cls: string }[] = [
  { status: "scheduled", label: "Scheduled", cls: "bg-primary" },
  { status: "published", label: "Published", cls: "bg-success" },
  { status: "draft", label: "Draft", cls: "bg-faint" },
  { status: "error", label: "Failed", cls: "bg-danger" },
];

export default function LaunchesPage() {
  const { state, movePost, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [customer, setCustomer] = useState("all");
  const [statuses, setStatuses] = useState<Post["status"][]>(["scheduled", "published", "draft", "error"]);

  const channels = useMemo(() => state.channels.filter((c) => customer === "all" || c.customer === customer), [state.channels, customer]);
  const posts = useMemo(
    () => state.posts.filter((p) => statuses.includes(p.status) && p.channelIds.some((id) => channels.some((c) => c.id === id))),
    [state.posts, statuses, channels],
  );

  const counts = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 86400000;
    return {
      upcoming: state.posts.filter((p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() >= now && new Date(p.scheduledAt).getTime() < week).length,
      drafts: state.posts.filter((p) => p.status === "draft").length,
      failed: state.posts.filter((p) => p.status === "error").length,
    };
  }, [state.posts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Launches</h1>
          <p className="text-xs text-muted">
            {counts.upcoming} scheduled this week · {counts.drafts} drafts{counts.failed > 0 && <span className="text-[#ff8a8e]"> · {counts.failed} failed</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-[11px]">
            {LEGEND.map((l) => {
              const on = statuses.includes(l.status);
              return (
                <button key={l.status} onClick={() => setStatuses((s) => (on ? s.filter((x) => x !== l.status) : [...s, l.status]))} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 transition", on ? "bg-white/5 text-text" : "text-faint")}>
                  <span className={cn("h-2 w-2 rounded-full", l.cls, !on && "opacity-30")} /> {l.label}
                </button>
              );
            })}
          </div>
          {state.customers.length > 0 && (
            <select className="input h-9 w-auto py-0 text-xs" value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="all">All customers</option>
              {state.customers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <Calendar
        posts={posts}
        channels={state.channels}
        onCreate={(d) => {
          setEditing(null);
          setInitialDate(d);
          setOpen(true);
        }}
        onOpen={(p) => {
          setEditing(p);
          setInitialDate(null);
          setOpen(true);
        }}
        onMove={(id, d) => {
          movePost(id, d);
          toast("Post rescheduled");
        }}
      />

      <Composer open={open} onClose={() => setOpen(false)} post={editing} initialDate={initialDate} />
    </div>
  );
}
