"use client";

import { Check, Download } from "lucide-react";
import { Badge, Button, SectionTitle } from "@/components/ui";
import { PLANS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { state, setPlan, toast } = useStore();
  const plan = PLANS.find((p) => p.id === state.plan)!;
  const yearly = state.billingCycle === "yearly";
  const price = yearly ? plan.yearly : plan.monthly;
  const invoices = [0, 1, 2].map((i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    return { id: `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`, date: d, amount: yearly ? plan.yearly * 12 : plan.monthly };
  });

  return (
    <div className="space-y-5">
      <SectionTitle title="Billing" description="Manage your subscription, usage and invoices." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{plan.name} plan</span>
                <Badge tone="success">Trial · 5 days left</Badge>
              </div>
              <div className="mt-1 text-sm text-muted">
                ${price}/month, billed {state.billingCycle}. Renews on the {new Date().getDate()}th.
              </div>
            </div>
            <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} onClick={() => setPlan(state.plan, c)} className={cn("rounded-md px-3 py-1.5 capitalize transition", state.billingCycle === c ? "bg-primary text-white" : "text-muted hover:text-text")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Usage label="Channels" used={state.channels.length} total={plan.channels} />
            <Usage label="Team members" used={state.team.length} total={plan.members === "unlimited" ? Infinity : plan.members} />
            <Usage label="AI credits" used={Math.round(plan.aiCredits * 0.37)} total={plan.aiCredits} />
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold">Payment method</div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 text-sm">
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">VISA</span>
            <span className="text-muted">•••• 4242</span>
            <span className="ml-auto text-xs text-faint">12/28</span>
          </div>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => toast("Payment portal would open here (demo)", "info")}>
            Update card
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 text-sm font-semibold">Change plan</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const current = p.id === state.plan;
            return (
              <div key={p.id} className={cn("card flex flex-col p-5", current && "border-primary/70")}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  {current && <Badge tone="primary">Current</Badge>}
                </div>
                <div className="mt-3 text-2xl font-bold tabular-nums">
                  ${yearly ? p.yearly : p.monthly}
                  <span className="text-sm font-normal text-muted">/mo</span>
                </div>
                <ul className="mt-4 flex-1 space-y-1.5 text-xs text-muted">
                  {p.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={current ? "secondary" : "primary"}
                  size="sm"
                  disabled={current || state.channels.length > p.channels}
                  onClick={() => {
                    setPlan(p.id);
                    toast(`Switched to the ${p.name} plan`);
                  }}
                >
                  {current ? "Current plan" : state.channels.length > p.channels ? "Too many channels" : PLANS.indexOf(p) > PLANS.indexOf(plan) ? "Upgrade" : "Downgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Invoices</div>
        <ul className="divide-y divide-border text-sm">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center gap-4 px-5 py-3">
              <span className="font-medium">{inv.id}</span>
              <span className="text-xs text-muted">{inv.date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              <Badge tone="success" className="ml-auto">
                Paid
              </Badge>
              <span className="w-16 text-right tabular-nums">${inv.amount}</span>
              <button className="text-muted hover:text-text" aria-label="Download invoice" onClick={() => toast("Invoice download (demo)", "info")}>
                <Download size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Usage({ label, used, total }: { label: string; used: number; total: number }) {
  const unlimited = !Number.isFinite(total);
  const pct = unlimited ? 0 : Math.min(100, (used / total) * 100);
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {used} / {unlimited ? "∞" : total}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base">
        <div className={cn("h-full rounded-full", pct > 90 ? "bg-warning" : "bg-primary")} style={{ width: `${unlimited ? 8 : pct}%` }} />
      </div>
    </div>
  );
}
