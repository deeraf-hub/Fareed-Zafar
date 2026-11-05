#!/usr/bin/env node
/**
 * Generate a short video or reel with Seedance 2.5 (BytePlus ModelArk).
 *
 * Usage:
 *   npm run video -- --prompt "A barista pours latte art, warm morning light" --ratio 9:16 --duration 5
 *   npm run video -- --prompt "Slow push-in on the product" --image ./product.jpg
 *   npm run video -- --prompt "Morph from day to night" --image day.jpg --last-image night.jpg
 *
 * Run with --help for every option. Needs ARK_API_KEY in .env (see .env.example).
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

const HELP = `
Generate a video with Seedance 2.5 via BytePlus ModelArk.

  npm run video -- --prompt "<text>" [options]

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
      --watermark           Add the Seedance watermark
      --seed <n>            Fixed seed for repeatable results
      --format <mp4|mov>    Container (default: mp4)
      --draft               Cheap 480p preview to test a prompt before a full render
  -o, --out <path>          Where to save (default: output/seedance-<timestamp>.<format>)
      --no-download         Print the URL only, do not save the file

Polling
      --poll <sec>          Seconds between status checks (default: 15)
      --timeout <min>       Give up after this many minutes (default: 30)
      --model <id>          Override the model id (default: ${DEFAULT_MODEL})
  -h, --help                Show this help

Environment (.env)
  ARK_API_KEY     your BytePlus ModelArk API key (required)
  ARK_BASE_URL    override the regional endpoint (optional)
  SEEDANCE_MODEL  default model id (optional)
`.trimStart();

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
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
      poll: { type: "string", default: "15" },
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

function toInt(name, raw) {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`--${name} must be a whole number, got "${raw}"`);
    process.exit(2);
  }
  return n;
}

const pollMs = Math.max(3, toInt("poll", values.poll)) * 1000;
const timeoutMs = Math.max(1, toInt("timeout", values.timeout)) * 60_000;

let client;
try {
  client = createClient();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let payload;
try {
  payload = buildTaskPayload({
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
  });
} catch (err) {
  console.error(err.message);
  process.exit(2);
}

const format = payload.output_format || "mp4";
const outPath = resolve(values.out || `output/seedance-${new Date().toISOString().replace(/[:.]/g, "-")}.${format}`);

console.log(`Model:      ${payload.model}`);
console.log(`Prompt:     ${payload.content[0].text}`);
const extras = payload.content.slice(1).map((c) => c.role).join(", ");
if (extras) console.log(`Inputs:     ${extras}`);
console.log(
  `Settings:   ${[
    payload.ratio && `ratio ${payload.ratio}`,
    payload.resolution && payload.resolution,
    payload.duration !== undefined && `${payload.duration}s`,
    payload.generate_audio === false && "no audio",
    payload.draft && "draft",
  ]
    .filter(Boolean)
    .join(", ") || "API defaults (720p, adaptive ratio, audio on)"}`
);

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
  console.error(`\nGeneration FAILED: ${err.message}`);
  console.error(
    "\nCommon causes:\n" +
      "  • ARK_API_KEY is wrong, or was created in a different region than ARK_BASE_URL\n" +
      "  • Seedance 2.5 is not activated on your account, or you have no resource pack / credits\n" +
      "  • The prompt or an input image was rejected by the content filter\n" +
      "  • Reference videos must be public http(s) URLs the API can download"
  );
  process.exit(1);
}

const url = videoUrlOf(task);
if (!url) {
  console.error("Task succeeded but no video URL was returned:", JSON.stringify(task, null, 2));
  process.exit(1);
}

console.log(`\nVideo URL:  ${url}`);
console.log("(the link is temporary — download it before it expires)");

if (!values["no-download"]) {
  try {
    await downloadToFile(url, outPath);
    console.log(`Saved to:   ${outPath}`);
  } catch (err) {
    console.error(`Could not download the video: ${err.message}`);
    process.exit(1);
  }
}
