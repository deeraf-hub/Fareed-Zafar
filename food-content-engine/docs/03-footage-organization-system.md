# 3. Footage Organization System

Folder structure, naming convention, AI tagging strategy and the search workflow. This is the part of the system that makes an archive *findable*; everything else builds on it.

---

## 1. Folder structure

One library root (NAS share, external SSD or a synced cloud folder). The engine never writes into it.

```
Library/
├── 01_raw/                                  camera originals, one folder per filming session
│   ├── 2026-09-10_grilled-chicken-bowl/
│   ├── 2026-09-10_modules/                  reusable module shots filmed on the same day (see §4)
│   └── 2026-09-12_salmon-teriyaki-mealprep/
├── 02_selects/                              optional: hand-picked keepers, same naming (indexed as "select")
├── 03_edited/                               finished exports, by platform (indexed as "edited", used for reference, never re-cut)
│   ├── instagram_reel/  tiktok/  youtube_short/  youtube/
├── 04_assets/
│   ├── ai-broll/                            AI-generated inserts → flagged ai_generated, capped by the brand rule
│   ├── music/  sfx/                         licensed audio
│   └── graphics/                            logos, lower thirds, end cards, LUT previews
└── README.txt                               written by `fce init`, repeats this page in short
```

Rules:
* **Session folder = `YYYY-MM-DD_<recipe-slug>`.** The date is the filming date; the slug is lowercase, hyphenated, no spaces (`grilled-chicken-bowl`). The recipe slug is the key that ties clips, plans and reports together.
* Never rename or move a file after it has been ingested unless you re-run `fce ingest --prune` (the index tracks files by path and content hash; a moved file is re-registered, a deleted one is pruned).
* Proxies, thumbnails and keyframes live under the project's `.fce/`, not in the library.
* Exports from the NLE go to `03_edited/<platform>/`; the engine's own drafts stay in `output/` (they are drafts, not finals).

---

## 2. File naming convention

```
YYYYMMDD_<recipe-slug>_<stage>_<subject>_<shot>_<take>.<ext>
20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4
20260910_grilled-chicken-bowl_ingredients_chicken-rice-broccoli_overhead-flatlay_t01.mp4
20260910_grilled-chicken-bowl_hero_final-dish_closeup-orbit_t01.mp4
20260912_salmon-teriyaki-mealprep_meal-prep_packing-containers_overhead_t01.mp4
```

| Token | Values | Notes |
|---|---|---|
| `YYYYMMDD` | filming date | matches the session folder |
| `recipe-slug` | as the folder | `modules` for generic reusable shots |
| `stage` | `ingredients` `prep` `cooking` `plating` `hero` `serving` `eating` `talking-head` `lifestyle` `meal-prep` `packaging` `workout` `transition` | the six in bold in §5 are the ones every recipe needs |
| `subject` | `<ingredient>-<action>` or a short noun phrase | `chicken-grilling`, `sauce-pouring`, `garlic-mincing`, `final-dish`, `packing-containers` |
| `shot` | `closeup` `extreme-closeup` `medium` `wide` `overhead` `pov` `detail`, optionally `-static` `-pushin` `-pullout` `-pan` `-tilt` `-handheld` `-slider` `-orbit` `-whip` | `closeup-pushin`, `overhead-flatlay` |
| `take` | `t01`, `t02` … | |

Why it matters: the engine's **offline tagger reads exactly these tokens** (stage, subject → ingredients and actions, shot → shot type and camera move). With AI tagging the names become hints only, but a good name still makes the search results readable and the EDL self-explanatory in the NLE.

Regex used by the engine (for reference): folder `^\d{4}-\d{2}-\d{2}[_-]` and file `^\d{8}_<slug>_<stage>_<subject>_<shot>_<take>`. Files that do not follow it still index: the recipe becomes the parent folder name and the AI supplies the tags.

### Renaming on the camera-card dump
Cameras produce `C0012.MP4`, phones `IMG_4021.MOV`. Two options:
1. **Session sheet + bulk rename** (recommended): during the shoot, note take numbers against the shot list on the session sheet (§4); after the dump, use Finder/Explorer batch rename, Adobe Bridge or a one-line script to apply the names.
2. **Do not rename; rely on AI tags.** Put the files in the session folder and run `fce analyze` with the API key. Search works from the AI tags; file names stay ugly in EDLs. Acceptable for the legacy archive.

---

## 3. Ingest: what happens on `fce ingest`

For every video file under the library root (`.mp4 .mov .m4v .mxf .mkv .avi .webm`; configurable):
1. Reads duration, resolution, fps, codec, audio presence, creation time with ffprobe (rotation metadata respected, so phone verticals are stored as 1080×1920).
2. Computes a content hash (first + last 2 MB + size) → **duplicates** are reported (same content under two names).
3. Parses the naming convention → recipe, session, source type, AI-generated flag.
4. Registers or updates the clip. Unchanged files are skipped, so re-running is cheap. `--prune` removes entries whose files are gone. `--force` re-reads everything.

---

## 4. Capture for reuse: the session sheet and module shots

A filming day should produce **coverage** (every stage for the recipe) and **modules** (generic shots that any future edit can borrow).

Session sheet (print or Notion; one row per planned shot):

| # | Stage | Subject | Shot | Takes | Notes |
|---|---|---|---|---|---|
| 1 | ingredients | chicken-rice-broccoli | overhead-flatlay | t01 | slate surface |
| 2 | prep | chicken-slicing | closeup | t01–t02 | 85 mm |
| … | | | | | |
| M1 | modules (cooking) | garlic-mincing | closeup | t01 | reusable |
| M2 | modules (cooking) | rice-steam-rising | extreme-closeup | t01 | reusable |
| M3 | modules (transition) | pan-whip-left | medium-whip | t01–t03 | for whip cuts |

