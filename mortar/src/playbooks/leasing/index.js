import { machine, FUB_STAGE } from "./machine.js";
import { leasingTasks } from "./tasks.js";
import { topicsOf, answerFromListing, petIssue, isHotLead, parseLeadReply, splitQuestions } from "./rules.js";
import { mergePlans } from "../../core/plan.js";
import { HOUR, MINUTE, formatDayTime, localParts } from "../../core/clock.js";
import { normalizeEmail, normalizePhone } from "../../core/ids.js";
import { notify, firstName } from "../shared/actions.js";
import { consentChange } from "../shared/consent.js";
import { isPleasantry } from "../maintenance/rules.js";

/**
 * LEASING — from rental inquiry to signed lease.
 *
 *   inquiry → instant answers from the listing record (+ grounded answers for long-tail
 *   questions) → self-tour link → pet/qualification checks → hot-lead routing to the
 *   leasing manager → tour prep → post-tour follow-up → objection handling (pricing is
 *   a human decision) → application nudge → nurture. Follow Up Boss mirrors every stage.
 *
 * ShowMojo owns showing confirmations and reminders; Mortar doesn't duplicate them.
 * ShowMojo has no "showing completed" event, so the post-tour follow-up is a timer
 * (start + 75 min) that an explicit completion event can pre-empt.
 */
export const leasing = {
  name: "leasing",
  casePrefix: "LS",
  machine,
  tasks: leasingTasks,
  claim,
  open,
  decide,
  plan,
  summarize,
};

const LEASING_EVENTS = new Set(["listing.inquiry", "showing.scheduled", "showing.completed", "showing.cancelled", "application.submitted"]);

// ═══ Stage 2 — State ══════════════════════════════════════════════════════════

function claim(event, { sender, directory, store }) {
  if (event.type === "crm.person.updated") {
    const c = store.findCaseByExternal("fubPersonId", event.payload.personId);
    return c?.playbook === "leasing" ? { caseRecord: c } : null;
  }
  const own = () => (sender?.role === "lead" ? store.findOpenCase({ playbook: "leasing", partyId: sender.id }) : null);
  if (LEASING_EVENTS.has(event.type)) {
    const c = own();
    return c ? { caseRecord: c } : { open: true };
  }
  if (event.type !== "message.received") return null;
  if (sender?.role === "lead") {
    const c = own();
    return c ? { caseRecord: c } : { open: true };
  }
  if (!sender && directory.line(event.payload.to)?.playbook === "leasing") return { open: true };
  return null;
}

function open({ event, sender, directory }) {
  const p = event.payload;
  const listing = directory.propertyByListing(p.listingId);
  const person = p.prospect ?? { name: null, phone: p.channel === "sms" ? p.from : null, email: p.channel === "email" ? p.from : null };
  return {
    title: `${listing?.name ?? "Rental inquiry"} — ${person.name ?? sender?.name ?? "new lead"}`,
    partyId: sender?.id ?? null,
    propertyId: listing?.id ?? sender?.propertyId ?? null,
    newParty: sender
      ? null
      : {
          idPrefix: "LD",
          role: "lead",
          name: person.name ?? "New lead",
          phone: normalizePhone(person.phone),
          email: normalizeEmail(person.email),
          propertyId: listing?.id ?? null,
          attributes: { consent: { sms: person.smsConsent ? "granted" : "none", email: "granted" }, source: p.source ?? "ShowMojo", preferredChannel: person.smsConsent ? "sms" : "email" },
        },
  };
}

// ═══ Stage 3 — Deterministic logic ════════════════════════════════════════════

