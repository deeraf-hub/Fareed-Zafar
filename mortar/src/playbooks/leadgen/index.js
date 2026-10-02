import { machine, CLOSING, FUB_STAGE } from "./machine.js";
import { leadgenTasks } from "./tasks.js";
import { templates, VARIANTS, fallbackOpener } from "./messages.js";
import { icpCheck, nextSendWindow, offerSlots, pickSlot, parseProspectReply } from "./rules.js";
import { features, score, PRIOR_WEIGHTS, DEFAULT_ARMS, FEATURES, seededRandom, thompsonPick } from "./learning.js";
import { splitQuestions } from "../leasing/rules.js";
import { mergePlans } from "../../core/plan.js";
import { DAY, MINUTE, formatDayTime, localParts } from "../../core/clock.js";
import { usd } from "../../core/format.js";
import { consentChange } from "../shared/consent.js";
import { email as emailAction, firstName } from "../shared/actions.js";

/**
 * OWNER LEAD GENERATION — find owners who need a property manager and start a
 * conversation worth a person's time.
 *
 *   discovered → ICP filter → score (logistic, explainable) → tier
 *     A: paid enrichment → frontier research brief → first email reviewed by a person
 *     B: paid enrichment → local-model opener → 3-step email sequence
 *     C: no spend, no outreach → nurture
 *   replies → rules first (unsubscribe, auto-reply, bounce, slot picks), local model for the rest
 *   interested / questions → grounded answers + meeting slots → booked in Follow Up Boss
 *   every outcome updates the subject-line bandit and becomes a training sample for the scorer
 *
 * Outbound prospects are created in Follow Up Boss with POST /v1/people?deduplicate=true,
 * so lead-flow automations never fire on people who didn't ask to hear from us.
 */
export const leadgen = {
  name: "leadgen",
  casePrefix: "LG",
  machine,
  tasks: leadgenTasks,
  claim,
  open,
  decide,
  plan,
  summarize,
};

const SEQUENCE_DAYS = { 1: 0, 2: 3, 3: 7 };
const SIGNER_TITLE = "Owner Relations";

// ═══ Stage 2 — State ══════════════════════════════════════════════════════════

function claim(event, { sender, directory, store }) {
  if (event.type === "prospect.discovered") {
    const existing = store.listParties({ role: "prospect" }).find((p) => p.external?.sourceRecord === event.payload.record.id);
    const open = existing && store.findOpenCase({ playbook: "leadgen", partyId: existing.id });
    return open ? { caseRecord: open } : { open: true };
  }
  if (event.type === "crm.person.updated") {
    const c = store.findCaseByExternal("fubPersonId", event.payload.personId);
    return c?.playbook === "leadgen" ? { caseRecord: c } : null;
  }
  if (event.type !== "message.received" || sender?.role !== "prospect") return null;
  const c = store.findOpenCase({ playbook: "leadgen", partyId: sender.id });
  return c ? { caseRecord: c } : null;
}

function open({ event }) {
  if (event.type !== "prospect.discovered") return null;
  const r = event.payload.record;
  return {
    title: `${r.name} — ${r.properties[0]?.address ?? "owner"}, ${r.properties[0]?.city ?? ""}`,
    newParty: {
      idPrefix: "PR",
      role: "prospect",
      name: r.name,
      external: { sourceRecord: r.id },
      attributes: { record: r, source: event.payload.source, consent: { email: "none", sms: "none" } },
    },
  };
}

// ═══ Stage 3 — Deterministic logic ════════════════════════════════════════════

