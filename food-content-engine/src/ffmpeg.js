// Thin wrappers around ffmpeg / ffprobe. Everything the engine knows about a
// video file comes through here so the rest of the code never shells out itself.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

export function run(bin, args, { cwd, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => reject(new Error(`Failed to start ${bin}: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve({ code, stdout, stderr });
      else reject(new Error(`${bin} exited with ${code}\n${stderr.split("\n").slice(-12).join("\n")}`));
    });
    if (input != null) child.stdin.end(input);
    else child.stdin.end();
  });
}

export async function ffmpegAvailable() {
  try {
    const { stdout } = await run(FFMPEG, ["-version"]);
    const { stdout: p } = await run(FFPROBE, ["-version"]);
    return { ok: true, ffmpeg: stdout.split("\n")[0], ffprobe: p.split("\n")[0] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function parseRate(s) {
  if (!s) return null;
  const [n, d] = String(s).split("/").map(Number);
  if (!d) return n || null;
  return d ? n / d : null;
}

/** ffprobe → normalised metadata object. */
export async function probe(file) {
  const { stdout } = await run(FFPROBE, [
    "-v", "error", "-print_format", "json", "-show_format", "-show_streams", file,
  ]);
  const info = JSON.parse(stdout);
  const v = (info.streams ?? []).find((s) => s.codec_type === "video");
  const a = (info.streams ?? []).find((s) => s.codec_type === "audio");
  if (!v) throw new Error(`No video stream in ${file}`);
  let width = v.width;
  let height = v.height;
  let rotation = 0;
  const sd = (v.side_data_list ?? []).find((x) => x.rotation != null);
  if (sd) rotation = Number(sd.rotation);
  else if (v.tags?.rotate) rotation = Number(v.tags.rotate);
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
  const duration = Number(info.format?.duration ?? v.duration ?? 0);
  return {
    duration,
    width,
    height,
    fps: parseRate(v.avg_frame_rate) || parseRate(v.r_frame_rate) || 30,
    codec: v.codec_name,
    pixFmt: v.pix_fmt,
    hasAudio: Boolean(a),
    audioCodec: a?.codec_name ?? null,
    sampleRate: a ? Number(a.sample_rate) : null,
    bitrate: Number(info.format?.bit_rate ?? 0),
    size: Number(info.format?.size ?? 0),
    mediaCreated: info.format?.tags?.creation_time ?? v.tags?.creation_time ?? null,
    rotation,
    aspect: width && height ? width / height : null,
  };
}

/** Scene-cut timestamps (seconds) using ffmpeg's scene score. */
export async function detectScenes(file, { threshold = 0.35 } = {}) {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner", "-nostats", "-i", file,
    "-vf", `select='gt(scene,${threshold})',showinfo`,
    "-an", "-f", "null", "-",
  ]);
  const cuts = [];
  for (const m of stderr.matchAll(/pts_time:\s*([0-9.]+)/g)) cuts.push(Number(m[1]));
  return cuts.sort((a, b) => a - b);
}

/**
 * Turn cut points into shot ranges, merging tiny fragments and splitting
 * long static takes so every shot is between minShot and maxShot seconds.
 */
export function buildShots(cuts, duration, { minShot = 0.8, maxShot = 10 } = {}) {
  const bounds = [0, ...cuts.filter((c) => c > 0 && c < duration), duration];
  let segs = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i];
    const end = bounds[i + 1];
    if (end - start <= 0) continue;
    if (segs.length && end - start < minShot) {
      segs[segs.length - 1].end = end; // merge into previous
    } else {
      segs.push({ start, end });
    }
  }
  if (segs.length > 1 && segs[0].end - segs[0].start < minShot) {
    segs[1].start = segs[0].start;
    segs.shift();
  }
  const out = [];
  for (const s of segs) {
    const len = s.end - s.start;
    if (len <= maxShot) {
      out.push(s);
      continue;
    }
    const parts = Math.ceil(len / maxShot);
    const step = len / parts;
    for (let p = 0; p < parts; p++) {
      out.push({ start: s.start + p * step, end: p === parts - 1 ? s.end : s.start + (p + 1) * step });
    }
  }
  return out.map((s, idx) => ({ idx, start: round3(s.start), end: round3(s.end), duration: round3(s.end - s.start) }));
}

export async function extractFrame(file, seconds, outPath, { width = 768, quality = 3 } = {}) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await run(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(seconds), "-i", file,
    "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", String(quality), outPath,
  ]);
  return outPath;
}

/**
 * Average luma frame-difference (0..255) across a range; near-zero means
 * nothing is happening on screen ("dead" footage: a locked-off pan with no hands).
 */
export async function motionScore(file, start, end, { sampleFps = 2 } = {}) {
  const dur = Math.max(0.2, end - start);
  const { stdout } = await run(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-nostats",
    "-ss", String(start), "-t", String(dur), "-i", file,
    "-vf", `fps=${sampleFps},scale=160:-2,signalstats,metadata=mode=print:key=lavfi.signalstats.YDIF:file=-`,
    "-an", "-f", "null", "-",
  ]);
  const vals = [];
  for (const m of stdout.matchAll(/lavfi\.signalstats\.YDIF=([0-9.]+)/g)) vals.push(Number(m[1]));
  if (vals.length <= 1) return null;
  const v = vals.slice(1); // first frame diff is against nothing
  return round3(v.reduce((a, b) => a + b, 0) / v.length);
}

/** Integrated loudness / true peak via ebur128. */
export async function loudness(file) {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-",
  ]);
  const tail = stderr.slice(stderr.lastIndexOf("Summary:"));
  const num = (re) => {
    const m = tail.match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    integrated: num(/I:\s*(-?[0-9.]+)\s*LUFS/),
    range: num(/LRA:\s*(-?[0-9.]+)\s*LU/),
    truePeak: num(/True peak:[\s\S]*?Peak:\s*(-?[0-9.]+)\s*dBFS/),
  };
}

export function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/** Seconds → non-drop-frame timecode HH:MM:SS:FF. */
export function timecode(seconds, fps = 30) {
  const totalFrames = Math.round(seconds * fps);
  const f = totalFrames % Math.round(fps);
  const totalSeconds = Math.floor(totalFrames / Math.round(fps));
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Seconds → SRT/ASS style clock. */
export function clock(seconds, { ms = true, sep = "," } = {}) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = Math.floor(seconds) % 60;
  const frac = seconds - Math.floor(seconds);
  const pad = (n) => String(n).padStart(2, "0");
  if (!ms) return `${h}:${pad(m)}:${pad(s)}.${String(Math.floor(frac * 100)).padStart(2, "0")}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${String(Math.round(frac * 1000)).padStart(3, "0")}`;
}