function decide(ctx) {
  const { event } = ctx;
  const consent = consentChange(event, ctx.sender, ctx.now);
  if (consent) return { kind: "consent", summary: consent.summary, rules: [consent.rule], partyUpdates: consent.partyUpdates };
  if (ctx.approvalDecision) return { kind: "noop", summary: `Approval ${ctx.approvalDecision.decision}`, rules: ["approval_decided"] };

  switch (event.type) {
    case "listing.inquiry":
      return decideInquiry(ctx, event.payload.message ?? "");
    case "message.received":
      return ctx.isNew ? decideInquiry(ctx, event.payload.text ?? "") : decideReply(ctx);
    case "showing.scheduled":
      return { kind: "showing_scheduled", startsAt: event.payload.startsAt, summary: `ShowMojo: self-tour booked for ${formatDayTime(new Date(event.payload.startsAt), tz(ctx))}`, rules: ["showmojo_showing"] };
    case "showing.cancelled":
      return { kind: "showing_cancelled", summary: "ShowMojo: showing cancelled", rules: ["showmojo_showing"] };
    case "showing.completed":
      return { kind: "post_tour", summary: "ShowMojo: showing completed", rules: ["showmojo_showing"] };
    case "application.submitted":
      return { kind: "applied", summary: "Application submitted", rules: ["application_received"] };
    case "crm.person.updated":
      return { kind: "crm_update", stage: event.payload.stage, summary: `Follow Up Boss: stage changed to “${event.payload.stage}” by a person`, rules: ["fub_webhook"] };
    case "action.completed":
      return event.payload.key === "fub-lead"
        ? { kind: "fub_linked", personId: event.payload.result.personId, summary: `Follow Up Boss person #${event.payload.result.personId} linked`, rules: ["action_result"] }
        : { kind: "noop", summary: "Action completed", rules: ["action_result"] };
    case "timer.fired":
      return decideTimer(ctx);
    default:
      return { kind: "noop", summary: event.type, rules: [] };
  }
}

function decideInquiry(ctx, text) {
  const listing = ctx.property?.attributes?.listing;
  if (!listing) return { kind: "no_listing", text, summary: "Inquiry without a known listing → ask which home, flag for the team", rules: ["no_listing"] };

  const questions = splitQuestions(text);
  const longTail = questions.filter((q) => topicsOf(q).length === 0);
  const template = text.split(/\s+/).length <= 14 && !/\b(pets?|dogs?|cats?|move|weekend|saturday|sunday|\d)\b/i.test(text);
  const needs = [];
  if (!template) {
    needs.push({ task: "leasing.read_inquiry", as: "inquiry", input: { text, today: localDate(ctx), listing: `${ctx.property.name}, available ${listing.availableOn}` } });
  }
  longTail.forEach((question, i) =>
    needs.push({
      task: "knowledge.answer",
      as: `answer${i}`,
      input: (k) => (k.byName[`q${i}`]?.results.length ? { question, references: k.byName[`q${i}`].results } : null),
      skipReason: "nothing relevant in the listing docs → a person answers",
    })
  );
  const topics = topicsOf(text);
  return {
    kind: "inquiry",
    text,
    questions,
    longTail,
    listing,
    summary: `Inquiry for ${ctx.property.name} · ${questions.length} question(s): ${topics.length ? `${topics.join(", ")} answered from the listing record` : "none matched a known topic"}${longTail.length ? ` · ${longTail.length} long-tail` : ""}`,
    rules: ["listing_lookup", ...topics.map((t) => `topic_${t}`), ...(template ? ["template_inquiry"] : [])],
    needs,
    retrieve: longTail.map((q, i) => ({ query: q, scopes: [`property:${ctx.property.id}`, "global"], limit: 2, budgetTokens: 300, as: `q${i}` })),
    context: {
      listing: `${ctx.property.name} · $${listing.rent}/mo · ${listing.beds} bd/${listing.baths} ba · available ${listing.availableOn}`,
      petPolicy: `cats ok · dogs < ${listing.pets.dogsMaxLb} lb · max ${listing.pets.maxPets}`,
      daysOnMarket: listing.daysOnMarket,
      leasingManager: ctx.directory.staffWithTitle("Leasing Manager")?.name ?? "—",
    },
    modelSkipReason: "not needed — a short template inquiry; every answer comes from the listing record",
  };
}