function decide(ctx) {
  const { event } = ctx;
  if (event.type === "message.received") {
    const consent = consentChange(event, ctx.sender, ctx.now);
    if (consent) return { kind: "unsubscribe", summary: consent.summary, rules: [consent.rule], partyUpdates: consent.partyUpdates };
  }
  if (ctx.approvalDecision) {
    const firstTouch = ctx.approvalDecision.approval.actions.some((a) => a.key === "sequence-1");
    return { kind: "approval", firstTouch, decision: ctx.approvalDecision.decision, summary: `First email ${ctx.approvalDecision.decision} by ${ctx.approvalDecision.by}`, rules: ["approval_decided"] };
  }

  switch (event.type) {
    case "prospect.discovered":
      return ctx.isNew ? decideDiscovered(ctx) : { kind: "noop", summary: "Already in the pipeline — duplicate discovery ignored", rules: ["dedupe"] };
    case "action.completed":
      if (event.payload.key === "enrich") return decideEnriched(ctx, event.payload.result);
      if (event.payload.key === "fub-person") return { kind: "fub_linked", personId: event.payload.result.personId, summary: `Follow Up Boss person #${event.payload.result.personId} created (no automations)`, rules: ["action_result"] };
      return { kind: "noop", summary: "Action completed", rules: ["action_result"] };
    case "timer.fired":
      return decideTimer(ctx);
    case "message.received":
      return decideReply(ctx);
    case "outcome.recorded":
      return { kind: "outcome", outcome: event.payload.outcome, summary: `Outcome recorded: ${event.payload.outcome}`, rules: ["outcome"] };
    case "crm.person.updated":
      return { kind: "crm_update", stage: event.payload.stage, summary: `Follow Up Boss stage → “${event.payload.stage}” (set by a person)`, rules: ["fub_webhook"] };
    default:
      return { kind: "noop", summary: event.type, rules: [] };
  }
}

function decideDiscovered(ctx) {
  const record = ctx.event.payload.record;
  const suppressed = ctx.directory.kv("leadgen:suppression", []).includes(record.id);
  const icp = icpCheck(record, { suppressed });
  if (!icp.ok) return { kind: "disqualified", record, reasons: icp.reasons, summary: `Outside the ICP: ${icp.reasons.join("; ")}`, rules: ["icp_filter"], portfolio: record.doors > 20 };

  const weights = ctx.directory.kv("leadgen:weights", PRIOR_WEIGHTS);
  const x = features(record, ctx.now);
  const s = score(x, weights);
  return {
    kind: "scored",
    record,
    x,
    scored: s,
    weightsVersion: weights.version,
    summary: `Score ${s.score} → tier ${s.tier} (${s.contributions.map((c) => c.feature).join(", ") || "no signals"})`,
    rules: ["icp_filter", "logistic_score", `tier_${s.tier}`],
    context: { score: s.score, tier: s.tier, signals: s.contributions.map((c) => `${c.label} (+${c.weight})`).join("; ") || "none", weights: `v${weights.version}` },
    modelSkipReason: "not needed — scoring is plain math on public-record and listing signals",
  };
}

function decideEnriched(ctx, result) {
  const f = ctx.case.facts;
  const record = ctx.party.attributes.record;
  if (!result.found || !result.email) {
    return { kind: "no_contact", result, summary: `Enrichment found no email${result.phone ? " (phone only — no SMS consent, so no texts)" : ""}`, rules: ["enrichment_result"] };
  }
  const input = {
    first: firstName(ctx.party),
    doors: record.doors,
    mailingCity: record.mailing.city,
    properties: record.properties,
    signals: f.scored.contributions.map((c) => c.label),
    enrichment: result,
  };
  const task = f.tier === "A" ? "leadgen.research_brief" : "leadgen.personalize";
  return {
    kind: "enriched",
    result,
    summary: `Enriched: ${result.email}${result.title ? ` · ${result.title}` : ""} (${usd(result.costUsd)})`,
    rules: ["enrichment_result", `tier_${f.tier}`],
    needs: [{ task, as: "opener", input }],
  };
}

function decideTimer(ctx) {
  const { kind, step } = ctx.event.payload;
  const status = ctx.case.status;
  const stale = (why) => ({ kind: "noop", summary: `Timer “${kind.replace(/_/g, " ")}” is stale — ${why}`, rules: ["stale_timer"] });
  switch (kind) {
    case "sequence_step":
      return ["ready", "outreach"].includes(status) ? { kind: "send_step", step, summary: `Sequence step ${step} due`, rules: ["sequence"] } : stale(`case is ${status}`);
    case "sequence_end":
      return status === "outreach" ? { kind: "sequence_end", summary: "Sequence finished with no reply", rules: ["sequence"] } : stale(`case is ${status}`);
    case "check_back":
      return status === "nurture" ? { kind: "check_back", summary: "Follow-up date the owner asked for", rules: ["check_back"] } : stale(`case is ${status}`);
    case "meeting_reminder":
      return status === "meeting_booked" ? { kind: "meeting_reminder", summary: "Meeting tomorrow", rules: ["reminder"] } : stale(`case is ${status}`);
    default:
      return stale("unknown timer");
  }
}

