"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Point {
  label: string;
  value: number;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * p;
}

/** Nice step for ~`count` ticks across a range. */
function niceStep(range: number, count = 4): number {
  const raw = range / count;
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

/** Y domain for a line: starts near the minimum (a line needs no zero baseline), on nice tick values. */
function lineDomain(values: number[]): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = niceStep(Math.max(hi - lo, hi * 0.05 || 1));
  const min = Math.max(0, Math.floor((lo - step * 0.5) / step) * step);
  const max = Math.ceil((hi + step * 0.5) / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + 1e-9; t += step) ticks.push(t);
  return { min, max, ticks };
}

/** Axis formatter: `step` is the tick spacing, so 35,500 at a 500 step reads "35.5k" and not "36k". */
const fmt = (n: number, step = 1000) => {
  if (n < 1000) return String(Math.round(n));
  const decimals = step < 1000 ? (step < 100 ? 2 : 1) : 0;
  return `${(n / 1000).toFixed(decimals)}k`;
};

/** Single-series line/area chart with crosshair tooltip. Color is the chart's one hue; text uses text tokens. */
export function LineChart({ data, color = "#9085e9", height = 220, unit = "" }: { data: Point[]; color?: string; height?: number; unit?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const W = Math.max(200, width);
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const { min, max, ticks } = lineDomain(data.map((d) => d.value));
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1000;
  const x = (i: number) => pad.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.floor(iw / 70)));
  const gid = `g-${color.replace("#", "")}`;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={W}
        height={height}
        className="block"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - rect.left - pad.l;
          const i = Math.round((px / iw) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={0.07} />
            <text x={pad.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#9a98b1">
              {fmt(t, step)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#9a98b1">
              {d.label}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#ffffff" strokeOpacity={0.25} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill={color} stroke="#13121c" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg" style={{ left: x(hover), top: Math.max(0, y(data[hover].value) - 48) }}>
          <div className="text-faint">{data[hover].label}</div>
          <div className="font-semibold tabular-nums">
            {data[hover].value.toLocaleString()}
            {unit}
          </div>
        </div>
      )}
    </div>
  );
}

/** Single-hue bar chart, 4px rounded tops anchored to the baseline, 2px+ gaps, per-bar tooltip. */
export function BarChart({ data, color = "#9085e9", height = 220, unit = "" }: { data: Point[]; color?: string; height?: number; unit?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const W = Math.max(200, width);
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.value)) * 1.1);
  const slot = iw / data.length;
  const bw = Math.max(4, Math.min(40, slot * 0.6));
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.floor(iw / 56)));

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={W} height={height} className="block" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={0.07} />
            <text x={pad.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#9a98b1">
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(d.value);
          const h = Math.max(0, pad.t + ih - top);
          const r = Math.min(4, h / 2, bw / 2);
          const x0 = cx - bw / 2;
          const base = pad.t + ih;
          const path = h <= 0 ? "" : `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${base} Z`;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
              {path && <path d={path} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />}
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" fontSize={10} fill="#9a98b1">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg" style={{ left: pad.l + slot * hover + slot / 2, top: Math.max(0, y(data[hover].value) - 48) }}>
          <div className="text-faint">{data[hover].label}</div>
          <div className="font-semibold tabular-nums">
            {data[hover].value.toLocaleString()}
            {unit}
          </div>
        </div>
      )}
    </div>
  );
}

/** Sequential single-hue heatmap (days × time buckets). */
export function Heatmap({ rows, cols, values, color = "#9085e9" }: { rows: string[]; cols: string[]; values: number[][]; color?: string }) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(1, ...values.flat());
  return (
    <div className="relative">
      <div className="grid gap-1 text-[10px] text-muted" style={{ gridTemplateColumns: `36px repeat(${cols.length}, minmax(0,1fr))` }}>
        <div />
        {cols.map((c) => (
          <div key={c} className="text-center">
            {c}
          </div>
        ))}
        {rows.map((r, ri) => (
          <div key={r} className="contents">
            <div className="flex items-center">{r}</div>
            {cols.map((c, ci) => {
              const v = values[ri][ci];
              const t = v / max;
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseEnter={() => setHover({ r: ri, c: ci })}
                  onMouseLeave={() => setHover(null)}
                  className={cn("aspect-[2/1] rounded-[3px] ring-1 ring-inset ring-white/5 transition", hover && hover.r === ri && hover.c === ci && "ring-white/40")}
                  style={{ background: color, opacity: 0.12 + t * 0.88 }}
                  title={`${r} ${c}: ${v}% engagement`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-faint">
        Low
        <span className="flex gap-0.5">
          {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
            <span key={o} className="h-2.5 w-4 rounded-sm" style={{ background: color, opacity: o }} />
          ))}
        </span>
        High
      </div>
    </div>
  );
}

export function DataTable({ data, unit = "" }: { data: Point[]; unit?: string }) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-2 text-left text-faint">
          <tr>
            <th className="px-3 py-2 font-medium">Period</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-border">
              <td className="px-3 py-1.5 text-muted">{d.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {d.value.toLocaleString()}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
