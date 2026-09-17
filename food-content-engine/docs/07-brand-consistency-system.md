# 7. Brand Consistency Automation

Everything that keeps the output looking and sounding like one brand is defined in one file, `brand/brand-kit.json`, and enforced by the renderer, the caption exporter, the copy generator, the B-roll prompts and the QC checklist.

---

## 1. Principle: the brand is data

| Brand element | Where defined | Enforced by |
|---|---|---|
| Editing style / pacing | `pacing`, `transitions`, template `pacing` | planner windows, QC `pacing` |
| Caption style | `captions`, `colors`, `fonts.caption` | ASS exporter → burned in; NLE preset mirrors it |
| Colours | `colors`, `colorGrade` | captions, macro cards, B-roll prompts; LUT in the NLE |
| Fonts | `fonts` + files in `brand/fonts/` | renderer (`fontsdir`), Canva brand kit |
| Transitions | `transitions.default/allowed/onBeat` | draft = hard cuts only; NLE follows the allowed list |
| Video pacing | `pacing.default`, per-template overrides | planner, QC |
| Thumbnail style | `thumbnails` | Canva/Photoshop template; hero frame from the report |
| Content formatting | `platforms` (frame, fps, length, safe zones, loudness, file size) | conform, captions margin, QC |
| Voice | `voice` (tone, caption rules, hook formulas, CTAs) | copy generator (offline formulas / Claude system prompt) |
| Visual style for AI | `visualStyle`, `aiBroll` | B-roll prompts, QC AI share |
| Variant sets | `variantSets` | `fce variants` |

Change the file, commit it, re-export: every future video follows. That is the whole consistency mechanism.

---

## 2. The brand kit, field by field

```jsonc
{
  "brand":  { "name", "niche", "audience", "promise" },        // used in prompts and copy
  "voice":  {
    "tone": "confident, warm, no fluff…",
    "captionRules": ["short imperative lines", "max 5 words per pop caption", "numbers as digits", "no emojis in burned-in captions", "sentence case"],
    "hookFormulas": ["{{protein_grams}}g protein {{dish}} in {{minutes}} min", "Stop overcooking your {{protein}}", …],
    "ctas": ["Save this for meal prep day", "Follow for a new recipe every day", …]
  },
  "colors": { "primary", "secondary", "accent", "background", "captionText", "captionHighlight", "captionOutline" },
  "fonts":  { "caption": { "family": "Montserrat", "weight": 800, "file": "fonts/Montserrat-ExtraBold.ttf" }, "title": { … } },
  "captions": {
    "style": "word-pop", "position": "lower-middle",
    "fontSizePct": 5.2,          // % of frame height → 100 px on 1920
    "outlinePx": 3, "shadowPx": 0,
    "maxCharsPerLine": 22, "maxLines": 2,
    "marginBottomPct": 24,       // never lower than the platform's bottom safe zone
    "uppercase": false, "highlightKeywords": true   // numbers + units in the accent colour
  },
  "pacing": { "default": { "minShot": 0.8, "maxShot": 3.0, "targetCutsPer10s": 4 }, "youtube": { … }, "hookMaxSeconds": 2.5 },
  "transitions": { "default": "hard_cut", "allowed": ["hard_cut", "whip", "match_cut", "speed_ramp"], "onBeat": true, "notes": "…" },
  "colorGrade": { "lut": "luts/brand-warm.cube", "notes": "warm, high contrast, lifted blacks, natural skin" },
  "visualStyle": { "lighting", "surfaces", "lens", "palette", "props", "avoid" },   // feeds every AI prompt
  "thumbnails": { "layout", "titleFont", "maxWords", "badge": "{{protein_grams}}g PROTEIN" },
  "aiBroll": { "maxShareOfRuntime": 0.2, "allowedFor": [...], "neverFor": [...], "notes": "…" },
  "platforms": {
    "instagram_reel": { "width": 1080, "height": 1920, "fps": 30, "maxSeconds": 90, "idealSeconds": [15, 45], "maxFileMB": 250,
                        "safeZone": { "top": 220, "bottom": 330, "left": 60, "right": 120 }, "loudnessLUFS": -14, "loudnessTolerance": 2, "truePeakMax": -1 },
    "tiktok": { … "safeZone": { "top": 150, "bottom": 400, "left": 60, "right": 130 } },
    "youtube_short": { … }, "youtube": { "width": 1920, "height": 1080, … }, "square": { … }
  },
  "variantSets": { "default": ["reel-recipe-30s", "tiktok-fast-45s", "short-hook-first-20s", "fitness-macro-focus-30s", "ingredient-spotlight-20s", "meal-prep-batch-40s"], "quick": [...] }
}
```

