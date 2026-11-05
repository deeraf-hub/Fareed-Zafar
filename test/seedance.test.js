import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MODEL,
  buildTaskPayload,
  createClient,
  downloadToFile,
  toImageUrl,
  videoUrlOf,
} from "../src/seedance.js";

test("text-to-video payload uses the Seedance 2.5 model and only the text block", () => {
  const payload = buildTaskPayload({ prompt: "  A sunrise over Dubai  " });
  assert.deepEqual(payload, {
    model: DEFAULT_MODEL,
    content: [{ type: "text", text: "A sunrise over Dubai" }],
  });
});

test("first and last frames and references map to the documented roles", () => {
  const payload = buildTaskPayload({
    prompt: "Morph",
    firstFrame: "https://x/first.png",
    lastFrame: "https://x/last.png",
    referenceImages: ["https://x/ref.png"],
    referenceVideos: ["https://x/ref.mp4"],
  });
  assert.deepEqual(
    payload.content.map((c) => [c.type, c.role]),
    [
      ["text", undefined],
      ["image_url", "first_frame"],
      ["image_url", "last_frame"],
      ["image_url", "reference_image"],
      ["video_url", "reference_video"],
    ]
  );
  assert.equal(payload.content[1].image_url.url, "https://x/first.png");
  assert.equal(payload.content[4].video_url.url, "https://x/ref.mp4");
});

test("optional settings are only sent when given, with API field names", () => {
  const minimal = buildTaskPayload({ prompt: "x" });
  assert.deepEqual(Object.keys(minimal), ["model", "content"]);

  const full = buildTaskPayload({
    prompt: "x",
    ratio: "9:16",
    resolution: "1080p",
    duration: 8,
    generateAudio: false,
    watermark: true,
    seed: 42,
    outputFormat: "mov",
    draft: false,
  });
  assert.equal(full.ratio, "9:16");
  assert.equal(full.resolution, "1080p");
  assert.equal(full.duration, 8);
  assert.equal(full.generate_audio, false);
  assert.equal(full.watermark, true);
  assert.equal(full.seed, 42);
  assert.equal(full.output_format, "mov");
  assert.equal("draft" in full, false);
});

test("invalid combinations are rejected before any request is made", () => {
  assert.throws(() => buildTaskPayload({ prompt: "   " }), /prompt is required/);
  assert.throws(() => buildTaskPayload({ prompt: "x", lastFrame: "https://x/l.png" }), /first frame/);
  assert.throws(() => buildTaskPayload({ prompt: "x", ratio: "2:1" }), /Invalid ratio/);
  assert.throws(
    () => buildTaskPayload({ prompt: "x", firstFrame: "https://x/f.png", ratio: "9:16" }),
    /adaptive/
  );
  assert.doesNotThrow(() => buildTaskPayload({ prompt: "x", firstFrame: "https://x/f.png", ratio: "adaptive" }));
  assert.throws(() => buildTaskPayload({ prompt: "x", resolution: "4k" }), /Invalid resolution/);
  assert.throws(() => buildTaskPayload({ prompt: "x", draft: true, resolution: "720p" }), /Draft mode/);
  assert.throws(() => buildTaskPayload({ prompt: "x", duration: 3 }), /Invalid duration/);
  assert.throws(() => buildTaskPayload({ prompt: "x", duration: 31 }), /Invalid duration/);
  assert.doesNotThrow(() => buildTaskPayload({ prompt: "x", duration: -1 }));
  assert.throws(() => buildTaskPayload({ prompt: "x", outputFormat: "avi" }), /Invalid output format/);
  assert.throws(() => buildTaskPayload({ prompt: "x", referenceVideos: ["./local.mp4"] }), /Reference videos/);
});