function decideReply(ctx) {
  const text = ctx.event.payload.text ?? "";
  if (isPleasantry(text)) return { kind: "noop", summary: "Pleasantry — no reply needed", rules: ["pleasantry"] };
  const intent = parseLeadReply(text);
  const questions = splitQuestions(text);
  const longTail = questions.filter((q) => topicsOf(q).length === 0);
  if (intent) return { kind: "reply", intent, text, questions, longTail: [], summary: `Reply parsed by rule: ${intent.replace("_", " ")}`, rules: [`reply_${intent}`] };
  if (questions.length && !longTail.length) return { kind: "reply", intent: "question", text, questions, longTail, summary: "Questions on known topics → answered from the listing record", rules: topicsOf(text).map((t) => `topic_${t}`) };
  return {
    kind: "reply",
    intent: null,
    text,
    questions,
    longTail,
    summary: "Reply the rules can't place",
    rules: ["no_rule_matched"],
    needs: [
      { task: "leasing.classify_reply", as: "reply", input: { text, stage: machine.labels[ctx.case.status] } },
      ...longTail.map((question, i) => ({
        task: "knowledge.answer",
        as: `answer${i}`,
        input: (k) => (k.byName[`q${i}`]?.results.length ? { question, references: k.byName[`q${i}`].results } : null),
        skipReason: "nothing relevant in the listing docs → a person answers",
      })),
    ],
    retrieve: longTail.map((q, i) => ({ query: q, scopes: [`property:${ctx.property?.id}`, "global"], limit: 2, budgetTokens: 300, as: `q${i}` })),
  };
}

function decideTimer(ctx) {
  const { kind } = ctx.event.payload;
  const status = ctx.case.status;
  const stale = (why) => ({ kind: "noop", summary: `Timer “${kind.replace(/_/g, " ")}” is stale — ${why}`, rules: ["stale_timer"] });
  switch (kind) {
    case "inquiry_followup":
      return status === "engaged" ? { kind: "inquiry_followup", summary: "24 h since the inquiry and no tour booked", rules: ["timer_inquiry_followup"] } : stale(`case is ${status}`);
    case "tour_prep":
      return status === "tour_scheduled" ? { kind: "tour_prep", summary: "Two hours before the self-tour", rules: ["timer_tour_prep"] } : stale(`case is ${status}`);
    case "post_tour":
      return status === "tour_scheduled" ? { kind: "post_tour", summary: "Tour slot has passed (ShowMojo has no 'completed' event)", rules: ["timer_post_tour"] } : stale(`case is ${status}`);
    case "application_nudge":
      return status === "toured" ? { kind: "application_nudge", summary: "48 h after the tour, no application", rules: ["timer_application_nudge"] } : stale(`case is ${status}`);
    case "nurture_close":
      return status === "nurture" ? { kind: "nurture_close", summary: "No response in 14 days", rules: ["timer_nurture_close"] } : stale(`case is ${status}`);
    default:
      return stale("unknown timer");
  }
}

// ═══ Stage 6 — Action ═════════════════════════════════════════════════════════