function decideReply(ctx) {
  const p = ctx.event.payload;
  const text = p.text ?? "";
  if (p.autoReply) return { kind: "auto_reply", summary: "Auto-reply (RFC 3834 headers) — not a human reply; sequence continues", rules: ["auto_reply_header"] };
  if (p.bounced) return { kind: "bounce", summary: "Bounce — address is bad", rules: ["bounce"] };

  const slots = ctx.case.facts.slots ?? [];
  if (slots.length) {
    const index = pickSlot(text, slots, tz(ctx));
    if (index !== null) return { kind: "book", index, summary: `Picked slot ${index + 1} (parsed by rule)`, rules: ["slot_pick"] };
  }
  const intent = parseProspectReply(text);
  const questions = splitQuestions(text);
  if (intent && !questions.length) return { kind: "reply", intent, summary: `Reply parsed by rule: ${intent.replace("_", " ")}`, rules: [`reply_${intent}`] };

  return {
    kind: "reply",
    intent: null,
    questions,
    summary: "Reply the rules can't fully read",
    rules: ["no_rule_matched"],
    needs: [
      { task: "leadgen.read_reply", as: "reply", input: { text, today: localDate(ctx) } },
      ...questions.map((question, i) => ({
        task: "knowledge.answer",
        as: `answer${i}`,
        input: (k) => (k.byName[`q${i}`]?.results.length ? { question, references: k.byName[`q${i}`].results } : null),
        skipReason: "nothing relevant in the service docs → a person answers",
      })),
    ],
    retrieve: questions.map((q, i) => ({ query: q, scopes: ["global"], limit: 2, budgetTokens: 300, as: `q${i}` })),
  };
}

// ═══ Stage 6 — Action ═════════════════════════════════════════════════════════

function plan(ctx, d, { models }) {
  switch (d.kind) {
    case "scored":
      return planScored(ctx, d);
    case "disqualified":
      return planDisqualified(ctx, d);
    case "enriched":
      return planEnriched(ctx, d, models);
    case "no_contact":
      return { status: "no_contact", close: true, facts: { enrichment: d.result }, kv: dataSpend(d.result), decisions: [d.summary] };
    case "fub_linked":
      return { external: { fubPersonId: d.personId }, decisions: [d.summary] };
    case "approval":
      if (!d.firstTouch) return { decisions: [d.summary] };
      return d.decision === "approved"
        ? { timers: [{ kind: "sequence_step", at: sendWindowAfter(ctx, SEQUENCE_DAYS[2]), payload: { step: 2 } }], decisions: ["First touch approved and sent → the rest of the sequence is scheduled"] }
        : { status: "nurture", flags: { needsHuman: true }, decisions: ["First touch declined by Owner Relations → not sent; they'll decide the approach"] };
    case "send_step":
      return planSendStep(ctx, d.step);
    case "sequence_end":
      return mergePlans({ status: "nurture", decisions: ["No reply after 3 emails → nurture (re-scored later)"] }, banditOutcome(ctx, false), trainingSample(ctx, 0), crmStage(ctx, "nurture"));
    case "check_back":
      return {
        status: "outreach",
        actions: [mail(ctx, "check-back", `Checking back on ${street(ctx)}`, templates.checkBack({ first: firstName(ctx.party), street: street(ctx), signer: signer(ctx).name }))],
        timers: [{ kind: "sequence_end", at: later(ctx, 7 * DAY) }],
        decisions: ["Owner asked us to check back → one email, then nurture if quiet"],
      };
    case "meeting_reminder":
      return { actions: [mail(ctx, "meeting-reminder", "Tomorrow's call", templates.reminder({ first: firstName(ctx.party), when: ctx.case.facts.meeting.when, signer: signer(ctx).name }))], decisions: ["Meeting reminder"] };
    case "auto_reply":
    case "noop":
      return { decisions: [d.summary] };
    case "bounce":
      return { status: "no_contact", close: true, cancelTimers: "all", decisions: ["Bounced → address marked bad, sequence stopped"] };
    case "unsubscribe":
      return mergePlans(
        { status: "suppressed", close: true, cancelTimers: "all", partyUpdates: d.partyUpdates, kv: [{ key: "leadgen:suppression", append: ctx.party.external.sourceRecord }], decisions: [d.summary, "Suppressed everywhere — never contacted again"] },
        banditOutcome(ctx, false),
        crmStage(ctx, "suppressed")
      );
    case "book":
      return planBook(ctx, d.index);
    case "reply":
      return planReply(ctx, d, models);
    case "outcome":
      return mergePlans(
        { status: d.outcome === "signed" ? "won" : "lost", close: true, cancelTimers: "all", decisions: [d.outcome === "signed" ? "Signed a management agreement 🎉" : "Lost"] },
        trainingSample(ctx, d.outcome === "signed" ? 1 : 0),
        crmStage(ctx, d.outcome === "signed" ? "won" : "lost")
      );
    case "crm_update":
      return planCrmUpdate(ctx, d);
    default:
      return { decisions: [d.summary] };
  }
}

