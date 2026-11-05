import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadToFile } from "../src/seedance.js";
import { FAL_ENDPOINTS, buildFalRequest, createFalClient, falVideoUrlOf } from "../src/seedance-fal.js";

test("text-only options go to the text-to-video endpoint with fal field names", () => {
  const { endpoint, input, warnings } = buildFalRequest({
    prompt: "  A sunrise over Dubai ",
    ratio: "9:16",
    resolution: "1080p",
    duration: 5,
    generateAudio: false,
    draft: false,
  });
  assert.equal(endpoint, FAL_ENDPOINTS.text);
  assert.deepEqual(input, {
    prompt: "A sunrise over Dubai",
    resolution: "1080p",
    duration: "5",
    generate_audio: false,
    aspect_ratio: "9:16",
  });
  assert.deepEqual(warnings, []);
});

test("adaptive ratio and -1 duration map to fal's auto values; minimal input stays minimal", () => {
  const { input } = buildFalRequest({ prompt: "x", ratio: "adaptive", duration: -1 });
  assert.deepEqual(input, { prompt: "x", duration: "auto", aspect_ratio: "auto" });
  assert.deepEqual(buildFalRequest({ prompt: "x" }).input, { prompt: "x" });
});

test("a first frame selects image-to-video, with the optional end frame and no aspect ratio", () => {
  const { endpoint, input } = buildFalRequest({
    prompt: "Morph",
    firstFrame: "data:image/png;base64,AAAA",
    lastFrame: "https://x/last.png",
    ratio: "adaptive",
    draft: true,
  });
  assert.equal(endpoint, FAL_ENDPOINTS.image);
  assert.deepEqual(input, {
    prompt: "Morph",
    draft: true,
    image_url: "data:image/png;base64,AAAA",
    end_image_url: "https://x/last.png",
  });
});

test("reference media selects reference-to-video and keeps the seed", () => {
  const { endpoint, input, warnings } = buildFalRequest({
    prompt: "Use @Image1 and the motion of @Video1",
    referenceImages: ["https://x/a.png", "https://x/b.png"],
    referenceVideos: ["https://x/motion.mp4"],
    ratio: "16:9",
    seed: 7,
  });
  assert.equal(endpoint, FAL_ENDPOINTS.reference);
  assert.deepEqual(input, {
    prompt: "Use @Image1 and the motion of @Video1",
    task: "reference",
    image_urls: ["https://x/a.png", "https://x/b.png"],
    video_urls: ["https://x/motion.mp4"],
    aspect_ratio: "16:9",
    seed: 7,
  });
  assert.deepEqual(warnings, []);
});

test("options fal cannot honour are dropped with a warning, not sent", () => {
  const { input, warnings } = buildFalRequest({ prompt: "x", watermark: true, outputFormat: "mov", seed: 3 });
  assert.deepEqual(input, { prompt: "x" });
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /watermark/);
  assert.match(warnings[1], /mp4/);
  assert.match(warnings[2], /seed/);
  assert.deepEqual(buildFalRequest({ prompt: "x", outputFormat: "mp4" }).warnings, []);
});

test("fal rejects a first frame combined with reference media, and shares the common validation", () => {
  assert.throws(
    () => buildFalRequest({ prompt: "x", firstFrame: "https://x/f.png", referenceImages: ["https://x/r.png"] }),
    /no endpoint that combines/
  );
  assert.throws(() => buildFalRequest({ prompt: " " }), /prompt is required/);
  assert.throws(() => buildFalRequest({ prompt: "x", ratio: "2:1" }), /Invalid ratio/);
  assert.throws(() => buildFalRequest({ prompt: "x", firstFrame: "https://x/f.png", ratio: "9:16" }), /adaptive/);
  assert.throws(() => buildFalRequest({ prompt: "x", duration: 31 }), /Invalid duration/);
  assert.throws(() => buildFalRequest({ prompt: "x", referenceVideos: ["./local.mp4"] }), /Reference videos/);
});

test("falVideoUrlOf reads the video object", () => {
  assert.equal(falVideoUrlOf({ video: { url: "https://v/a.mp4" }, seed: 1 }), "https://v/a.mp4");
  assert.equal(falVideoUrlOf({ seed: 1 }), null);
});

test("createFalClient requires an API key", () => {
  assert.throws(() => createFalClient({ apiKey: "" }), /FAL_KEY/);
});

