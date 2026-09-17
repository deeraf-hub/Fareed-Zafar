# 5. Training & Documentation

Step-by-step instructions, standard operating procedures, tool setup and best practices so the creator/team can run the workflow without outside help.

---

## 1. Tool setup guide (once per machine)

### 1.1 Requirements
* macOS, Windows or Linux with at least 16 GB RAM (analysis is ffmpeg-bound; a laptop is fine).
* **Node.js 22.13 or newer** — https://nodejs.org (LTS). Check: `node --version`.
* **ffmpeg + ffprobe** — macOS: `brew install ffmpeg`; Windows: download a static build from gyan.dev or BtbN and add its `bin` folder to PATH; Linux: `apt install ffmpeg` or a static build. Check: `ffmpeg -version`. If they live elsewhere, set `FFMPEG_PATH` and `FFPROBE_PATH`.
* Access to the footage library (NAS share mounted, SSD plugged in, or cloud folder synced locally).
* Optional: an **Anthropic API key** (console.anthropic.com) for vision tagging, plain-English search, captions and B-roll prompts. Without it the engine runs offline from the naming convention.
* Optional: `whisper.cpp` or `pip install openai-whisper` for transcription of spoken clips.

### 1.2 Install the engine
```bash
git clone <this repository>
cd Fareed-Zafar/food-content-engine
npm install
npm test            # should print "pass" for every test; the pipeline test is skipped without ffmpeg
npm link            # makes the `fce` command available everywhere (or use: node bin/fce.js …)
```

### 1.3 Create the project
```bash
mkdir ~/BrandContent && cd ~/BrandContent
fce init --library /Volumes/Footage/Library      # your library root; creates fce.config.json + folders
```
Edit `fce.config.json` if needed:
```json
{
  "library": "/Volumes/Footage/Library",
  "ai": { "mode": "auto", "model": "claude-opus-5", "effort": "medium", "maxFramesPerShot": 3, "frameWidth": 768 },
  "analysis": { "sceneThreshold": 0.35, "minShotSeconds": 0.8, "maxShotSeconds": 10 },
  "render": { "preset": "medium", "crf": 20 },
  "transcription": { "command": "whisper {input} --model small --output_format srt --output_dir {outdir}" }
}
```
Set the API key in the shell profile (`export ANTHROPIC_API_KEY=sk-ant-…`) or in a `.env` you source before running. `fce status` shows whether the key was picked up (`ai mode claude`).

### 1.4 Brand kit and fonts
* Open `food-content-engine/brand/brand-kit.json` and fill in the real brand name, colours, fonts, caption spec, voice, hook formulas, CTAs, platform tweaks (doc 07 explains every field).
* Drop the caption/title font files into `food-content-engine/brand/fonts/` (`Montserrat-ExtraBold.ttf` etc.). The renderer looks there; if a font is missing it falls back to a system font, so check the first render.
* Drop the brand LUT into `brand/luts/` for the NLE (the draft renderer does not apply LUTs).

### 1.5 The web app (optional, recommended for non-terminal users)
```bash
cd ~/BrandContent && fce ui          # opens the engine at http://127.0.0.1:4310
```
Everything in the SOPs below can be done from the browser instead of the terminal: the Dashboard shows coverage per recipe and has the **Make variants** form; Library browses clips and shots (hover a thumbnail to scrub its keyframes, edit tags on the clip page); Search takes plain-English queries; a plan page lets you swap shots, nudge in/out, edit captions with the brand's length rules, preview with safe zones, render and run QC; Brand kit edits `brand-kit.json` with a live caption preview; B-roll writes prompt sheets. Long actions (analyze, render, variants) run as jobs you can watch in the Jobs drawer. `fce ui --snapshot review.html` writes a single read-only HTML file of the whole app with the current library, for sharing with someone who does not have the engine installed.

### 1.6 Nightly automation (optional)
macOS/Linux `crontab -e`:
```
30 2 * * * cd ~/BrandContent && /usr/local/bin/fce ingest && /usr/local/bin/fce analyze >> ~/BrandContent/nightly.log 2>&1
```
Windows: Task Scheduler → run `fce ingest && fce analyze` in the project folder at 02:30.

---

## 2. Roles

| Role | Owns | Daily/weekly |
|---|---|---|
| Creator | Filming from the session sheet, module shots, card dump + rename, recipe facts (macros, time, portions) | Film day SOP |
| Editor | Ingest/analyze, variants, NLE polish, QC, export | New recipe SOP, Library day SOP |
| Designer (AI & Design Executive) | Brand kit, templates, thumbnails, AI B-roll, caption style | Brand SOP, B-roll SOP |
| Manager | Metrics review, publishing calendar | Monthly review SOP |

---

## 3. SOPs