function plan(ctx, d, { models, knowledge }) {
  switch (d.kind) {
    case "consent":
      return { partyUpdates: d.partyUpdates, decisions: [d.summary] };
    case "inquiry":
      return planInquiry(ctx, d, models);
    case "reply":
      return planReply(ctx, d, models);
    case "no_listing":
      return {
        status: "engaged",
        flags: { needsHuman: true },
        actions: say(ctx, "which-home", "Thanks for reaching out to Northwind Leasing! Which home are you asking about? Reply with the address and I'll send details and a self-tour link.", { inReplyTo: true }),
        decisions: [d.summary],
      };
    case "fub_linked":
      return planFubLinked(ctx, d);
    case "showing_scheduled":
      return planShowingScheduled(ctx, d);
    case "showing_cancelled":
      return {
        status: "engaged",
        cancelTimers: ["tour_prep", "post_tour"],
        actions: say(ctx, "rebook", `No problem — whenever you'd like to see ${ctx.property.name}, you can pick a new time here: ${listingOf(ctx).selfTourUrl}`),
        decisions: ["Showing cancelled → tour timers cancelled, rebooking link sent"],
      };
    case "post_tour":
      return planPostTour(ctx);
    case "applied":
      return mergePlans(
        {
          status: "applied",
          cancelTimers: ["application_nudge", "inquiry_followup", "post_tour"],
          actions: say(ctx, "applied", `Thank you for applying for ${ctx.property.name}! Our team reviews applications within one business day and will be in touch.`),
          decisions: ["Application in → nudges stopped, leasing manager notified"],
        },
        crmStage(ctx, "applied"),
        crmTask(ctx, "review-application", `Review application — ${ctx.party.name} for ${ctx.property.name}`)
      );
    case "crm_update":
      return planCrmUpdate(ctx, d);
    case "inquiry_followup":
      return {
        actions: say(ctx, "inquiry-followup", `Hi ${firstName(ctx.party)}, just checking in — ${ctx.property.name} is still available. You can self-tour any day: ${listingOf(ctx).selfTourUrl}`),
        timers: [{ kind: "nurture_close", at: later(ctx, 14 * 24 * 60) }],
        status: "nurture",
        decisions: ["No tour booked in 24 h → one friendly follow-up, then nurture"],
      };
    case "tour_prep":
      return {
        actions: say(ctx, "tour-prep", `See you at ${ctx.property.name} at ${formatDayTime(new Date(ctx.case.facts.tour.startsAt), tz(ctx))}! The ShowMojo app checks your ID before the lockbox opens. Any questions before then? Just reply here.`),
        decisions: ["Tour-prep message (ShowMojo sends its own confirmation; this answers questions before the visit)"],
      };
    case "application_nudge":
      return {
        actions: say(ctx, "application-nudge", `Hi ${firstName(ctx.party)}, if ${ctx.property.name} felt like the one, the application takes about 10 minutes: ${listingOf(ctx).applyUrl}. Happy to answer anything first.`),
        status: "nurture",
        timers: [{ kind: "nurture_close", at: later(ctx, 14 * 24 * 60) }],
        decisions: ["48 h after the tour → one application nudge, then nurture"],
      };
    case "nurture_close":
      return mergePlans({ status: "lost", close: true, decisions: ["No response in 14 days → closed as lost (re-opens if they write back)"] }, crmStage(ctx, "lost"));
    default:
      return { decisions: [d.summary] };
  }
}

