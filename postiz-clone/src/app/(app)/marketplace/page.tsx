"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Badge, Button, Field, Modal, SectionTitle } from "@/components/ui";
import { ProviderBadge } from "@/components/ui/Provider";
import { SELLERS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, formatCompact, formatDateTime } from "@/lib/utils";

type Seller = (typeof SELLERS)[number];

export default function MarketplacePage() {
  const { state, placeOrder, toast } = useStore();
  const [niche, setNiche] = useState("all");
  const [seller, setSeller] = useState<Seller | null>(null);
  const [brief, setBrief] = useState("");
  const niches = ["all", ...Array.from(new Set(SELLERS.map((s) => s.niche)))];
  const list = SELLERS.filter((s) => niche === "all" || s.niche === niche);

  const order = () => {
    if (!seller) return;
    if (!brief.trim()) {
      toast("Describe what you want the creator to post", "error");
      return;
    }
    placeOrder({ sellerId: seller.id, brief: brief.trim(), price: seller.price });
    toast(`Order sent to ${seller.name}`);
    setSeller(null);
    setBrief("");
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Marketplace"
        description="Buy sponsored posts from vetted creators, or sell posts on your own channels."
        action={
          <select className="input h-9 w-auto py-0 text-xs" value={niche} onChange={(e) => setNiche(e.target.value)}>
            {niches.map((n) => (
              <option key={n} value={n}>
                {n === "all" ? "All niches" : n}
              </option>
            ))}
          </select>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <div key={s.id} className="card flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: s.color }}>
                {s.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{s.name}</span>
                  <span className="flex items-center gap-0.5 text-xs text-warning">
                    <Star size={12} fill="currentColor" /> {s.rating.toFixed(1)}
                  </span>
                </div>
                <div className="text-xs text-muted">{s.handle}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {s.providers.map((p) => (
                    <ProviderBadge key={p} id={p} size={16} />
                  ))}
                  <span className="ml-1 text-[11px] text-faint">{formatCompact(s.followers)} followers</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="neutral">{s.niche}</Badge>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">${s.price}</div>
                <div className="text-[11px] text-faint">per post</div>
              </div>
            </div>
            <Button className="mt-4" variant="secondary" onClick={() => setSeller(s)}>
              Order a post
            </Button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Your orders</div>
        {state.orders.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-faint">No orders yet. Pick a creator above to send your first brief.</div>
        ) : (
          <ul className="divide-y divide-border">
            {[...state.orders].reverse().map((o) => {
              const s = SELLERS.find((x) => x.id === o.sellerId);
              return (
                <li key={o.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s?.color }}>
                    {s?.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s?.name}</span>
                      <Badge tone={o.status === "delivered" ? "success" : o.status === "accepted" ? "info" : "warning"}>{o.status}</Badge>
                    </div>
                    <div className="truncate text-xs text-muted">{o.brief}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold tabular-nums">${o.price}</div>
                    <div className="text-faint">{formatDateTime(o.createdAt)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={!!seller} onClose={() => setSeller(null)} title={seller ? `Order a post from ${seller.name}` : ""} size="md">
        {seller && (
          <div className="space-y-4 p-5">
            <div className={cn("rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted")}>
              {seller.name} posts to {seller.providers.map((p) => p.toUpperCase()).join(", ")} for an audience of {formatCompact(seller.followers)} in {seller.niche}. Price: <span className="font-semibold text-text">${seller.price}</span> per post, paid on delivery.
            </div>
            <Field label="Brief" hint="What should the post say? Include links, hashtags and anything to avoid.">
              <textarea className="input min-h-[120px]" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Announce our new analytics dashboard, link to postio.app/analytics, keep it casual…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSeller(null)}>
                Cancel
              </Button>
              <Button onClick={order}>Send order · ${seller.price}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
