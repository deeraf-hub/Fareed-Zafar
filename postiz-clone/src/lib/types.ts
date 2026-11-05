export type ProviderId =
  | "x"
  | "linkedin"
  | "linkedin-page"
  | "instagram"
  | "facebook"
  | "threads"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "dribbble"
  | "slack"
  | "discord"
  | "mastodon"
  | "bluesky"
  | "reddit"
  | "telegram"
  | "medium"
  | "devto"
  | "hashnode"
  | "wordpress"
  | "lemmy"
  | "warpcast"
  | "nostr"
  | "vk";

export type ProviderCategory = "social" | "community" | "blog";

export interface Provider {
  id: ProviderId;
  name: string;
  /** brand background colour for the badge */
  color: string;
  /** foreground colour for the monogram */
  fg: string;
  /** 1–3 letter monogram shown in the badge */
  mono: string;
  /** max characters for one post */
  maxChars: number;
  category: ProviderCategory;
  /** supports multi-part posts (threads / comments) */
  threads: boolean;
}

export interface Channel {
  id: string;
  provider: ProviderId;
  name: string;
  handle: string;
  avatarColor: string;
  disabled?: boolean;
  preferred?: boolean;
  customer?: string;
  followers: number;
}

export type PostStatus = "draft" | "scheduled" | "published" | "error";

export interface PostPart {
  id: string;
  content: string;
  media: string[];
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Post {
  id: string;
  channelIds: string[];
  parts: PostPart[];
  /** per-channel content overrides (first part only) */
  overrides: Record<string, string>;
  scheduledAt: string;
  status: PostStatus;
  createdAt: string;
  comments: PostComment[];
  tags: string[];
  /** repeat interval in days (0 = none) */
  repeatDays: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "invited";
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  channelIds: string[];
}

export interface Signature {
  id: string;
  content: string;
  autoAdd: boolean;
}

export interface PlugDefinition {
  type: string;
  providers: ProviderId[];
  title: string;
  description: string;
  fields: { key: string; label: string; type: "number" | "text"; placeholder: string }[];
}

export interface Plug {
  id: string;
  channelId: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface PostSet {
  id: string;
  name: string;
  channelIds: string[];
  content: string;
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  channelIds: string[];
  enabled: boolean;
}

export interface MarketplaceOrder {
  id: string;
  sellerId: string;
  brief: string;
  price: number;
  status: "pending" | "accepted" | "delivered";
  createdAt: string;
}

export type PlanId = "standard" | "team" | "pro" | "ultimate";

export interface Plan {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  channels: number;
  members: number | "unlimited";
  posts: "unlimited";
  aiCredits: number;
  tagline: string;
  features: string[];
  popular?: boolean;
}

export interface User {
  name: string;
  email: string;
  org: string;
}

export interface AppState {
  user: User | null;
  plan: PlanId;
  billingCycle: "monthly" | "yearly";
  apiKey: string;
  channels: Channel[];
  posts: Post[];
  team: TeamMember[];
  webhooks: Webhook[];
  signatures: Signature[];
  plugs: Plug[];
  sets: PostSet[];
  feeds: RssFeed[];
  orders: MarketplaceOrder[];
  customers: string[];
}
