# 2. AI Content Production Blueprint

The blueprint describes the complete system: architecture, tool stack, what is automated, and how it is rolled out. The concrete implementation is the `food-content-engine` in this repository (`fce` CLI); the documents 03–07 go into each part in depth.

---

## 1. Design principles

1. **Index once, reuse forever.** Every clip is analysed when it enters the library, never again at edit time.
2. **Templates, not timelines.** A platform version is a template applied to tagged shots. New version = new template, not a new edit.
3. **The brand is a file.** Colours, fonts, caption style, pacing, safe zones, voice, platform specs and AI-usage rules live in `brand/brand-kit.json`. Every render, caption and prompt reads from it.
4. **Human at the point of taste.** AI tags, drafts, captions and prompts; the editor chooses, polishes and approves. Nothing publishes itself.
5. **Degrade gracefully.** With no API key the system still indexes, searches (by naming convention), plans, renders and checks. AI improves quality; it is not a dependency.
6. **Plain files.** SQLite index, JSON plans, EDL/CSV/SRT/ASS outputs, shell render scripts. Nothing is locked inside a proprietary tool.

---

## 2. Architecture

```
                         ┌──────────────────────────── brand/brand-kit.json ────────────────────────────┐
                         │  colours · fonts · captions · pacing · transitions · voice · platforms · AI rules │
                         └───────────────┬──────────────────────┬──────────────────────┬──────────────────┘
                                         │                      │                      │
   Library (NAS / SSD)          Index (.fce/index.sqlite)   Planner + exporters       QC + render
┌────────────────────┐   ingest  ┌────────────────────┐  plan  ┌────────────────────┐  ┌───────────────┐
│ 01_raw/            │──────────▶│ clips              │───────▶│ templates/*.json   │─▶│ ffmpeg render │
│  2026-09-10_recipe/│  analyze  │ shots  (tags, FTS) │ search │ plan.json          │  │ captions burn │
│ 02_selects/        │──────────▶│ transcripts        │◀───────│ EDL · CSV · SRT/ASS│  │ loudnorm      │
│ 03_edited/         │           │ plans · usage      │        │ post copy          │  │ qc.json       │
│ 04_assets/ai-broll │           └─────────▲──────────┘        └─────────┬──────────┘  └───────┬───────┘
└────────────────────┘                     │                             │                     │
                                 Claude (vision + text)                  ▼                     ▼
                                 tags · query parsing ·          NLE (Premiere / Resolve /   Upload
                                 captions · B-roll prompts       CapCut) for music, transitions, polish
```

### Components

| Component | Implementation | Role |
|---|---|---|
| Library | Folder tree + naming convention (doc 03) | Single source of footage; never modified by the tool |
| Ingest | `fce ingest` (ffprobe, content hash) | Registers clips, metadata, recipe/session; detects duplicates; incremental |
| Analyzer | `fce analyze` (ffmpeg scene detection, keyframes, motion score, Claude vision) | Splits clips into shots and tags them; flags dead footage; optional transcription |
| Index | SQLite + FTS5 (`node:sqlite`) | Clips, shots, tags, transcripts, plans, usage ledger |
| Search | `fce search`, `fce unused`, `fce report` | Natural-language retrieval, repurposing backlog, coverage/gap report |
| Planner | `fce plan`, `fce variants` + `templates/*.json` | Fills template slots with the best shots; one recipe → many versions |
| Copy | Claude or brand formulas | Hook, per-segment captions, CTA, title, description, hashtags |
| Exporters | EDL (CMX3600), CSV shot list, SRT, styled ASS, `render.sh` | Hand-off to any editor or direct draft render |
| Renderer | ffmpeg | Conforms to platform frame, hard cuts, burned-in captions, music bed, -14 LUFS |
| QC | `fce qc` | 15 automated checks per platform |
| B-roll | `fce broll` | Prompt sheets for image → video generators, matched to a real reference frame |
| Web app | `fce ui` (server + single-page app) | Dashboard, library, search, plan editing, QC, report, brand kit and B-roll in the browser; jobs run in the background; `--snapshot` exports a shareable read-only copy |

---

## 3. The seven-step process

