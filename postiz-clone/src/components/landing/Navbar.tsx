"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Star, X } from "lucide-react";
import { Github } from "@/components/ui/GithubIcon";
import { BRAND } from "@/lib/brand";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#channels", label: "Channels" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-text">
              {l.label}
            </Link>
          ))}
          <a href={BRAND.repo} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:border-border-strong hover:text-text">
            <Github size={14} /> GitHub <Star size={12} className="text-warning" /> 40k
          </a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/auth/login" className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-text">
            Log in
          </Link>
          <Link href="/auth/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            Start free trial
          </Link>
        </div>
        <button className="rounded-md p-2 text-muted md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-base px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-muted hover:text-text">
                {l.label}
              </Link>
            ))}
            <Link href="/auth/login" onClick={() => setOpen(false)} className="text-muted hover:text-text">
              Log in
            </Link>
            <Link href="/auth/register" onClick={() => setOpen(false)} className="rounded-lg bg-primary px-4 py-2 text-center font-medium text-white">
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
