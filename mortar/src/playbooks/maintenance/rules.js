/**
 * Maintenance — deterministic rules.
 *
 * Severity for the cases that matter most (water through a ceiling, gas, fire,
 * sparks, sewage) is decided here, by auditable patterns, in microseconds, at zero
 * cost. A model can RAISE a severity these rules set — never lower it. When no rule
 * matches, the playbook asks the local model to triage, and if no model is
 * available the default is "P2 + a person looks at it".
 *
 *   P1  life safety or active property damage → respond now, 24/7
 *   P2  habitability or risk of damage        → within 24 hours
 *   P3  routine                               → schedule in business hours
 *
 * `ignore` lists phrases that look like a hazard but aren't (a chirping detector, a
 * fireplace, a fire hydrant). They are cut out of the text before the rule's pattern is
 * tested, so a real hazard elsewhere in the same message still matches.
 *
 * Weather matters (emergency SOP): no heat is P1 at or below 40°F; no air conditioning is
 * P1 at or above 95°F or when a resident is medically vulnerable. The temperature comes
 * from the message ("it's 30 degrees outside") or the weather feed — never from a model.
 */

const RANK = { P1: 3, P2: 2, P3: 1 };
export const isHigher = (a, b) => (RANK[a] ?? 0) > (RANK[b] ?? 0);
export const maxSeverity = (a, b) => ((RANK[a] ?? 0) >= (RANK[b] ?? 0) ? a : b) ?? null;

const rule = (id, severity, category, pattern, extra = {}) => ({ id, severity, category, pattern, trades: [], ...extra });

/** "isn't working", "stopped working", "quit", "won't turn on", "is out", "broke down"… */
const BROKEN = String.raw`(?:is\s+|has\s+)?(?:not working|isn'?t working|stopped working|stopped|quit(?: working)?|died|broke(?:n)?(?: down)?|went out|is out|out|off|won'?t (?:turn on|work|come on|start|kick on)|doesn'?t work|not (?:turning|coming|kicking) on)`;

