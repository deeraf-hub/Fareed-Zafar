import type {
  Channel,
  Plan,
  PlugDefinition,
  Post,
  Provider,
  ProviderId,
} from "./types";

export const PROVIDERS: Provider[] = [
  { id: "x", name: "X", color: "#000000", fg: "#ffffff", mono: "X", maxChars: 280, category: "social", threads: true },
  { id: "linkedin", name: "LinkedIn", color: "#0a66c2", fg: "#ffffff", mono: "in", maxChars: 3000, category: "social", threads: true },
  { id: "linkedin-page", name: "LinkedIn Page", color: "#004182", fg: "#ffffff", mono: "in", maxChars: 3000, category: "social", threads: true },
  { id: "instagram", name: "Instagram", color: "#d62976", fg: "#ffffff", mono: "IG", maxChars: 2200, category: "social", threads: true },
  { id: "facebook", name: "Facebook Page", color: "#1877f2", fg: "#ffffff", mono: "f", maxChars: 63206, category: "social", threads: true },
  { id: "threads", name: "Threads", color: "#101010", fg: "#ffffff", mono: "@", maxChars: 500, category: "social", threads: true },
  { id: "youtube", name: "YouTube", color: "#ff0000", fg: "#ffffff", mono: "▶", maxChars: 5000, category: "social", threads: false },
  { id: "tiktok", name: "TikTok", color: "#010101", fg: "#69c9d0", mono: "Tk", maxChars: 2200, category: "social", threads: false },
  { id: "pinterest", name: "Pinterest", color: "#e60023", fg: "#ffffff", mono: "P", maxChars: 500, category: "social", threads: false },
  { id: "dribbble", name: "Dribbble", color: "#ea4c89", fg: "#ffffff", mono: "Dr", maxChars: 1000, category: "social", threads: false },
  { id: "slack", name: "Slack", color: "#4a154b", fg: "#ffffff", mono: "S", maxChars: 4000, category: "community", threads: true },
  { id: "discord", name: "Discord", color: "#5865f2", fg: "#ffffff", mono: "D", maxChars: 2000, category: "community", threads: true },
  { id: "mastodon", name: "Mastodon", color: "#6364ff", fg: "#ffffff", mono: "M", maxChars: 500, category: "social", threads: true },
  { id: "bluesky", name: "Bluesky", color: "#1185fe", fg: "#ffffff", mono: "Bs", maxChars: 300, category: "social", threads: true },
  { id: "reddit", name: "Reddit", color: "#ff4500", fg: "#ffffff", mono: "r/", maxChars: 40000, category: "community", threads: true },
  { id: "telegram", name: "Telegram", color: "#229ed9", fg: "#ffffff", mono: "Tg", maxChars: 4096, category: "community", threads: false },
  { id: "medium", name: "Medium", color: "#000000", fg: "#ffffff", mono: "M", maxChars: 100000, category: "blog", threads: false },
  { id: "devto", name: "Dev.to", color: "#0a0a0a", fg: "#ffffff", mono: "DEV", maxChars: 100000, category: "blog", threads: false },
  { id: "hashnode", name: "Hashnode", color: "#2962ff", fg: "#ffffff", mono: "H", maxChars: 100000, category: "blog", threads: false },
  { id: "wordpress", name: "WordPress", color: "#21759b", fg: "#ffffff", mono: "W", maxChars: 100000, category: "blog", threads: false },
  { id: "lemmy", name: "Lemmy", color: "#14854f", fg: "#ffffff", mono: "L", maxChars: 10000, category: "community", threads: true },
  { id: "warpcast", name: "Warpcast", color: "#855dcd", fg: "#ffffff", mono: "Wc", maxChars: 320, category: "social", threads: true },
  { id: "nostr", name: "Nostr", color: "#8e30eb", fg: "#ffffff", mono: "N", maxChars: 5000, category: "social", threads: true },
  { id: "vk", name: "VK", color: "#0077ff", fg: "#ffffff", mono: "VK", maxChars: 15000, category: "social", threads: false },
];

export const PROVIDER_MAP: Record<ProviderId, Provider> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
) as Record<ProviderId, Provider>;

