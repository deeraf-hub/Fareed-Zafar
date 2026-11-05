"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SEED_CHANNELS, makeId, seedPosts } from "./data";
import { randomKey } from "./utils";
import type {
  AppState,
  Channel,
  MarketplaceOrder,
  PlanId,
  Plug,
  Post,
  PostSet,
  RssFeed,
  Signature,
  TeamMember,
  User,
  Webhook,
} from "./types";

const STORAGE_KEY = "postiz-clone:state:v1";

function initialState(): AppState {
  return {
    user: null,
    plan: "team",
    billingCycle: "monthly",
    apiKey: `pk_live_${randomKey(28)}`,
    channels: SEED_CHANNELS,
    posts: seedPosts(),
    team: [
      { id: "tm_1", name: "You", email: "you@example.com", role: "admin", status: "active" },
      { id: "tm_2", name: "Maya Chen", email: "maya@example.com", role: "editor", status: "active" },
      { id: "tm_3", name: "Luis Ortega", email: "luis@example.com", role: "viewer", status: "invited" },
    ],
    webhooks: [{ id: "wh_1", name: "Slack notifier", url: "https://hooks.example.com/slack/abc123", channelIds: ["ch_x", "ch_li"] }],
    signatures: [{ id: "sg_1", content: "— Postio team · schedule smarter at postio.app", autoAdd: false }],
    plugs: [
      { id: "pl_1", channelId: "ch_x", type: "auto-repost", enabled: true, config: { likes: "50" } },
      { id: "pl_2", channelId: "ch_li", type: "auto-plug", enabled: false, config: { likes: "20", text: "Want the full guide? It's free at postio.app/guide" } },
    ],
    sets: [{ id: "set_1", name: "Product launch", channelIds: ["ch_x", "ch_li", "ch_th"], content: "🚀 We just launched {product}! Here's what's new:\n\n• \n• \n• \n\nTry it now → {link}" }],
    feeds: [{ id: "rss_1", name: "Company blog", url: "https://blog.example.com/rss.xml", channelIds: ["ch_x", "ch_li"], enabled: true }],
    orders: [],
    customers: ["Acme Corp"],
  };
}

