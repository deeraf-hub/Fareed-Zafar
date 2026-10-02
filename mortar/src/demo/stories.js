import * as sim from "./simulate.js";
import { PROSPECTS } from "./seed.js";
import { MINUTE, HOUR, DAY } from "../core/clock.js";
import { runLearningCycle } from "../playbooks/leadgen/learning-cycle.js";

/**
 * Scripted demo stories for the console's story player (and the Loom walkthrough).
 * Each step plays the *other* side of the conversation — tenant, vendor, on-call,
 * owner, prospect — through the same webhook normalizers production uses. Mortar's
 * side is never scripted: everything it does is the real pipeline reacting.
 *
 * `say` is a one-line narration hint for whoever is presenting.
 */

const MAYA = "+15125550142";
const JORDAN = "+15125550143";
const APEX = "+15125550111";
const HILL_COUNTRY = "+15125550112";
const ALEX = "+15125550102";
const DANA = "+15125550121";
const DENISE = "+15125550131";
const LEAD = { name: "Chris Nguyen", phone: "+15125550161", email: "chris.nguyen@example.com", smsConsent: true };
const OWNERS = "owners@northwind.example";

/** Jump to an absolute time, firing every timer on the way. */
const until = (app, iso) => app.fastForward(Math.max(0, Date.parse(iso) - app.clock.now().getTime()));

