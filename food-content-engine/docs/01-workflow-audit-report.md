# 1. Workflow Audit Report

**Project:** AI-Powered Food Content Repurposing & Editing Workflow
**Scope:** filming, organisation, footage retrieval, editing, platform versioning, brand consistency
**Not in scope:** scripting, hooks, ideation (the brief is explicit that creative is not the bottleneck)

> **How this audit was produced.** The brief describes the situation (large archive, repeated filming, slow retrieval, manual re-edits, not enough volume) but the audit was written without direct observation of the team's day-to-day process, existing project files or tool licences. Sections 2–4 therefore state the current workflow as described in the brief plus the standard pattern for a brand at this volume, and every time figure is an **assumption to be replaced** with the team's own numbers. Appendix A is the one-week audit worksheet that turns the assumptions into measurements; the roadmap in section 7 starts with it.

---

## 1. Executive summary

The production bottleneck is not creativity, camera work or editing skill. It is that **footage is write-only**: the archive grows, but nothing about it is indexed, so every new video starts from scratch: film it again, scrub through old clips by eye, rebuild the same edit for each platform, restyle captions by hand.

Five structural problems drive the time cost:

| # | Finding | Effect |
|---|---|---|
| F1 | No index of what footage exists, at shot level | Retrieval is scrubbing; old footage is effectively lost |
| F2 | Every recipe is filmed as a one-off, not as reusable modules | Filming hours scale 1:1 with output |
| F3 | Edit decisions (structure, pacing, shot order) are re-made per platform version | Each extra version costs almost as much as the first |
| F4 | Captions, colours, fonts, safe zones and loudness are applied by hand | Slow, and consistency depends on who edits |
| F5 | Missing shots are discovered in the edit, not before | Re-shoots and compromises |

The recommended system (documented in the Blueprint) is a **tagged, searchable footage library** plus a **template-driven, semi-automated editing pipeline**, both operated through one command-line tool (`fce`) and one brand kit file. The expected outcome, once the archive is indexed, is 3–6 platform versions per recipe from the same filming day, first drafts in minutes instead of hours, and a measurable drop in footage that is filmed but never used.

---

## 2. Current workflow (as described)

```
Plan recipe ─▶ Film everything again ─▶ Copy cards to drive ─▶ Scrub for usable takes
                                                                      │
       Publish ◀─ Export per platform ◀─ Restyle captions ◀─ Edit ◀───┘
                        (repeat for each platform version)
```

### 2.1 Filming
* Each recipe is shot as a complete, self-contained session: ingredients, prep, cook, plate, hero, sometimes eating/talking head.
* The same generic actions (chopping onion, pouring sauce, steam rising off rice, spooning into containers) are re-filmed for every recipe because nobody can find the previous take quickly.
* Shot lists exist in the creator's head; there is no session sheet listing which shots were captured, so gaps show up in the edit.

### 2.2 Organisation
* Footage is stored by date or by camera dump. Recipe, stage and shot type are not encoded in the file names, so the only search tool is the file browser's thumbnail.
* Edited exports live next to raw files or on the phone; there is no clean separation between raw, selects, finals and assets.
* Duplicates and dead takes (locked-off camera left rolling, nothing happening) sit in the archive at full size.

### 2.3 Retrieval
* Finding "that close-up of sauce pouring" means remembering roughly when it was shot and scrubbing until it appears. When the memory is wrong the shot is filmed again.
* There is no record of which clips have been used, so the same favourite takes get reused while good footage is never touched.

### 2.4 Editing
* Each video is built in the NLE from scratch: import, review, select, cut to music, caption, colour, export.
* Platform versions (Reel, TikTok, Short) are made by re-opening the project and re-cutting for length and framing, then re-doing captions inside the platform's safe zones.
* Caption styling, fonts, colours and pacing are applied manually and drift between videos and between editors.
* Thumbnails are made separately in Canva/Photoshop from a screenshot.

### 2.5 Tools (typical for this brand profile; confirm in the worksheet)
Camera + phone, NAS or external SSDs, Premiere Pro or CapCut for edits, Canva for graphics, Photoshop, CapCut/Descript-style auto-captions for spoken content, cloud drive for sharing.

---

## 3. Time model (assumptions; replace with measured values)

Per recipe, per finished video, for a single editor:

| Stage | Hours (assumed) | Notes |
|---|---|---|
| Plan + shop | 1.0 | Not addressed here |
| Film | 3.0–4.0 | Full re-shoot of every stage |
| Ingest + organise | 0.5–1.0 | Copy, rename by hand (if at all) |
| Review + select footage | 1.0–2.0 | Scrubbing, no index |
| First edit (30–60 s) | 2.5–4.0 | Structure, cut to music, colour |
| Captions + brand styling | 0.5–1.0 | Manual, per video |
| Each additional platform version | 1.0–2.0 | Re-cut, re-caption, re-export |
| Thumbnail / cover | 0.5 | Manual |
| **Total for 1 recipe → 3 versions** | **≈ 12–18 h** | of which ~9–13 h is repeatable work |

Where the time actually goes: **~60–70 % of hours are spent on work that repeats (re-filming generic shots, finding footage, rebuilding the same edit, restyling captions), and almost none of it requires creative judgement.** That is the automation target.

---

## 4. Bottleneck analysis

| Bottleneck | Root cause | Automatable? | Mechanism |
|---|---|---|---|
| Re-filming generic actions | No way to find previous takes (F1, F2) | **Yes** | Shot-level AI tagging + natural-language search + modular capture list |
| Footage review | No index, no quality signal | **Yes** | Automatic shot split, dead-footage detection, quality/hero/hook flags |
| First-draft assembly | Structure re-invented per video (F3) | **Semi** | Edit templates fill slots from tagged shots → EDL / draft render; human refines |
| Platform versions | Re-cut by hand (F3) | **Yes** | One plan → 6 variants; conformed 9:16 / 1:1 / 16:9 renders |
| Caption styling | Manual (F4) | **Yes** | Brand-kit-driven caption files (SRT + styled ASS), burned in or imported |
| Loudness, safe zones, length limits | Checked by eye/ear (F4) | **Yes** | Automated QC checklist per platform |
| Missing shots | Found late (F5) | **Yes** | Coverage report per recipe: "what to film next"; AI B-roll for inserts |
| Unused archive | No usage tracking | **Yes** | Usage ledger + "unused footage" backlog |
| Music sync, whip transitions, speed ramps, final polish | Craft | **No** (by design) | Stays in the NLE, on top of the generated EDL |
| Colour grading of new footage | Craft, camera-dependent | **Partly** | Brand LUT applied as a default; hero shots hand-graded |

---

## 5. AI opportunities, ranked by payoff ÷ effort

1. **Shot-level footage index with AI tags (vision model).** Every clip is split into shots; each shot is tagged with stage (ingredients / prep / cooking / plating / hero / eating…), shot type, camera move, ingredients, actions, technical quality, hero-worthy and hook-worthy flags. Search becomes a sentence. Payoff: unlocks everything else. Effort: one batch run over the archive (hours of compute, a few cents per clip).
2. **Template-driven draft edits.** A 30 s Reel is a fixed structure (hook → ingredients → cook beats → plating → CTA). Filling that structure from tagged shots is mechanical; the AI's job was already done at tagging time. Payoff: first draft in seconds, six versions in a minute. Effort: templates in JSON, tuned once.
3. **Brand-locked captions and copy.** Captions, hooks and CTAs generated in the brand voice from the shots on screen plus the recipe's macros, styled from one brand file. Payoff: removes the most tedious per-version work. Effort: brand kit + voice rules.
4. **Automated QC.** Length, frame, fps, loudness, true peak, caption coverage and safe zones, pacing, hook present, AI-footage share. Payoff: fewer re-exports, consistent output regardless of editor. Effort: low.
5. **Coverage-driven filming.** The library report lists which stages each recipe lacks. Filming days become "fill the gaps + shoot the modules", not "shoot everything". Payoff: the filming-hours reduction the brief asks for. Effort: behaviour change, supported by the report.
6. **AI-generated B-roll for inserts.** Ingredient close-ups, textures, steam, lifestyle cutaways generated from a real reference frame in the brand's look. Payoff: closes small gaps without a shoot. Effort: prompt sheets are generated; the human picks and grades. Must be capped (brand rule: ≤ 20 % of runtime, never the hero, never a technique shot).
7. **Transcription of spoken footage** (optional Whisper step) so talking-head and voice-over clips are searchable by what was said.

Deliberately **not** recommended: fully automatic publishing, AI-generated hero dishes, AI voice clones of the creator, and "one-click" tools that hide the edit decisions. The team's advantage is taste; the system should remove the drudgery around it.

---

## 6. Recommended improvements

