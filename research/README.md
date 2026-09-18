# Prospect research — Pitch Decks, Presentation & Collateral Design

**Round one:** 18 August 2026, 100 prospects across 7 segments, plus your supplied 105-company list.
**Round two:** 18 September 2026, 82 prospects in healthcare, SaaS and fintech. Rows 101 to 182.

**For:** LinkedIn-first outreach, email second.

---

## What's in here

| File | What it's for |
|---|---|
| **[01-outreach-playbook.md](01-outreach-playbook.md)** | Read this first. Segment logic, what each type of prospect actually buys, message angles, LinkedIn + email templates, sequencing, pricing anchors, objection handling. |
| **[02-prospect-list.md](02-prospect-list.md)** | The 100 prospects, grouped into 7 segments. Each one has a **buying trigger with a date and a source**, what to sell, and who to contact. |
| **[prospects.csv](prospects.csv)** | The same 100, CRM-ready. Import into a sheet or CRM and work it top-down. |
| **[04-outreach-messages.md](04-outreach-messages.md)** | A tailored message set for each of the 27 high-priority prospects: where to reach them, the pain to hit, a LinkedIn connection note under 300 characters, and the day-+3 follow-up. |
| **[05-email-campaign.md](05-email-campaign.md)** | Email outreach for the 105-company list you supplied. Tiered by whether cold email can actually reach a buyer, with 16 per-company emails, subject lines, real published addresses, and the compliance rules for emailing US, UK and EU organisations. |
| **[top-100-leads-scored.xlsx](top-100-leads-scored.xlsx)** | Your original spreadsheet with six columns added: verdict, published emails found, in-house team evidence, 2026 trigger, evidence quality, and the action to take. Colour coded. |
| **[03-sources.md](03-sources.md)** | Every source URL used, grouped by segment, so you can re-verify before you send. |
| **[Prospect-Outreach-Pack.pdf](Prospect-Outreach-Pack.pdf)** | The playbook and the full prospect directory as one designed, print-ready 28-page PDF. Ends with a tick-box worksheet of the 27 prospects to contact this week. |
| **[build-pdf.py](build-pdf.py)** | Regenerates the PDF from `prospects.csv`. Edit the CSV, run `python3 build-pdf.py`, and the PDF rebuilds. |

### Round two, added 18 September 2026

| File | What it's for |
|---|---|
| **[06-healthcare-saas-fintech.md](06-healthcare-saas-fintech.md)** | 82 prospects in healthcare, SaaS and fintech, rows 101 to 182, sorted into five tiers by strength of evidence rather than by company size. Each row carries a dated trigger, what to sell, the role to contact, and an evidence grade. |
| **[07-hsf-outreach-messages.md](07-hsf-outreach-messages.md)** | 26 message sets for the strongest rows. Split in two: 12 applications to live postings, and 14 cold LinkedIn notes each under 300 characters. Includes the three-week sending order. |
| **[prospects-hsf.csv](prospects-hsf.csv)** | The same 82 rows, CRM-ready, with tier, sector, trigger, what to sell, contact route and evidence grade. |
| **[08-hsf-sources.md](08-hsf-sources.md)** | All 125 source URLs for round two, grouped the same way the list is, plus the research limitations stated plainly. |

---

## How the 100 break down

| # | Segment | Count | Why they're on the list | Expected close rate |
|---|---|---:|---|---|
| **A** | **Active hiring signal** | 14 | Posted a job for a presentation/proposal designer. Budget approved, need proven, no education needed. | **Highest** |
| **B** | **Agencies & studios (white-label)** | 21 | Their product *is* decks. They subcontract overflow. Recurring, not one-off. | **Highest volume** |
| **C** | **Recently funded startups** | 31 | Raised in Jul–Aug 2026. Cash in bank, sales motion starting, next raise in 12–18 months. | Medium-high |
| **D** | **VCs, accelerators, fund managers** | 10 | Buy for themselves (LP decks) *and* refer their whole portfolio. Highest leverage per contact. | Medium, huge upside |
| **E** | **Events, conferences, associations** | 10 | Publish a sponsorship prospectus every single year. Predictable, calendar-driven. | Medium |
| **F** | **Sports & esports properties** | 9 | Sponsorship sales decks are their revenue engine. Several just lost a major partner programme. | Medium-high |
| **G** | **Nonprofits & foundations** | 5 | Annual/impact reports, donor decks, data viz — on a fixed annual cycle. | Medium |