function planInquiry(ctx, d, models) {
  const L = d.listing;
  const extracted = models.inquiry?.ok ? models.inquiry.output : null;
  const topics = new Set(topicsOf(d.text));
  for (const q of d.questions) for (const t of topicsOf(q)) topics.add(t);
  if (extracted?.pets?.length) topics.add("pets");
  topics.add("availability");
  topics.add("tour");

  const { grounded, unanswered } = longTailAnswers(d, models);
  const petProblem = petIssue(extracted?.pets, L);
  const manager = ctx.directory.staffWithTitle("Leasing Manager");
  const answer = (t) => answerFromListing(t, L);
  const hot = isHotLead({ wantsTour: extracted?.wants_tour ?? topics.has("tour"), moveIn: extracted?.move_in_date, availableOn: L.availableOn, petProblem });

  // Facts first, then the long tail, then compliance, then the next step.
  const emailBody = [
    `Hi ${firstName(ctx.party)}! Thanks for your interest in ${ctx.property.name} — ${answer("availability").replace(/^It's/, "it's")}`,
    topics.has("rent") || topics.has("deposit") ? [answer("rent"), topics.has("deposit") ? answer("deposit") : null].filter(Boolean).join(" ") : null,
    topics.has("pets") ? `${answer("pets")}${petProblem ? ` ${petProblem}${manager ? ` I've asked ${manager.name}, our leasing manager, to follow up with you on that.` : ""}` : ""}` : null,
    ...grounded,
    unanswered.length ? `Good question${unanswered.length > 1 ? "s" : ""} about ${unanswered.map((q) => `“${q}”`).join(" and ")} — I've asked our leasing team and we'll get back to you shortly.` : null,
    topics.has("apply") ? answer("apply") : null,
    topics.has("steering") ? answer("steering") : null,
    answer("tour"),
    "— Northwind Leasing",
  ]
    .filter(Boolean)
    .join("\n\n");
  const smsBody = `Hi ${firstName(ctx.party)}! ${ctx.property.name} is available ${new Date(`${L.availableOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}. Self-tour any day: ${L.selfTourUrl} — I've emailed answers to your questions.`;

  const actions = [];
  if (ctx.party.email) actions.push(...notify({ key: "inquiry", to: ctx.party, body: emailBody, subject: `${ctx.property.name} — your questions answered`, purpose: "leasing", channels: ["email"], generated: grounded.length > 0, inReplyTo: true }));
  if (ctx.party.phone && ctx.party.attributes?.consent?.sms === "granted") actions.push(...notify({ key: "inquiry", to: ctx.party, body: smsBody, purpose: "leasing", channels: ["sms"], from: line(ctx), inReplyTo: true }));
  actions.push(fubLeadAction(ctx, d.text));

  const crmQueue = [];
  if (petProblem) crmQueue.push({ type: "task", key: "pet-exception", name: `Pet exception request — ${ctx.party.name}: ${describePets(extracted.pets)} (policy: max ${L.pets.maxPets}, dogs < ${L.pets.dogsMaxLb} lb)` });
  if (unanswered.length) crmQueue.push({ type: "task", key: "answer-question", name: `Answer ${ctx.party.name}: ${unanswered.join(" / ")}` });
  if (hot) crmQueue.push({ type: "task", key: "hot-lead", name: `Hot lead — ${ctx.party.name} wants to tour ${ctx.property.name}, move-in ${extracted.move_in_date}` });
  crmQueue.push({ type: "note", key: "inquiry-note", subject: "Inquiry summary (Mortar)", body: inquiryNote(extracted, d, petProblem) });

  return {
    status: "engaged",
    facts: {
      listingId: ctx.property.external?.showmojo,
      moveIn: extracted?.move_in_date ?? null,
      pets: extracted?.pets ?? [],
      wantsTour: extracted?.wants_tour ?? null,
      preferredTimes: extracted?.preferred_times ?? null,
      questions: d.questions,
      petProblem,
      hot,
      crmQueue,
    },
    flags: unanswered.length || petProblem ? { needsHuman: true } : {},
    actions,
    timers: [{ kind: "inquiry_followup", at: later(ctx, 24 * 60) }],
    decisions: [
      `Answered by code from the listing record: ${[...topics].filter((t) => t !== "tour").join(", ")}`,
      ...(grounded.length ? [`${grounded.length} long-tail answer(s) grounded in the listing docs`] : []),
      ...(unanswered.length ? [`${unanswered.length} question(s) not in the docs → leasing team answers (no guessing)`] : []),
      ...(topics.has("steering") ? ["Neighborhood-safety question → standard fair-housing answer, never an opinion"] : []),
      ...(petProblem ? [`Pets outside policy (${describePets(extracted.pets)}) → leasing manager decides on an exception`] : []),
      ...(hot ? ["Hot lead → leasing manager task"] : []),
    ],
  };
}

