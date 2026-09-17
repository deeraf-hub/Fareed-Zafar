// Shot list for manual assembly in CapCut / Canva / any tool without EDL import.
import { timecode } from "../ffmpeg.js";

function cell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(plan) {
  const fps = plan.fps ?? 30;
  const header = ["#", "slot", "file", "in_s", "out_s", "in_tc", "out_tc", "duration_s", "timeline_start_s", "caption", "stage", "shot_type", "actions", "ingredients", "description", "path"];
  const rows = [header.join(",")];
  let t = 0;
  plan.segments.forEach((s, i) => {
    rows.push(
      [i + 1, s.slot, s.filename, s.in, s.out, timecode(s.in, fps), timecode(s.out, fps), s.duration, Math.round(t * 1000) / 1000, s.caption, s.stage, s.shot_type, (s.actions ?? []).join(" "), (s.ingredients ?? []).join(" "), s.description, s.path]
        .map(cell)
        .join(","),
    );
    t += s.duration;
  });
  return rows.join("\n") + "\n";
}
