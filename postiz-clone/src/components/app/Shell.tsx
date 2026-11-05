"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Info,
  LogOut,
  Menu,
  Plug2,
  Plus,
  Settings,
  Store,
  XCircle,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/landing/Logo";
import { ChannelAvatar } from "@/components/ui/Provider";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AddChannelModal } from "./AddChannelModal";

const NAV = [
  { href: "/launches", label: "Launches", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plugs", label: "Plugs", icon: Plug2 },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Shell({ children }: { children: ReactNode }) {
  const { state, hydrated, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [addChannel, setAddChannel] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    if (hydrated && !state.user) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, state.user, router, pathname]);

  if (!hydrated || !state.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LogoMark size={40} className="animate-pulse" />
      </div>
    );
  }

  const plan = PLANS.find((p) => p.id === state.plan)!;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/launches">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobileNav(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/20 text-accent" : "text-muted hover:bg-white/5 hover:text-text",
              )}
            >
              <n.icon size={18} /> {n.label}
            </Link>
          );
        })}
        <div className="mt-6 flex items-center justify-between px-3 text-[11px] uppercase tracking-wider text-faint">
          <span>Channels</span>
          <span>
            {state.channels.length}/{plan.channels}
          </span>
        </div>
        <div className="mt-1 max-h-64 space-y-0.5 overflow-y-auto">
          {state.channels.map((c) => (
            <Link key={c.id} href="/settings?tab=channels" className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-text">
              <ChannelAvatar channel={c} size={22} dimmed={c.disabled} />
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
        </div>
        <button onClick={() => setAddChannel(true)} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-primary/10">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-accent/60">
            <Plus size={12} />
          </span>
          Add channel
        </button>
      </nav>
      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-surface-2 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">{plan.name} plan</span>
            <Link href="/billing" className="text-accent hover:underline">
              Upgrade
            </Link>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (state.channels.length / plan.channels) * 100)}%` }} />
          </div>
          <div className="mt-1.5 text-faint">
            {state.channels.length} of {plan.channels} channels used
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-base">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">{sidebar}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileNav(false)}>
          <aside className="h-full w-64 border-r border-border bg-surface" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 text-muted lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div className="text-sm text-muted">
              <span className="font-medium text-text">{state.user.org}</span>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{state.user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden sm:inline">{state.user.name}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {userMenu && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-xl" onMouseLeave={() => setUserMenu(false)}>
                <div className="border-b border-border px-3 py-2 text-xs text-muted">{state.user.email}</div>
                <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-white/5" onClick={() => setUserMenu(false)}>
                  Settings
                </Link>
                <Link href="/billing" className="block px-3 py-2 text-sm hover:bg-white/5" onClick={() => setUserMenu(false)}>
                  Billing
                </Link>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#ff8a8e] hover:bg-white/5"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <AddChannelModal open={addChannel} onClose={() => setAddChannel(false)} />
      <Toasts />
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm shadow-xl">
          {t.kind === "success" && <CheckCircle2 size={16} className="text-success" />}
          {t.kind === "error" && <XCircle size={16} className="text-danger" />}
          {t.kind === "info" && <Info size={16} className="text-info" />}
          {t.title}
        </div>
      ))}
    </div>
  );
}
