import { config, GRAPH_BASE } from "./config.js";

const nameCache = new Map(); // PSID -> { name, fetchedAt }
const NAME_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Resolves a Messenger PSID to the sender's display name via the Graph API.
 * Falls back to the PSID itself if the profile is not accessible (e.g. the
 * user restricted profile access, or the app lacks the field).
 */
export async function getSenderName(psid) {
  const cached = nameCache.get(psid);
  if (cached && Date.now() - cached.fetchedAt < NAME_CACHE_TTL_MS) {
    return cached.name;
  }

  try {
    const url = new URL(`${GRAPH_BASE}/${psid}`);
    url.searchParams.set("fields", "first_name,last_name,name");
    url.searchParams.set("access_token", config.pageAccessToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Graph profile lookup HTTP ${res.status}`);

    const data = await res.json();
    const name =
      data.name ||
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      `Messenger user ${psid}`;

    nameCache.set(psid, { name, fetchedAt: Date.now() });
    return name;
  } catch (err) {
    console.warn(`Could not resolve name for PSID ${psid}: ${err.message}`);
    return `Messenger user ${psid}`;
  }
}