function planScored(ctx, d) {
  const { scored, x } = d;
  const facts = { features: x, scored, tier: scored.tier, score: scored.score, weightsVersion: d.weightsVersion };
  if (scored.tier === "C") {
    return { status: "nurture", priority: "C", facts, decisions: [`Tier C (score ${scored.score}) → nurture list: no data spend, no outreach, no model calls`] };
  }
  return {
    status: "qualified",
    priority: scored.tier,
    facts,
    actions: [
      {
        key: "enrich",
        once: true,
        notify: true,
        connector: "enrichment",
        operation: "lookup",
        label: `Enrich contact details (${usd(0.15)} data spend)`,
        payload: { recordId: d.record.id, name: d.record.name, mailing: d.record.mailing },
        purpose: "internal",
      },
    ],
    decisions: [`Tier ${scored.tier} (score ${scored.score}) → worth paying for enrichment`],
  };
}

function planDisqualified(ctx, d) {
  if (!d.portfolio) return { status: "disqualified", close: true, decisions: [d.summary] };
  // Portfolio-size owners are relationships, not sequences: a person takes it from here.
  return {
    status: "disqualified",
    close: true,
    flags: { needsHuman: true },
    actions: [
      {
        key: "portfolio-alert",
        connector: "email",
        operation: "sendEmail",
        label: `Portfolio owner → ${signer(ctx).name}`,
        payload: { to: signer(ctx).email, subject: `Portfolio owner: ${d.record.name} (${d.record.doors} doors)`, body: `${d.record.name} owns ${d.record.doors} doors (${d.record.properties.map((p) => p.address).join("; ")}). Outside the automated ICP — worth a personal approach.` },
        recipient: { partyId: signer(ctx).id, role: "staff", name: signer(ctx).name },
        purpose: "internal",
      },
    ],
    decisions: [`${d.reasons.join("; ")} → handed to ${signer(ctx).name}, not sequenced`],
  };
}

function planEnriched(ctx, d, models) {
  const f = ctx.case.facts;
  const record = ctx.party.attributes.record;
  const property = record.properties[0];
  const opener = models.opener?.ok ? models.opener.output : null;
  const opening = opener?.opening_line ?? fallbackOpener({ property, features: f.features, mailingCity: record.mailing.city });
  const variant = chooseVariant(ctx, f.tier, f.features);
  const sendAt = nextSendWindow(ctx.now, tz(ctx));
  const [first, ...rest] = ctx.party.name.split(" ");

  return {
    status: "ready",
    facts: {
      enrichment: { email: d.result.email, phone: d.result.phone, title: d.result.title, confidence: d.result.confidence, costUsd: d.result.costUsd },
      opening,
      openingSource: opener ? models.opener.tier : "template",
      brief: f.tier === "A" && opener ? { angle: opener.angle, hooks: opener.hooks, avoid: opener.avoid } : null,
      variant,
      sequence: { step: 0 },
    },
    partyUpdates: [{ partyId: ctx.party.id, fields: { email: d.result.email, phone: d.result.phone }, attributes: { enrichment: { title: d.result.title, confidence: d.result.confidence } } }],
    actions: [
      { key: "fub-person", once: true, notify: true, connector: "fub", operation: "createPerson", label: "Create prospect in Follow Up Boss (no automations)", payload: { person: { firstName: first, lastName: rest.join(" "), emails: [{ value: d.result.email }], phones: d.result.phone ? [{ value: d.result.phone }] : [] }, source: "Mortar outbound", tags: ["mortar", "owner-prospect", `tier-${f.tier}`], stage: FUB_STAGE.outreach }, purpose: "internal" },
    ],
    kv: dataSpend(d.result),
    timers: [{ kind: "sequence_step", at: sendAt, payload: { step: 1 } }],
    decisions: [
      `Opener from ${opener ? `the ${models.opener.tier} model` : "a template (no model available)"}; subject variant ${variant} chosen by Thompson sampling`,
      `First email scheduled for the send window (${formatDayTime(sendAt, tz(ctx))})${f.tier === "A" ? " — A-tier first touch is reviewed by a person" : ""}`,
    ],
  };
}

