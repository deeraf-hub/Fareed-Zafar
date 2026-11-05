import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { Channels, Cta, Faq, Features, Hero, HowItWorks, Logos, Testimonials } from "@/components/landing/sections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Logos />
        <Features />
        <Channels />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