| Area | Change | Owner |
|---|---|---|
| Storage | One library root with `01_raw / 02_selects / 03_edited / 04_assets`; session folders `YYYY-MM-DD_recipe-slug`; file names carry stage + subject + shot (see doc 03) | Creator + editor |
| Capture | Session sheet with the modular shot list; generic actions filmed once as reusable modules; the "what to film next" list from the library report drives each filming day | Creator |
| Index | `fce ingest` + `fce analyze` after every session; weekly full pass; quarterly review sample of AI tags | Editor |
| Retrieval | `fce search` replaces scrubbing; `fce unused` is the weekly repurposing backlog | Editor |
| Editing | `fce variants` produces plan + EDL + captions + draft renders; the editor opens the EDL in Premiere/Resolve (or the CSV in CapCut) and applies music sync, transitions and polish | Editor |
| Brand | `brand/brand-kit.json` is the only place fonts, colours, caption style, pacing, safe zones, voice and platform specs are defined | Designer |
| QC | `fce qc` must pass before upload; warnings reviewed, failures fixed | Editor |
| Filming | Aim for one filming day → 2–3 recipes → 12–18 finished videos, plus module shots | Creator |

---

## 7. AI implementation roadmap

| Phase | When | Work | Exit criteria |
|---|---|---|---|
| 0. Measure | Week 1 | Run the audit worksheet (Appendix A): time log per stage, tool inventory, archive size, current output/month | Baseline numbers in the worksheet |
| 1. Library foundation | Weeks 1–2 | Install `fce`, adopt folder + naming convention for *new* sessions, `fce ingest` the archive as-is, offline analysis to prove the loop | Every new file indexed within a day of filming |
| 2. AI tagging of the archive | Weeks 2–3 | Add the Claude API key, `fce analyze` the full archive (batch overnight), review a 5 % sample, tune the taxonomy if needed | Search answers "chicken recipes with grilling shots" correctly |
| 3. Template editing | Weeks 3–5 | Adjust the six templates to the brand's real pacing, fill the brand kit (fonts, colours, LUT, voice), run `fce variants` on 3 recipes, editor finishes them in the NLE, compare time to baseline | 3 recipes × 6 versions published; edit time per version measured |
| 4. Filming from coverage | Weeks 5–6 | Filming days planned from `fce report`; modules shot deliberately; AI B-roll trial for inserts | A filming day yields ≥ 2 recipes' worth of coverage |
| 5. Hand-over | Weeks 7–8 | SOPs (doc 05) adopted, team trained, weekly cadence running without the consultant | Team runs a full cycle alone; metrics reviewed |

---

## 8. Success metrics

| Metric | How measured | Baseline (from Phase 0) | Target after Phase 5 |
|---|---|---|---|
| Filming hours per published video | Time log | assumed 1.0–1.3 h | ≤ 0.4 h |
| Editing time per platform version | Time log | assumed 1–2 h | ≤ 20 min editor time on top of the draft |
| Time to find a specific shot | Stopwatch, 10 sample searches | minutes | < 30 s |
| Videos published per recipe | Publishing calendar | 1–2 | 4–6 |
| Share of archive shots used in ≥ 1 plan | `fce report` ("shots used in plans") | ~0 % | > 60 % of usable shots within 3 months |
| Brand QC pass rate on first export | `fce qc` logs | n/a | > 90 % |
| Re-shoots for missing shots | Session sheets | frequent | rare; gaps closed by library or AI B-roll |

---

## Appendix A — one-week audit worksheet

**A1. Time log** (everyone, one line per block of work, for 5 working days)

| Date | Person | Recipe / video | Stage (plan, film, ingest, review, edit, captions, version, thumbnail, publish, other) | Minutes | Tool used | What slowed you down |
|---|---|---|---|---|---|---|

**A2. Archive inventory** — run `fce ingest` on the existing drive(s) and `fce status`: number of clips, hours of footage, formats, resolutions. Note how much is raw vs finished exports vs duplicates (the ingest log lists duplicates).

**A3. Tool inventory** — every app/subscription used in production, who uses it, monthly cost, what it is used for.

**A4. Interview questions** (creator, editor, designer)
1. Walk me through the last video you made, from idea to upload. Where did you wait? Where did you redo something?
2. When you need a shot from an old recipe, what do you do? How often do you give up and re-film?
3. Which platform versions take the longest and why?
4. What do you always have to fix in someone else's edit? (fonts, colours, pacing, caption position…)
5. Which shots do you film for every recipe that look the same every time?
6. What breaks when a new person joins?

**A5. Output baseline** — videos published per platform per month for the last 3 months; average length; which recipes got multiple versions.

Fill A1–A5 in, then revisit section 3 of this report with real numbers before Phase 1.
