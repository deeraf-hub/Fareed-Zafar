/**
 * Minimal client for BytePlus ModelArk video generation (Seedance 2.5).
 *
 * The API is asynchronous: you create a task, poll it until it reaches
 * "succeeded", then download the video from the returned URL.
 *
 * Docs:
 *   Create task:   https://docs.byteplus.com/en/docs/ModelArk/1520757
 *   Seedance 2.5:  https://docs.byteplus.com/en/docs/ModelArk/2607688
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";

export const DEFAULT_MODEL = "dreamina-seedance-2-5-260628";
export const DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

export const RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"];
export const RESOLUTIONS = ["480p", "720p", "1080p"];
export const OUTPUT_FORMATS = ["mp4", "mov"];
export const TERMINAL_FAILURES = new Set(["failed", "expired", "cancelled"]);

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True for anything the API can fetch itself (http(s), data: and asset: URLs). */
export function isRemoteUrl(value) {
  return /^(https?:|data:|asset:)/i.test(String(value));
}

/**
 * Turn a local image path into a base64 data URL so it can be sent inline.
 * URLs (http, data, asset) are returned unchanged.
 */
export async function toImageUrl(source) {
  if (isRemoteUrl(source)) return source;
  const mime = MIME_BY_EXT[extname(source).toLowerCase()];
  if (!mime) {
    throw new Error(
      `Unsupported image file "${source}" — use .png, .jpg, .jpeg, .webp, .gif or .bmp, or pass a URL`
    );
  }
  const bytes = await readFile(source);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/**
 * Validate the provider-independent options shared by every Seedance backend.
 * Throws a descriptive Error so the CLI can fail before any credits are spent.
 */
export function validateVideoOptions({
  prompt,
  firstFrame,
  lastFrame,
  referenceVideos = [],
  ratio,
  resolution,
  duration,
  outputFormat,
  draft,
} = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error("A text prompt is required");
  }
  if (lastFrame && !firstFrame) {
    throw new Error("A last frame image needs a first frame image as well");
  }
  if (ratio && !RATIOS.includes(ratio)) {
    throw new Error(`Invalid ratio "${ratio}" — use one of: ${RATIOS.join(", ")}`);
  }
  if (firstFrame && ratio && ratio !== "adaptive") {
    throw new Error(
      "Seedance 2.5 keeps the aspect ratio of the first-frame image; leave ratio unset (or use \"adaptive\") for image-to-video"
    );
  }
  if (resolution && !RESOLUTIONS.includes(resolution)) {
    throw new Error(`Invalid resolution "${resolution}" — use one of: ${RESOLUTIONS.join(", ")}`);
  }
  if (draft && resolution && resolution !== "480p") {
    throw new Error("Draft mode only produces 480p videos; drop --resolution or set it to 480p");
  }
  if (duration !== undefined && duration !== -1 && (!Number.isInteger(duration) || duration < 4 || duration > 30)) {
    throw new Error(`Invalid duration ${duration} — use a whole number of seconds from 4 to 30, or -1 to let the model choose`);
  }
  if (outputFormat && !OUTPUT_FORMATS.includes(outputFormat)) {
    throw new Error(`Invalid output format "${outputFormat}" — use mp4 or mov`);
  }
  for (const url of referenceVideos) {
    if (!/^(https?:|asset:)/i.test(url)) {
      throw new Error(`Reference videos must be http(s) or asset:// URLs, got "${url}"`);
    }
  }
}

/**
 * Build the JSON body for POST /contents/generations/tasks.
 * Pure function so it can be unit-tested without network access.
 */
export function buildTaskPayload(options = {}) {
  validateVideoOptions(options);
  const {
    model = DEFAULT_MODEL,
    prompt,
    firstFrame,
    lastFrame,
    referenceImages = [],
    referenceVideos = [],
    ratio,
    resolution,
    duration,
    generateAudio,
    watermark,
    seed,
    outputFormat,
    draft,
  } = options;

  const content = [{ type: "text", text: String(prompt).trim() }];
  if (firstFrame) content.push({ type: "image_url", image_url: { url: firstFrame }, role: "first_frame" });
  if (lastFrame) content.push({ type: "image_url", image_url: { url: lastFrame }, role: "last_frame" });
  for (const url of referenceImages) {
    content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  }
  for (const url of referenceVideos) {
    content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
  }

  const payload = { model, content };
  if (ratio) payload.ratio = ratio;
  if (resolution) payload.resolution = resolution;
  if (duration !== undefined) payload.duration = duration;
  if (generateAudio !== undefined) payload.generate_audio = generateAudio;
  if (watermark !== undefined) payload.watermark = watermark;
  if (seed !== undefined) payload.seed = seed;
  if (outputFormat) payload.output_format = outputFormat;
  if (draft) payload.draft = true;
  return payload;
}

/** The video URL from a finished task, or null if there is none yet. */
export function videoUrlOf(task) {
  const value = task?.content?.video_url;
  if (typeof value === "string") return value;
  return value?.url || null;
}

/**
 * Create a client bound to one API key and region base URL.
 * Reads ARK_API_KEY / ARK_BASE_URL from the environment when not given.
 */
export function createClient({
  apiKey = process.env.ARK_API_KEY,
  baseUrl = process.env.ARK_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) {
    throw new Error(
      "ARK_API_KEY is not set. Create one in the BytePlus ModelArk console (API Key management) and add it to .env"
    );
  }
  const root = baseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  async function request(path, init = {}) {
    const res = await fetchImpl(`${root}${path}`, { ...init, headers });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    if (!res.ok) {
      const err = body.error || body;
      const detail = [err.code, err.message || body.raw].filter(Boolean).join(" ");
      throw new Error(`ModelArk request failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return body;
  }

  const createTask = (payload) =>
    request("/contents/generations/tasks", { method: "POST", body: JSON.stringify(payload) });

  const getTask = (id) =>
    request(`/contents/generations/tasks/${encodeURIComponent(id)}`, { method: "GET" });

  /**
   * Poll a task until it succeeds. Rejects on failed/expired/cancelled or on timeout.
   * `onPoll(task)` is called after every status check.
   */
  async function waitForTask(id, { intervalMs = 15_000, timeoutMs = 30 * 60_000, onPoll } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const task = await getTask(id);
      onPoll?.(task);
      if (task.status === "succeeded") return task;
      if (TERMINAL_FAILURES.has(task.status)) {
        const err = task.error || {};
        const detail = [err.code, err.message].filter(Boolean).join(" ");
        throw new Error(`Task ${id} ${task.status}${detail ? `: ${detail}` : ""}`);
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for task ${id} (last status: ${task.status})`);
      }
      await sleep(intervalMs);
    }
  }

  return { createTask, getTask, waitForTask };
}

/** Download a URL to disk, creating parent folders as needed. Returns the path. */
export async function downloadToFile(url, filePath, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}) for ${url}`);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
  return filePath;
}
