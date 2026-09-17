// Static snapshot of the UI: one self-contained HTML file with the demo data
// embedded (thumbnails inlined as small JPEG data URIs) so the interface can
// be shared and clicked through without the server. Actions that need the
// engine (analyze, render, jobs) are disabled in snapshot mode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, FFMPEG } from "../ffmpeg.js";
import { buildSnapshotData } from "./server.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function thumbDataUri(absFrame, width, cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const out = path.join(cacheDir, `${width}_${path.basename(path.dirname(absFrame))}_${path.basename(absFrame)}`);
  if (!fs.existsSync(out)) {
    await run(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-i", absFrame, "-vf", `scale=${width}:-2`, "-q:v", "6", out]);
  }
  return `data:image/jpeg;base64,${fs.readFileSync(out).toString("base64")}`;
}

export async function writeSnapshot({ config, brand, ix, api, outFile, thumbWidth = 320, videos = false, log = () => {} }) {
  const data = await buildSnapshotData({ config, brand, ix, api });
  // Map every /frames/... URL in the data to an inline data URI.
  const urls = new Set();
  const collect = (v) => {
    if (typeof v === "string" && v.startsWith("/frames/")) urls.add(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(data);
  const map = {};
  let i = 0;
  for (const u of urls) {
    const abs = path.join(config.framesDir, decodeURIComponent(u.slice("/frames/".length)));
    if (!fs.existsSync(abs)) continue;
    map[u] = await thumbDataUri(abs, thumbWidth, path.join(config.cacheDir, "thumbs"));
    if (++i % 20 === 0) log(`  ${i}/${urls.size} thumbnails`);
  }
  const replace = (v) => {
    if (typeof v === "string") return map[v] ?? v;
    if (Array.isArray(v)) return v.map(replace);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]));
    return v;
  };
  const inlined = replace(data);
  if (!videos) {
    // Drop file links that need the server; keep the names so the UI can say what would be there.
    for (const p of inlined.plans) p.files = Object.fromEntries(Object.entries(p.files).map(([k, v]) => [k, null]));
    for (const d of Object.values(inlined.planDetails)) d.files = Object.fromEntries(Object.entries(d.files).map(([k, v]) => [k, null]));
  }
  const html = fs.readFileSync(path.join(here, "index.html"), "utf8");
  const payload = JSON.stringify(inlined).replace(/<\/script/gi, "<\\/script");
  const out = html.replace("<!--FCE_SNAPSHOT-->", `<script id="fce-snapshot" type="application/json">${payload}</script>`);
  fs.writeFileSync(outFile, out);
  return { outFile, bytes: Buffer.byteLength(out), thumbnails: Object.keys(map).length };
}
