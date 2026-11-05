/**
 * Seedance 2.5 via fal.ai (reseller of ByteDance's model, pay-as-you-go with a card).
 *
 * fal exposes three Seedance 2.5 endpoints and a generic queue API:
 *   POST https://queue.fal.run/<endpoint>            -> { request_id, status_url, response_url }
 *   GET  <status_url>                                -> { status: IN_QUEUE | IN_PROGRESS | COMPLETED, error? }
 *   GET  <response_url>                              -> { video: { url }, seed, draft_id }
 *
 * Docs:
 *   Queue API:          https://fal.ai/docs/documentation/model-apis/inference/queue
 *   Text to video:      https://fal.ai/models/bytedance/seedance-2.5/text-to-video/api
 *   Image to video:     https://fal.ai/models/bytedance/seedance-2.5/image-to-video/api
 *   Reference to video: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api
 */
import { validateVideoOptions } from "./seedance.js";

export const FAL_BASE_URL = "https://queue.fal.run";
export const FAL_ENDPOINTS = {
  text: "bytedance/seedance-2.5/text-to-video",
  image: "bytedance/seedance-2.5/image-to-video",
  reference: "bytedance/seedance-2.5/reference-to-video",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** fal's aspect ratio enum uses "auto" where BytePlus uses "adaptive". */
function toFalRatio(ratio) {
  return ratio === "adaptive" ? "auto" : ratio;
}

/** fal's duration is a string enum: "auto" or "4".."30". */
function toFalDuration(duration) {
  return duration === -1 ? "auto" : String(duration);
}

/**
 * Map the CLI's provider-independent options onto one of fal's three Seedance 2.5
 * endpoints. Returns { endpoint, input, warnings } — warnings list options that fal
 * cannot honour and that were dropped, so the CLI can tell the user.
 */
export function buildFalRequest(options = {}) {
  validateVideoOptions(options);
  const {
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
    endpoints = FAL_ENDPOINTS,
  } = options;

  const hasReferences = referenceImages.length > 0 || referenceVideos.length > 0;
  if (firstFrame && hasReferences) {
    throw new Error(
      "fal.ai has no endpoint that combines a first-frame image with reference media. " +
        "Either pass the frame as --ref-image and mention it as @Image1 in the prompt, or use --provider byteplus"
    );
  }

  const warnings = [];
  const input = { prompt: String(prompt).trim() };
  if (resolution) input.resolution = resolution;
  if (duration !== undefined) input.duration = toFalDuration(duration);
  if (generateAudio !== undefined) input.generate_audio = generateAudio;
  if (draft) input.draft = true;
  if (watermark) warnings.push("fal.ai has no watermark option; --watermark was ignored");
  if (outputFormat && outputFormat !== "mp4") {
    warnings.push(`fal.ai always returns mp4; --format ${outputFormat} was ignored`);
  }

  let endpoint;
  if (firstFrame) {
    endpoint = endpoints.image;
    input.image_url = firstFrame;
    if (lastFrame) input.end_image_url = lastFrame;
    // aspect_ratio is always "auto" for image-to-video, so it is not sent.
  } else if (hasReferences) {
    endpoint = endpoints.reference;
    input.task = "reference";
    if (referenceImages.length) input.image_urls = [...referenceImages];
    if (referenceVideos.length) input.video_urls = [...referenceVideos];
    if (ratio) input.aspect_ratio = toFalRatio(ratio);
    if (seed !== undefined) input.seed = seed;
  } else {
    endpoint = endpoints.text;
    if (ratio) input.aspect_ratio = toFalRatio(ratio);
  }

  if (seed !== undefined && endpoint !== endpoints.reference) {
    warnings.push("fal.ai only supports --seed on the reference-to-video endpoint; it was ignored");
  }

  return { endpoint, input, warnings };
}

/** The video URL from a finished fal result, or null. */
export function falVideoUrlOf(result) {
  return result?.video?.url || null;
}

/** Turn fal's error bodies ({detail: "..."} or {detail: [{msg, loc}]}) into one line. */
function describeFalError(body) {
  if (!body) return "";
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail
      .map((d) => {
        const where = Array.isArray(d.loc) ? d.loc.filter((x) => x !== "body").join(".") : "";
        return where ? `${where}: ${d.msg}` : d.msg || JSON.stringify(d);
      })
      .join("; ");
  }
  if (body.error) return typeof body.error === "string" ? body.error : JSON.stringify(body.error);
  if (body.raw) return String(body.raw).slice(0, 300);
  return "";
}

/**
 * Create a fal queue client. Reads FAL_KEY / FAL_BASE_URL from the environment
 * when not given.
 */
export function createFalClient({
  apiKey = process.env.FAL_KEY,
  baseUrl = process.env.FAL_BASE_URL || FAL_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) {
    throw new Error("FAL_KEY is not set. Create one at https://fal.ai/dashboard/keys and add it to .env");
  }
  const root = baseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Key ${apiKey}`,
  };

  async function request(url, init = {}) {
    const res = await fetchImpl(url, { ...init, headers });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    if (!res.ok) {
      const detail = describeFalError(body);
      throw new Error(`fal.ai request failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return body;
  }

  /** Resolve the URLs fal returns (absolute in production, maybe relative in tests). */
  const absolute = (url) => new URL(url, `${root}/`).toString();

  /** Submit an input to an endpoint. Returns { request_id, status_url, response_url }. */
  async function submit(endpoint, input) {
    const submitted = await request(`${root}/${endpoint}`, { method: "POST", body: JSON.stringify(input) });
    if (!submitted.request_id) {
      throw new Error(`fal.ai did not return a request id: ${JSON.stringify(submitted).slice(0, 300)}`);
    }
    return {
      request_id: submitted.request_id,
      status_url: absolute(submitted.status_url),
      response_url: absolute(submitted.response_url),
      queue_position: submitted.queue_position,
    };
  }

  const getStatus = (statusUrl) => request(statusUrl, { method: "GET" });
  const getResult = (responseUrl) => request(responseUrl, { method: "GET" });

  /**
   * Poll a submitted request until it completes, then fetch and return the result.
   * `onPoll(status)` is called after every status check.
   */
  async function waitForRequest(submitted, { intervalMs = 10_000, timeoutMs = 30 * 60_000, onPoll } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const status = await getStatus(submitted.status_url);
      onPoll?.(status);
      if (status.status === "COMPLETED") {
        if (status.error) {
          const kind = status.error_type ? `${status.error_type}: ` : "";
          throw new Error(`fal.ai request ${submitted.request_id} failed: ${kind}${status.error}`);
        }
        return getResult(submitted.response_url);
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for fal.ai request ${submitted.request_id} (last status: ${status.status})`);
      }
      await sleep(intervalMs);
    }
  }

  return { submit, getStatus, getResult, waitForRequest };
}