| Step | Who | Command / action | Output |
|---|---|---|---|
| 1. Upload raw footage | Creator | Copy cards into `01_raw/<YYYY-MM-DD>_<recipe-slug>/`, name files per convention (or run the session sheet's rename) | Files in place |
| 2. AI analyses clips | Editor (or nightly job) | `fce ingest && fce analyze` | Shots, keyframes, motion, tags in the index |
| 3. Footage receives tags | automatic | Claude vision (or naming convention offline) | Stage, shot type, camera move, ingredients, actions, quality, hero/hook |
| 4. Creator searches shots | Anyone | `fce search "close-up shots of pouring sauce"` | Ranked shot list with file + in/out |
| 5. AI generates draft edits | Editor | `fce variants --recipe <slug> --info "protein_grams=42,…" --render` | Per template: plan, EDL, CSV, captions, draft MP4, QC |
| 6. Human reviews and adjusts | Editor | Open the EDL in Premiere/Resolve (CSV in CapCut); swap shots, sync to music, add whip/speed-ramp where the brand allows, hand-grade the hero | Final timeline |
| 7. Final content exported | Editor | Export with the platform preset; `fce qc` on the export (optional for NLE exports) | Upload-ready file + post copy |

Steps 2–5 take minutes of machine time. Step 6 is where the editor's time goes, on top of a draft instead of a blank timeline.

---

## 4. Recommended tool stack

| Category | Recommended | Why | Alternatives |
|---|---|---|---|
| Footage indexing & repurposing | **`fce` (this repo)** | Purpose-built, plain files, offline-capable | — |
| Vision + language model | **Claude Opus 5** via the Anthropic API (`claude-opus-5`) | Strong at fine-grained food/action recognition from keyframes and at structured JSON output; server-side fallback keeps batches running | Set `ai.model` in `fce.config.json` to a cheaper model for very large archives if quality holds on your sample |
| Media processing | **ffmpeg / ffprobe** (free) | Scene detection, keyframes, motion, loudness, conform, captions burn-in | — |
| Transcription (optional) | **whisper.cpp** or `openai-whisper` CLI, run locally | Makes talking-head / voice-over clips searchable | Descript, CapCut auto-captions for spoken video |
| NLE | **DaVinci Resolve** (free, excellent EDL import + colour) or **Premiere Pro** | Import the generated EDL, relink, polish | **CapCut** (desktop) with the CSV shot list for phone-first teams |
| Captions on spoken content | CapCut / Premiere auto-captions, restyled to the brand caption spec | Word-level timing for speech | Descript |
| Graphics & thumbnails | **Canva** (brand kit synced with `brand-kit.json` values) / Photoshop | Thumbnails from the hero frame the report points to | Figma for templates |
| AI stills | Midjourney, Adobe Firefly (commercially safe), Ideogram | Reference-matched ingredient/texture stills | — |
| AI image → video | Kling, Runway Gen-4, Google Veo, Luma | Short motion on the approved still | — |
| Storage | NAS (RAID) or 2× SSD + cloud copy (3-2-1) | Library root lives here; index is rebuilt from it | Cloud-only (Dropbox/Drive) works if the machine syncs the library locally |
| Automation | cron / launchd / Task Scheduler running `fce ingest && fce analyze` nightly; optional n8n/Make for Slack summary of `fce report` | Hands-off indexing | — |
| Music | Licensed library (Epidemic/Artlist) in `04_assets/music/` | `--music` for drafts; final sync in the NLE | — |

**Cost notes.** ffmpeg, Resolve and the engine are free. AI tagging: with 3 keyframes per shot at 768 px, a typical 10-shot clip is roughly 12–15k input tokens and ~2k output tokens; on Claude Opus 5 that is on the order of a few cents per clip, so a 2,000-clip archive is in the low hundreds of dollars once, then cents per new session. The engine prints the token usage and an estimate after every run. The Anthropic Message Batches API (50 % off, asynchronous) is the natural next step for an archive above ~10,000 clips; it is on the roadmap in section 8, not implemented yet.

---

## 5. Automation strategy

| Fully automatic | Semi-automatic (AI proposes, human decides) | Human only |
|---|---|---|
| Ingest, metadata, duplicate detection | Shot tags (review a 5 % sample monthly) | Filming, food styling |
| Scene split, keyframes, dead-footage flag | Draft edits from templates | Music sync, transitions, speed ramps |
| Search ranking, usage ledger, coverage report | Caption copy, hooks, CTAs | Hero-shot grade |
| Caption styling, safe zones, loudness, conform | B-roll prompts | Approving AI B-roll |
| QC checklist | Thumbnail suggestions (hero frame) | Publishing, community |

Rules baked into the system: dead shots are never planned; a shot is never used twice in one video (a second *window* of a long take is allowed and flagged); AI B-roll is capped at 20 % of runtime and never used for the hero or a technique step; every platform version starts from a hook-worthy or hero shot, and QC warns when it does not.

---

## 6. Storage structure (summary; full detail in doc 03)

```
Library/
├── 01_raw/2026-09-10_grilled-chicken-bowl/20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4
├── 02_selects/                       optional hand-picked keepers, same naming
├── 03_edited/instagram_reel/ tiktok/ youtube_short/ youtube/
└── 04_assets/ai-broll/ music/ sfx/ graphics/
Project/ (anywhere)
├── fce.config.json                   points at Library/, brand kit, templates
├── .fce/index.sqlite, frames/, cache/   rebuildable
└── output/<plan-id>/ plan.json · *.edl · shotlist.csv · captions.srt · captions.ass · post-copy.md · render.sh · *.mp4 · qc.json
```

---

## 7. Data model (what a "tag" is)

Each **shot** carries: `stage` (ingredients, prep, cooking, plating, hero, serving, eating, talking_head, lifestyle, meal_prep, packaging, workout, transition) · `shot_type` (extreme_close_up, close_up, medium, wide, overhead, pov, detail) · `camera_motion` (static, pan, tilt, push_in, pull_out, handheld, slider, orbit, whip) · `ingredients[]` · `actions[]` (52 controlled cooking actions) · `keywords[]` · `quality` 1–5 · `hero_worthy` · `hook_worthy` · `has_face` · `has_hands` · `lighting` · `motion` score · `dead` flag · one-sentence `description` · `caption_suggestion`. Each **clip** carries recipe, session, source type (raw/select/edited/asset), AI-generated flag, dish/cuisine/protein guess, and an optional transcript. The **usage ledger** records every shot placed in every plan.

The vocabulary is fixed in `src/taxonomy.js` and is identical for the AI tagger, the offline tagger and the query parser, so a search for "grilling" finds AI-tagged and convention-tagged shots alike.

---

## 8. Implementation roadmap

| Week | Milestone | Details |
|---|---|---|
| 1 | Baseline + install | Audit worksheet running; Node + ffmpeg installed; `fce init`; library skeleton; first `ingest` of the existing archive as-is |
| 2 | Convention live | New sessions named per convention; legacy sessions at least placed in `01_raw/<date>_<recipe>/` folders; nightly `ingest && analyze` job |
| 2–3 | AI tagging | API key set; full `analyze` of the archive (overnight batches with `--limit`/`--concurrency`); 5 % sample review; taxonomy tweaks |
| 3–4 | Brand kit + templates | Fonts and LUT dropped into `brand/`; caption spec, pacing, safe zones, voice, hook formulas filled in; templates tuned on 3 real recipes |
| 4–5 | Editing pipeline live | `fce variants` for every new recipe; editor works from EDLs; QC gate before upload; time per version logged |
| 5–6 | Filming from coverage | Filming days planned from `fce report`; module shots; AI B-roll pilot for inserts under the brand rule |
| 7–8 | Hand-over | SOPs adopted; training sessions (doc 05); consultant steps back; metrics reviewed against section 8 of the audit |
| Later | Scale | Batches API for very large archives; transcript search for talking-head content; second machine or cloud runner for analysis; Slack/Notion reporting via n8n |

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Legacy footage without convention names tags poorly offline | AI tagging does not need names; run it first on the legacy archive, use the convention for new sessions |
| AI tag errors | Quality/hero/hook are conservative by prompt; monthly 5 % review; tags are editable in the SQLite index; search ranks, it does not gate |
| Editor bypasses the pipeline "because it is faster" | The draft must be faster than a blank timeline: keep templates tuned, keep `render` fast (draft preset), and accept the EDL as the hand-off, not the MP4 |
| Brand drift | One brand kit file under version control; QC checks read from it |
| Over-reliance on AI B-roll | Hard cap in QC; never for hero/technique; disclosure policy decided by the brand (doc 06) |
| Costs on a huge archive | Token usage printed per run; `--limit` batches; cheaper model configurable; Batches API on the roadmap |
| Single-machine dependency | Library is plain files; the index rebuilds from them in one command |