function planReply(ctx, d, models) {
  const reply = models.reply?.ok ? models.reply.output : null;
  const intent = d.intent ?? reply?.intent ?? "other";
  const L = listingOf(ctx);
  const { grounded, unanswered } = longTailAnswers(d, models);

  switch (intent) {
    case "schedule_tour":
    case "reschedule":
      return { actions: say(ctx, "tour-link", answerFromListing("tour", L), { inReplyTo: true }), decisions: ["Wants to tour → self-tour link"] };
    case "apply":
      return { actions: say(ctx, "apply-link", answerFromListing("apply", L), { inReplyTo: true }), decisions: ["Wants to apply → application link + criteria (identical for everyone)"] };
    case "not_interested":
      return mergePlans(
        {
          status: "lost",
          close: true,
          cancelTimers: "all",
          actions: say(ctx, "goodbye", `Thanks for letting me know, ${firstName(ctx.party)} — good luck with the move! If anything changes, just reply here.`, { inReplyTo: true }),
          decisions: ["Not interested → closed as lost, all follow-ups cancelled"],
        },
        crmStage(ctx, "lost")
      );
    case "objection":
      return planObjection(ctx, reply);
    case "question": {
      const answers = [...d.questions.flatMap((q) => topicsOf(q)).map((t) => answerFromListing(t, L)).filter(Boolean), ...grounded];
      const body = [...new Set(answers), unanswered.length ? "I've asked our leasing team about the rest and we'll reply shortly." : null].filter(Boolean).join("\n\n");
      return mergePlans(
        { actions: say(ctx, "answers", body || "Good question — I've asked our leasing team and we'll reply shortly.", { inReplyTo: true, generated: grounded.length > 0 }), decisions: [`Answered ${answers.length} question(s)${unanswered.length ? `; ${unanswered.length} sent to the team` : ""}`] },
        unanswered.length ? crmTask(ctx, `question-${ctx.event.id}`, `Answer ${ctx.party.name}: ${unanswered.join(" / ")}`) : null
      );
    }
    case "positive":
      return ctx.case.status === "toured"
        ? { actions: say(ctx, "apply-encourage", `So glad you liked it! If you're ready, you can apply here: ${L.applyUrl}`, { inReplyTo: true }), decisions: ["Positive after tour → application link"] }
        : { decisions: ["Positive reply — logged"] };
    default:
      return mergePlans(crmNote(ctx, `note-${ctx.event.id}`, "Reply needs a person", `“${d.text}”`), { flags: { needsHuman: true }, decisions: [`Unclear reply${reply ? ` (model: ${reply.summary})` : ""} → noted in Follow Up Boss for the team`] });
  }
}

/** Pricing and concessions are human decisions — the agent routes, it doesn't negotiate. */
function planObjection(ctx, reply) {
  const objection = reply?.objection ?? "other";
  const manager = ctx.directory.staffWithTitle("Leasing Manager");
  const text = {
    price: `Thanks for the honest feedback, ${firstName(ctx.party)}. Pricing is set by our leasing manager${manager ? `, ${manager.name}` : ""} — I've shared your note${manager ? ` and ${firstName(manager)} will reach out` : ""}.`,
    commute: "Thanks — that's fair. If you tell me where you commute to, our leasing team can suggest homes that might be a better fit.",
  }[objection] ?? `Thanks for the feedback, ${firstName(ctx.party)} — I've passed it to our leasing manager, who will follow up.`;
  return mergePlans(
    {
      facts: { objection: { type: objection, text: ctx.event.payload.text, at: ctx.now.toISOString() } },
      cancelTimers: ["application_nudge"],
      actions: say(ctx, "objection-ack", text, { inReplyTo: true }),
      decisions: [`Objection: ${objection} → ${objection === "price" ? "pricing is a human decision; leasing manager task" : "leasing manager task"}`],
    },
    crmTask(ctx, `objection-${ctx.event.id}`, `${objection === "price" ? "Price objection" : `Objection (${objection})`} — ${ctx.party.name}: “${ctx.event.payload.text}”`)
  );
}

