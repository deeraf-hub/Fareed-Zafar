import { Github } from "@/components/ui/GithubIcon";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "./Logo";

const COLUMNS = [
  { title: "Product", links: [{ label: "Features", href: "/#features" }, { label: "Channels", href: "/#channels" }, { label: "Pricing", href: "/pricing" }, { label: "Log in", href: "/auth/login" }] },
  { title: "Developers", links: [{ label: "GitHub", href: BRAND.repo }, { label: "Public API", href: "/#faq" }, { label: "Webhooks", href: "/#faq" }, { label: "Self-hosting", href: BRAND.repo }] },
  { title: "Company", links: [{ label: "About", href: "/#features" }, { label: "Blog", href: "/#features" }, { label: "Contact", href: `mailto:${BRAND.supportEmail}` }, { label: "Open source", href: BRAND.repo }] },
  { title: "Legal", links: [{ label: "Terms", href: "#" }, { label: "Privacy", href: "#" }, { label: "Security", href: "#" }] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">{BRAND.tagline}. Schedule, publish and analyse your content everywhere.</p>
            <a href={BRAND.repo} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
              <Github size={16} /> Star us on GitHub
            </a>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold">{c.title}</div>
              <ul className="mt-4 space-y-2.5 text-sm text-muted">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-text">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-faint sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. Open-source social media scheduling.</span>
          <span>Built with Next.js · Inspired by the Postiz UI</span>
        </div>
      </div>
    </footer>
  );
}