### SOP-1 Film day (creator)
1. The night before: `fce report` → note the **What to film next** list and the recipes planned. Print/open the session sheet (doc 03 §4) with coverage + module rows.
2. Shoot coverage for each recipe: ingredients (1–2), prep (2–3), cooking (5–8 beats, mix close-up/overhead, at least one pour/sizzle/steam **hook**), plating (2), hero (2 moves), eating/reaction (1).
3. Shoot modules while the set is dressed: generic actions and transitions.
4. Tick takes on the sheet as you go; note `t01/t02`.
5. Dump cards to `01_raw/<YYYY-MM-DD>_<recipe-slug>/` (one folder per recipe, `_modules` for modules).
6. Rename per the convention (batch rename from the sheet). Ten minutes now saves hours later.
7. Tell the editor the recipe facts: dish name, protein g, kcal, minutes, portions.

### SOP-2 New recipe → six versions (editor)
1. `fce ingest` → check the log: expected number of clips, no failures, no duplicates.
2. `fce analyze` (Claude mode) → check `analyze: N clips → M shots (D dead), 0 failed` and the cost line.
3. `fce report` → the new slug shows all six stages. If a stage is missing, tell the creator or plan an AI B-roll insert (SOP-4) for non-hero gaps.
4. `fce variants --recipe <slug> --info "dish=…,protein_grams=…,calories=…,minutes=…,portions=…" --render`
5. For each row of the summary table: open `output/<plan-id>/`, watch the MP4, read `qc.json`.
   * QC pass, looks right → ship the draft or polish (step 6).
   * A wrong shot → edit `plan.json` (`shot_id`, `in`, `out`), `fce export <id>`, `fce render <id>`; or try `--seed 2`.
   * Caption wrong → edit `caption` in `plan.json` → `fce export` → `fce render`.
6. Polish in the NLE from the EDL (doc 04 §4.5): music sync, allowed transitions, hero grade. Export with the platform preset into `03_edited/<platform>/`.
7. `fce qc <id>` on the draft (the NLE export can be checked by copying it over the draft MP4 name), fix fails.
8. Paste `post-copy.md` into the scheduler; pick the cover from `.fce/frames/<hero clip>/`.

### SOP-3 Library day (editor, weekly, 2 hours)
1. `fce unused` → choose 2–3 recipes with the most unused seconds and a hero shot.
2. For each: `fce plan --template fitness-macro-focus-30s --recipe <slug> --seed <n> --info "…" --render` and/or `fce plan --template meal-prep-batch-40s …`.
3. One cross-recipe piece: `fce plan --template ingredient-spotlight-20s --seed <n> --render` (or `fce search "close-up <ingredient>"` first to see what exists).
4. QC, polish if needed, schedule. Note in the calendar which recipes were repurposed.

### SOP-4 AI B-roll insert (designer)
1. `fce broll --plan <plan-id>` (gaps) and/or `fce broll --need "extreme close-up of teriyaki glaze bubbling"`.
2. Open `output/broll/broll-requests-<date>.md`; generate stills with the image prompt and the reference frame it names; pick one; animate with the motion prompt (3–5 s).
3. Grade with the brand LUT; export 1080×1920 (or the source frame size), name it `YYYYMMDD_modules_<stage>_<subject>_<shot>_ai01.mp4`, save in `04_assets/ai-broll/`.
4. `fce ingest && fce analyze` → the clip is indexed and flagged AI. Re-plan; QC enforces the 20 % cap and blocks AI on hero/CTA.
5. Full rules: doc 06.

### SOP-5 Brand change (designer)
1. Change `brand/brand-kit.json` (colours, fonts, caption spec, pacing, voice…). Commit it.
2. `fce export <any plan-id>` + `fce render <plan-id>` to preview the effect on one video.
3. Update the NLE caption preset / Canva brand kit to match. Announce the change to the team.

### SOP-6 Monthly review (manager + editor)
1. `fce report` → coverage, unused %, dead footage; compare "shots used in plans" month over month.
2. Time log (audit worksheet A1) for a sample week → editing minutes per version, filming hours per published video.
3. Tag review: 5 % sample (doc 03 §5.3).
4. Delete dead shots; `fce ingest --prune`; back-up check.

---

## 4. Step-by-step: the full cycle in commands

```bash
# 0. once
fce init --library /Volumes/Footage/Library
export ANTHROPIC_API_KEY=sk-ant-…

# 1. after filming
fce ingest
fce analyze
fce report

# 2. find things
fce search "chicken recipes with grilling shots"
fce search "close-up shots of pouring sauce" --strict --unused
fce unused

# 3. make things
fce templates
fce variants --recipe grilled-chicken-bowl --info "dish=Grilled Chicken Bowl,protein_grams=42,calories=520,minutes=20,portions=4" --render
fce plan --template ingredient-spotlight-20s --seed 3 --render
fce plan --template reel-recipe-30s --recipe grilled-chicken-bowl --seed 2 --music /Volumes/Footage/Library/04_assets/music/upbeat-120.mp3 --render

# 4. adjust and re-export
#    edit output/<plan-id>/plan.json, then:
fce export <plan-id>
fce render <plan-id>
fce qc <plan-id>

# 5. fill gaps
fce broll --plan <plan-id> --need "steam rising off jasmine rice"
```

