"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Table2 } from "lucide-react";
import { BarChart, DataTable, Heatmap, LineChart, type Point } from "@/components/app/Charts";
import { SectionTitle } from "@/components/ui";
import { ChannelAvatar } from "@/components/ui/Provider";
import { PROVIDER_MAP } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, formatCompact, seededRandom } from "@/lib/utils";

const PERIODS = [7, 30, 90] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BUCKETS = ["0–3", "3–6", "6–9", "9–12", "12–15", "15–18", "18–21", "21–24"];

export default function AnalyticsPage() {
  const { state } = useStore();
  const [channelId, setChannelId] = useState("all");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(30);
  const [table, setTable] = useState<"followers" | "impressions" | null>(null);

  const channels = channelId === "all" ? state.channels : state.channels.filter((c) => c.id === channelId);
  const seed: number = channels.reduce((a: number, c) => a + c.id.split("").reduce((x, ch) => x + ch.charCodeAt(0), 0), Number(period));

  const data = useMemo(() => {
    const rnd = seededRandom(seed || 1);
    const totalFollowers = channels.reduce((a, c) => a + c.followers, 0);
    const growth = Math.round(totalFollowers * (0.03 + rnd() * 0.05));
    const start = totalFollowers - growth;
    const followers: Point[] = [];
    const impressions: Point[] = [];
    let f = start;
    for (let i = period - 1; i >= 0; i -= 1) {
      const d = subDays(new Date(), i);
      f += Math.round((growth / period) * (0.4 + rnd() * 1.2));
      followers.push({ label: format(d, period > 30 ? "d MMM" : "d MMM"), value: Math.min(f, totalFollowers) });
      impressions.push({ label: format(d, "d MMM"), value: Math.round(totalFollowers * (0.15 + rnd() * 0.5)) });
    }
    followers[followers.length - 1].value = totalFollowers;
    const weekday: Point[] = DAYS.map((d) => ({ label: d, value: Math.round(totalFollowers * (0.5 + rnd() * 0.6)) }));
    const heat = DAYS.map(() => BUCKETS.map(() => Math.round(1 + rnd() * 9)));
    // make a plausible peak
    heat[1][3] = 10;
    heat[3][4] = 9;
    heat[6][0] = 1;
    const impTotal = impressions.reduce((a, p) => a + p.value, 0);
    const engagement = 2.1 + rnd() * 3;
    return { followers, impressions, weekday, heat, growth, impTotal, engagement, totalFollowers };
  }, [seed, channels, period]);

  const published = state.posts.filter((p) => p.status === "published" && p.channelIds.some((id) => channels.some((c) => c.id === id)));
  const topPosts = useMemo(() => {
    const rnd = seededRandom(seed + 7);
    return published
      .map((p) => ({ post: p, likes: Math.round(20 + rnd() * 900), comments: Math.round(rnd() * 80), reach: Math.round(500 + rnd() * 20000) }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);
  }, [published, seed]);

  const tiles = [
    { label: "Followers", value: formatCompact(data.totalFollowers), delta: `+${formatCompact(data.growth)}`, up: true },
    { label: "Impressions", value: formatCompact(data.impTotal), delta: `+${(8 + (seed % 20)).toFixed(0)}%`, up: true },
    { label: "Engagement rate", value: `${data.engagement.toFixed(1)}%`, delta: `${seed % 3 === 0 ? "-" : "+"}0.${seed % 9}%`, up: seed % 3 !== 0 },
    { label: "Posts published", value: String(published.length), delta: `last ${period} days`, up: true, neutral: true },
  ];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Analytics"
        description="Follower growth, reach and engagement for every connected channel."
        action={
          <div className="flex items-center gap-2">
            <select className="input h-9 w-auto py-0 text-xs" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <option value="all">All channels</option>
              {state.channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {PROVIDER_MAP[c.provider].name}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={cn("rounded-md px-3 py-1.5 transition", period === p ? "bg-primary text-white" : "text-muted hover:text-text")}>
                  {p}d
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{t.value}</div>
            <div className={cn("mt-1 flex items-center gap-1 text-xs", t.neutral ? "text-faint" : t.up ? "text-[#5fd99a]" : "text-[#ff8a8e]")}>
              {!t.neutral && (t.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
              {t.delta}
              {!t.neutral && <span className="text-faint"> vs previous {period}d</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Follower growth" subtitle={`Total followers, last ${period} days`} onTable={() => setTable(table === "followers" ? null : "followers")} tableOn={table === "followers"}>
          {table === "followers" ? <DataTable data={data.followers} /> : <LineChart data={data.followers} />}
        </ChartCard>
        <ChartCard title="Impressions" subtitle={`Daily impressions, last ${period} days`} onTable={() => setTable(table === "impressions" ? null : "impressions")} tableOn={table === "impressions"}>
          {table === "impressions" ? <DataTable data={data.impressions} /> : <BarChart data={period > 30 ? bucketWeekly(data.impressions) : data.impressions} />}
        </ChartCard>
        <ChartCard title="Best time to post" subtitle="Average engagement by weekday and hour (UTC)">
          <Heatmap rows={DAYS} cols={BUCKETS} values={data.heat} />
        </ChartCard>
        <ChartCard title="Reach by weekday" subtitle="Average impressions per published post">
          <BarChart data={data.weekday} height={200} />
        </ChartCard>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Top posts</div>
        {topPosts.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-faint">No published posts in this range yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-faint">
              <tr>
                <th className="px-5 py-2 font-medium">Post</th>
                <th className="px-3 py-2 text-right font-medium">Likes</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Comments</th>
                <th className="px-5 py-2 text-right font-medium">Reach</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map(({ post, likes, comments, reach }) => (
                <tr key={post.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex -space-x-2">
                        {post.channelIds.slice(0, 3).map((id) => {
                          const c = state.channels.find((x) => x.id === id);
                          return c ? <ChannelAvatar key={id} channel={c} size={24} /> : null;
                        })}
                      </span>
                      <span className="line-clamp-1 text-muted">{post.parts[0]?.content}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{likes}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{comments}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCompact(reach)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function bucketWeekly(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const slice = points.slice(i, i + 7);
    out.push({ label: slice[0].label, value: slice.reduce((a, p) => a + p.value, 0) });
  }
  return out;
}

function ChartCard({ title, subtitle, children, onTable, tableOn }: { title: string; subtitle: string; children: React.ReactNode; onTable?: () => void; tableOn?: boolean }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
        {onTable && (
          <button onClick={onTable} className={cn("rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-text", tableOn && "bg-primary/20 text-accent")} aria-label="Toggle table view" title="Table view">
            <Table2 size={16} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
