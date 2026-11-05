"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { ProviderBadge } from "@/components/ui/Provider";
import { PLANS, PROVIDERS } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = ["#7c3aed", "#0a66c2", "#d62976", "#199e70", "#d95926", "#3987e5", "#c98500", "#d55181"];

export function AddChannelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addChannel, toast } = useStore();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Provider | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [customer, setCustomer] = useState("");
  const plan = PLANS.find((p) => p.id === state.plan)!;
  const atLimit = state.channels.length >= plan.channels;

  const close = () => {
    setPicked(null);
    setQuery("");
    setName("");
    setHandle("");
    setCustomer("");
    onClose();
  };

  const filtered = PROVIDERS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const groups: Record<string, Provider[]> = { social: [], community: [], blog: [] };
  filtered.forEach((p) => groups[p.category].push(p));

  const connect = () => {
    if (!picked) return;
    const n = name.trim() || `My ${picked.name}`;
    addChannel({
      provider: picked.id,
      name: n,
      handle: handle.trim() || `@${n.toLowerCase().replace(/\s+/g, "")}`,
      avatarColor: COLORS[state.channels.length % COLORS.length],
      customer: customer.trim() || undefined,
    });
    toast(`${picked.name} connected`);
    close();
  };

  return (
    <Modal open={open} onClose={close} title={picked ? `Connect ${picked.name}` : "Add a channel"} size="lg">
      {!picked ? (
        <div className="p-5">
          {atLimit && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-[#f3c57a]">
              You have reached the {plan.channels}-channel limit of the {plan.name} plan. Upgrade in Billing to connect more.
            </div>
          )}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" placeholder="Search providers…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          {(["social", "community", "blog"] as const).map(
            (cat) =>
              groups[cat].length > 0 && (
                <div key={cat} className="mb-5">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-faint">{cat === "social" ? "Social networks" : cat === "community" ? "Communities & messaging" : "Blogs & publishing"}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {groups[cat].map((p) => (
                      <button
                        key={p.id}
                        disabled={atLimit}
                        onClick={() => setPicked(p)}
                        className={cn("flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left text-sm transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50")}
                      >
                        <ProviderBadge id={p.id} size={26} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
            <ProviderBadge id={picked.id} size={36} />
            <div className="text-sm">
              <div className="font-medium">{picked.name}</div>
              <div className="text-xs text-muted">
                In the real product this opens the {picked.name} OAuth screen. In this demo, enter the account details to simulate a connected channel.
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <input className="input" placeholder={`My ${picked.name}`} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Handle">
              <input className="input" placeholder="@brand" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </Field>
            <Field label="Customer (optional)" hint="Group channels by client when you manage several brands.">
              <input className="input" list="customers" placeholder="e.g. Acme Corp" value={customer} onChange={(e) => setCustomer(e.target.value)} />
              <datalist id="customers">
                {state.customers.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setPicked(null)}>
              ← Back
            </Button>
            <Button onClick={connect}>Connect {picked.name}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
