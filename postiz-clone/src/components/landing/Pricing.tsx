"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Pricing({ compact = false }: { compact?: boolean }) {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className={cn("mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6", compact ? "py-10" : "py-24")}>
      {!compact && (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing that grows with you</h2>
          <p className="mt-4 text-muted">Every plan includes unlimited posts and a 7-day free trial. Prefer to self-host? It is free forever.</p>
        </div>
      )}
      <div className="mt-8 flex items-center justify-center gap-3 text-sm">
        <span className={cn(!yearly ? "text-text" : "text-muted")}>Monthly</span>
        <button
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((v) => !v)}
          className={cn("relative h-6 w-11 rounded-full border transition-colors", yearly ? "border-primary bg-primary" : "border-border-strong bg-surface-2")}
        >
          <span className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform", yearly ? "left-[22px]" : "left-0.5")} style={{ width: 18, height: 18 }} />
        </button>
        <span className={cn(yearly ? "text-text" : "text-muted")}>
          Yearly <span className="ml-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-[#5fd99a]">save ~18%</span>
        </span>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div key={p.id} className={cn("card relative flex flex-col p-6", p.popular && "border-primary/70 shadow-glow")}>
            {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">Most popular</span>}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-xs text-muted">{p.tagline}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">${yearly ? p.yearly : p.monthly}</span>
              <span className="text-sm text-muted">/month</span>
            </div>
            {yearly && <div className="text-[11px] text-faint">billed ${p.yearly * 12} yearly</div>}
            <Link href={`/auth/register?plan=${p.id}`} className={cn("mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium transition", p.popular ? "bg-primary text-white hover:bg-primary-hover" : "border border-border-strong hover:bg-white/5")}>
              Start 7-day trial
            </Link>
            <ul className="mt-6 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-muted">
                  <Check size={16} className="mt-0.5 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-faint">Prices in USD. All plans include a 7-day free trial, unlimited posts, calendar, previews and email support.</p>
    </section>
  );
}