export const STORIES = [
  {
    id: "leak",
    title: "11:30 PM — water through the ceiling",
    playbook: "maintenance",
    start: "2026-10-08T04:29:30Z", // Wed 11:29:30 PM Central
    steps: [
      {
        title: "Maya emails at 11:30 PM: “There is water coming through the ceiling. I tried calling and nobody answered.”",
        say: "Nobody is watching the inbox. Rules set P1 in milliseconds — note the Model stage is skipped. Safety steps, work order, plumber, on-call page, the unit above and the owner all go out at once.",
        run: async (app) => {
          await until(app, "2026-10-08T04:30:00Z");
          await sim.email(app, { from: "maya.t@example.com", subject: "Leak!!", body: "There is water coming through the ceiling. I tried calling and nobody answered." });
        },
      },
      {
        title: "Apex Plumbing presses 2 on the dispatch call (declines)",
        say: "A keypress is a deterministic event. The vendor ladder moves to Hill Country Plumbing and Maya hears about it once.",
        run: (app) => sim.keypress(app, { phone: APEX, digits: "2" }),
      },
      {
        title: "Hill Country Plumbing presses 1, then texts “ETA 40 min”",
        say: "Accept and ETA are parsed by rule. The on-call manager is asked to send access details — the agent never sends lockbox codes.",
        run: async (app) => {
          await app.fastForward(2 * MINUTE);
          await sim.keypress(app, { phone: HILL_COUNTRY, digits: "1" });
          await app.settle();
          await sim.sms(app, { from: HILL_COUNTRY, body: "ETA 40 min" });
        },
      },
      {
        title: "Jordan (3B, the unit above) replies: “Hmm, the floor by my bathroom vanity feels a little damp? Not sure if that's new.”",
        say: "Hedged language — the rules refuse to guess. This is where a small LOCAL model earns its place: it reads ‘possible leak’, and the plumber is told to check 3B first.",
        run: (app) => sim.sms(app, { from: JORDAN, body: "Hmm, the floor by my bathroom vanity feels a little damp? Not sure if that's new." }),
      },
      {
        title: "Sam (on-call #1) never answers — fast-forward to 11:40 PM",
        say: "A durable timer fires: no acknowledgement in 10 minutes, so level 2 (Alex) is called and texted.",
        run: (app) => until(app, "2026-10-08T04:40:05Z"),
      },
      {
        title: "Alex replies “ACK”",
        say: "The ladder stops, Alex gets a brief built from structured state, Maya is told a person has her case.",
        run: (app) => sim.sms(app, { from: ALEX, body: "ACK" }),
      },
      {
        title: "Midnight check-in, then the plumber arrives at 12:10 AM",
        say: "Follow-through runs on timers: a check-in Maya can answer with 1 or 2, then arrival updates the resident and Rentvine.",
        run: async (app) => {
          await until(app, "2026-10-08T05:10:00Z");
          await sim.sms(app, { from: HILL_COUNTRY, body: "On site now" });
        },
      },
      {
        title: "12:35 AM — the plumber's findings, in free text",
        say: "A local model turns this into structured follow-up work. $1,150 is over the owner's $750 limit, so the repair waits for approval — and the owner's text is deferred to 8 AM by quiet-hours policy.",
        run: async (app) => {
          await until(app, "2026-10-08T05:35:00Z");
          await sim.sms(app, {
            from: HILL_COUNTRY,
            body: "Found a burst supply line under the 3B bathroom vanity. Shut off and replaced it, water has stopped. 2B ceiling drywall is soaked and needs to be cut out and replaced, estimate $1,150.",
          });
        },
      },
      {
        title: "Maya replies “1” (water has stopped)",
        say: "Parsed by rule. No model needed to read a ‘1’.",
        run: (app) => sim.sms(app, { from: MAYA, body: "1" }),
      },
      {
        title: "8:00 AM — the owner's approval request goes out; Dana replies “YES”",
        say: "The deferred message leaves at 8:00. An SMS ‘YES’ from the approver releases the held repair work order.",
        run: async (app) => {
          await until(app, "2026-10-08T13:05:00Z");
          await sim.sms(app, { from: DANA, body: "YES" });
        },
      },
      {
        title: "That afternoon — Rentvine reports the repair completed",
        say: "A Rentvine webhook (relayed by n8n) resolves the case. It closes itself 72 hours later if nothing comes back.",
        run: async (app) => {
          await until(app, "2026-10-08T20:00:00Z");
          const c = app.store.listCases({ playbook: "maintenance" })[0];
          await sim.rentvineWorkOrder(app, { workOrderId: c.external.repairWorkOrderId, status: "completed" });
        },
      },
    ],
  },
  {
    id: "sensitive",
    title: "Mold, asthma, rent withholding, a lawyer",
    playbook: "maintenance",
    start: "2026-10-08T04:44:00Z",
    steps: [
      {
        title: "Denise (1A) texts: third mold report, son has asthma, withholding rent, calling a lawyer",
        say: "Rules flag legal + health + repeat. A vetted acknowledgement goes now. This is the one place a FRONTIER model is worth it: it drafts the reply and a brief from structured history — and the draft waits for a person.",
        run: (app) =>
          sim.sms(app, {
            from: DENISE,
            body: "This is the third time I'm writing about the mold smell in the bathroom. My son has asthma and I'm not paying rent until this is fixed properly. If nobody does anything I'm calling a lawyer.",
          }),
      },
      {
        title: "Sam edits the draft and approves it",
        say: "Human-in-the-loop: the person can edit before approving. The edited text is what goes out.",
        run: async (app) => {
          const [approval] = app.store.listApprovals({ status: "pending" });
          if (!approval) return;
          await sim.decideApproval(app, {
            approvalId: approval.id,
            decision: "approved",
            by: "Sam Patel",
            edits: { "sensitive-reply-sms": { body: "Hi Denise, this is Sam Patel. I'm sorry this keeps happening. I'll call you at 9 AM, and a mold specialist will inspect tomorrow to find the source — not just treat the surface." } },
          });
        },
      },
    ],
  },
  {
    id: "leasing",
    title: "Rental inquiry → self-tour → objection",
    playbook: "leasing",
    start: "2026-10-08T15:14:30Z", // Thu 10:14 AM Central
    steps: [
      {
        title: "Chris inquires via Zillow → ShowMojo: pets, move-in date, a tour, a fenced yard, “is the neighborhood safe?”",
        say: "A local model reads the inquiry; the ANSWERS come from the listing record by code. The fenced-yard question is answered from the listing doc (grounded), the safety question gets the fair-housing answer, and 3 pets triggers a manager task — not a rejection.",
        run: async (app) => {
          await until(app, "2026-10-08T15:15:00Z");
          await sim.showmojo(app, {
            event: "listing.inquiry",
            listingId: "SM-12CL",
            prospect: LEAD,
            source: "Zillow via ShowMojo",
            message: "Hi! Is 12 Cedar Lane still available? We have 2 cats and a small dog (about 25 lbs) and are looking to move in around November 1st. Can I see it this weekend? Is there a fenced yard? And is the neighborhood safe?",
          });
        },
      },
      {
        title: "ShowMojo: self-tour booked for Saturday 11 AM",
        say: "ShowMojo sends its own confirmation, so Mortar doesn't. It schedules a prep message 2 h before and a follow-up 75 min after (ShowMojo has no ‘completed’ event).",
        run: (app) => sim.showmojo(app, { event: "showing.scheduled", listingId: "SM-12CL", showingId: "SH-77", prospect: LEAD, startsAt: "2026-10-10T16:00:00Z" }),
      },
      {
        title: "Fast-forward to Saturday afternoon",
        say: "Two timers fire on schedule: tour prep at 9 AM, post-tour follow-up at 12:15 PM.",
        run: (app) => until(app, "2026-10-10T17:30:00Z"),
      },
      {
        title: "Chris: “Loved the house! Honestly the rent is a bit of a stretch for us though.”",
        say: "A local model spots a price objection. Pricing is a human decision: the agent acknowledges and creates a Follow Up Boss task for the leasing manager — it never offers a discount.",
        run: (app) => sim.sms(app, { from: LEAD.phone, to: "+15125550177", body: "Loved the house! Honestly the rent is a bit of a stretch for us though." }),
      },
    ],
  },
  {
    id: "leadgen",
    title: "Find owners → outreach → booked meeting → learning",
    playbook: "leadgen",
    start: "2026-10-08T15:14:30Z",
    steps: [
      {
        title: "Discover 12 owners (county records + rental-listing signals)",
        say: "ICP filter and scoring are plain math. Paid enrichment only for tiers A and B; a frontier research brief only for A-tier, whose first email waits for a person. C-tier: zero spend.",
        run: async (app) => {
          await until(app, "2026-10-08T15:15:00Z");
          await sim.discover(app, PROSPECTS.records);
        },
      },
      {
        title: "Jamie (Owner Relations) approves Priya's first email",
        say: "High-value relationships get human review; the system drafted it and schedules the rest of the sequence once it's approved.",
        run: async (app) => {
          const approval = app.store.listApprovals({ status: "pending" }).find((a) => a.summary.includes("Priya"));
          if (approval) await sim.decideApproval(app, { approvalId: approval.id, decision: "approved", by: "Jamie Lee" });
        },
      },
      {
        title: "Sofia replies: “Yes, I'd be open to a call. What are your fees?”",
        say: "Local model reads intent; the fee answer is grounded in the service docs; three meeting slots are offered.",
        run: (app) => sim.email(app, { from: "sofia.alvarez@example.com", to: OWNERS, subject: "Re: your rental", body: "Yes, I'd be open to a call. What are your fees?" }),
      },
      {
        title: "Sofia: “2 works for me”",
        say: "Slot choice parsed by rule → Follow Up Boss appointment, confirmation, reminder timer, and a positive training sample.",
        run: (app) => sim.email(app, { from: "sofia.alvarez@example.com", to: OWNERS, subject: "Re: your rental", body: "2 works for me" }),
      },
      {
        title: "Natalie: “maybe after the holidays” · Beth: “Please unsubscribe me.”",
        say: "Not-now becomes a dated check-back. Unsubscribe is deterministic and permanent (CAN-SPAM).",
        run: async (app) => {
          await sim.email(app, { from: "natalie.brooks@example.com", to: OWNERS, subject: "Re", body: "Not a good time right now, maybe after the holidays." });
          await sim.email(app, { from: "beth.kowalski@example.com", to: OWNERS, subject: "Re", body: "Please unsubscribe me." });
        },
      },
      {
        title: "Two weeks pass",
        say: "Sequences run on timers in the send window; silence ends in nurture and updates the subject-line bandit.",
        run: (app) => app.fastForward(14 * DAY),
      },
      {
        title: "Run the learning cycle",
        say: "The scorer is refit on campaign history + live outcomes and only promoted if it beats the current weights on held-out data.",
        run: async (app) => {
          const entry = runLearningCycle(app.store, app.clock.now());
          app.bus.emit("learning", entry);
        },
      },
    ],
  },
];

export const storyById = (id) => STORIES.find((s) => s.id === id);

export { HOUR };
