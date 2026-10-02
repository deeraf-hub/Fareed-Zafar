import { usd } from "../../core/format.js";
import { isSteeringQuestion } from "../../core/compliance.js";

/**
 * Leasing — deterministic rules. Most prospect questions are lookups, not
 * generation: rent, deposit, pets, availability, touring and screening criteria all
 * come straight from the listing record. Only questions outside these topics go to
 * retrieval + a local model, and questions that invite steering get the standard
 * fair-housing answer — never an opinion.
 */

export const TOPICS = [
  ["steering", (t) => isSteeringQuestion(t)],
  ["pets", (t) => /\b(pets?|dogs?|cats?|pupp(y|ies)|kittens?|animals?)\b/i.test(t)],
  ["availability", (t) => /\b(available|availability|move[- ]?in|still (open|on the market|for rent)|when can i)\b/i.test(t)],
  ["rent", (t) => /\b(rent|price|cost|how much|monthly)\b/i.test(t)],
  ["deposit", (t) => /\bdeposit\b/i.test(t)],
  ["tour", (t) => /\b(tour|see (it|the (house|home|place))|showing|viewing|visit|look at it)\b/i.test(t)],
  ["apply", (t) => /\b(apply|application|credit|income|screening|requirements?|qualify)\b/i.test(t)],
];

export function topicsOf(text) {
  return TOPICS.filter(([, test]) => test(String(text ?? ""))).map(([name]) => name);
}

/** Answers composed from the listing record by code — free, instant, always consistent. */
export function answerFromListing(topic, listing) {
  const pets = listing.pets;
  switch (topic) {
    case "pets":
      return `${pets.cats ? "Cats are welcome, and so are dogs" : "Dogs are welcome"} under ${pets.dogsMaxLb} lb, with a ${usd(pets.petDeposit)} refundable pet deposit and ${usd(pets.petRent)}/month pet rent (up to ${pets.maxPets} pets). Assistance animals are never charged pet fees.`;
    case "availability":
      return `It's available ${formatDate(listing.availableOn)}.`;
    case "rent":
      return `Rent is ${usd(listing.rent)}/month.`;
    case "deposit":
      return `The security deposit is ${usd(listing.deposit)}.`;
    case "tour":
      return `You can self-tour any day ${hour(listing.tourHours.start)}–${hour(listing.tourHours.end)}: ${listing.selfTourUrl}`;
    case "apply":
      return `You can apply at ${listing.applyUrl} ($55 per adult). We look for income of ${listing.criteria.incomeMultiple}× the rent, a credit score of ${listing.criteria.minCredit}+, and no evictions in the past ${listing.criteria.noEvictionsYears} years — the same criteria for every applicant.`;
    case "steering":
      return "We don't characterize neighborhoods or who lives in them — fair housing rules apply to every home we list. For objective information, the city's police department publishes crime maps, and school assignments are on the district's website.";
    default:
      return null;
  }
}

/** Questions are split by code: one sentence ending in "?" = one question. */
export function splitQuestions(text) {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.endsWith("?"));
}

/** Pet policy check on what the prospect told us. Returns null when there's nothing to flag. */
export function petIssue(pets, listing) {
  if (!pets?.length) return null;
  const policy = listing.pets;
  const total = pets.reduce((n, p) => n + (p.count ?? 1), 0);
  if (total > policy.maxPets) return `With ${total} pets you'd be above this home's ${policy.maxPets}-pet limit, so it would need an exception.`;
  const dog = pets.find((p) => p.type === "dog");
  if (dog && dog.weight_lb && dog.weight_lb > policy.dogsMaxLb) return `Dogs need to be under ${policy.dogsMaxLb} lb for this home, so it would need an exception.`;
  if (dog && !dog.weight_lb) return "About how much does your dog weigh? Dogs need to be under 40 lb for this home.";
  return null;
}

/** "Hot" = wants to see it, moves in within 45 days of availability, and the pets fit. */
export function isHotLead({ wantsTour, moveIn, availableOn, petProblem }) {
  if (!wantsTour || petProblem) return false;
  if (!moveIn) return false;
  const gapDays = (Date.parse(moveIn) - Date.parse(availableOn)) / 86400000;
  return gapDays >= -14 && gapDays <= 45;
}

/** Common replies that need no model. */
export function parseLeadReply(text) {
  const t = String(text ?? "");
  if (/\b(not interested|no longer (looking|interested)|found (a|another) (place|home|apartment)|signed (a lease )?(somewhere|elsewhere)|rented elsewhere|went with another)\b/i.test(t)) return "not_interested";
  if (/\b(how (do|can) i apply|send (me )?the application|ready to apply|want to apply)\b/i.test(t)) return "apply";
  if (/\b(reschedule|different time|another time|can'?t make (it|the tour))\b/i.test(t)) return "reschedule";
  if (/^\s*(yes|sure|ok|yeah)[\s,.!]*(i'?d like to )?(see it|tour|schedule)?/i.test(t) && /\b(tour|see|schedul|visit)\b/i.test(t)) return "schedule_tour";
  return null;
}

const formatDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const hour = (h) => (h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`);
