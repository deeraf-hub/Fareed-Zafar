# 6. AI-Generated Food & Recipe B-Roll Playbook

Where AI-generated visuals can reduce filming, how to make them look real and match the brand, and how the engine keeps them in check.

---

## 1. Where AI B-roll is allowed (and where it is not)

| Use case from the brief | Verdict | Why |
|---|---|---|
| Additional ingredient shots (spices in bowls, herbs, a lime half) | **Yes** | Static subjects, easy to match, no technique shown |
| Food close-ups / textures (grain of rice, glaze sheen, crumb) | **Yes, with a reference frame** | Must match the real dish's colour and surface |
| Lifestyle shots (kitchen light, gym bag, coffee on the counter) | **Yes** | Generic, no product claims |
| Background visuals / plates for macro cards | **Yes** | Often better than a screenshot |
| Missing transition footage (steam, sizzle, whip pans, pours) | **Yes, short** | 1–3 s inserts blend easily |
| The hero dish | **No** | Viewers buy the dish, not a render; also hardest to match |
| Any step that teaches technique (how to sear, fold, plate) | **No** | Trust and accuracy |
| The creator's face or hands | **No** | Identity; never synthesise the person |
| Whole videos | **No** | Brand rule caps AI at 20 % of runtime; QC fails above it |

These rules are encoded in `brand-kit.json → aiBroll` and enforced by `fce qc` (`ai_broll_share`, `ai_hero`).

---

## 2. Workflow

```
fce broll ──▶ prompt sheet (+ reference frame) ──▶ still image (4 candidates) ──▶ pick one
     ──▶ image-to-video (3–5 s) ──▶ grade with brand LUT ──▶ 04_assets/ai-broll/ ──▶ fce ingest && fce analyze ──▶ planner can use it
```

1. **Request.** `fce broll --plan <plan-id>` turns the plan's gaps into needs; `--need "…"` adds any other. The sheet in `output/broll/` contains per request: an image prompt (lens, light, surface, props, framing), a motion prompt, a negative prompt, length, camera, and continuity notes. With the API key, Claude art-directs the prompts and looks at a real reference frame from the library; offline, the prompts are built from the brand's visual style.
2. **Reference.** The sheet names a real shot (`.fce/frames/<clip>/s000_f1.jpg`) with the same stage and high quality. Upload that frame as the style/image reference in the generator. This is the single biggest factor in blending.
3. **Still first.** Generate 4 stills (Midjourney with `--sref` on the frame, Firefly for commercially safe output, Ideogram for text-free realism). Judge at 100 %: no floating ingredients, no extra fingers, correct plate shape, plausible physics.
4. **Animate.** Image-to-video (Kling, Runway Gen-4, Veo, Luma) with the motion prompt: *one* motion (slow push-in, steam drift, a pour), no camera shake, 3–5 s. Generate 2–3, keep the one with no morphing.
5. **Grade.** Apply the brand LUT and match exposure/white balance to the neighbouring real shots; add a touch of grain if the real footage has it.
6. **File.** Export at the platform frame (1080×1920) or the source size; name `YYYYMMDD_modules_<stage>_<subject>_<shot>_ai01.mp4`; save in `04_assets/ai-broll/`.
7. **Index.** `fce ingest && fce analyze`. The clip is flagged `ai_generated`; planners can use it, QC caps it.

---

## 3. Prompt structure that blends

```
[subject + action], [lens & framing], [lighting direction & quality], [surface & props],
[colour palette & grade], [imperfections], [aspect], negative: [avoid list]
```
Example (from the brand kit's visual style):
> Photorealistic food photography, extreme close-up of teriyaki glaze bubbling on seared salmon; 85 mm macro, shallow depth of field, subject in the centre third; soft window light from camera left, no flash; dark slate surface, brushed steel pan edge; warm neutrals with pops of green spring onion; slight oil sheen, a few sesame seeds out of place, gentle steam; vertical 9:16. Negative: harsh flash, plastic textures, perfect symmetry, floating ingredients, text, logos, watermark, extra fingers.

Motion prompt: *Slow push-in, glaze bubbles gently, thin steam drifts up and right, no camera shake, hold the last frame.*

Realism checklist before you keep a generation: light direction matches the reference; specular highlights are on the wet parts only; sauce viscosity is right; steam is thin and rises; nothing is symmetrical; no text; the plate/bowl matches the brand props.

---

## 4. Tool notes (September 2026)

| Need | Tools | Notes |
|---|---|---|
| Stills, style reference | Midjourney (`--sref` + `--cref` off for food), Adobe Firefly (Structure/Style reference; commercially safe), Ideogram | Firefly for client work with licensing questions |
| Image → video | Kling, Runway Gen-4, Google Veo, Luma | Short, single-motion; 1080p; export ProRes/H.264 |
| Upscale / clean-up | Topaz Video AI | For 1080p from 720p generations |
| Grade | DaVinci Resolve (free) with the brand LUT | Match to neighbours on the timeline |

Tools change monthly; the workflow (reference → still → motion → grade → index) does not.

---

## 5. Disclosure and ethics
* Platforms increasingly label AI media; decide the brand's policy once (e.g., "AI inserts allowed, never the dish or the person, no claim about the food is made with AI imagery") and write it into `aiBroll.notes`.
* Never generate the creator, other people, logos, or a real product's packaging.
* Keep the reference frame and the prompt sheet with the asset (the sheet is dated in `output/broll/`) in case provenance is asked for.

---

## 6. When *not* to bother
If the missing shot is a 4-second module you can film in the next session (a pour, a steam shot, a sprinkle), film it: it will be reused for months and the brand's own footage is always the better match. AI B-roll is for the insert you need today.
