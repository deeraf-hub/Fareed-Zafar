import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { Cta, Faq } from "@/components/landing/sections";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Pricing — ${BRAND.name}` };

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="hero-glow mx-auto max-w-3xl px-4 pt-20 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Plans for every stage</h1>
          <p className="mt-4 text-muted">Start free for 7 days. Upgrade, downgrade or cancel at any time. Or self-host the open-source edition for free.</p>
        </div>
        <Pricing compact />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
