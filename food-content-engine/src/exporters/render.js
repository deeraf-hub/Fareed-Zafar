// Draft render with ffmpeg: trims every segment, conforms it to the platform
// frame, concatenates, burns in brand-styled captions, mixes optional music
// and normalises loudness. The exact command is also written to render.sh so
// an editor can tweak and re-run it by hand.
import fs from "node:fs";
import path from "node:path";
import { run, FFMPEG } from "../ffmpeg.js";

function escapeFilterPath(p) {
  // Escape for use inside a filtergraph option value.
  return String(p).replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/;/g, "\;");
}

export function buildRenderArgs({ plan, platform, outFile, captionsAss = null, fontsDir = null, music = null, musicVolume = 0.22, crf = 20, preset = "medium", loudnessLUFS = -14, truePeak = -1 }) {
  const W = platform.width;
  const H = platform.height;
  const fps = platform.fps ?? 30;
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-nostats"];
  const filters = [];
  const vlabels = [];
  const alabels = [];
  plan.segments.forEach((s, i) => {
    args.push("-ss", String(s.in), "-t", String(s.duration), "-i", s.path);
    filters.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps},format=yuv420p,setpts=PTS-STARTPTS[v${i}]`,
    );
    if (s.has_audio) {
      filters.push(`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,apad=whole_dur=${s.duration},atrim=0:${s.duration}[a${i}]`);
    } else {
      filters.push(`anullsrc=r=48000:cl=stereo:d=${s.duration}[a${i}]`);
    }
    vlabels.push(`[v${i}]`);
    alabels.push(`[a${i}]`);
  });
  const n = plan.segments.length;
  filters.push(`${plan.segments.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${n}:v=1:a=1[vc][ac]`);
  let v = "[vc]";
  if (captionsAss) {
    const fonts = fontsDir ? `:fontsdir='${escapeFilterPath(fontsDir)}'` : "";
    filters.push(`${v}subtitles='${escapeFilterPath(captionsAss)}'${fonts}[vs]`);
    v = "[vs]";
  }
  let a = "[ac]";
  if (music) {
    args.push("-stream_loop", "-1", "-i", music);
    const total = plan.segments.reduce((x, s) => x + s.duration, 0);
    filters.push(`[${n}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${musicVolume},atrim=0:${total}[am]`);
    filters.push(`${a}[am]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[amx]`);
    a = "[amx]";
  }
  filters.push(`${a}loudnorm=I=${loudnessLUFS}:TP=${truePeak}:LRA=11[aout]`);
  args.push("-filter_complex", filters.join(";\n"), "-map", v, "-map", "[aout]");
  args.push("-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p", "-r", String(fps));
  args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", outFile);
  return args;
}

function shellQuote(s) {
  return /^[A-Za-z0-9_\-./=:+,@%]+$/.test(s) ? s : `'${String(s).replace(/'/g, "'\\''")}'`;
}

export async function renderPlan({ plan, platform, dir, brand, captionsAss, music, crf, preset, execute = true }) {
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, `${plan.id}.mp4`);
  const fontsDir = brand?._dir ? path.join(brand._dir, "fonts") : null;
  const args = buildRenderArgs({
    plan,
    platform,
    outFile,
    captionsAss,
    fontsDir: fontsDir && fs.existsSync(fontsDir) ? fontsDir : null,
    music,
    crf,
    preset,
    loudnessLUFS: platform.loudnessLUFS ?? -14,
    truePeak: platform.truePeakMax ?? -1,
  });
  const script = `#!/bin/sh\n# Draft render for ${plan.name}\n# Re-run after editing captions.ass or plan.json (regenerate with: fce export ${plan.id})\n${shellQuote(FFMPEG)} ${args.map(shellQuote).join(" \\\n  ")}\n`;
  fs.writeFileSync(path.join(dir, "render.sh"), script, { mode: 0o755 });
  if (!execute) return { outFile, script: path.join(dir, "render.sh"), rendered: false };
  const t0 = Date.now();
  await run(FFMPEG, args);
  return { outFile, script: path.join(dir, "render.sh"), rendered: true, ms: Date.now() - t0 };
}