test("toImageUrl inlines local files as data URLs and passes URLs through", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seedance-"));
  try {
    const file = join(dir, "frame.png");
    await writeFile(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    assert.equal(await toImageUrl(file), "data:image/png;base64,iVBORw==");
    assert.equal(await toImageUrl("https://x/a.png"), "https://x/a.png");
    assert.equal(await toImageUrl("asset://asset-123"), "asset://asset-123");
    await assert.rejects(toImageUrl(join(dir, "notes.txt")), /Unsupported image file/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("videoUrlOf accepts both string and object forms", () => {
  assert.equal(videoUrlOf({ content: { video_url: "https://v/a.mp4" } }), "https://v/a.mp4");
  assert.equal(videoUrlOf({ content: { video_url: { url: "https://v/b.mp4" } } }), "https://v/b.mp4");
  assert.equal(videoUrlOf({ status: "running" }), null);
});

test("createClient requires an API key", () => {
  assert.throws(() => createClient({ apiKey: "" }), /ARK_API_KEY/);
});

/** Stand up a fake ModelArk server for an end-to-end run of create → poll → download. */
async function withFakeArk(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("client creates a task, polls until success and downloads the video", async () => {
  const seen = [];
  let polls = 0;
  await withFakeArk((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
      if (req.method === "POST" && req.url === "/api/v3/contents/generations/tasks") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: "cgt-test-1" }));
      } else if (req.method === "GET" && req.url === "/api/v3/contents/generations/tasks/cgt-test-1") {
        polls += 1;
        const status = polls < 3 ? (polls === 1 ? "queued" : "running") : "succeeded";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            status === "succeeded"
              ? { id: "cgt-test-1", status, content: { video_url: `http://${req.headers.host}/video.mp4` } }
              : { id: "cgt-test-1", status }
          )
        );
      } else if (req.method === "GET" && req.url === "/video.mp4") {
        res.writeHead(200, { "Content-Type": "video/mp4" });
        res.end("FAKE-MP4-BYTES");
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }, async (base) => {
    const client = createClient({ apiKey: "test-key", baseUrl: `${base}/api/v3/` });
    const payload = buildTaskPayload({ prompt: "hello", ratio: "9:16" });
    const created = await client.createTask(payload);
    assert.equal(created.id, "cgt-test-1");

    const statuses = [];
    const task = await client.waitForTask(created.id, { intervalMs: 5, onPoll: (t) => statuses.push(t.status) });
    assert.deepEqual(statuses, ["queued", "running", "succeeded"]);

    const dir = await mkdtemp(join(tmpdir(), "seedance-"));
    try {
      const out = join(dir, "nested", "clip.mp4");
      await downloadToFile(videoUrlOf(task), out);
      assert.equal(await readFile(out, "utf8"), "FAKE-MP4-BYTES");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  assert.equal(seen[0].auth, "Bearer test-key");
  assert.deepEqual(JSON.parse(seen[0].body), {
    model: DEFAULT_MODEL,
    content: [{ type: "text", text: "hello" }],
    ratio: "9:16",
  });
});

test("client surfaces API errors and failed tasks with their code and message", async () => {
  await withFakeArk((req, res) => {
    if (req.method === "POST") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "AuthenticationError", message: "bad key" } }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "cgt-x", status: "failed", error: { code: "OutputVideoSensitiveContentDetected", message: "blocked" } }));
    }
  }, async (base) => {
    const client = createClient({ apiKey: "k", baseUrl: `${base}/api/v3` });
    await assert.rejects(client.createTask({ model: "m", content: [] }), /HTTP 401.*AuthenticationError bad key/);
    await assert.rejects(client.waitForTask("cgt-x", { intervalMs: 1 }), /failed: OutputVideoSensitiveContentDetected blocked/);
  });
});

test("waitForTask times out while a task is still running", async () => {
  await withFakeArk((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: "cgt-slow", status: "running" }));
  }, async (base) => {
    const client = createClient({ apiKey: "k", baseUrl: base });
    await assert.rejects(client.waitForTask("cgt-slow", { intervalMs: 1, timeoutMs: 20 }), /Timed out.*running/);
  });
});
