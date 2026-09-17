# Food Content Engine (`fce`)

An AI-assisted content production pipeline for a high-volume food and fitness brand. It turns a large archive of recipe footage into a **searchable, tagged library** and then into **many platform-ready cuts per recipe** with very little manual editing.

```
                     fce ui  (web app over everything below)
raw footage ──▶ fce ingest ──▶ fce analyze ──▶ fce search / unused / report
                 (metadata)     (shots, keyframes,        │
                                 AI tags, FTS index)      ▼
                                              fce plan / variants ──▶ EDL + shot list + captions
                                                       │                 (Premiere / Resolve / CapCut)
                                                       └──▶ fce render ──▶ MP4 draft ──▶ fce qc
```

The five written deliverables live in [`docs/`](docs/):

| # | Deliverable | File |
|---|---|---|
| 1 | Workflow Audit Report | [docs/01-workflow-audit-report.md](docs/01-workflow-audit-report.md) |
| 2 | AI Content Production Blueprint | [docs/02-ai-content-production-blueprint.md](docs/02-ai-content-production-blueprint.md) |
| 3 | Footage Organization System | [docs/03-footage-organization-system.md](docs/03-footage-organization-system.md) |
| 4 | AI Editing Pipeline | [docs/04-ai-editing-pipeline.md](docs/04-ai-editing-pipeline.md) |
| 5 | Training & Documentation (SOPs) | [docs/05-training-and-sops.md](docs/05-training-and-sops.md) |
| + | AI B-roll Playbook | [docs/06-ai-broll-playbook.md](docs/06-ai-broll-playbook.md) |
| + | Brand Consistency System | [docs/07-brand-consistency-system.md](docs/07-brand-consistency-system.md) |
| + | Reference video notes | [docs/08-reference-video-notes.md](docs/08-reference-video-notes.md) |

## What the tool does

| Command | What happens |
|---|---|
| `fce init` | Creates `fce.config.json` and the library folder skeleton (`01_raw`, `02_selects`, `03_edited`, `04_assets`). |
| `fce ingest` | Scans the library, reads duration/resolution/fps with ffprobe, de-duplicates by content hash, reads recipe + session from the naming convention. Re-runs are incremental. |
| `fce analyze` | Splits every clip into shots (scene detection), extracts keyframes, measures on-screen motion (flags **dead footage**), and tags each shot: shot type, camera move, cooking stage, ingredients, actions, quality 1-5, hero-worthy, hook-worthy. Tags come from **Claude vision** when `ANTHROPIC_API_KEY` is set, otherwise from the file naming convention (offline mode). Optional Whisper transcription. |
| `fce search "…"` | Natural-language search: `"chicken recipes with grilling shots"`, `"close-up shots of pouring sauce"`, `"best hero shots of salmon under 4s"`. Ranked by facets matched, quality and whether the shot is still unused. |
| `fce unused` | The repurposing backlog: usable shots that no plan has touched, grouped by recipe. |
| `fce report` | Library health: coverage per recipe across the six stages, unused footage, dead footage, **what to film next**. |
| `fce plan` | Fills an edit template (hook → ingredients → cook → plating → CTA …) with the best matching shots, trims them to the platform's pacing, writes captions in the brand voice, and exports **plan.json, CMX3600 EDL, CSV shot list, SRT + brand-styled ASS captions, post copy**. |
| `fce variants` | One recipe → Reel, TikTok, Short, fitness-angle, ingredient-spotlight and meal-prep versions in one command. |
| `fce render` | ffmpeg draft: conforms every segment to 9:16 / 1:1 / 16:9, hard cuts, burned-in brand captions, optional music bed, loudness-normalised to -14 LUFS. Also writes `render.sh` you can tweak. |
| `fce qc` | Checklist: duration, frame, fps, size, loudness, true peak, caption coverage, safe zones, pacing, unique shots, hook present, AI B-roll share, AI never on the hero. |
| `fce broll` | Turns the gaps in a plan (or `--need "…"`) into image + motion prompt sheets that match the brand's visual style, with a real reference frame from the library. |
| `fce ui` | The same engine as a local web app at `http://127.0.0.1:4310`: dashboard with the coverage matrix and a one-form "Make variants", library browser with keyframe scrub and tag editing, plain-English search, plan editor (swap shots, nudge in/out, edit captions with brand lint, safe-zone preview, QC), report, brand kit editor with live caption preview, B-roll sheets, job progress. `fce ui --snapshot review.html` writes a read-only single-file copy to share. |

Everything reads from one file, [`brand/brand-kit.json`](brand/brand-kit.json): colours, fonts, caption style, pacing, transitions, platform specs, safe zones, voice, hook formulas, AI B-roll rules.

## Quick start

Requirements: Node ≥ 22.13 and ffmpeg/ffprobe on the PATH (or set `FFMPEG_PATH` / `FFPROBE_PATH`).

```bash
cd food-content-engine
npm install
npm run demo          # generates synthetic footage, indexes it, builds + renders 7 variants, runs QC (~90 s)
npm test              # unit + integration tests
```

Real project:

```bash
mkdir ~/brand-content && cd ~/brand-content
node /path/to/food-content-engine/bin/fce.js init --library /Volumes/Footage/Library
export ANTHROPIC_API_KEY=sk-ant-…          # omit to stay in offline mode
fce ingest
fce analyze                                # first pass over the archive; incremental afterwards
fce search "close-up shots of pouring sauce"
fce variants --recipe grilled-chicken-bowl --info "protein_grams=42,calories=520,minutes=20,portions=4" --render
open output/
fce ui                                     # or do all of the above from the browser
```

(`npm link` inside `food-content-engine/` puts `fce` on your PATH.)

## Offline vs Claude mode

| | Offline (no key) | Claude (`ANTHROPIC_API_KEY` set) |
|---|---|---|
| Shot tags | From the naming convention only | From the keyframes: what is actually on screen, quality, hero/hook flags |
| Search | Synonym matching | Query understood in plain English, incl. textures, moods, "cheese pull" |
| Captions | Shot's own suggestion + brand formulas | Written per segment in the brand voice, with the macros you pass in |
| B-roll prompts | Template from the brand style | Art-directed prompts matched to a reference frame |

The model defaults to `claude-opus-5` (`ai.model` in `fce.config.json`). A declined request is re-run server-side on Anthropic's recommended fallback model (`fallbacks: "default"`), so a whole batch never fails on one clip. Cost is printed after every run; a typical 10-shot clip costs a few cents to tag.

## Layout

```
food-content-engine/
├── bin/fce.js            CLI entry
├── src/                  engine (config, ffmpeg, db, taxonomy, ai, ingest, analyze, search,
│   ├── exporters/          planner, copy, variants, qc, report, broll; edl/csv/captions/render)
│   └── ui/                 web app: server.js (JSON API + jobs), index.html (single-page app), snapshot.js
├── brand/brand-kit.json  the brand system (fonts + LUT files go next to it, git-ignored)
├── templates/*.json      six edit templates; add your own
├── docs/                 the deliverables
├── scripts/              demo + synthetic footage generator
└── test/                 node --test suite
```

Templates and the brand kit are plain JSON; see [docs/04-ai-editing-pipeline.md](docs/04-ai-editing-pipeline.md) for the template format and [docs/07-brand-consistency-system.md](docs/07-brand-consistency-system.md) for the brand kit.
