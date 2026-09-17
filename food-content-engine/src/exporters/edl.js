// CMX3600 EDL — imports into Premiere Pro, DaVinci Resolve and Final Cut
// (via converter). Each event carries the source filename as a comment, which
// is what the NLEs use to relink media.
import { timecode } from "../ffmpeg.js";

export function toEDL(plan, { title } = {}) {
  const fps = plan.fps ?? 30;
  const lines = [`TITLE: ${title ?? plan.name}`, "FCM: NON-DROP FRAME", ""];
  let rec = 0;
  plan.segments.forEach((s, i) => {
    const n = String(i + 1).padStart(3, "0");
    const srcIn = timecode(s.in, fps);
    const srcOut = timecode(s.out, fps);
    const recIn = timecode(rec, fps);
    rec += s.duration;
    const recOut = timecode(rec, fps);
    lines.push(`${n}  AX       ${s.has_audio ? "AA/V" : "V   "}  C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    lines.push(`* FROM CLIP NAME: ${s.filename}`);
    lines.push(`* SOURCE FILE: ${s.path}`);
    if (s.caption) lines.push(`* COMMENT: [${s.slot}] ${s.caption}`);
    lines.push("");
  });
  return lines.join("\n");
}