function planSendStep(ctx, step) {
  const f = ctx.case.facts;
  const first = firstName(ctx.party);
  const vars = { first, street: street(ctx), mailingCity: ctx.party.attributes.record.mailing.city, signer: signer(ctx).name, opening: f.opening };
  const subject = step === 1 ? VARIANTS[f.variant].subject(vars) : threadSubject(ctx);
  const body = templates[`step${step}`](vars);
  const reviewed = step === 1 && f.tier === "A";
  const action = mail(ctx, `sequence-${step}`, subject, body, {
    generated: step === 1 && f.openingSource !== "template",
    ...(reviewed ? { requiresApproval: "A-tier first touch is reviewed by Owner Relations", approverId: signer(ctx).id } : {}),
  });
  // A reviewed first touch schedules the rest of the sequence only once it's approved.
  const next = reviewed ? [] : step < 3 ? [{ kind: "sequence_step", at: sendWindowAfter(ctx, SEQUENCE_DAYS[step + 1] - SEQUENCE_DAYS[step]), payload: { step: step + 1 } }] : [{ kind: "sequence_end", at: later(ctx, 4 * DAY) }];
  return mergePlans(
    {
      status: "outreach",
      facts: { sequence: { step, lastSentAt: ctx.now.toISOString() } },
      actions: [action],
      timers: next,
      decisions: [`Sequence email ${step}/3 (${f.variant}: “${subject}”)${reviewed ? " — waits for Owner Relations to approve" : ""}`],
    },
    step === 1 ? crmStage(ctx, "outreach") : null
  );
}

function planReply(ctx, d, models) {
  const reply = models.reply?.ok ? models.reply.output : null;
  const intent = d.intent ?? reply?.intent ?? "other";
  const first = firstName(ctx.party);
  const answers = (d.questions ?? []).map((q, i) => models[`answer${i}`]).filter((r) => r?.ok && r.output.grounded).map((r) => r.output.answer);
  const unanswered = (d.questions ?? []).filter((q, i) => !(models[`answer${i}`]?.ok && models[`answer${i}`].output.grounded));
  const base = { cancelTimers: ["sequence_step", "sequence_end"], facts: { lastReply: { text: ctx.event.payload.text, intent, at: ctx.now.toISOString() } } };

  switch (intent) {
    case "interested":
    case "question": {
      const slots = offerSlots(ctx.now, tz(ctx));
      const labels = slots.map((s) => formatDayTime(new Date(s), tz(ctx)));
      const answer = answers.join(" ");
      return mergePlans(
        base,
        {
          status: "replied",
          facts: { slots },
          actions: [mail(ctx, "slots", threadSubject(ctx), templates.offerSlots({ first, slots: labels, answer }), { inReplyTo: true, generated: answers.length > 0 })],
          decisions: [`${intent === "interested" ? "Interested" : "Question"} → ${answers.length ? `${answers.length} grounded answer(s) + ` : ""}3 meeting slots offered`, ...(unanswered.length ? [`${unanswered.length} question(s) not in the docs → ${signer(ctx).name} answers`] : [])],
          flags: unanswered.length ? { needsHuman: true } : {},
        },
        banditOutcome(ctx, true),
        crmStage(ctx, "replied"),
        crmNote(ctx, "reply-note", "Prospect replied", `“${ctx.event.payload.text}”${unanswered.length ? `\nUnanswered: ${unanswered.join(" / ")}` : ""}`)
      );
    }
    case "not_now": {
      const date = reply?.follow_up_date ?? isoDate(new Date(ctx.now.getTime() + 60 * DAY));
      const when = new Date(`${date}T15:30:00Z`);
      return mergePlans(base, {
        status: "nurture",
        facts: { checkBackOn: date },
        actions: [mail(ctx, "not-now", threadSubject(ctx), templates.notNowAck({ first, when: when.toLocaleDateString("en-US", { month: "long", day: "numeric" }) }), { inReplyTo: true })],
        timers: [{ kind: "check_back", at: when }],
        decisions: [`Not now → check back on ${date}`],
      }, banditOutcome(ctx, true), crmStage(ctx, "nurture"));
    }
    case "not_interested":
    case "already_managed":
      return mergePlans(
        base,
        { status: "lost", close: true, cancelTimers: "all", actions: [mail(ctx, "closing", threadSubject(ctx), templates.closingAck({ first }), { inReplyTo: true })], decisions: [intent === "already_managed" ? "Already has a manager → closed politely" : "Not interested → closed politely, no further contact"] },
        banditOutcome(ctx, false),
        trainingSample(ctx, 0),
        crmStage(ctx, "lost")
      );
    case "wrong_person":
      return mergePlans(base, { status: "suppressed", close: true, cancelTimers: "all", kv: [{ key: "leadgen:suppression", append: ctx.party.external.sourceRecord }], decisions: ["Wrong person → suppressed (data quality issue noted)"] }, crmStage(ctx, "suppressed"));
    case "referral":
      return mergePlans(base, { actions: [mail(ctx, "referral-thanks", threadSubject(ctx), templates.referralThanks({ first }), { inReplyTo: true })], flags: { needsHuman: true }, decisions: ["Referral → thanked; a person follows up with the referral"] }, banditOutcome(ctx, true), crmNote(ctx, "referral", "Referral", `“${ctx.event.payload.text}”`));
    default:
      return mergePlans(base, { flags: { needsHuman: true }, decisions: [`Unclear reply${reply ? ` (model: ${reply.intent}, ${reply.confidence})` : ""} → a person reads it`] }, crmNote(ctx, "unclear", "Reply needs a person", `“${ctx.event.payload.text}”`));
  }
}

