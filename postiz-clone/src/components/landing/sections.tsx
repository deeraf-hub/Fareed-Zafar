"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Plug2,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Github } from "@/components/ui/GithubIcon";
import { BRAND } from "@/lib/brand";
import { FAQ, FEATURES, PROVIDERS, STEPS, TESTIMONIALS } from "@/lib/data";
import { ProviderBadge } from "@/components/ui/Provider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ReactNode> = {
  calendar: <CalendarDays size={20} />,
  sparkles: <Sparkles size={20} />,
  chart: <BarChart3 size={20} />,
  users: <Users size={20} />,
  plug: <Plug2 size={20} />,
  store: <Store size={20} />,
  code: <Code2 size={20} />,
  github: <Github size={20} />,
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <div className="fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-accent">
          <Sparkles size={12} /> New: AI Copilot writes, designs and schedules with you
        </div>
        <h1 className="fade-up mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl" style={{ animationDelay: "60ms" }}>
          Your ultimate <span className="gradient-text">social media</span> scheduling tool
        </h1>
        <p className="fade-up mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
          {BRAND.name} offers everything you need to manage your social media posts, build an audience, capture leads and grow your
          business. Open source, with a cloud edition that just works.
        </p>
        <div className="fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
          <Link href="/auth/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-white shadow-glow transition hover:bg-primary-hover">
            Start 7-day free trial <ArrowRight size={18} />
          </Link>
          <a href={BRAND.repo} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border-strong bg-surface px-6 text-base font-medium transition hover:bg-surface-2">
            <Github size={18} /> Self-host for free
          </a>
        </div>
        <p className="mt-4 text-xs text-faint">No credit card required · Cancel anytime · AGPL-licensed open-source edition</p>

        <HeroPreview />
      </div>
    </section>
  );
}

const PREVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREVIEW_POSTS: { day: number; row: number; providers: ("x" | "linkedin" | "instagram" | "threads" | "youtube" | "tiktok" | "bluesky")[]; text: string }[] = [
  { day: 0, row: 0, providers: ["x", "bluesky"], text: "Monday plan: batch the week" },
  { day: 1, row: 1, providers: ["linkedin"], text: "Case study: Brightline" },
  { day: 2, row: 0, providers: ["instagram", "threads"], text: "Carousel: 5 hooks" },
  { day: 3, row: 2, providers: ["youtube", "x"], text: "Tutorial: n8n automation" },
  { day: 4, row: 1, providers: ["tiktok"], text: "Friday wins 🙌" },
  { day: 5, row: 0, providers: ["x", "linkedin", "threads"], text: "Analytics deep-dive" },
];

function HeroPreview() {
  return (
    <div className="fade-up relative mx-auto mt-14 max-w-5xl" style={{ animationDelay: "260ms" }}>
      <div className="absolute -inset-x-10 -top-10 h-40 bg-primary/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="rounded-md bg-surface-2 px-3 py-1 text-[11px] text-faint">app.{BRAND.domain}/launches</div>
          <div className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white">Create post</div>
        </div>
        <div className="flex">
          <aside className="hidden w-40 shrink-0 flex-col gap-1 border-r border-border p-3 text-left text-xs md:flex">
            {["Launches", "Analytics", "Plugs", "Marketplace", "Settings"].map((l, i) => (
              <div key={l} className={cn("rounded-md px-2 py-1.5", i === 0 ? "bg-primary/20 text-accent" : "text-muted")}>
                {l}
              </div>
            ))}
            <div className="mt-3 px-2 text-[10px] uppercase tracking-wide text-faint">Channels</div>
            {PROVIDERS.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1 text-muted">
                <ProviderBadge id={p.id} size={14} /> {p.name}
              </div>
            ))}
          </aside>
          <div className="flex-1 overflow-hidden p-3 text-left">
            <div className="grid grid-cols-7 gap-1.5">
              {PREVIEW_DAYS.map((d, i) => (
                <div key={d} className={cn("text-center text-[10px] font-medium", i === 2 ? "text-accent" : "text-faint")}>
                  {d}
                </div>
              ))}
              {PREVIEW_DAYS.map((d, dayIdx) => (
                <div key={d} className={cn("flex h-44 flex-col gap-1 rounded-lg border border-border/70 bg-base/60 p-1", dayIdx === 2 && "border-primary/50")}>
                  {[0, 1, 2].map((row) => {
                    const p = PREVIEW_POSTS.find((x) => x.day === dayIdx && x.row === row);
                    if (!p) return <div key={row} className="h-11" />;
                    return (
                      <div key={row} className="h-11 rounded-md border border-border bg-surface-2 p-1.5">
                        <div className="flex -space-x-1">
                          {p.providers.map((pr) => (
                            <ProviderBadge key={pr} id={pr} size={12} />
                          ))}
                        </div>
                        <div className="mt-1 truncate text-[9px] text-muted">{p.text}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LOGOS = ["Northwind", "Brightline", "Fjord", "Kestrel", "Nimbus", "Lumen Labs", "Hexa", "Orbital"];

export function Logos() {
  const row = [...LOGOS, ...LOGOS];
  return (
    <section className="border-y border-border/70 bg-surface/40 py-8">
      <p className="mb-5 text-center text-xs uppercase tracking-widest text-faint">Trusted by 10,000+ creators, agencies and teams</p>
      <div className="relative overflow-hidden">
        <div className="marquee flex w-max gap-12 px-6">
          {row.map((l, i) => (
            <span key={`${l}-${i}`} className="whitespace-nowrap text-lg font-bold tracking-tight text-muted/60">
              {l}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-base to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-base to-transparent" />
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Features</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to grow on social</h2>
        <p className="mt-4 text-muted">From the first draft to the analytics report, one tool replaces the five you are juggling today.</p>
      </div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card group p-6 transition hover:border-primary/50">
            <div className="mb-4 inline-flex rounded-lg bg-primary/15 p-2.5 text-accent ring-1 ring-primary/30">{ICONS[f.icon]}</div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Channels() {
  return (
    <section id="channels" className="scroll-mt-20 border-y border-border/70 bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Channels</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Post to {PROVIDERS.length}+ platforms from one place</h2>
          <p className="mt-4 text-muted">Social networks, communities and blogs. Connect once; we handle tokens, limits and formats for you.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 px-4 py-3 transition hover:border-primary/50">
              <ProviderBadge id={p.id} size={30} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-[11px] capitalize text-faint">{p.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From idea to published in four steps</h2>
      </div>
      <ol className="mt-14 grid gap-6 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</div>
            {i < STEPS.length - 1 && <div className="absolute left-12 top-5 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-primary/60 to-transparent md:block" />}
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="border-y border-border/70 bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Loved by teams</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What people say</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="card flex flex-col p-6">
              <blockquote className="flex-1 text-sm leading-relaxed text-text/90">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: t.color }}>
                  {t.initials}
                </span>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
      </div>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
        {FAQ.map((f, i) => (
          <div key={f.q}>
            <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {f.q}
              <ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <div className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/30 via-surface to-surface p-10 text-center sm:p-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Ready to schedule smarter?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-muted">Join thousands of teams publishing with {BRAND.name}. Start a free trial, or clone the repo and run it yourself.</p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-hover">
            Start free trial <ArrowRight size={18} />
          </Link>
          <Link href="/pricing" className="inline-flex h-12 items-center rounded-xl border border-border-strong px-6 font-medium hover:bg-white/5">
            See pricing
          </Link>
        </div>
        <ul className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
          {["7-day free trial", "No credit card", "Cancel anytime", "Open source"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check size={14} className="text-success" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