function planShowingScheduled(ctx, d) {
  const startsAt = new Date(d.startsAt);
  const timers = [{ kind: "post_tour", at: new Date(startsAt.getTime() + 75 * MINUTE) }];
  const prep = new Date(startsAt.getTime() - 2 * HOUR);
  if (prep > ctx.now) timers.push({ kind: "tour_prep", at: prep });
  return mergePlans(
    {
      status: "tour_scheduled",
      facts: { tour: { startsAt: startsAt.toISOString(), showingId: ctx.event.payload.showingId } },
      cancelTimers: ["inquiry_followup", "nurture_close", "post_tour", "tour_prep"],
      timers,
      decisions: [`Tour booked → prep message 2 h before, follow-up 75 min after (ShowMojo sends its own confirmation)`],
    },
    crmStage(ctx, "tour_scheduled"),
    crmNote(ctx, "tour-note", "Self-tour booked", `ShowMojo self-tour: ${formatDayTime(startsAt, tz(ctx))}`)
  );
}

function planPostTour(ctx) {
  return {
    status: "toured",
    cancelTimers: ["post_tour"],
    actions: say(ctx, "post-tour", `Thanks for touring ${ctx.property.name}, ${firstName(ctx.party)}! What did you think? If it's the one, you can apply here (about 10 minutes): ${listingOf(ctx).applyUrl}`),
    timers: [{ kind: "application_nudge", at: later(ctx, 48 * 60) }],
    decisions: ["Tour done → follow-up now, one application nudge in 48 h"],
  };
}

/** Follow Up Boss is where the leasing team works: their changes win. */
function planCrmUpdate(ctx, d) {
  const status = Object.entries(FUB_STAGE).find(([, stage]) => stage === d.stage)?.[0];
  if (!status || status === ctx.case.status || !machine.canTransition(ctx.case.status, status)) {
    return { decisions: [`Follow Up Boss stage “${d.stage}” noted (no status change)`] };
  }
  const closing = ["leased", "lost"].includes(status);
  return { status, close: closing, cancelTimers: closing ? "all" : [], flags: { humanInControl: true }, decisions: [`A person moved the lead to “${d.stage}” in Follow Up Boss → ${status} (people win)`] };
}

/** CRM writes that need the FUB person id wait in facts.crmQueue until it arrives. */
function planFubLinked(ctx, d) {
  const queue = ctx.case.facts.crmQueue ?? [];
  const personId = d.personId;
  const actions = queue.map((item) => (item.type === "task" ? taskAction(ctx, personId, item.key, item.name) : noteAction(ctx, personId, item.key, item.subject, item.body)));
  return { external: { fubPersonId: personId }, facts: { crmQueue: [] }, actions, decisions: [`Follow Up Boss person #${personId} linked → ${actions.length} queued CRM write(s) flushed`] };
}

// ── CRM helpers ──────────────────────────────────────────────────────────────

function fubLeadAction(ctx, message) {
  const [street, city, rest] = ctx.property.address.split(", ");
  const [state, code] = (rest ?? "").split(" ");
  const [firstNameValue, ...last] = ctx.party.name.split(" ");
  return {
    key: "fub-lead",
    once: true,
    notify: true,
    connector: "fub",
    operation: "upsertLead",
    label: `Send lead to Follow Up Boss (Property Inquiry · ${ctx.party.attributes?.source ?? "ShowMojo"})`,
    payload: {
      source: ctx.party.attributes?.source ?? "ShowMojo",
      type: "Property Inquiry",
      message,
      person: {
        firstName: firstNameValue,
        lastName: last.join(" "),
        emails: ctx.party.email ? [{ value: ctx.party.email }] : [],
        phones: ctx.party.phone ? [{ value: ctx.party.phone }] : [],
      },
      property: { street, city, state, code, price: listingOf(ctx).rent, forRent: true, url: listingOf(ctx).selfTourUrl },
      tags: ["mortar", "rental-lead"],
    },
    purpose: "internal",
  };
}

const personId = (ctx) => ctx.case.external.fubPersonId;

function crmStage(ctx, status) {
  if (!personId(ctx) || !FUB_STAGE[status]) return null;
  return { actions: [{ key: `fub-stage-${status}`, connector: "fub", operation: "updatePerson", label: `Follow Up Boss stage → ${FUB_STAGE[status]}`, payload: { personId: personId(ctx), stage: FUB_STAGE[status] }, purpose: "internal" }] };
}

