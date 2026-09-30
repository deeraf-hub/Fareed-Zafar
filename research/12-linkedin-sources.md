# Sources for round four (file 11)

Researched 30 September 2026.

## How the last-post dates were worked out

Every LinkedIn post URL ends in an activity ID, for example `activity-7503571954814058496`. The first 41 bits of that number are the moment the post was published, in milliseconds since 1970. Shift the number right by 22 bits and you get the timestamp.

```python
from datetime import datetime, timezone
datetime.fromtimestamp((7503571954814058496 >> 22) / 1000, tz=timezone.utc)
# 2026-09-09  (Katie Diasti, the day Viv announced its round)
```

Only the person's **own** posts were used, meaning URLs of the form `linkedin.com/posts/<their-handle>_...`. Company-page posts and other people's posts about them were ignored, because they say nothing about whether the person reads their own feed.

The links below use LinkedIn's canonical form, `linkedin.com/feed/update/urn:li:activity:<ID>/`, which opens the same post and depends only on the ID.

The date is the most recent post that came back in search. They may have posted since. Treat it as "at least this active".

| Person | Post used | Decoded date |
|---|---|---|
| Katie Diasti | [activity 7503571954814058496](https://www.linkedin.com/feed/update/urn:li:activity:7503571954814058496/) | 2026-09-09 |
| Nishith Khandwala | [activity 7486120635937767424](https://www.linkedin.com/feed/update/urn:li:activity:7486120635937767424/) | 2026-07-23 |
| Robin Shah | [activity 7483575541783048192](https://www.linkedin.com/feed/update/urn:li:activity:7483575541783048192/) | 2026-07-16 |
| Brad Diephuis | [activity 7483216376040480769](https://www.linkedin.com/feed/update/urn:li:activity:7483216376040480769/) | 2026-07-15 |
| Cheryl Sew Hoy | [activity 7476355302490103808](https://www.linkedin.com/feed/update/urn:li:activity:7476355302490103808/) | 2026-06-26 |
| Zach Newman | [activity 7472344663039860736](https://www.linkedin.com/feed/update/urn:li:activity:7472344663039860736/) | 2026-06-15 |
| Edmund Jackson | [activity 7470860133296910336](https://www.linkedin.com/feed/update/urn:li:activity:7470860133296910336/) | 2026-06-11 |
| Scott Hoch | [activity 7467987402301693952](https://www.linkedin.com/feed/update/urn:li:activity:7467987402301693952/) | 2026-06-03 |
| Adam Pellegrini | [activity 7467533941751783424](https://www.linkedin.com/feed/update/urn:li:activity:7467533941751783424/) | 2026-06-02 |
| Ariel Katz | [activity 7465832791759491074](https://www.linkedin.com/feed/update/urn:li:activity:7465832791759491074/) | 2026-05-28 |
| Madge Rumman | [activity 7465159017464659968](https://www.linkedin.com/feed/update/urn:li:activity:7465159017464659968/) | 2026-05-26 |
| Frank Westermann | [activity 7460335661871525888](https://www.linkedin.com/feed/update/urn:li:activity:7460335661871525888/) | 2026-05-13 |
| Sahir Jaggi | [activity 7459960823654887424](https://www.linkedin.com/feed/update/urn:li:activity:7459960823654887424/) | 2026-05-12 |
| Jonathan Kolstad | [activity 7459953633540059136](https://www.linkedin.com/feed/update/urn:li:activity:7459953633540059136/) | 2026-05-12 |
| Tim Hwang | [activity 7458158247263318017](https://www.linkedin.com/feed/update/urn:li:activity:7458158247263318017/) | 2026-05-07 |
| Prakash Khot | [activity 7457464268683264000](https://www.linkedin.com/feed/update/urn:li:activity:7457464268683264000/) | 2026-05-05 |
| Scott Hickle | [activity 7445194518645358592](https://www.linkedin.com/feed/update/urn:li:activity:7445194518645358592/) | 2026-04-01 |
| Grant Verstandig | [activity 7440473742100721664](https://www.linkedin.com/feed/update/urn:li:activity:7440473742100721664/) | 2026-03-19 |
| Jack O'Hara | [activity 7437516438707494912](https://www.linkedin.com/feed/update/urn:li:activity:7437516438707494912/) | 2026-03-11 |
| Frederik Mueller | [activity 7432835941460873216](https://www.linkedin.com/feed/update/urn:li:activity:7432835941460873216/) | 2026-02-26 |
| Navin Nagiah | [activity 7429532740158619648](https://www.linkedin.com/feed/update/urn:li:activity:7429532740158619648/) | 2026-02-17 |
| Danny Sigurdson | [activity 7407079616433217536](https://www.linkedin.com/feed/update/urn:li:activity:7407079616433217536/) | 2025-12-17 |
| Matan Hoffmann | [activity 7399169998851633153](https://www.linkedin.com/feed/update/urn:li:activity:7399169998851633153/) | 2025-11-25 |
| Arnaud Rosier | [activity 7396864210602868736](https://www.linkedin.com/feed/update/urn:li:activity:7396864210602868736/) | 2025-11-19 |
| Ricky Sahu | [activity 7386823737532235776](https://www.linkedin.com/feed/update/urn:li:activity:7386823737532235776/) | 2025-10-22 |
| Nitesh Shroff | [activity 7380706632655130626](https://www.linkedin.com/feed/update/urn:li:activity:7380706632655130626/) | 2025-10-05 |
| Sharam Fouladgar-Mercer | [activity 7373806677227270144](https://www.linkedin.com/feed/update/urn:li:activity:7373806677227270144/) | 2025-09-16 |
| Fangchang Ma | [activity 7371217244724391936](https://www.linkedin.com/feed/update/urn:li:activity:7371217244724391936/) | 2025-09-09 |
| Michal Miernowski | [activity 7369731125012877312](https://www.linkedin.com/feed/update/urn:li:activity:7369731125012877312/) | 2025-09-05 |
| Patrick Nelli | [activity 7325606349281644546](https://www.linkedin.com/feed/update/urn:li:activity:7325606349281644546/) | 2025-05-06 |
| Charlie Bullock | [activity 7310567449219768320](https://www.linkedin.com/feed/update/urn:li:activity:7310567449219768320/) | 2025-03-26 |
| Rishi Choudhary | [activity 7301262398412230656](https://www.linkedin.com/feed/update/urn:li:activity:7301262398412230656/) | 2025-02-28 |
| Abdel Mahmoud | [activity 7290752533961048064](https://www.linkedin.com/feed/update/urn:li:activity:7290752533961048064/) | 2025-01-30 |
| Mika Newton | [activity 7284664716721864704](https://www.linkedin.com/feed/update/urn:li:activity:7284664716721864704/) | 2025-01-13 |
| John Zutter | [activity 7277050529053032449](https://www.linkedin.com/feed/update/urn:li:activity:7277050529053032449/) | 2024-12-23 |
| Jeremy Gurewitz | [activity 7232550475886157826](https://www.linkedin.com/feed/update/urn:li:activity:7232550475886157826/) | 2024-08-23 |
| Joanna Strober | [activity 7183093752914194432](https://www.linkedin.com/feed/update/urn:li:activity:7183093752914194432/) | 2024-04-08 |
| Dallen Allred | [activity 7054169255474302976](https://www.linkedin.com/feed/update/urn:li:activity:7054169255474302976/) | 2023-04-18 |
| Nick Reber | [activity 6906739935681081344](https://www.linkedin.com/feed/update/urn:li:activity:6906739935681081344/) | 2022-03-07 |
| Deanna Harshbarger | [activity 6891846232470376448](https://www.linkedin.com/feed/update/urn:li:activity:6891846232470376448/) | 2022-01-25 |

No personal post surfaced for Amir Tehrani, Zubin Singh Koticha, Lewis Carhart or Sadra Hosseini.

## Funding and leadership sources

**Main tracker.** [Fierce Healthcare Fundraising Tracker 2026](https://www.fiercehealthcare.com/health-tech/fierce-healthcare-fundraising-tracker-26). 83 rounds, February to September 2026, each with the date, round, amount, investors and the executive quoted. Source for every healthcare row unless a second link is listed below.

**Confirmed against a second source:**

| Company | Sources |
|---|---|
| Tiny Health | [GlobeNewswire, 29 Sep 2026](https://www.globenewswire.com/news-release/2026/09/29/3370894/0/en/tiny-health-raises-33m-series-b-to-establish-microbiome-intelligence-as-the-standard-of-care.html) · [Crunchbase News](https://news.crunchbase.com/venture/tiny-health-33m-microbiome-tests-sew-hoy/) · [CEO letter](https://www.tinyhealth.com/blog/tiny-health-series-b-letter-from-cheryl-sew-hoy) |
| Forus | [Forus Series C](https://forus.com/stories/forus-series-c) · [MedCity News](https://medcitynews.com/2026/09/forus-secures-150m-series-c-reaches-3b-valuation/) |
| Thyme Care | [HIT Consultant, CEO succession](https://hitconsultant.net/2026/07/15/thyme-care-announces-ceo-succession-diephuis/) · [CNBC, Series E](https://www.cnbc.com/2026/09/02/thyme-care-raises-125-million-cancer-startups-value-over-2-billion.html) |
| Scan.com | [Scan.com press release](https://scan.com/media/press-releases/scan-com-series-c-2026) · [Business Wire](https://www.businesswire.com/news/home/20260831019981/en/Scan.com-Raises-$220-Million-to-Build-the-Largest-Medical-Imaging-Network-in-the-US) |
| Implicity | [GlobeNewswire, 9 Sep 2026](https://www.globenewswire.com/news-release/2026/09/09/3358622/0/en/implicity-secures-40m-growth-equity-funding-to-scale-its-ai-driven-cardiac-monitoring-platform-globally.html) |
| Garner Health | [PR Newswire](https://www.prnewswire.com/news-releases/garner-health-raises-118-million-to-close-the-healthcare-quality-and-cost-gap-reaches-1-35-billion-valuation-302680953.html) · [Forbes, 10 Feb 2026](https://www.forbes.com/sites/amyfeldman/2026/02/10/this-startups-clever-way-to-cut-health-costs-helped-it-hit-a-14-billion-valuation/) · [The Org](https://theorg.com/org/garner-health/org-chart/nick-reber) |
| Midi Health | [Fierce Healthcare, Series D](https://www.fiercehealthcare.com/health-tech/womens-health-clinic-midi-health-closes-100m-series-d-round-hitting-1b-valuation) |
| Solace Health | [Dealbreaker, Feb 2026](https://dealbreaker.com/2026/02/solace-health-reaches-unicorn-status-by-taking-the-homework-out-of-care-navigation) |
| Translucent | [Fortune, 11 Mar 2026](https://fortune.com/2026/03/11/exclusive-translucent-ai-native-healthcare-finance-startup-raises-27-million-series-a/) |
| Enzo Health | [Enzo blog](https://www.enzo.health/blog/enzo-raises-26m-series-a) |

**Other sectors (Section D):**

| Source | Covers |
|---|---|
| [SaaSRise, This Week in SaaS, 15 to 21 Sep 2026](https://www.saasrise.com/blog/this-week-in-saas-september-15---21-2026) | Comp AI, Kastle, Ryft, Raindrop |
| [Raise Track, 29 Sep 2026](https://buttondown.com/raisetrack/archive/raise-track-update-2026-09-29/) | Nuance Labs, Raindrop |
| [FinTech Futures, top five rounds of September 2026](https://fintechfutures.com/venture-capital-funding/september-2026-top-five-fintech-funding-rounds-of-the-month) | Tabby, Ridgeline, TabaPay (used for the skip list) |

**Market context:** [CB Insights via HLTH, Q2 2026 digital health funding](https://hlth.com/insights/news/cb-insights-reports-q2-2026-digital-health-funding-decline-as-ai-mega-rounds-drive-larger-deal-sizes). Funding fell in Q2 but the rounds got bigger, which is why the list skews toward companies with fresh, large rounds.

## Limitations

- **LinkedIn itself was not opened.** Profiles and posts were found through search results. Headlines are what search showed, which may lag a recent job change. Tim Hwang's is an example.
- **The last-post date is a floor.** Search indexes some posts, not all.
- **Company size is judged from the round,** not from headcount data. A few Series A companies may already have a designer.
- **Three CEOs are named but not yet checked on LinkedIn.** Listed at the end of file 11.