function planBook(ctx, index) {
  const start = new Date(ctx.case.facts.slots[index]);
  const end = new Date(start.getTime() + 30 * MINUTE);
  const when = formatDayTime(start, tz(ctx));
  const s = signer(ctx);
  return mergePlans(
    {
      status: "meeting_booked",
      cancelTimers: ["sequence_step", "sequence_end"],
      facts: { meeting: { start: start.toISOString(), when, with: s.id }, slots: [] },
      actions: [
        mail(ctx, "booked", `Confirmed: ${when} call`, templates.booked({ first: firstName(ctx.party), when, signer: s.name, phone: ctx.case.facts.enrichment?.phone }), { inReplyTo: true }),
        ...(ctx.case.external.fubPersonId
          ? [{ key: "fub-appointment", connector: "fub", operation: "createAppointment", label: `Follow Up Boss appointment: ${when}`, payload: { personId: ctx.case.external.fubPersonId, title: `Intro call — ${ctx.party.name}`, start: start.toISOString(), end: end.toISOString(), location: "Phone", personName: ctx.party.name, personEmail: ctx.party.email }, purpose: "internal" }]
          : []),
      ],
      timers: [{ kind: "meeting_reminder", at: new Date(start.getTime() - DAY) }],
      decisions: [`Meeting booked for ${when} with ${s.name}`],
    },
    trainingSample(ctx, 1),
    crmStage(ctx, "meeting_booked")
  );
}

function planCrmUpdate(ctx, d) {
  const status = Object.entries(FUB_STAGE).find(([, stage]) => stage === d.stage)?.[0];
  if (!status || status === ctx.case.status || !machine.canTransition(ctx.case.status, status)) return { decisions: [`Follow Up Boss stage “${d.stage}” noted`] };
  return { status, close: CLOSING.has(status), cancelTimers: CLOSING.has(status) ? "all" : [], flags: { humanInControl: true }, decisions: [`A person moved the prospect to “${d.stage}” in Follow Up Boss → ${status} (people win)`] };
}

// ── Learning hooks ───────────────────────────────────────────────────────────

function chooseVariant(ctx, tier, x) {
  const arms = ctx.directory.kv("leadgen:bandit", {})[tier] ?? DEFAULT_ARMS;
  const eligible = Object.fromEntries(Object.entries(arms).filter(([id]) => VARIANTS[id].appliesTo(x)));
  return thompsonPick(eligible, seededRandom(`${ctx.case.id}:${ctx.party.id}`));
}

