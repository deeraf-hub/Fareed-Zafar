// Caption files: SRT (upload to platforms / import into any editor) and ASS
// (styled from the brand kit, burned in by the renderer).
import fs from "node:fs";
import path from "node:path";
import { clock } from "../ffmpeg.js";

/** "#RRGGBB" → ASS "&HAABBGGRR" */
export function assColor(hex, alpha = 0) {
  const m = String(hex).replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "&H00FFFFFF";
  const [, r, g, b] = m;
  const a = alpha.toString(16).padStart(2, "0");
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/** Segments → caption events; consecutive identical captions are merged. */
export function captionEvents(plan) {
  const events = [];
  let t = 0;
  for (const s of plan.segments) {
    const text = (s.caption ?? "").trim();
    const start = t;
    t += s.duration;
    if (!text) continue;
    const last = events[events.length - 1];
    if (last && last.text === text && Math.abs(last.end - start) < 0.01) last.end = t;
    else events.push({ start, end: t, text });
  }
  return events.map((e) => ({ ...e, start: Math.round(e.start * 1000) / 1000, end: Math.round(e.end * 1000) / 1000 }));
}

export function wrapText(text, maxChars = 22, maxLines = 2) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    head.push(lines.slice(maxLines - 1).join(" "));
    return head;
  }
  return lines;
}

export function toSRT(events) {
  return events.map((e, i) => `${i + 1}\n${clock(e.start)} --> ${clock(e.end)}\n${e.text}\n`).join("\n");
}

export function toASS(events, { brand, platform }) {
  const c = brand.captions ?? {};
  const colors = brand.colors ?? {};
  const font = brand.fonts?.caption ?? {};
  const H = platform.height;
  const W = platform.width;
  const fontSize = Math.round((H * (c.fontSizePct ?? 5)) / 100);
  const safeBottom = platform.safeZone?.bottom ?? 0;
  const marginV = Math.max(Math.round((H * (c.marginBottomPct ?? 20)) / 100), safeBottom);
  const marginL = platform.safeZone?.left ?? 40;
  const marginR = platform.safeZone?.right ?? 40;
  const fontName = font.family ?? "DejaVu Sans";
  const bold = (font.weight ?? 400) >= 600 ? -1 : 0;
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${W}`,
    `PlayResY: ${H}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Brand,${fontName},${fontSize},${assColor(colors.captionText ?? "#FFFFFF")},${assColor(colors.captionHighlight ?? "#FFD23F")},${assColor(colors.captionOutline ?? "#000000")},${assColor("#000000", 128)},${bold},0,0,0,100,100,0,0,1,${c.outlinePx ?? 3},${c.shadowPx ?? 0},2,${marginL},${marginR},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const hl = assColor(colors.captionHighlight ?? "#FFD23F");
  const primary = assColor(colors.captionText ?? "#FFFFFF");
  const lines = events.map((e) => {
    let text = c.uppercase ? e.text.toUpperCase() : e.text;
    text = wrapText(text, c.maxCharsPerLine ?? 22, c.maxLines ?? 2).join("\\N");
    if (c.highlightKeywords) {
      // numbers with units (40g, 12 min, 520 kcal) pop in the accent colour
      text = text.replace(/(\d+(?:[.,]\d+)?\s?(?:g|kg|ml|min|kcal|cal|%|x)?\b)/gi, `{\\c${hl}}$1{\\c${primary}}`);
    }
    return `Dialogue: 0,${clock(e.start, { ms: false })},${clock(e.end, { ms: false })},Brand,,0,0,0,,${text}`;
  });
  return header.concat(lines).join("\n") + "\n";
}

export function writeCaptionFiles(dir, plan, brand, platform) {
  const events = captionEvents(plan);
  fs.mkdirSync(dir, { recursive: true });
  const srt = path.join(dir, "captions.srt");
  const ass = path.join(dir, "captions.ass");
  fs.writeFileSync(srt, toSRT(events));
  fs.writeFileSync(ass, toASS(events, { brand, platform }));
  return { srt, ass, events };
}
