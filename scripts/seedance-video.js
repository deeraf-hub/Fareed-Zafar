#!/usr/bin/env node
/**
 * Generate a short video or reel with Seedance 2.5.
 *
 * Works with either provider — pick whichever you can sign up for:
 *   • BytePlus ModelArk (ByteDance's official API)  → ARK_API_KEY
 *   • fal.ai (reseller, pay-as-you-go with a card)  → FAL_KEY
 *
 * Usage:
 *   npm run video -- --prompt "A barista pours latte art, warm morning light" --ratio 9:16 --duration 5
 *   npm run video -- --prompt "Slow push-in on the product" --image ./product.jpg
 *   npm run video -- --prompt "Morph from day to night" --image day.jpg --last-image night.jpg
 *
 * Run with --help for every option. Put your key in .env (see .env.example).
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import {
  DEFAULT_MODEL,
  RATIOS,
  RESOLUTIONS,
  buildTaskPayload,
  createClient,
  downloadToFile,
  toImageUrl,
  videoUrlOf,
} from "../src/seedance.js";
import { buildFalRequest, createFalClient, falVideoUrlOf } from "../src/seedance-fal.js";

const PROVIDERS = ["byteplus", "fal"];

const HELP = `
Generate a video with Seedance 2.5.

  npm run video -- --prompt "<text>" [options]

Provider (which account/key to use)
      --provider <name>     byteplus | fal   (default: SEEDANCE_PROVIDER, else whichever key is set)
                            byteplus = BytePlus ModelArk, needs ARK_API_KEY
                            fal      = fal.ai reseller,   needs FAL_KEY

Inputs
  -p, --prompt <text>       What to generate (required; positional words also work)
  -i, --image <file|url>    First-frame image: the video starts from this picture
      --last-image <file|url>  Last-frame image (needs --image too)
      --ref-image <file|url>   Reference image for style/character (repeatable, up to 30)
      --ref-video <url>        Reference video for motion/camera (repeatable, up to 10, URL only)

Output
      --ratio <r>           ${RATIOS.join(" | ")}  (default: adaptive; 9:16 for reels)
      --resolution <r>      ${RESOLUTIONS.join(" | ")}  (default: 720p)
  -d, --duration <sec>      4-30, or -1 to let the model choose (default: model picks)
      --no-audio            Generate a silent video (audio is on by default)
      --watermark           Add the Seedance watermark (BytePlus only)
      --seed <n>            Fixed seed for repeatable results (fal: reference videos only)
      --format <mp4|mov>    Container (default: mp4; fal always returns mp4)
      --draft               Cheap 480p preview to test a prompt before a full render
  -o, --out <path>          Where to save (default: output/seedance-<timestamp>.<format>)
      --no-download         Print the URL only, do not save the file

Polling
      --poll <sec>          Seconds between status checks (default: 15 BytePlus, 10 fal)
      --timeout <min>       Give up after this many minutes (default: 30)
      --model <id>          BytePlus model id override (default: ${DEFAULT_MODEL})
  -h, --help                Show this help

Environment (.env)
  ARK_API_KEY        BytePlus ModelArk API key
  FAL_KEY            fal.ai API key
  SEEDANCE_PROVIDER  byteplus | fal — default provider when both keys exist
  ARK_BASE_URL / FAL_BASE_URL / SEEDANCE_MODEL   optional overrides
`.trimStart();

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      provider: { type: "string" },
      prompt: { type: "string", short: "p" },
      image: { type: "string", short: "i" },
      "last-image": { type: "string" },
      "ref-image": { type: "string", multiple: true, default: [] },
      "ref-video": { type: "string", multiple: true, default: [] },
      ratio: { type: "string" },
      resolution: { type: "string" },
      duration: { type: "string", short: "d" },
      "no-audio": { type: "boolean", default: false },
      watermark: { type: "boolean", default: false },
      seed: { type: "string" },
      format: { type: "string" },
      draft: { type: "boolean", default: false },
      out: { type: "string", short: "o" },
      "no-download": { type: "boolean", default: false },
      poll: { type: "string" },
      timeout: { type: "string", default: "30" },
      model: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
} catch (err) {
  console.error(err.message);
  console.error("\nRun with --help to see the options.");
  process.exit(2);
}

const { values, positionals } = args;

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const prompt = values.prompt || positionals.join(" ");
if (!prompt.trim()) {
  console.error("Please give a prompt, e.g.  npm run video -- --prompt \"A sunrise over the Dubai skyline\"");
  console.error("\nRun with --help to see the options.");
  process.exit(2);
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function toInt(name, raw) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) fail(`--${name} must be a whole number, got "${raw}"`, 2);
  return n;
}

/** Decide which backend to use from the flag, the env default, or whichever key exists. */
function pickProvider() {
  const requested = values.provider || process.env.SEEDANCE_PROVIDER;
  if (requested) {
    if (!PROVIDERS.includes(requested)) fail(`Unknown provider "${requested}" — use byteplus or fal`, 2);
    return requested;
  }
  const hasArk = Boolean(process.env.ARK_API_KEY);
  const hasFal = Boolean(process.env.FAL_KEY);
  if (hasArk) return "byteplus";
  if (hasFal) return "fal";
  fail(
    "No API key found. Add one of these to .env:\n" +
      "  ARK_API_KEY=...   BytePlus ModelArk (https://console.byteplus.com → ModelArk → API Key management)\n" +
      "  FAL_KEY=...       fal.ai (https://fal.ai/dashboard/keys)\n" +
      "Then re-run. With both keys set, choose with --provider or SEEDANCE_PROVIDER."
  );
}