export const SEVERITY_RULES = [
  // ── P1 — life safety / active damage ──
  rule("gas_or_co", "P1", "gas", /\b(smell(s|ing)?\s+(like\s+)?(gas|rotten eggs?|sulfur)|rotten eggs?\s+(smell|odou?r)|gas\s+(smell|leak|odou?r)|carbon monoxide|co\s+(alarm|detector)\s+(is\s+)?(going off|sounding|beeping))\b/i, {
    safety: "gas",
    ignore: /\b(co|carbon monoxide)\s+(alarm|detector)\b.{0,30}\b(chirp(s|ing)?|low battery|battery)\b/gi,
  }),
  rule("fire_or_smoke", "P1", "fire", /\b(fire|flames?|on fire|smoke\s+(is\s+)?(coming|pouring|filling)|burning smell|smell(s|ing)?\s+(of\s+|like\s+)?smoke|smoke smell|smoky)\b/i, {
    safety: "fire",
    ignore: /\b(smoke|fire)\s+(detector|alarm)\b.{0,30}\b(chirp(s|ing)?|beep(s|ing)?|battery)\b|\bfire ?(place|pit|wood|fly|flies|hydrant|extinguisher|drill|escape|department|truck|station|works)\b/gi,
  }),
  rule("electrical_hazard", "P1", "electrical", /\b(spark(s|ing|ed)?|(outlet|socket|light switch|switch|plug|cord)\b.{0,30}\b((is|feels|gets|got|was)\s+(really\s+|very\s+)?(hot|warm)|smoking|melt(ed|ing)|burning|scorched|charred)|exposed wires?|(breaker|electrical)\s+(panel|box)\s+(is\s+)?(hot|smoking|buzzing)|electrical (fire|burning|smell)|smell(s|ing)?\s+(like\s+)?(burning|melting)\s+(plastic|rubber|wires?)|burning (plastic|rubber|wire) smell)\b/i, {
    safety: "electrical",
    trades: ["electrical"],
  }),
  rule("active_water_intrusion", "P1", "water_leak", /(water\b.{0,40}\b(coming|pouring|leaking|dripping|gushing|flowing|spraying|seeping)\b.{0,30}\b(ceiling|walls?|light|fixture|vent|upstairs)|\b(ceiling|wall)\b.{0,25}\b(leaking|pouring|gushing|caving|collapsing|sagging|bulging)\b|\bburst(ed)?\s+pipe|\bpipe\s+(burst|broke|exploded|split)|\bflood(ed|ing)?\b|\bwater\s+everywhere|\bstanding water|\bwater\s+(is\s+)?(pouring|gushing|spraying)|\bwater heater\b.{0,30}\b(leaking|burst|pouring|gushing|spraying|flooding)|\bwater\b.{0,30}\b(coming|pouring|flowing|seeping|leaking)\s+(in|inside|into)\s+(under|through|from|the (apartment|unit|house|room|living room|bedroom|kitchen|hallway))|\b(leaking|pouring|gushing)\b.{0,20}\ball over (the |my )?(\w+ )?(floor|place|room))/i, {
    safety: "water",
    trades: ["plumbing"],
  }),
  rule("sewage_backup", "P1", "sewage", /\b(sewage|sewer\s+(backup|smell|backing)|(toilet|drain)\s+(is\s+)?(backing|backed)\s+up|backing up into (the )?(tub|shower|sink|floor))\b/i, {
    safety: "sewage",
    trades: ["plumbing"],
  }),
  rule("security_breach", "P1", "security", /\b(break[- ]?in|broken into|(door|window)\s+(was\s+)?(kicked in|smashed|broken)|someone\s+(is\s+)?(in|inside)\s+my)\b/i, {
    safety: "security",
    trades: ["locksmith"],
  }),
  rule("injury", "P1", "injury", /\b((got|was|is|been|am)\s+(hurt|injured|electrocuted|shocked)|bleeding|fell through|(ceiling|it)\s+fell on|hurt (my|his|her|their|our) (back|head|neck|leg|arm|knee|ankle|wrist|hip|hand|foot)|(fell|tripped|slipped)\b.{0,40}\b(hurt|injured|hit (my|his|her|their) head|can'?t (move|walk|get up)))\b/i, { safety: "injury" }),
  rule("structural_collapse", "P1", "structural", /\b(ceiling|roof)\b.{0,25}\b(collapsed|collapsing|caved in|caving in|fell( in| down)?|came down|coming down)\b|\b(part|piece|chunks?) of (the |my )?ceiling\b.{0,20}\b(fell|came down)\b/i, {
    safety: "structural",
    trades: ["plumbing"], // in apartments a ceiling usually comes down because of water from above
  }),

  // ── P2 — habitability / damage risk within 24 h ──
  rule("no_heat", "P2", "hvac", new RegExp(String.raw`\bno heat\b|\b(?:heat|heater|heating|furnace)\s+${BROKEN}\b`, "i"), { trades: ["hvac"] }),
  rule("no_cooling", "P2", "hvac", new RegExp(String.raw`\bno (?:ac|a/c|air conditioning|cooling)\b|\b(?:ac|a/c|air conditioning|air conditioner|hvac)\s+(?:${BROKEN}|(?:is\s+)?blowing (?:hot|warm))\b`, "i"), { trades: ["hvac"] }),
  rule("power_out", "P2", "electrical", /\b(no (power|electricity)|power (is |went |has gone )?out|lost power|(outlets?|lights?) (don'?t|do not|stopped|aren'?t|are not) work(ing)?)\b/i, { trades: ["electrical"] }),
  rule("no_water", "P2", "plumbing", /\b(no (running |hot )?water|water\s+(is\s+)?(shut off|not working))\b/i, { trades: ["plumbing"] }),
  rule("lockout", "P2", "lockout", /\b(locked out|lost (my )?keys?|can'?t get (in|into))\b/i, { trades: ["locksmith"] }),
  rule("fridge_out", "P2", "appliance", /\b(fridge|refrigerator|freezer)\b.{0,30}\b((not|isn'?t|is not|stopped|won'?t|doesn'?t)\s+(working|cooling|cold|getting cold|staying cold)|warm|died)\b/i, { trades: ["appliance"] }),
  rule("toilet_overflow", "P2", "plumbing", /\btoilet\b.{0,25}\b(overflow(ing|ed)?|won'?t stop running|clogged)\b/i, { trades: ["plumbing"] }),
  rule("mold", "P2", "mold", /\b(mold|mould|mildew|musty smell)\b/i, { trades: ["mold"] }),
  rule("detector_chirp", "P2", "life_safety_device", /\b(smoke|co|carbon monoxide)\s+(detector|alarm)\b.{0,30}\b(chirp(s|ing)?|beep(s|ing)?|low battery)\b/i),
  rule("ceiling_stain", "P2", "water_leak", /\b(water\s+)?(stain|spot|discolou?ration)\b.{0,20}\b(ceiling|wall)\b|\b(ceiling|wall)\b.{0,20}\b(stain|damp|wet spot|bubbling)\b/i, { trades: ["plumbing"] }),

  // ── P3 — routine ──
  rule("routine_plumbing", "P3", "plumbing", /\b(dripp?ing faucet|faucet\s+(is\s+)?(dripping|leaking)|running toilet|toilet\s+(keeps\s+)?running|slow drain|(small|tiny|minor|slow)\s+(leak|drip))\b/i, { trades: ["plumbing"] }),
  rule("appliance", "P3", "appliance", /\b(dishwasher|garbage disposal|disposal|microwave|oven|stove|range hood|washer|dryer|ice maker)\b/i, { trades: ["appliance"] }),
  rule("pests", "P3", "pest", /\b(roach(es)?|cockroach(es)?|mice|mouse|rats?|ants|bed ?bugs|termites|wasps?)\b/i, { trades: ["pest"] }),
  rule("fixtures", "P3", "general", /\b(light ?bulb|blinds|cabinet|drawer|door handle|squeak(y|ing)?|screen door|towel bar|closet door)\b/i, { trades: ["handyman"] }),
];

/** Modifiers: they don't set severity, they change who gets involved and how. */
export const SIGNALS = {
  failedContact: /\b((tried|trying)\s+(to\s+)?(call|reach|contact)|nobody\s+(answered|picked up|is answering|called back)|no one\s+(answered|is answering|picked up)|(called|calling)\s+(you\s+|the office\s+)?(twice|again|several times|multiple times|all night)|no answer|voicemail\s+(is\s+)?full)\b/i,
  wantsHuman: /\b((speak|talk)\s+(to|with)\s+(a\s+)?(real\s+)?(person|human|someone|somebody|manager|supervisor)|call me( back)?|real person)\b/i,
  legalThreat: /\b(lawyer|attorney|sue|suing|lawsuit|legal action|small claims|code enforcement|housing authority|tenants?'? (union|rights))\b/i,
  rentWithholding: /\b((not|won'?t|refuse to|stop)\s+pay(ing)?\s+(my\s+|the\s+)?rent|withhold(ing)?\s+(my\s+|the\s+)?rent|rent strike|escrow)\b/i,
  healthRisk: /\b(asthma|allerg(y|ies|ic)|sick|ill|hospital|doctor|baby|infant|newborn|pregnan(t|cy)|elderly|senior|grand(mother|father|ma|pa)|disab(led|ility)|medical|breathing|respiratory|heart (condition|problem|disease)|oxygen|diabet(es|ic)|dialysis|chemo(therapy)?|copd)\b/i,
  recurrence: /\b(again|(second|third|fourth|2nd|3rd|4th) time|still (not|hasn'?t|isn'?t|broken)|keeps (happening|coming back)|for (weeks|months)|nobody (has )?(fixed|came|showed))\b/i,
  // Hazard vocabulary. Below P1 it buys a second look from the local model, so a routine
  // keyword ("dishwasher") can't hide an emergency told in words no rule knows.
  hazardWords: /\b(water|leak(s|ing)?|flood(s|ed|ing)?|gas|smell(s|ing)?|smoke|smoky|fire|burn(s|ing|t)?|spark(s|ing)?|sewage|won'?t stop|everywhere|pouring|gushing|spraying|smash(ed)?|broke (in|into)|intruder|bleeding|hurt|injur(ed|y))\b/i,
  reportsProblem: /\b((isn'?t|is not|not|stopped|won'?t|doesn'?t|does not)\s+(working|turning on|draining|flushing|closing|locking|opening|cooling|heating)|broken|broke|clogged|jammed)\b/i,
};

/** Degrees stated in a message: "30 degrees outside", "it's 101 outside", "98° in here". */
const STATED_TEMP = /\b(-?\d{1,3})\s*(?:°\s*f?|degrees?(?:\s+f(?:ahrenheit)?)?|deg\b)?\s*(?:outside|out there|outdoors|inside|in here|in the (?:apartment|house|unit|room))\b|\b(-?\d{1,3})\s*(?:°|degrees?\b)/i;

export function statedTemperature(text) {
  const m = String(text ?? "").match(STATED_TEMP);
  const value = m ? Number(m[1] ?? m[2]) : null;
  return value !== null && value > -40 && value < 130 ? value : null;
}

/** The SOP's weather rules: they raise a no-heat / no-AC P2 to P1. */
function weatherRules(matched, { text, outsideTempF, signals }) {
  const temps = [statedTemperature(text), outsideTempF].filter((t) => typeof t === "number");
  const extra = [];
  if (matched.some((r) => r.id === "no_heat") && temps.some((t) => t <= 40)) {
    extra.push({ id: "no_heat_at_or_below_40F", severity: "P1", category: "hvac", trades: ["hvac"] });
  }
  if (matched.some((r) => r.id === "no_cooling")) {
    if (temps.some((t) => t >= 95)) extra.push({ id: "no_cooling_at_or_above_95F", severity: "P1", category: "hvac", trades: ["hvac"] });
    else if (signals.healthRisk) extra.push({ id: "no_cooling_vulnerable_resident", severity: "P1", category: "hvac", trades: ["hvac"] });
  }
  return extra;
}

const ROUTING_HINTS = new Set(["photos", "hazardWords", "reportsProblem"]);
const ROOM = /\b(bathroom|kitchen|bedroom|living room|hallway|hall|closet|laundry|dining room|garage|basement|attic|patio|balcony)\b/i;

/**
 * Assess a tenant message. Pure function — same input, same output, every time.
 * Returns severity (or null when no rule matched), category, trades to dispatch,
 * which safety template applies, every rule that fired, and the modifier signals.
 */
export function assessMessage(text, { hasPhotos = false, outsideTempF = null } = {}) {
  const value = String(text ?? "");
  const signals = Object.fromEntries(Object.entries(SIGNALS).map(([name, re]) => [name, re.test(value)]));
  signals.photos = hasPhotos;

  const matched = SEVERITY_RULES.filter((r) => r.pattern.test(r.ignore ? value.replace(r.ignore, " ") : value));
  matched.push(...weatherRules(matched, { text: value, outsideTempF, signals }));

  let top = null;
  for (const r of matched) if (!top || isHigher(r.severity, top.severity)) top = r;

  const trades = [...new Set(matched.filter((r) => r.severity === top?.severity).flatMap((r) => r.trades))];
  const sensitive = signals.legalThreat || signals.rentWithholding || (signals.healthRisk && ["mold", "hvac", "sewage", "water_leak"].includes(top?.category));

  return {
    severity: top?.severity ?? null,
    category: top?.category ?? null,
    safety: top?.safety ?? null,
    trades,
    // Findings only — routing hints (photos, hazard words, "something is broken") stay in signals.
    rulesFired: [...matched.map((r) => r.id), ...Object.entries(signals).filter(([k, v]) => v && !ROUTING_HINTS.has(k)).map(([k]) => k)],
    signals,
    sensitive,
    room: value.match(ROOM)?.[1]?.toLowerCase() ?? null,
    wordCount: value.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * A new message goes to the triage model when no rule matched, when it is long (it may
 * mix issues), or when a below-P1 rule fired but the text carries hazard words — a second
 * look that can only raise severity. Rule-decided P1s never wait on a model.
 */
export const needsTriageModel = (a) => !a.severity || a.wordCount > 80 || (a.severity !== "P1" && a.signals.hazardWords);

// ── Reply parsers: the common answers never need a model ──────────────────────

const VENDOR = {
  accept: /^\s*(1|yes|y|accept(ed)?|ok(ay)?|on (my|our) way|omw|we('| ca)n (take|do|go)|can do|heading (over|there|out)|sending (a tech|someone))\b/i,
  decline: /^\s*((sorry|unfortunately|apologies|hi|hey)[\s,.!-]*)?(2|no|n|decline(d)?|can'?t|cannot|unavailable|not available|busy|pass)\b|\b(can'?t|cannot|won'?t be able to|(not|unable|aren'?t|isn'?t) able to|unable to)\b.{0,25}\b(tonight|today|make it|get (there|out)|come|go|take (it|this|the job)|do (it|this))\b/i,
  butWill: /\bbut\b.{0,30}\b(we'?ll|i'?ll|we can|i can|will)\b/i,
  delayed: /\b(running (late|behind)|(\d+\s*(min|minutes|mins)\s+)(late|behind)|behind schedule|stuck in traffic|delayed)\b/i,
  onSite: /\b(on ?site|arrived|i'?m here|we'?re here|at the (unit|property|building|door))\b/i,
  mitigated: /\b(water\s+(is\s+|has\s+)?(now\s+)?(off|stopped|shut off)|shut\s+(it\s+|the water\s+|the valve\s+)?off|stopped the leak|leak\s+(is\s+|has\s+)?(now\s+)?stopped|capped|isolated)\b/i,
  completed: /\b(fixed|repaired|replaced|all done|completed|job (is )?done|work (is )?(done|complete))\b/i,
};

/** Vendor SMS / keypad: accepted · declined · delayed · on_site · mitigated · completed, with ETA and estimate if stated. */
export function parseVendorReply(text, digits = null) {
  const value = String(text ?? "");
  const etaMatch = value.match(/\b(?:eta\s*:?\s*|in\s+)?(\d{1,3})\s*(?:min(?:ute)?s?|m)\b/i) ?? value.match(/\bin\s+(\d{1,3})\b/i);
  const hoursMatch = value.match(/\b(\d{1,2})\s*(?:hrs?|hours?)\b/i);
  const estimateMatch = value.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/);
  const etaMinutes = etaMatch ? Number(etaMatch[1]) : hoursMatch ? Number(hoursMatch[1]) * 60 : null;
  const estimateUsd = estimateMatch ? Number(estimateMatch[1].replace(/,/g, "")) : null;

  let status = null;
  if (digits === "1") status = "accepted";
  else if (digits === "2") status = "declined";
  else if (VENDOR.mitigated.test(value) || VENDOR.completed.test(value)) status = VENDOR.mitigated.test(value) ? "mitigated" : "completed";
  else if (VENDOR.onSite.test(value)) status = "on_site";
  else if (VENDOR.delayed.test(value)) status = "delayed";
  else if (VENDOR.decline.test(value)) status = VENDOR.butWill.test(value) ? null : "declined"; // "can't before 1am, but we'll come" → a model reads it
  else if (VENDOR.accept.test(value) || etaMinutes !== null) status = "accepted";

  // A detailed report (follow-up work, costs, findings) is worth a structured read.
  const detailed = estimateUsd !== null || /\b(need(s|ed)?|recommend|also|follow[- ]?up|drywall|replace|source)\b/i.test(value) || value.split(/\s+/).length > 22;
  return { status, etaMinutes, estimateUsd, detailed };
}

/** Free-text vendor updates with details (findings, costs, follow-up work) get a structured read. */
export const needsVendorReport = (parsed, { keypad = false } = {}) => !keypad && (parsed.detailed || !parsed.status);

/** Tenant reply to "1 = stopped, 2 = still leaking". */
export function parseCheckinReply(text) {
  const value = String(text ?? "").trim();
  if (/^(1|stopped|it stopped|it'?s stopped|no more water|dry now|all good|fixed|resolved|yes,? (it )?stopped)\b/i.test(value)) return "stopped";
  if (/^(2|still|not yet|worse|getting worse|it'?s still|no,? (it'?s )?still)\b/i.test(value) || /\bstill (leaking|coming|dripping)\b/i.test(value)) return "still_leaking";
  return null;
}

const HEDGE = /\b(not sure|unsure|maybe|might|a little|a bit|slightly|damp|i think|kind of|sort of|possibly)\b/i;

/** Neighbor's reply to "please check your unit for leaks". null = ambiguous → model. */
export function parseNeighborReply(text) {
  const value = String(text ?? "");
  if (HEDGE.test(value)) return null;
  const noLeak = /\b(no (leak|water|sign)|nothing|not seeing|(don'?t|didn'?t) see|(all|bone|completely) dry|looks (fine|good|normal)|all good|everything('?s| is) (fine|dry|ok))\b/i.test(value);
  const leak = /\b(found (a |the )?(leak|water)|there'?s water|it'?s (wet|leaking)|(is|are) (wet|leaking|dripping)|puddle|flooded|soaked|water (on|under|around))\b/i.test(value);
  if (noLeak && !leak) return "no_leak";
  if (leak && !noLeak) return "leak_found";
  return null;
}

/** Messages that need no reply at all ("thanks!", "ok", 👍). Replying to these is how agents loop. */
export const isPleasantry = (text) =>
  /^\s*(thanks?( you)?( so much)?|thank you|ty|ok(ay)?|great|perfect|got it|appreciate (it|you)|sounds good|👍|🙏)[\s.!]*$/i.test(String(text ?? ""));
