"use client";

import { Github } from "@/components/ui/GithubIcon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { Logo } from "@/components/landing/Logo";
import { BRAND } from "@/lib/brand";
import { PLANS } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { PlanId } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, setPlan } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/launches";
  const planParam = params.get("plan") as PlanId | null;
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = (n: string, e: string, o: string) => {
    setBusy(true);
    if (planParam && PLANS.some((p) => p.id === planParam)) setPlan(planParam);
    login({ name: n, email: e, org: o });
    window.setTimeout(() => router.push(next), 350);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const n = name.trim() || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    finish(n, email, org.trim() || `${n.split(" ")[0]}'s workspace`);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/40 via-surface to-base p-12 lg:flex">
        <Link href="/">
          <Logo />
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight">Schedule everywhere. Analyse everything. Grow faster.</h2>
          <p className="mt-4 max-w-md text-muted">Join 10,000+ creators and teams publishing with {BRAND.name}. Open source, self-hostable, and built for the way social teams actually work.</p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            {["24+ channels from one calendar", "AI Copilot for copy, images and video", "Team comments, approvals and customers", "Public API, webhooks and MCP for agents"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-faint">© {new Date().getFullYear()} {BRAND.name}</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" ? "Log in to your workspace." : planParam ? `Start your 7-day free trial of the ${PLANS.find((p) => p.id === planParam)?.name ?? ""} plan.` : "Start your 7-day free trial. No credit card required."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" type="button" onClick={() => finish("Demo User", "demo@example.com", "Demo Workspace")}>
              <Github size={16} /> GitHub
            </Button>
            <Button variant="secondary" type="button" onClick={() => finish("Demo User", "demo@example.com", "Demo Workspace")}>
              <span className="font-bold">G</span> Google
            </Button>
          </div>
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <>
                <Field label="Full name">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
                </Field>
                <Field label="Company / workspace">
                  <input className="input" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Acme Inc." />
                </Field>
              </>
            )}
            <Field label="Email">
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Signing in…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted">
            {mode === "login" ? (
              <>
                No account yet?{" "}
                <Link href="/auth/register" className="text-accent hover:underline">
                  Start free trial
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/auth/login" className="text-accent hover:underline">
                  Log in
                </Link>
              </>
            )}
          </p>
          <p className="mt-6 text-center text-[11px] text-faint">Demo build: any email and password work; data is stored in your browser only.</p>
        </div>
      </div>
    </div>
  );
}