const provider = pickProvider();
const pollMs = Math.max(3, toInt("poll", values.poll) ?? (provider === "fal" ? 10 : 15)) * 1000;
const timeoutMs = Math.max(1, toInt("timeout", values.timeout)) * 60_000;

// Shared, provider-independent options. Local image files become data URLs.
let options;
try {
  options = {
    model: values.model || process.env.SEEDANCE_MODEL || DEFAULT_MODEL,
    prompt,
    firstFrame: values.image ? await toImageUrl(values.image) : undefined,
    lastFrame: values["last-image"] ? await toImageUrl(values["last-image"]) : undefined,
    referenceImages: await Promise.all(values["ref-image"].map(toImageUrl)),
    referenceVideos: values["ref-video"],
    ratio: values.ratio,
    resolution: values.resolution,
    duration: toInt("duration", values.duration),
    generateAudio: values["no-audio"] ? false : undefined,
    watermark: values.watermark ? true : undefined,
    seed: toInt("seed", values.seed),
    outputFormat: values.format,
    draft: values.draft,
  };
} catch (err) {
  fail(err.message, 2);
}

function describeSettings({ ratio, resolution, duration, generateAudio, draft }) {
  const parts = [
    ratio && `ratio ${ratio}`,
    resolution,
    duration !== undefined && (duration === -1 ? "auto length" : `${duration}s`),
    generateAudio === false && "no audio",
    draft && "draft",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "defaults (720p, adaptive ratio, audio on)";
}

function printFailure(err, hints) {
  console.error(`\nGeneration FAILED: ${err.message}`);
  console.error("\nCommon causes:\n" + hints.map((h) => `  • ${h}`).join("\n"));
  process.exit(1);
}

/** Run the job on BytePlus ModelArk. Returns { url, extension }. */
async function runByteplus() {
  let client;
  let payload;
  try {
    client = createClient();
    payload = buildTaskPayload(options);
  } catch (err) {
    fail(err.message, 2);
  }

  console.log(`Provider:   BytePlus ModelArk (${payload.model})`);
  console.log(`Prompt:     ${payload.content[0].text}`);
  const extras = payload.content.slice(1).map((c) => c.role).join(", ");
  if (extras) console.log(`Inputs:     ${extras}`);
  console.log(`Settings:   ${describeSettings(options)}`);

  let task;
  try {
    const created = await client.createTask(payload);
    console.log(`Task id:    ${created.id}`);
    console.log("Rendering… this usually takes 1-5 minutes.");
    let lastStatus = "";
    task = await client.waitForTask(created.id, {
      intervalMs: pollMs,
      timeoutMs,
      onPoll: (t) => {
        if (t.status !== lastStatus) {
          lastStatus = t.status;
          console.log(`Status:     ${t.status}`);
        }
      },
    });
  } catch (err) {
    printFailure(err, [
      "ARK_API_KEY is wrong, or was created in a different region than ARK_BASE_URL",
      "Seedance 2.5 is not activated on your account, or you have no resource pack / credits",
      "The prompt or an input image was rejected by the content filter",
      "Reference videos must be public http(s) URLs the API can download",
    ]);
  }

  const url = videoUrlOf(task);
  if (!url) fail(`Task succeeded but no video URL was returned:\n${JSON.stringify(task, null, 2)}`);
  return { url, extension: payload.output_format || "mp4" };
}

/** Run the job on fal.ai. Returns { url, extension }. */
async function runFal() {
  let client;
  let req;
  try {
    client = createFalClient();
    req = buildFalRequest(options);
  } catch (err) {
    fail(err.message, 2);
  }

  console.log(`Provider:   fal.ai (${req.endpoint})`);
  console.log(`Prompt:     ${req.input.prompt}`);
  const inputs = [
    req.input.image_url && "first_frame",
    req.input.end_image_url && "last_frame",
    req.input.image_urls && `${req.input.image_urls.length} reference image(s)`,
    req.input.video_urls && `${req.input.video_urls.length} reference video(s)`,
  ].filter(Boolean);
  if (inputs.length) console.log(`Inputs:     ${inputs.join(", ")}`);
  console.log(`Settings:   ${describeSettings(options)}`);
  for (const w of req.warnings) console.log(`Note:       ${w}`);

  let result;
  try {
    const submitted = await client.submit(req.endpoint, req.input);
    console.log(`Request id: ${submitted.request_id}`);
    console.log("Rendering… this usually takes 1-5 minutes.");
    let lastLine = "";
    result = await client.waitForRequest(submitted, {
      intervalMs: pollMs,
      timeoutMs,
      onPoll: (s) => {
        const line =
          s.status === "IN_QUEUE" && Number.isInteger(s.queue_position)
            ? `IN_QUEUE (${s.queue_position} ahead)`
            : s.status;
        if (line !== lastLine) {
          lastLine = line;
          console.log(`Status:     ${line}`);
        }
      },
    });
  } catch (err) {
    printFailure(err, [
      "FAL_KEY is wrong or was revoked (create a new one at https://fal.ai/dashboard/keys)",
      "Your fal.ai balance is empty — top up at https://fal.ai/dashboard/billing",
      "The prompt or an input image was rejected by the content filter",
      "Reference videos must be public http(s) URLs (MP4/MOV, 1.8-30 s each)",
    ]);
  }

  const url = falVideoUrlOf(result);
  if (!url) fail(`Request completed but no video URL was returned:\n${JSON.stringify(result, null, 2)}`);
  return { url, extension: "mp4" };
}

const { url, extension } = provider === "fal" ? await runFal() : await runByteplus();

console.log(`\nVideo URL:  ${url}`);
console.log("(the link is temporary — download it before it expires)");

if (!values["no-download"]) {
  const outPath = resolve(
    values.out || `output/seedance-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`
  );
  try {
    await downloadToFile(url, outPath);
    console.log(`Saved to:   ${outPath}`);
  } catch (err) {
    fail(`Could not download the video: ${err.message}`);
  }
}