/** Any human reply that isn't a "no" counts as a win for the subject line. */
function banditOutcome(ctx, success) {
  const { tier, variant, banditCounted } = ctx.case.facts;
  if (!variant || banditCounted) return null;
  return { kv: [{ key: "leadgen:bandit", increment: [tier, variant, success ? "a" : "b"] }], facts: { banditCounted: true } };
}

/** Booked meeting (1) or a definitive no (0) becomes a training sample for the scorer. */
function trainingSample(ctx, y) {
  const { features: x, sampleRecorded } = ctx.case.facts;
  if (!x || sampleRecorded) return null;
  return { kv: [{ key: "leadgen:outcomes", append: { x, y, caseId: ctx.case.id, at: ctx.now.toISOString() } }], facts: { sampleRecorded: true } };
}

const dataSpend = (result) => [{ key: "leadgen:spend", increment: ["enrichmentUsd"], by: result.costUsd ?? 0 }, { key: "leadgen:spend", increment: ["lookups"], by: 1 }];

// ── CRM helpers ──────────────────────────────────────────────────────────────

function crmStage(ctx, status) {
  const personId = ctx.case.external.fubPersonId;
  if (!personId || !FUB_STAGE[status]) return null;
  return { actions: [{ key: `fub-stage-${status}`, connector: "fub", operation: "updatePerson", label: `Follow Up Boss stage → ${FUB_STAGE[status]}`, payload: { personId, stage: FUB_STAGE[status], tags: [`tier-${ctx.case.facts.tier}`] }, purpose: "internal" }] };
}

function crmNote(ctx, key, subject, body) {
  const personId = ctx.case.external.fubPersonId;
  if (!personId) return null;
  return { actions: [{ key: `fub-${key}`, connector: "fub", operation: "addNote", label: `Follow Up Boss note: ${subject}`, payload: { personId, subject, body }, purpose: "internal" }] };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const tz = () => "America/Chicago";
const later = (ctx, ms) => new Date(ctx.now.getTime() + ms);
const street = (ctx) => ctx.party.attributes.record.properties[0].address;
const signer = (ctx) => ctx.directory.staffWithTitle(SIGNER_TITLE);

/** Replies stay in the original thread. */
function threadSubject(ctx) {
  const f = ctx.case.facts;
  const vars = { first: firstName(ctx.party), street: street(ctx), mailingCity: ctx.party.attributes.record.mailing.city };
  return `Re: ${VARIANTS[f.variant ?? "V1"].subject(vars)}`;
}

function sendWindowAfter(ctx, days) {
  return nextSendWindow(new Date(ctx.now.getTime() + days * DAY), tz(ctx));
}

/** Cold email: always marketing (CAN-SPAM footer + opt-out enforced by policy). */
function mail(ctx, key, subject, body, extra = {}) {
  const to = { ...ctx.party, email: ctx.case.facts.enrichment?.email ?? ctx.party.email };
  return emailAction({ key, to, subject, body, purpose: "marketing", label: `Email → ${ctx.party.name}: ${subject}`, ...extra });
}

function localDate(ctx) {
  const p = localParts(ctx.now, tz(ctx));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

const isoDate = (d) => d.toISOString().slice(0, 10);

// ═══ Summary ══════════════════════════════════════════════════════════════════

function summarize(c) {
  const f = c.facts;
  const parts = [machine.labels[c.status] ?? c.status];
  if (f.tier) parts.push(`tier ${f.tier} · score ${f.score}`);
  if (f.scored?.contributions?.length) parts.push(f.scored.contributions.slice(0, 3).map((x) => FEATURES[x.feature].toLowerCase()).join(", "));
  if (f.variant) parts.push(`subject ${f.variant}`);
  if (f.sequence?.step) parts.push(`email ${f.sequence.step}/3`);
  if (f.meeting) parts.push(`meeting ${f.meeting.when}`);
  if (f.checkBackOn) parts.push(`check back ${f.checkBackOn}`);
  if (c.external?.fubPersonId) parts.push(`FUB #${c.external.fubPersonId}`);
  return parts.join(" · ");
}

export { PRIOR_WEIGHTS };