Minimum coverage per recipe (the report checks exactly these six): **ingredients, prep, cooking, plating, hero, eating**. Aim for: 1–2 ingredient layouts, 2–3 prep actions, 5–8 cooking beats (different actions, mixed close-up/overhead), 2 plating angles, 2 hero moves (orbit + push-in), 1 eating/reaction, plus hooks (pour, sizzle, cut-through, cheese pull, steam).

Module library ideas (film once, reuse for months): knife-through-board close-ups per common ingredient; pours (oil, sauce, honey, milk); steam over rice/pasta/broth; seasoning sprinkles; container packing; fridge door; timer on the oven; gym-bag/shaker lifestyle cutaways.

---

## 5. AI tagging strategy

### 5.1 What `fce analyze` does per clip
1. **Scene detection** (ffmpeg scene score, threshold 0.35 by default) splits the clip into shots; fragments shorter than 0.8 s are merged, takes longer than 10 s are split into ≤ 10 s shots so every shot has its own tags.
2. **Keyframes**: 3 frames per shot (15 %, 50 %, 85 %; 1 frame for shots under 1.5 s) at 768 px wide → `.fce/frames/<clip>/`. Also the thumbnails you see in search results and B-roll references.
3. **Motion score** (average luma frame difference at 2 fps). Shots ≥ 1.5 s with almost no motion are flagged **dead** (locked camera, nothing happening) and excluded from planning.
4. **Tagging**, Claude vision: all keyframes of a clip go to the model in one request (chunked at 36 images), with the filename hints, the shot boundaries and the motion level. It must answer in a fixed JSON schema using the controlled vocabulary. Offline: tags from the naming convention.
5. **Optional transcription** (`transcription.command` in the config, e.g. whisper.cpp): the transcript becomes searchable text on every shot of that clip.
6. Results are written to the index and the full-text table; the clip is marked `analyzed` with the mode used.

### 5.2 The vocabulary
Stages (13), shot types (7), camera moves (9), actions (52 cooking verbs from chopping to sizzling), lighting (4), plus free ingredients in snake_case and free keywords. Full lists: `src/taxonomy.js`. The AI prompt lists them verbatim and tells the model to be *conservative* on `hero_worthy` and `hook_worthy` ("fewer than one shot in five"). Quality is technical only (focus, exposure, stability, composition), 1–5.

### 5.3 Reviewing AI tags
* Monthly, sample 5 % of newly analysed clips: `fce search "<recipe>" --json` and compare the description/stage against the keyframes in `.fce/frames/`.
* Systematic errors → fix in the taxonomy synonyms (offline) or the system prompt in `src/analyze.js` (`tagSystemPrompt`), then `fce analyze --force` on the affected session.
* One-off errors: edit the row in `.fce/index.sqlite` (any SQLite browser) or re-analyse that clip with `--force`.

### 5.4 Cost and speed
Analysis is ffmpeg-bound (about 1–3 s per clip on a laptop for scene detection + frames) plus one model call per clip. Use `--limit 200` for overnight batches and `--concurrency 2–4` for API calls. Token usage and a cost estimate are printed after each run.

---

## 6. Search workflow

```
fce search "chicken recipes with grilling shots"
fce search "close-up shots of pouring sauce" --strict
fce search "best hero shots of salmon under 4s"
fce search "hands only, overhead, meal prep containers" --unused
fce search "steam rising" --recipe salmon-teriyaki-mealprep --json
```

How a query is handled:
1. **Parse** → a structured filter: ingredients, actions, shot types, stages, camera moves, dish, hero-only, hook-only, min quality, face/no face, duration bounds, and leftover free-text terms. With the API key, Claude does this (so "cheese pull", "golden crust", "morning light" work); offline, the taxonomy synonyms do.
2. **Match**: tag facets against the shot's tags, free-text terms against the FTS index (description, keywords, ingredients, actions, dish, file name, recipe, transcript; Porter-stemmed so "grilled" finds "grilling").
3. **Rank**: number of facets matched first (a chicken *and* grilling shot beats chicken-only), then a score from matches, technical quality, hero/hook flags, whether the shot is still unused, and the FTS rank. Dead shots sink. `--strict` requires every facet; `--unused` hides shots already placed in a plan; `--recipe` restricts to one session.
4. **Use**: each result shows the shot id, source file, in/out seconds, tags and how many times it has been used. Copy the in/out into the NLE, or let a template pick it (`fce plan`), or export a plan's EDL.

Read the results as "the archive's answer to a question", not as a strict database query: it is deliberately tolerant so old, half-tagged footage still surfaces.

### Unused footage and coverage
* `fce unused` — usable shots (quality ≥ 3, not dead) that no plan has used, grouped by recipe with seconds, hero and hook counts. This is the weekly repurposing backlog.
* `fce report` — coverage table per recipe across the six stages, unused footage, dead footage, most common actions/ingredients, and **what to film next**. Written to `output/library-report.md`.

---

## 7. Maintenance cadence

| When | Do |
|---|---|
| After every filming day | Dump → rename per session sheet → `fce ingest && fce analyze` |
| Nightly (automated) | `fce ingest && fce analyze` catches anything added by hand |
| Weekly | `fce unused` → pick 2–3 recipes for variants; `fce report` → filming list |
| Monthly | 5 % tag review; delete dead shots the report lists; `fce ingest --prune` |
| Quarterly | Back-up check (3-2-1: library on NAS, mirror SSD, cloud copy); archive `03_edited` older than a year to cold storage (they stay indexed) |

The index (`.fce/`) is disposable: delete it and run `ingest` + `analyze` again to rebuild from the library.