---

## 5. Best practices

**Filming**
* Film for the library, not for one video: every action from two angles (close-up + overhead) doubles the template's choices.
* Always capture a hook: a pour, a sizzle, a cut-through, steam, a cheese pull. The hook slot needs `hook_worthy` shots.
* Lock exposure/white balance per session so AI B-roll and module shots match later.
* 4K source lets the 9:16 crop breathe; frame the action in the centre third.

**Naming**
* Rename the same day. Keep slugs stable (`grilled-chicken-bowl`, not `chicken bowl v2`).
* Subject = `<ingredient>-<action>`; it feeds captions ("Sear the salmon") in offline mode.

**Analysis**
* Run Claude mode on everything you will search. Offline mode is a fallback, not the plan.
* After changing the scene threshold or shot length, `fce analyze --force` a single session to compare before running the archive.

**Planning**
* Pass real facts with `--info`; hooks and macro cards are only as good as the numbers.
* Use seeds for alternatives instead of hand-swapping; keep the seed in the plan id for traceability.
* Leave `sameRecipe` on hero/plating/ingredients slots. Cook slots can borrow module shots.

**Captions**
* Short lines, digits for numbers, no all-caps sentences. QC warns on length.
* Keep captions inside the safe zone even if the platform later moves its UI: margins are per platform in the brand kit.

**QC**
* Fails block upload. Warnings are judgement calls, but "hook" and "safe_zone" warnings are almost always worth fixing.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `No fce.config.json found` | Run commands inside the project folder or pass `--project <dir>` |
| `ffmpeg exited with …` on analyze | Corrupt or unsupported file; check with `ffprobe <file>`; skip by moving it out of the library |
| `ai mode offline` although the key is set | The shell didn't export it; `echo $ANTHROPIC_API_KEY`; or `ai.mode` is `offline` in the config |
| Search finds nothing for a recipe | Was it analysed? `fce status` shows `ingested` vs `analyzed`; run `fce analyze` |
| Every shot in a session has the same tags | Offline mode with non-convention names; rename or use Claude mode |
| Captions render in the wrong font | Font file missing from `brand/fonts/`; check the family name in the kit matches the file's internal name |
| Draft looks stretched or letterboxed | Source is not 16:9 or 9:16; conform is scale-to-cover + centre crop by design; reframe in the NLE |
| Render is slow | Set `render.preset` to `veryfast` for drafts; keep `medium` for deliverables |
| `Claude output was cut off` | Lower `ai.maxImagesPerRequest` (e.g. 24) |
| `Claude declined this request` | Rare; the request is retried on a fallback model automatically; if it still declines, tag that clip offline |
| Two clips reported as duplicates | Same content under two names; delete one and `fce ingest --prune` |
| Plan has gaps | Not enough matching footage for the slot: film it (report), borrow via `scope: library`, or AI B-roll for non-hero inserts |

---

## 7. Glossary

* **Clip** — one video file. **Shot** — a continuous camera take inside a clip, found by scene detection.
* **Stage** — where in the recipe story a shot belongs (ingredients → eating).
* **Hero** — the finished dish presented as the star. **Hook** — a shot that stops the scroll in one second.
* **Dead footage** — a shot with no on-screen motion; skipped automatically.
* **Template** — a JSON structure of slots that defines a platform version.
* **Plan** — a template filled with concrete shots, captions and copy (`plan.json`).
* **Variant** — one plan per template in a set, from the same recipe.
* **EDL** — edit decision list; the universal timeline exchange format Premiere/Resolve import.
* **Safe zone** — the area of the frame the platform UI covers; captions stay out of it.
* **LUFS** — loudness unit; platforms normalise to about -14.

---

## 8. Training plan (three sessions, 90 minutes each)

1. **Library** — folder/naming convention, session sheet, `ingest`, `analyze`, reading `fce report`, `search` exercises (find five specific shots in under a minute each).
2. **Pipeline** — templates, `variants`, reading `plan.json` and `qc.json`, editing a plan by hand, `export`/`render`, EDL import into the team's NLE, finishing one video end to end.
3. **Brand & AI** — brand kit walk-through, caption spec, `broll` prompt sheets, generating and integrating one AI insert under the rules, monthly review routine.

Each session ends with the trainee running the SOP alone while the trainer watches. Sign-off = one full cycle (SOP-2) completed solo.