export interface Toast {
  id: string;
  title: string;
  kind: "success" | "error" | "info";
}

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  toasts: Toast[];
  toast: (title: string, kind?: Toast["kind"]) => void;
  // auth
  login: (user: User) => void;
  logout: () => void;
  // channels
  addChannel: (c: Omit<Channel, "id" | "followers">) => Channel;
  removeChannel: (id: string) => void;
  updateChannel: (id: string, patch: Partial<Channel>) => void;
  // posts
  upsertPost: (p: Post) => void;
  deletePost: (id: string) => void;
  movePost: (id: string, date: Date) => void;
  duplicatePost: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  // team etc.
  inviteMember: (m: Omit<TeamMember, "id" | "status">) => void;
  removeMember: (id: string) => void;
  addWebhook: (w: Omit<Webhook, "id">) => void;
  removeWebhook: (id: string) => void;
  addSignature: (s: Omit<Signature, "id">) => void;
  removeSignature: (id: string) => void;
  toggleSignatureAuto: (id: string) => void;
  upsertPlug: (p: Plug) => void;
  removePlug: (id: string) => void;
  addSet: (s: Omit<PostSet, "id">) => void;
  removeSet: (id: string) => void;
  addFeed: (f: Omit<RssFeed, "id">) => void;
  removeFeed: (id: string) => void;
  toggleFeed: (id: string) => void;
  addCustomer: (name: string) => void;
  placeOrder: (o: Omit<MarketplaceOrder, "id" | "createdAt" | "status">) => void;
  regenerateApiKey: () => void;
  setPlan: (plan: PlanId, cycle?: AppState["billingCycle"]) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const skipPersist = useRef(true);

  // Load persisted state on the client only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        setState({ ...initialState(), ...parsed });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode); the app still works in memory
    }
  }, [state, hydrated]);

  const toast = useCallback((title: string, kind: Toast["kind"] = "success") => {
    const id = makeId("toast");
    setToasts((t) => [...t, { id, title, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const patch = useCallback((fn: (s: AppState) => Partial<AppState>) => {
    setState((s) => ({ ...s, ...fn(s) }));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      hydrated,
      toasts,
      toast,
      login: (user) => patch(() => ({ user })),
      logout: () => patch(() => ({ user: null })),
      addChannel: (c) => {
        const channel: Channel = { ...c, id: makeId("ch"), followers: Math.floor(500 + Math.random() * 20000) };
        patch((s) => ({ channels: [...s.channels, channel] }));
        return channel;
      },
      removeChannel: (id) =>
        patch((s) => ({
          channels: s.channels.filter((c) => c.id !== id),
          posts: s.posts
            .map((p) => ({ ...p, channelIds: p.channelIds.filter((cid) => cid !== id) }))
            .filter((p) => p.channelIds.length > 0),
          plugs: s.plugs.filter((p) => p.channelId !== id),
        })),
      updateChannel: (id, cp) => patch((s) => ({ channels: s.channels.map((c) => (c.id === id ? { ...c, ...cp } : c)) })),
      upsertPost: (p) =>
        patch((s) => ({
          posts: s.posts.some((x) => x.id === p.id) ? s.posts.map((x) => (x.id === p.id ? p : x)) : [...s.posts, p],
        })),
      deletePost: (id) => patch((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      movePost: (id, date) =>
        patch((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p;
            const status = p.status === "published" || p.status === "error" ? "scheduled" : p.status;
            return { ...p, scheduledAt: date.toISOString(), status };
          }),
        })),
      duplicatePost: (id) =>
        patch((s) => {
          const src = s.posts.find((p) => p.id === id);
          if (!src) return {};
          const d = new Date(src.scheduledAt);
          d.setDate(d.getDate() + 1);
          const copy: Post = {
            ...src,
            id: makeId("post"),
            parts: src.parts.map((pt) => ({ ...pt, id: makeId("pt") })),
            scheduledAt: d.toISOString(),
            status: "draft",
            createdAt: new Date().toISOString(),
            comments: [],
          };
          return { posts: [...s.posts, copy] };
        }),
      addComment: (postId, text) =>
        patch((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, { id: makeId("c"), author: s.user?.name ?? "You", text, at: new Date().toISOString() }] }
              : p,
          ),
        })),
      inviteMember: (m) => patch((s) => ({ team: [...s.team, { ...m, id: makeId("tm"), status: "invited" }] })),
      removeMember: (id) => patch((s) => ({ team: s.team.filter((m) => m.id !== id) })),
      addWebhook: (w) => patch((s) => ({ webhooks: [...s.webhooks, { ...w, id: makeId("wh") }] })),
      removeWebhook: (id) => patch((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),
      addSignature: (sg) => patch((s) => ({ signatures: [...s.signatures, { ...sg, id: makeId("sg") }] })),
      removeSignature: (id) => patch((s) => ({ signatures: s.signatures.filter((x) => x.id !== id) })),
      toggleSignatureAuto: (id) =>
        patch((s) => ({ signatures: s.signatures.map((x) => (x.id === id ? { ...x, autoAdd: !x.autoAdd } : { ...x, autoAdd: false })) })),
      upsertPlug: (p) =>
        patch((s) => ({ plugs: s.plugs.some((x) => x.id === p.id) ? s.plugs.map((x) => (x.id === p.id ? p : x)) : [...s.plugs, p] })),
      removePlug: (id) => patch((s) => ({ plugs: s.plugs.filter((p) => p.id !== id) })),
      addSet: (st) => patch((s) => ({ sets: [...s.sets, { ...st, id: makeId("set") }] })),
      removeSet: (id) => patch((s) => ({ sets: s.sets.filter((x) => x.id !== id) })),
      addFeed: (f) => patch((s) => ({ feeds: [...s.feeds, { ...f, id: makeId("rss") }] })),
      removeFeed: (id) => patch((s) => ({ feeds: s.feeds.filter((x) => x.id !== id) })),
      toggleFeed: (id) => patch((s) => ({ feeds: s.feeds.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) })),
      addCustomer: (name) => patch((s) => ({ customers: s.customers.includes(name) ? s.customers : [...s.customers, name] })),
      placeOrder: (o) =>
        patch((s) => ({ orders: [...s.orders, { ...o, id: makeId("ord"), status: "pending", createdAt: new Date().toISOString() }] })),
      regenerateApiKey: () => patch(() => ({ apiKey: `pk_live_${randomKey(28)}` })),
      setPlan: (plan, cycle) => patch((s) => ({ plan, billingCycle: cycle ?? s.billingCycle })),
      resetDemo: () => {
        const fresh = initialState();
        patch((s) => ({ ...fresh, user: s.user }));
      },
    }),
    [state, hydrated, toasts, toast, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
