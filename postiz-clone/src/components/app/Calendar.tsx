"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ChannelAvatar } from "@/components/ui/Provider";
import type { Channel, Post } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";

export type CalendarView = "day" | "week" | "month";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64;

const STATUS_BAR: Record<Post["status"], string> = {
  scheduled: "bg-primary",
  published: "bg-success",
  draft: "bg-faint",
  error: "bg-danger",
};

export function PostChip({
  post,
  channels,
  onOpen,
  compact,
}: {
  post: Post;
  channels: Channel[];
  onOpen: (p: Post) => void;
  compact?: boolean;
}) {
  const chans = post.channelIds.map((id) => channels.find((c) => c.id === id)).filter(Boolean) as Channel[];
  const text = post.parts[0]?.content ?? "";
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/post-id", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(post);
      }}
      title={`${format(new Date(post.scheduledAt), "EEE d MMM, HH:mm")} · ${post.status}`}
      className={cn(
        "group relative flex w-full cursor-grab items-start gap-1.5 overflow-hidden rounded-md border border-border bg-surface-2 text-left transition hover:border-primary/60 active:cursor-grabbing",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        post.status === "draft" && "border-dashed",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-0.5", STATUS_BAR[post.status])} />
      <span className="ml-0.5 flex shrink-0 -space-x-1.5">
        {chans.slice(0, 3).map((c) => (
          <ChannelAvatar key={c.id} channel={c} size={compact ? 14 : 18} />
        ))}
        {chans.length > 3 && <span className="ml-1 text-[10px] text-faint">+{chans.length - 3}</span>}
      </span>
      <span className={cn("min-w-0 flex-1 leading-tight text-muted group-hover:text-text", compact ? "text-[10px]" : "text-[11px]")}>
        {!compact && <span className="mr-1 text-faint">{format(new Date(post.scheduledAt), "HH:mm")}</span>}
        <span className={cn(compact ? "line-clamp-1" : "line-clamp-2")}>{truncate(text, 90) || "Empty post"}</span>
      </span>
    </button>
  );
}

function DropCell({
  date,
  onCreate,
  onDrop,
  className,
  children,
  hint = true,
}: {
  date: Date;
  onCreate: (d: Date) => void;
  onDrop: (postId: string, d: Date) => void;
  className?: string;
  children?: React.ReactNode;
  hint?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={() => onCreate(date)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/post-id");
        if (id) onDrop(id, date);
      }}
      className={cn("group/cell relative cursor-pointer transition-colors", over && "bg-primary/10", className)}
    >
      {children}
      {hint && (
        <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-primary/80 p-0.5 text-white group-hover/cell:block">
          <Plus size={10} />
        </span>
      )}
    </div>
  );
}

export function Calendar({
  posts,
  channels,
  onCreate,
  onOpen,
  onMove,
}: {
  posts: Post[];
  channels: Channel[];
  onCreate: (d: Date) => void;
  onOpen: (p: Post) => void;
  onMove: (postId: string, d: Date) => void;
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view !== "month" && scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 7.5;
  }, [view]);

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [view, cursor]);

  const label =
    view === "day"
      ? format(cursor, "EEEE, d MMMM yyyy")
      : view === "week"
        ? `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`
        : format(cursor, "MMMM yyyy");

  const move = (dir: 1 | -1) =>
    setCursor((c) => (view === "day" ? addDays(c, dir) : view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));

  const postsOn = (day: Date, hour?: number) =>
    posts
      .filter((p) => {
        const d = new Date(p.scheduledAt);
        return isSameDay(d, day) && (hour === undefined || d.getHours() === hour);
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const at = (day: Date, hour: number, minute = 0) => {
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const dropKeepingTime = (postId: string, day: Date) => {
    const p = posts.find((x) => x.id === postId);
    const src = p ? new Date(p.scheduledAt) : new Date();
    onMove(postId, at(day, src.getHours(), src.getMinutes()));
  };

  return (
    <div className="card flex h-[calc(100vh-9.5rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label="Previous">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label="Next">
            <ChevronRight size={16} />
          </Button>
          <span className="ml-2 text-sm font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("rounded-md px-3 py-1.5 capitalize transition", view === v ? "bg-primary text-white" : "text-muted hover:text-text")}>
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => onCreate(at(new Date(), new Date().getHours() + 1))}>
            <Plus size={14} /> Create post
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-medium uppercase tracking-wider text-faint">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
            {days.map((day) => {
              const list = postsOn(day);
              return (
                <DropCell
                  key={day.toISOString()}
                  date={at(day, 10)}
                  onCreate={onCreate}
                  onDrop={dropKeepingTime}
                  className={cn("min-h-[110px] border-b border-r border-border p-1.5", !isSameMonth(day, cursor) && "bg-base/60 opacity-60")}
                >
                  <div className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday(day) ? "bg-primary font-semibold text-white" : "text-muted")}>{format(day, "d")}</div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((p) => (
                      <PostChip key={p.id} post={p} channels={channels} onOpen={onOpen} compact />
                    ))}
                    {list.length > 3 && (
                      <button
                        className="w-full text-left text-[10px] text-accent hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCursor(day);
                          setView("day");
                        }}
                      >
                        +{list.length - 3} more
                      </button>
                    )}
                  </div>
                </DropCell>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className={cn("border-l border-border py-2 text-center", isToday(day) && "bg-primary/5")}>
                <div className="text-[11px] uppercase tracking-wider text-faint">{format(day, "EEE")}</div>
                <div className={cn("mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm", isToday(day) ? "bg-primary font-semibold text-white" : "")}>{format(day, "d")}</div>
              </div>
            ))}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
              {HOURS.map((h) => (
                <div key={h} className="contents">
                  <div className="relative border-b border-border pr-2 text-right text-[11px] text-faint" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute right-2 top-1">{String(h).padStart(2, "0")}:00</span>
                  </div>
                  {days.map((day) => {
                    const list = postsOn(day, h);
                    return (
                      <DropCell
                        key={`${day.toISOString()}-${h}`}
                        date={at(day, h)}
                        onCreate={onCreate}
                        onDrop={(id, d) => onDrop(id, d, posts, onMove)}
                        className={cn("border-b border-l border-border p-1", isToday(day) && "bg-primary/[0.03]")}
                      >
                        <div className="flex flex-col gap-1" style={{ minHeight: HOUR_HEIGHT - 10 }}>
                          {list.map((p) => (
                            <PostChip key={p.id} post={p} channels={channels} onOpen={onOpen} compact={days.length > 1 && list.length > 1} />
                          ))}
                        </div>
                      </DropCell>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function onDrop(postId: string, target: Date, posts: Post[], onMove: (id: string, d: Date) => void) {
  const p = posts.find((x) => x.id === postId);
  const src = p ? new Date(p.scheduledAt) : new Date();
  const d = new Date(target);
  d.setMinutes(src.getMinutes());
  onMove(postId, d);
}
