# 4. AI Editing Pipeline

How a tagged library becomes finished, on-brand videos with a fraction of the manual editing: the automation, the templates, the repeatable workflows and the QC checklist.

---

## 1. Pipeline overview

```
fce plan / variants ──▶ plan.json ──▶ EDL (Premiere / Resolve)        ──▶ polish in NLE ──▶ export ──▶ fce qc
        │                        ├──▶ shotlist.csv (CapCut / manual)
        │                        ├──▶ captions.srt + captions.ass (brand style)
        │                        └──▶ post-copy.md (hook, CTA, title, description, hashtags)
        └──────────────────────▶ fce render ──▶ draft MP4 (captions burned in, -14 LUFS) ──▶ fce qc
```

Two hand-off modes, chosen per video:
* **Draft render is good enough** (fast formats, daily volume): use the MP4 from `fce render` directly after QC. Hard cuts, brand captions, music bed, normalised audio.
* **Editor finish** (hero content): import the EDL, relink to the library, keep the structure and captions, add music sync, whip/speed-ramp transitions where the brand allows, hand-grade the hero shot, export with the platform preset.

Either way the editor never starts from an empty timeline.

---

## 2. Automated editing tasks

| Task in the brief | How the engine does it |
|---|---|
| Clip selection | Template slots score every shot on stage, shot type, camera move, actions, hero/hook flags, quality, recipe match, motion and whether it is unused; best window of the best shot is taken per pick |
| Removing dead footage | Shots with no on-screen motion are flagged at analysis and never planned; low quality is penalised |
| Finding best moments | `hook_worthy` / `hero_worthy` flags + quality drive the hook and CTA slots; window placement favours the part of a take just before the middle, where the action is |
| Creating transitions | Hard cuts on every slot boundary (brand default). Whip / match / speed-ramp are marked as *allowed* in the brand kit and done in the NLE on the EDL |
| Adding captions | Per-segment captions from the template placeholder → Claude in the brand voice (or the shot's own suggestion + brand formulas offline); SRT for upload, ASS styled from the brand kit for burn-in |
| Formatting for platforms | Platform profile (frame, fps, max length, safe zones, loudness) from the brand kit; conform = scale-to-cover + centre crop, 30 fps, loudnorm -14 LUFS / -1 dBTP |
| Creating multiple variations | `fce variants` runs every template in a variant set with a different seed; `--seed` on `fce plan` gives alternative cuts of the same template |

---

## 3. Templates

A template is a JSON file in `templates/`. Six ship with the engine:

| Template | Platform | Length | Story |
|---|---|---|---|
| `reel-recipe-30s` | Instagram Reel | 30 s | hook → ingredients → 6 cook beats → plating → hero/CTA |
| `tiktok-fast-45s` | TikTok | 45 s | faster cuts, 10 cook beats, first-bite reaction, CTA |
| `short-hook-first-20s` | YouTube Short | 20 s | reveal → 5 cook beats → plate → hero |
| `fitness-macro-focus-30s` | Instagram Reel | 30 s | macro hook → protein close-ups → cook → plating → macro card on hero → CTA |
| `ingredient-spotlight-20s` | TikTok | 20 s | **library-wide**: every close-up of one ingredient across recipes, one cooking action, one hero |
| `meal-prep-batch-40s` | YouTube Short | 40 s | batch cook → portioning → container hero → storage tip → CTA |

### 3.1 Template format

```json
{
  "id": "reel-recipe-30s",
  "name": "Instagram Reel - full recipe in 30s",
  "platform": "instagram_reel",            // key in brand-kit.json → platforms
  "targetSeconds": 30,
  "pacing": { "minShot": 0.8, "maxShot": 3.0 },
  "scope": "recipe",                        // optional: "library" lets slots borrow across recipes
  "slots": [
    { "id": "hook", "seconds": 2.5, "count": 1,
      "prefer": { "hookWorthy": true, "heroWorthy": true, "stages": ["hero", "plating", "eating"],
                  "shotTypes": ["close_up", "extreme_close_up"], "minQuality": 4 },
      "sameRecipe": true, "caption": "{{hook}}" },
    { "id": "cook", "seconds": 15, "count": 6,
      "prefer": { "stages": ["cooking", "prep"], "minMotion": 0.6 },
      "diversify": "actions", "caption": "{{step}}" }
  ]
}
```

| Field | Meaning |
|---|---|
| `seconds`, `count` | slot length and how many shots to spread it over (≈ `seconds/count` each, clamped to pacing) |
| `prefer.stages` | ordered preference; the first pass of the planner **only** accepts these stages, so scarce plating/hero shots are reserved for their slots |
| `prefer.shotTypes`, `cameraMotion`, `actions` | soft preferences |
| `prefer.heroWorthy`, `hookWorthy`, `proteinOnly`, `minQuality`, `minMotion` | soft requirements with penalties |
| `sameRecipe` | never borrow from another recipe (hero, plating, ingredients); leave false on cook slots to allow module shots |
| `diversify` | `actions` / `ingredients` / `clip` — penalise repeats inside the slot so six cook beats show six different things |
| `caption` | placeholder: `{{hook}}` `{{ingredients}}` `{{step}}` `{{cta}}` `{{reaction}}` `{{macro_hook}}` `{{protein_line}}` `{{macros}}` `{{ingredient_hook}}` `{{ingredient_fact}}` `{{mealprep_hook}}` `{{portion_line}}` `{{storage_tip}}`, or literal text |

Adding a template: copy one, change the id/platform/slots, run `fce templates` to validate. Add its id to a `variantSets` list in the brand kit to include it in `fce variants`.

### 3.2 How the planner chooses
1. Candidates = all analysed, non-dead shots (recipe scope: only that recipe's session).
2. Pass 1 fills each slot only with shots whose stage matches the slot's preference, best score first. Pass 2 tops up short slots with the best remaining shots, so a draft always exists; the shortfall is reported as a **gap**.
3. A shot is never reused with overlapping frames; a second, non-overlapping window of a long take is allowed but penalised (QC warns).
4. Picks are spread across clips and, with `diversify`, across actions/ingredients.
5. A seeded random jitter breaks ties → `--seed 2` gives a different but equally valid cut; the same seed always reproduces the same plan.
6. Gaps feed `fce broll --plan <id>` and the filming list.

---

## 4. Repeatable workflows

### 4.1 New recipe day (creator + editor, same day)
```bash
# after the card dump and rename
fce ingest && fce analyze
fce report                                   # check the six stages are covered for the new slug
fce variants --recipe <slug> --info "dish=Grilled Chicken Bowl,protein_grams=42,calories=520,minutes=20,portions=4" --render
```
Then per variant: watch the draft (`output/<plan-id>/*.mp4`), read `qc.json`, open the EDL in the NLE if it deserves polish, otherwise ship the draft. Copy `post-copy.md` into the scheduler.

### 4.2 Library day (editor, weekly)
```bash
fce unused                                   # which recipes have untouched footage
fce plan --template ingredient-spotlight-20s --seed 3 --render        # cross-recipe format
fce plan --template fitness-macro-focus-30s --recipe <old-slug> --seed 5 --info "…" --render
```
Old recipes get new life without filming.

### 4.3 Alternative cut of one video
```bash
fce plan --template reel-recipe-30s --recipe <slug> --seed 7 --render
```

### 4.4 Re-export after a manual tweak
Edit `output/<plan-id>/plan.json` (swap a `shot_id`, change `in`/`out`, rewrite a `caption`), then `fce export <plan-id>` (regenerates EDL/CSV/captions) and `fce render <plan-id>`.

### 4.5 NLE hand-off
* **Premiere Pro**: File → Import → the `.edl`; when prompted, relink media by "FROM CLIP NAME" (file names match the library). Import `captions.srt` as a caption track and apply the brand caption style (Essential Graphics), or keep the burned-in draft as reference.
* **DaVinci Resolve**: File → Import → Timeline → the `.edl` (set project to 30 fps first); Resolve relinks by clip name from the media pool (import the session folder first).
* **CapCut / manual**: use `shotlist.csv` (file, in, out, caption per row) and drag clips in order; paste captions from the CSV.

---

## 5. Captions

* Style comes from `brand-kit.json → captions` + `colors` + `fonts.caption`: font family/weight, size as % of frame height, outline, shadow, max characters per line, max lines, bottom margin as % of height (clamped to the platform's bottom safe zone), keyword highlight (numbers with units light up in the accent colour).
* Copy: `{{hook}}` uses the brand's hook formulas with the facts you pass in `--info` (formulas that need a missing fact are skipped); `{{step}}` uses the shot's action ("Sear the salmon"); `{{ingredients}}` lists what is on screen; `{{cta}}` cycles the brand CTAs by seed. With the API key, Claude writes all lines in the brand voice from the segment descriptions and the facts, never inventing nutrition numbers.
* Spoken-word captions (talking head, voice-over) are a separate track: auto-caption in CapCut/Premiere and restyle with the same spec.

---

## 6. Music and audio
* `--music path.mp3` on `plan`/`variants`/`render` loops a licensed track under the segments at 22 % volume, then the whole mix is normalised to the platform target (-14 LUFS, -1 dBTP). Beat-sync is a manual NLE step (or keep cuts at the template's pacing and pick tracks at ~120 BPM for 2–2.5 s cuts).
* Clips without audio get silence so the concat never fails; sizzle/steam SFX from `04_assets/sfx` are added in the NLE.

---

## 7. Quality control checklist

Automated by `fce qc <plan-id>` (also run automatically after `--render`); result in `output/<plan-id>/qc.json`.

| Check | Fail | Warn |
|---|---|---|
| duration | > platform max | outside the ideal window |
| frame | not the platform's width×height | — |
| fps | — | ≠ platform fps |
| filesize | > platform max | — |
| loudness | — | integrated LUFS outside target ± tolerance |
| true_peak | — | above -1 dBTP |
| captions | — | no caption file / < 70 % of runtime covered |
| safe_zone | — | caption margin inside the bottom UI zone |
| caption_length | — | a line longer than the brand max |
| unique_shots | overlapping frames reused | a take used twice (different windows) |
| pacing | — | average shot outside min/max, or shots over max |
| hook | — | first shot not hook-/hero-worthy |
| ai_broll_share | > brand max (20 %) | — |
| ai_hero | AI footage on hero/CTA | — |
| gaps | — | slots short of footage |

Manual checklist before upload (2 minutes):
- [ ] Hook reads in the first second with sound off
- [ ] Every caption is true to what is on screen; numbers match the recipe card
- [ ] Hero shot graded; skin tones natural
- [ ] No caption or logo under the platform UI (compare with the safe-zone overlay in the NLE)
- [ ] Music licensed for the platform; SFX not clipping
- [ ] CTA matches the post copy; hashtags updated
- [ ] AI B-roll inserts (if any) blend: same light direction, grade, grain
- [ ] Thumbnail/cover chosen from a hero frame (`.fce/frames/<clip>/`)

---

## 8. Turnaround targets

| Step | Target |
|---|---|
| Ingest + analyse a filming day (30–60 clips) | < 20 min machine time, unattended |
| Six variants planned, exported, rendered | < 5 min |
| Editor polish per hero version | ≤ 20 min |
| Draft-only versions | 0 editor minutes beyond QC review |
| QC | seconds |