/** Stand up a fake fal queue for an end-to-end run of submit → poll → result → download. */
async function withFakeFal(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("client submits, polls through the queue states, fetches the result and downloads it", async () => {
  const seen = [];
  let polls = 0;
  await withFakeFal((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
      const base = `http://${req.headers.host}`;
      const json = (code, obj) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (req.method === "POST" && req.url === "/bytedance/seedance-2.5/text-to-video") {
        json(200, {
          request_id: "req-1",
          status_url: `${base}/bytedance/seedance-2.5/requests/req-1/status`,
          response_url: `${base}/bytedance/seedance-2.5/requests/req-1`,
          queue_position: 2,
        });
      } else if (req.method === "GET" && req.url === "/bytedance/seedance-2.5/requests/req-1/status") {
        polls += 1;
        if (polls === 1) json(200, { status: "IN_QUEUE", request_id: "req-1", queue_position: 2 });
        else if (polls === 2) json(200, { status: "IN_PROGRESS", request_id: "req-1", logs: [] });
        else json(200, { status: "COMPLETED", request_id: "req-1", metrics: { inference_time: 90 } });
      } else if (req.method === "GET" && req.url === "/bytedance/seedance-2.5/requests/req-1") {
        json(200, { video: { url: `${base}/out.mp4`, content_type: "video/mp4" }, seed: 42, draft_id: null });
      } else if (req.method === "GET" && req.url === "/out.mp4") {
        res.writeHead(200, { "Content-Type": "video/mp4" });
        res.end("FAKE-FAL-MP4");
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }, async (base) => {
    const client = createFalClient({ apiKey: "test-key", baseUrl: `${base}/` });
    const { endpoint, input } = buildFalRequest({ prompt: "hello", ratio: "9:16", duration: 5 });
    const submitted = await client.submit(endpoint, input);
    assert.equal(submitted.request_id, "req-1");
    assert.equal(submitted.queue_position, 2);

    const statuses = [];
    const result = await client.waitForRequest(submitted, { intervalMs: 5, onPoll: (s) => statuses.push(s.status) });
    assert.deepEqual(statuses, ["IN_QUEUE", "IN_PROGRESS", "COMPLETED"]);
    assert.equal(result.seed, 42);

    const dir = await mkdtemp(join(tmpdir(), "seedance-fal-"));
    try {
      const out = join(dir, "clip.mp4");
      await downloadToFile(falVideoUrlOf(result), out);
      assert.equal(await readFile(out, "utf8"), "FAKE-FAL-MP4");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  assert.equal(seen[0].auth, "Key test-key");
  assert.deepEqual(JSON.parse(seen[0].body), { prompt: "hello", duration: "5", aspect_ratio: "9:16" });
  assert.ok(seen.every((r) => r.auth === "Key test-key" || r.url === "/out.mp4"));
});

test("client surfaces validation errors, failed requests and timeouts", async () => {
  let mode = "submit-422";
  await withFakeFal((req, res) => {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    const base = `http://${req.headers.host}`;
    if (req.method === "POST") {
      if (mode === "submit-422") {
        return json(422, { detail: [{ loc: ["body", "duration"], msg: "Input should be 'auto', '4', ...", type: "enum" }] });
      }
      return json(200, { request_id: "r", status_url: `${base}/s`, response_url: `${base}/r` });
    }
    if (req.url === "/s") {
      if (mode === "failed") return json(200, { status: "COMPLETED", request_id: "r", error: "content blocked", error_type: "content_policy_violation" });
      return json(200, { status: "IN_PROGRESS", request_id: "r" });
    }
    res.writeHead(404);
    res.end();
  }, async (base) => {
    const client = createFalClient({ apiKey: "k", baseUrl: base });
    await assert.rejects(client.submit("bytedance/seedance-2.5/text-to-video", { prompt: "x" }), /HTTP 422.*duration: Input should be/);

    mode = "failed";
    const submitted = await client.submit("bytedance/seedance-2.5/text-to-video", { prompt: "x" });
    await assert.rejects(client.waitForRequest(submitted, { intervalMs: 1 }), /failed: content_policy_violation: content blocked/);

    mode = "slow";
    const slow = await client.submit("bytedance/seedance-2.5/text-to-video", { prompt: "x" });
    await assert.rejects(client.waitForRequest(slow, { intervalMs: 1, timeoutMs: 20 }), /Timed out.*IN_PROGRESS/);
  });
});