---

## The three things that make this list work

1. **Every prospect has a dated trigger.** You are never sending "hi, I do decks." You are sending "I saw you posted a Presentation Designer role on <date>" or "congrats on the $8M seed on 12 Aug."
2. **The list is ordered by how little convincing is required.** Segments A and B do not need to be sold on the *category* — only on *you*. Start there. Segment C onwards needs a reason-to-care first.
3. **Segments B and D are repeat revenue.** One agency that adds you to its freelance bench is worth more than twenty one-off startup decks. Weight your effort accordingly.

---

## How round two breaks down, and what changed in the thinking

Round one taught one lesson worth keeping: **company size predicts nothing about whether they will pay a freelancer.** Twenty-eight of the biggest names on the first list had in-house studios doing exactly the pitched work. The viable ones all shared a single trait, which was public proof they already pay outside designers.

So round two is sorted by proof of purchase.

| Tier | The evidence | Count | Why it sits there |
|---|---|---:|---|
| **1** | A live freelance or contract posting naming decks, presentations, brand or collateral work | 33 | They wrote the need down themselves. Highest reply rate on the list. |
| **2** | An agency or studio running a standing freelance roster | 13 | Overflow is structural. Lower rate, steadier volume, shorter sales cycle. |
| **3** | A rebrand shipped or in flight | 9 | Nobody staffs the eighteen months of collateral that follows an identity launch. They discover it. |
| **4** | Funded recently, no in-house creative findable | 22 | Biggest budgets, worst odds. The window is one to two quarters and then it shuts. |
| **5** | Sector events, played from the sponsor side | 5 | Do not pitch HLTH. Pitch the 950 companies buying booths at it. |

Evidence grades across all 82 rows: **41 Strong, 37 Medium, 4 Weak.** Read the grade before you spend a message.

Sector split, summing to 82: **34 healthcare** (12 pharma and med comms with live postings, 10 digital health and medtech, 9 healthcare agencies, 3 mid-rebrand), **27 fintech** (11 with live postings, 12 recently funded, 4 mid-rebrand), **12 SaaS and technology**, **5 sector events** and **4 cross-sector agencies**.

### The one number worth more than the whole list

Six of these prospects publish their rate: **$75 to $90 an hour** at Avalere Health, **$125 to $200** at Flex for contract design, **$55** at Syneos, **$40 to $60** at a New York medical center, **up to $40** at Toloka, and **CAD $70,000 to $80,000** salaried at Klick.

That spread is not about skill. It is about who is buying. The agency roster pays least, the direct client pays most, for work that is often identical.

---

## Honest caveats — read before you send

- **Job postings expire.** Segment A triggers were live as of 10–18 Aug 2026. Re-check the posting is still up (or recently filled) before you reference it. If it's filled, the angle flips to *"you've got someone in-house now — I'm useful for overflow and peak pursuit weeks."*
- **I have not verified individual LinkedIn profiles.** Named people appear only where a public source names them (founders in funding announcements, a named events contact). Everywhere else the list gives you the **job title to target** — search that title + the company on LinkedIn and you'll land on the right person.
- **Funding figures and dates are as reported by the sources cited.** Amounts occasionally get restated. Never quote a number you haven't re-read that morning.
- **Segment C moves fast.** A seed round announced in August is a hot lead in September and a cold one by December. Work this segment first or replace it.

### Round two, additional caveats

- **Nothing in round two was fetched directly.** The egress proxy blocked Lever, Greenhouse, Jobvite, Built In, LinkedIn, Rock Health, Fierce Healthcare and fintech.global. Quoted text is accurate but a posting may already be closed. Verify before you name one.
- **Tier 4 creative-team status is unverified in all 22 rows.** The funding is confirmed. Whether they have a designer is not. Two minutes on their careers page and LinkedIn answers it, and it is the highest-value two minutes in the whole document.
- **No email address appears in round two at all,** and none was constructed from a pattern. Same rule as round one, same reason.
- **Asia Pacific and Latin America are thin,** two Singapore rows, one Philippines, one Colombia, one India. That reflects one day of English-language search, not the size of those markets.
- **Healthcare payers and provider systems are barely covered.** One academic medical center, found through a recruiter. Payers buy a large amount of member-facing and broker-facing design and were not researched.