function crmTask(ctx, key, name) {
  if (!personId(ctx)) return { facts: { crmQueue: [...(ctx.case.facts.crmQueue ?? []), { type: "task", key, name }] } };
  return { actions: [taskAction(ctx, personId(ctx), key, name)] };
}

function crmNote(ctx, key, subject, body) {
  if (!personId(ctx)) return { facts: { crmQueue: [...(ctx.case.facts.crmQueue ?? []), { type: "note", key, subject, body }] } };
  return { actions: [noteAction(ctx, personId(ctx), key, subject, body)] };
}

function taskAction(ctx, id, key, name) {
  const manager = ctx.directory.staffWithTitle("Leasing Manager");
  return { key: `fub-${key}`, connector: "fub", operation: "createTask", label: `Follow Up Boss task: ${name}`, payload: { personId: id, name, dueDate: later(ctx, 4 * 60).toISOString(), assignedTo: manager?.name }, purpose: "internal" };
}

function noteAction(ctx, id, key, subject, body) {
  return { key: `fub-${key}`, connector: "fub", operation: "addNote", label: `Follow Up Boss note: ${subject}`, payload: { personId: id, subject, body }, purpose: "internal" };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const tz = (ctx) => ctx.property?.timezone ?? "America/Chicago";
const later = (ctx, minutes) => new Date(ctx.now.getTime() + minutes * MINUTE);
const line = (ctx) => ctx.directory.lineAddress("leasing", "sms");
const listingOf = (ctx) => ctx.property.attributes.listing;

function say(ctx, key, body, extra = {}) {
  const smsOk = ctx.party.phone && ctx.party.attributes?.consent?.sms === "granted";
  return notify({ key, to: ctx.party, body, subject: `${ctx.property?.name ?? "Your rental inquiry"}`, purpose: "leasing", channels: [smsOk ? "sms" : "email"], from: line(ctx), ...extra });
}

function longTailAnswers(d, models) {
  const grounded = [];
  const unanswered = [];
  (d.longTail ?? []).forEach((question, i) => {
    const r = models[`answer${i}`];
    if (r?.ok && r.output.grounded && r.output.answer) grounded.push(r.output.answer);
    else unanswered.push(question);
  });
  return { grounded, unanswered };
}

function localDate(ctx) {
  const p = localParts(ctx.now, tz(ctx));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function describePets(pets = []) {
  return pets.map((p) => `${p.count} ${p.type}${p.count > 1 ? "s" : ""}${p.weight_lb ? ` (~${p.weight_lb} lb)` : ""}`).join(" + ");
}

function inquiryNote(extracted, d, petProblem) {
  return [
    extracted?.move_in_date && `Move-in: ${extracted.move_in_date}`,
    extracted?.pets?.length && `Pets: ${describePets(extracted.pets)}${petProblem ? " — outside policy" : ""}`,
    extracted?.wants_tour && `Wants to tour${extracted.preferred_times ? ` (${extracted.preferred_times})` : ""}`,
    d.questions.length && `Asked: ${d.questions.join(" | ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ═══ Summary ══════════════════════════════════════════════════════════════════

function summarize(c, directory) {
  const f = c.facts;
  const property = directory.property(c.propertyId);
  const parts = [machine.labels[c.status] ?? c.status, property?.name ?? "Rental inquiry"];
  if (f.moveIn) parts.push(`move-in ${f.moveIn}`);
  if (f.pets?.length) parts.push(`pets: ${describePets(f.pets)}${f.petProblem ? " (exception needed)" : ""}`);
  if (f.tour?.startsAt) parts.push(`tour ${formatDayTime(new Date(f.tour.startsAt), property?.timezone ?? "UTC")}`);
  if (f.objection) parts.push(`objection: ${f.objection.type}`);
  if (f.hot) parts.push("hot lead");
  if (c.external?.fubPersonId) parts.push(`FUB #${c.external.fubPersonId}`);
  return parts.join(" · ");
}