---

## 3. Caption specification (what the burned-in captions look like)

* Font: the caption family/weight from the kit (file in `brand/fonts/`); bold if weight ≥ 600.
* Size: `fontSizePct` of frame height (5.2 % → 100 px on a 1920-high frame).
* Colour: `captionText` fill, `captionOutline` outline of `outlinePx`, optional shadow.
* Position: bottom-centre, margin = max(`marginBottomPct` × height, platform `safeZone.bottom`) → always clear of the platform UI; left/right margins = platform safe zone.
* Wrap: at `maxCharsPerLine`, max `maxLines`; longer lines are flagged by QC.
* Keyword pop: `40g`, `12 min`, `520 kcal`, `4x` render in `captionHighlight`.
* Case: as written (`uppercase: true` forces caps).
* Timing: one caption per segment; identical consecutive captions merge into one longer cue.
* Files: `captions.srt` (plain, for platform upload / NLE import) and `captions.ass` (styled, burned in by `fce render`). The NLE caption preset should copy these values so hand-finished videos match the drafts.

---

## 4. Pacing and transitions

* Default 0.8–3.0 s per shot, ~4 cuts per 10 s; the hook is ≤ 2.5 s; YouTube long-form 1.5–6 s. Templates can override.
* Draft renders use **hard cuts only**. The allowed list (`whip`, `match_cut`, `speed_ramp`) is for the NLE, on the beat (`onBeat: true`): whip only between prep→cook and cook→plating; no dissolves, no zoom-blur presets.
* QC warns when the average shot length leaves the range, when a shot exceeds `maxShot`, or when the first shot is not a hook/hero.

---

## 5. Colour, grade and thumbnails

* Grade notes and the LUT path are for the NLE and for AI-generation prompts; the draft renderer does not colour-grade (drafts show the camera grade).
* Match exposure and white balance per session in camera so module shots and AI inserts cut together.
* Thumbnails: layout, title font, max words and the macro badge are defined once; make the Canva template from them and pick the frame from `.fce/frames/<hero clip>/` (hero-worthy shots are listed in `fce search "hero shots of <recipe>"`).

---

## 6. Platform formatting

Frame, fps, max/ideal length, max file size, safe zones and loudness per platform. The conform is scale-to-cover + centre crop, so 16:9 sources become 9:16 by cropping the sides — frame the action in the centre third when filming. Loudness is normalised to -14 LUFS / -1 dBTP in the draft; the NLE export should use the same target.

Safe zones as shipped (px on 1080×1920): Reel 220 top / 330 bottom / 60 left / 120 right; TikTok 150 / 400 / 60 / 130; Shorts 200 / 360 / 60 / 120. Platforms move their UI; update the kit, not the videos.

---

## 7. Voice

`captionRules` are appended to every AI prompt and applied by the offline generator (short imperative lines, digits, no emojis, sentence case). `hookFormulas` are filled from `--info` facts; formulas needing a fact you did not pass are skipped, so no video ever ships with `{{protein_grams}}` on screen. `ctas` rotate by seed so consecutive variants do not repeat the same closing line.

---

## 8. Change control

1. Edit `brand-kit.json` on a branch; commit with the reason.
2. `fce export` + `fce render` one existing plan to preview; check the caption position on every platform profile once.
3. Update the NLE caption preset and the Canva brand kit to the same values.
4. Merge; tell the team. Old outputs are not regenerated unless they are re-published.

The kit is the contract. If a video does not match it, the fix is in the kit or the pipeline, not in the video.