export const PLANS: Plan[] = [
  {
    id: "standard",
    name: "Standard",
    monthly: 29,
    yearly: 24,
    channels: 5,
    members: 1,
    posts: "unlimited",
    aiCredits: 50,
    tagline: "For creators getting started with scheduling.",
    features: [
      "5 channels",
      "Unlimited posts",
      "1 team member",
      "Calendar & preview mode",
      "50 AI Copilot credits / month",
      "Community support",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 39,
    yearly: 32,
    channels: 10,
    members: "unlimited",
    posts: "unlimited",
    aiCredits: 150,
    tagline: "For small teams that collaborate on content.",
    popular: true,
    features: [
      "10 channels",
      "Unlimited posts",
      "Unlimited team members",
      "Comments & approvals",
      "150 AI Copilot credits / month",
      "Plugs (auto-repost, auto-plug)",
      "Customer groups",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 49,
    yearly: 40,
    channels: 30,
    members: "unlimited",
    posts: "unlimited",
    aiCredits: 400,
    tagline: "For agencies managing many brands.",
    features: [
      "30 channels",
      "Unlimited posts",
      "Unlimited team members",
      "Public API & webhooks",
      "400 AI Copilot credits / month",
      "AI images & short videos",
      "Marketplace access",
      "Priority support",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthly: 99,
    yearly: 82,
    channels: 100,
    members: "unlimited",
    posts: "unlimited",
    aiCredits: 1000,
    tagline: "For large teams with a lot of channels.",
    features: [
      "100 channels",
      "Unlimited posts",
      "Unlimited team members",
      "Everything in Pro",
      "1,000 AI Copilot credits / month",
      "RSS auto-posting",
      "Dedicated account manager",
    ],
  },
];

export const FEATURES = [
  {
    title: "Schedule everywhere, from one calendar",
    description:
      "Plan a week of content across X, LinkedIn, Instagram, TikTok and 20 more channels. Drag posts between days, preview them exactly as they will look, and let the scheduler publish for you.",
    icon: "calendar",
  },
  {
    title: "AI Copilot that writes with you",
    description:
      "Turn a rough idea into platform-ready copy, generate hooks, rewrite for tone, and create images or short videos without leaving the editor.",
    icon: "sparkles",
  },
  {
    title: "Analytics that show what works",
    description:
      "Follower growth, impressions, engagement and the best time to post for each channel, in one place, so you can double down on what performs.",
    icon: "chart",
  },
  {
    title: "Collaborate with your team",
    description:
      "Invite teammates, leave comments on drafts, request approvals, and group channels by customer when you manage more than one brand.",
    icon: "users",
  },
  {
    title: "Plugs: automation for engagement",
    description:
      "Automatically repost a post once it hits a like threshold, add a follow-up comment with your link, or cross-post to another channel.",
    icon: "plug",
  },
  {
    title: "Marketplace for sponsored posts",
    description:
      "Buy or sell posts with other creators and influencers right inside the tool, with briefs, approvals and payments handled for you.",
    icon: "store",
  },
  {
    title: "Public API, webhooks & agents",
    description:
      "Automate with n8n, Make, Zapier or your own code. Connect your favourite AI agent through MCP and schedule content from the command line.",
    icon: "code",
  },
  {
    title: "Open source. Self-host for free.",
    description:
      "Run it on your own infrastructure with a single Docker command, keep every byte of your data, and extend it however you like.",
    icon: "github",
  },
];

export const STEPS = [
  {
    title: "Connect your channels",
    description:
      "Log in to each social account once. We handle tokens, refreshes and the quirks of every API.",
  },
  {
    title: "Create posts, with or without AI",
    description:
      "Write once, customise per channel, attach media, add a thread or comment and preview the result.",
  },
  {
    title: "Schedule and relax",
    description:
      "Drop it on the calendar. We publish at the right time, retry on failure and tell you what happened.",
  },
  {
    title: "Learn and repeat",
    description:
      "Check analytics, find the best time to post and let Plugs amplify your winners automatically.",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "We replaced three tools with one. Scheduling for twelve client brands now takes my team an hour on Monday instead of all week.",
    name: "Amara Okafor",
    role: "Head of Social, Brightline Agency",
    initials: "AO",
    color: "#d95926",
  },
  {
    quote:
      "The per-channel preview is the killer feature. No more deleting a LinkedIn post because the line breaks came out wrong.",
    name: "Jonas Lindqvist",
    role: "Founder, Fjord Analytics",
    initials: "JL",
    color: "#3987e5",
  },
  {
    quote:
      "Self-hosting took ten minutes. Our data stays on our servers and the team still gets a tool that feels like a polished SaaS.",
    name: "Priya Raman",
    role: "CTO, Kestrel Health",
    initials: "PR",
    color: "#199e70",
  },
  {
    quote:
      "Plugs quietly repost our best content when it crosses 50 likes. Reach went up 40% without anyone touching a thing.",
    name: "Diego Álvarez",
    role: "Creator, 180k followers",
    initials: "DA",
    color: "#9085e9",
  },
  {
    quote:
      "The AI Copilot writes in our tone after a few examples. It drafts, we approve, it posts. That's the whole workflow now.",
    name: "Hannah Weiss",
    role: "Marketing Lead, Nimbus Tools",
    initials: "HW",
    color: "#d55181",
  },
  {
    quote:
      "I connected it to n8n and now every new product in our store becomes a scheduled post on five channels. Zero manual work.",
    name: "Kenji Watanabe",
    role: "E-commerce Owner",
    initials: "KW",
    color: "#c98500",
  },
];

export const FAQ = [
  {
    q: "Which social networks are supported?",
    a: "X, LinkedIn (profiles and pages), Instagram, Facebook Pages, Threads, YouTube, TikTok, Pinterest, Dribbble, Reddit, Slack, Discord, Mastodon, Bluesky, Telegram, Lemmy, Warpcast, Nostr, VK, and the blogging platforms Medium, Dev.to, Hashnode and WordPress. New providers are added regularly.",
  },
  {
    q: "Is there a free plan?",
    a: "Every cloud plan starts with a 7-day free trial and no credit card is required. If you prefer, the open-source edition is free forever: you only pay for your own hosting.",
  },
  {
    q: "What counts as a channel?",
    a: "A channel is one connected account, for example one X profile or one LinkedIn page. You can connect and disconnect channels at any time within your plan's limit.",
  },
  {
    q: "Can my team collaborate?",
    a: "Yes. Invite teammates with admin, editor or viewer roles, comment on posts, and group channels by customer so agencies can keep brands separate.",
  },
  {
    q: "Does it have an API?",
    a: "Yes. The public API and webhooks let you create posts, upload media and react to publishing events. There are ready-made integrations for n8n, Make and Zapier, plus an MCP server for AI agents.",
  },
  {
    q: "How do I self-host?",
    a: "Run the Docker image with a PostgreSQL database and a Redis instance, add your provider keys and you are done. The full guide is in the README of this repository.",
  },
];

export const PLUG_DEFINITIONS: PlugDefinition[] = [
  {
    type: "auto-repost",
    providers: ["x", "linkedin", "linkedin-page", "threads", "bluesky", "mastodon", "warpcast", "nostr"],
    title: "Auto repost",
    description: "Repost the post from this channel once it reaches a number of likes.",
    fields: [{ key: "likes", label: "Repost when likes reach", type: "number", placeholder: "50" }],
  },
  {
    type: "auto-plug",
    providers: ["x", "linkedin", "linkedin-page", "threads", "bluesky", "mastodon"],
    title: "Auto plug",
    description: "Add a comment with your own link or call-to-action once the post is popular.",
    fields: [
      { key: "likes", label: "Plug when likes reach", type: "number", placeholder: "20" },
      { key: "text", label: "Comment to add", type: "text", placeholder: "Want more like this? Subscribe at ..." },
    ],
  },
  {
    type: "cross-post",
    providers: ["x", "linkedin", "instagram", "facebook", "threads", "bluesky", "mastodon", "pinterest", "reddit"],
    title: "Cross-post to another channel",
    description: "When this channel publishes, repeat the post on another connected channel.",
    fields: [{ key: "target", label: "Target channel handle", type: "text", placeholder: "@brand" }],
  },
];

export const SELLERS = [
  { id: "s1", name: "Lena Marsh", handle: "@lenawrites", niche: "SaaS & startups", followers: 88000, price: 250, rating: 4.9, color: "#3987e5", initials: "LM", providers: ["x", "linkedin"] as ProviderId[] },
  { id: "s2", name: "Omar Haddad", handle: "@omar.codes", niche: "Developer tools", followers: 142000, price: 420, rating: 4.8, color: "#d95926", initials: "OH", providers: ["x", "youtube"] as ProviderId[] },
  { id: "s3", name: "Sofia Bianchi", handle: "@sofia.designs", niche: "Design & UX", followers: 61000, price: 180, rating: 5.0, color: "#d55181", initials: "SB", providers: ["instagram", "dribbble", "threads"] as ProviderId[] },
  { id: "s4", name: "Marcus Hale", handle: "@marcushale", niche: "Marketing", followers: 230000, price: 600, rating: 4.7, color: "#199e70", initials: "MH", providers: ["linkedin", "x"] as ProviderId[] },
  { id: "s5", name: "Yuki Tanaka", handle: "@yuki.makes", niche: "Indie hackers", followers: 47000, price: 120, rating: 4.9, color: "#9085e9", initials: "YT", providers: ["x", "bluesky", "mastodon"] as ProviderId[] },
  { id: "s6", name: "Grace Mbeki", handle: "@gracetalks", niche: "E-commerce", followers: 310000, price: 850, rating: 4.8, color: "#c98500", initials: "GM", providers: ["tiktok", "instagram"] as ProviderId[] },
];

export const AI_IDEAS = [
  "Here's a behind-the-scenes look at how we build {topic}. Thread 🧵👇",
  "3 lessons we learned about {topic} this quarter (the third one surprised us):",
  "Hot take: most teams overthink {topic}. Here's the simple version that works.",
  "We just shipped something new for {topic}. Try it and tell us what you think 👇",
  "If you only read one thing about {topic} today, make it this.",
];

export function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export const SEED_CHANNELS: Channel[] = [
  { id: "ch_x", provider: "x", name: "Postio", handle: "@postio", avatarColor: "#7c3aed", followers: 12840 },
  { id: "ch_li", provider: "linkedin-page", name: "Postio", handle: "postio", avatarColor: "#0a66c2", followers: 6420, preferred: true },
  { id: "ch_ig", provider: "instagram", name: "postio.app", handle: "@postio.app", avatarColor: "#d62976", followers: 9810 },
  { id: "ch_th", provider: "threads", name: "postio.app", handle: "@postio.app", avatarColor: "#444", followers: 3115 },
  { id: "ch_bs", provider: "bluesky", name: "Postio", handle: "@postio.app", avatarColor: "#1185fe", followers: 2210 },
  { id: "ch_yt", provider: "youtube", name: "Postio Official", handle: "@postioofficial", avatarColor: "#ff0000", followers: 1890, customer: "Acme Corp" },
];

const SEED_COPY: { content: string; channels: string[]; dayOffset: number; hour: number; status: Post["status"]; media?: string[]; thread?: string }[] = [
  { content: "Monday plan: batch-create the week's posts in 45 minutes. Here's the exact workflow we use 🧵", channels: ["ch_x", "ch_bs"], dayOffset: -2, hour: 9, status: "published", thread: "1/ Start with three pillars: education, proof, and behind-the-scenes. Every post maps to one." },
  { content: "New in the editor: per-channel customisation. Write once, tweak the LinkedIn version, keep the X version short. Preview both before you schedule.", channels: ["ch_li", "ch_x"], dayOffset: -1, hour: 14, status: "published", media: ["https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80"] },
  { content: "What's the one metric you check every morning? We're curious what matters most to social teams in 2026.", channels: ["ch_th", "ch_x"], dayOffset: 0, hour: 11, status: "scheduled" },
  { content: "Self-hosting guide, updated: Postgres + Redis + one Docker command. Your data stays yours.", channels: ["ch_li"], dayOffset: 0, hour: 16, status: "scheduled" },
  { content: "Carousel: 5 hooks that stop the scroll (swipe →)", channels: ["ch_ig"], dayOffset: 1, hour: 10, status: "scheduled", media: ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80"] },
  { content: "Weekly tutorial: connecting n8n so every new blog post becomes a thread automatically. Full walkthrough on the channel tonight.", channels: ["ch_yt", "ch_x"], dayOffset: 2, hour: 18, status: "scheduled" },
  { content: "Draft: case study with Brightline Agency — 12 brands, 1 calendar, 60% less time spent scheduling.", channels: ["ch_li", "ch_x", "ch_th"], dayOffset: 3, hour: 9, status: "draft" },
  { content: "Friday wins: tag a teammate who made your week easier 🙌", channels: ["ch_ig", "ch_th"], dayOffset: 4, hour: 15, status: "scheduled" },
  { content: "Analytics deep-dive: why your best time to post is probably not 9am.", channels: ["ch_x", "ch_bs", "ch_li"], dayOffset: 6, hour: 12, status: "scheduled" },
  { content: "Oops — this one failed to publish: the Instagram token expired. Reconnect the channel to retry.", channels: ["ch_ig"], dayOffset: -3, hour: 17, status: "error" },
];

export function seedPosts(now = new Date()): Post[] {
  return SEED_COPY.map((s, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + s.dayOffset);
    d.setHours(s.hour, 0, 0, 0);
    const parts = [{ id: `pt_${i}_0`, content: s.content, media: s.media ?? [] }];
    if (s.thread) parts.push({ id: `pt_${i}_1`, content: s.thread, media: [] });
    return {
      id: `post_seed_${i}`,
      channelIds: s.channels,
      parts,
      overrides: {},
      scheduledAt: d.toISOString(),
      status: s.status,
      createdAt: new Date(d.getTime() - 86400000).toISOString(),
      comments:
        i === 6
          ? [{ id: "c1", author: "Maya (editor)", text: "Can we add the 60% stat to the first line?", at: new Date(now.getTime() - 3600000).toISOString() }]
          : [],
      tags: i % 3 === 0 ? ["launch"] : [],
      repeatDays: 0,
    };
  });
}
