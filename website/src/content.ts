/**
 * All page copy lives here so the text can be swapped (e.g. with the live
 * coresight-digital.com copy) without touching any component or layout code.
 */

export const brand = {
  name: 'coresight',
  fullName: 'CoreSight Digital',
};

export const assets = {
  // Hero scroll video (CloudFront). A local mirror can be dropped at
  // /hero.mp4 with a /hero-poster.jpg first-frame still for offline/dev use.
  heroVideo:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4',
  heroPoster: '/hero-poster.jpg',
  portrait:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260728_050334_5b076e26-0ce7-4898-b432-d764190e448f.png&w=1280&q=85',
  portraitAlt: 'Founder of CoreSight Digital',
};

export const nav = {
  links: [
    { label: 'Services', sup: null as string | null },
    { label: 'Projects', sup: '6' as string | null },
    { label: 'About', sup: null as string | null },
    { label: 'Contact', sup: null as string | null },
  ],
  cta: 'Get Free Consultation',
};

export const hero = {
  services: [
    '/ WEB DESIGN & DEVELOPMENT',
    '/ DIGITAL MARKETING & SEO',
    '/ BRAND & CREATIVE STRATEGY',
  ],
  intro:
    'We design digital experiences that bring clarity, precision, and measurable growth to the way your brand connects.',
  badge: 'Trusted By 100+ Brands',
  headline: ['Clear. Bold.', 'Digital.'],
  card: {
    title: 'Talk with CoreSight',
    subtitle: 'Founder of CoreSight Digital',
    button: 'Book 15-mins call',
  },
};

export const capability = {
  badge: 'Insight On Demand',
  intro:
    "We don't just build websites — we interpret your market, sharpen your message, and deliver the signal your customers need.",
  headline: ['See your brand', 'brilliantly.'],
  body:
    'From the first sketch to the final launch, CoreSight turns raw ideas into digital experiences your customers act on — quietly, precisely, at speed.',
  primaryCta: 'See our work',
  secondaryCta: 'Free consultation',
  items: [
    {
      index: '01',
      title: 'Strategy-first design',
      body: 'Every decision starts with your business goals and surfaces what matters to your customers.',
    },
    {
      index: '02',
      title: 'Layered execution',
      body: 'Moves from rough concept to polished launch without losing the thread.',
    },
    {
      index: '03',
      title: 'Growth that compounds',
      body: 'Learns what your audience responds to and tightens every campaign as you grow.',
    },
  ],
};
