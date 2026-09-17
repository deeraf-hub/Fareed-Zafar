# 8. Reference video notes

**Video:** https://www.youtube.com/watch?v=RLrkE_qBXw0

**Status: not reviewed.** The environment this system was built in blocks outbound access to youtube.com, so the video could not be watched or transcribed. Nothing in the deliverables is derived from it. This page is a worksheet for the team to extract the useful concepts and map them onto the system; fill it in during the first training session.

---

## 1. Extraction worksheet (fill in while watching)

| Timestamp | Concept or tool shown | What problem it solves for the creator in the video | Equivalent in this system | Adopt / adapt / skip | Notes |
|---|---|---|---|---|---|
| | | | | | |

Questions to answer:
1. Which tools does the video rely on (editor, AI service, storage, automation)? Any we already pay for?
2. Does it index footage, or does it work per project? (Our system indexes once, reuses forever.)
3. How does it choose clips: transcript-driven, visual tags, manual? (Ours: visual tags + templates; transcript optional.)
4. How are captions produced and styled? Does the style live in a reusable place? (Ours: brand kit → ASS/SRT.)
5. How does it produce platform versions? (Ours: templates → variants.)
6. What stays manual in the video's workflow, and is that the same as ours (music sync, transitions, grade)?
7. Any step the video automates that we still do by hand? Log it as a roadmap item in doc 02 §8.

---

## 2. Concepts common to AI editing-workflow videos and where they plug in

| Concept | Plugs into |
|---|---|
| Transcript-based editing (cut by words) | Optional transcription in `fce analyze` (`transcription.command`); transcripts are searchable; word-level cuts remain an NLE/Descript task |
| Auto-clipping long videos into shorts | Templates with `scope: library` + hook/hero flags do this for footage; for long talking-head videos, add a transcript-driven template later |
| Auto-captions with animated styles | `captions.style` in the brand kit; burned-in ASS today; animated word-pop is an NLE preset that copies the same values |
| Asset tagging / smart bins | The shot index (`fce search`, `fce unused`, `fce report`) |
| AI B-roll generation | `fce broll` prompt sheets + doc 06 rules |
| Multi-platform reformatting | Platform profiles (conform, safe zones, loudness) + `fce variants` |
| Brand kits / presets | `brand/brand-kit.json` |
| Automation glue (Zapier/Make/n8n) | Nightly `fce ingest && fce analyze`; optional n8n step to post `fce report` |

When a concept from the video does not fit a row above, it is either creative work (out of scope by the brief) or a genuinely new capability; note it in the worksheet and decide in the monthly review.
