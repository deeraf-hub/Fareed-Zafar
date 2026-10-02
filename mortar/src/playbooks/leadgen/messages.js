import { formatPhone } from "../../core/format.js";

/**
 * Lead generation — email templates. Subject lines are the variants the bandit tests;
 * bodies are fixed, short and compliant (CAN-SPAM: real address + a working opt-out).
 */

export const VARIANTS = {
  V1: { label: "Quick question", subject: ({ street }) => `Quick question about ${street}`, appliesTo: () => true },
  V2: { label: "Faster leasing", subject: ({ first, street }) => `${first}, a faster way to fill ${street}`, appliesTo: (f) => f.listedForRent === 1 },
  V3: { label: "Long-distance owner", subject: ({ street, mailingCity }) => `Managing ${street} from ${mailingCity}?`, appliesTo: (f) => f.absentee === 1 },
};

const FOOTER = `—
Northwind Residential · 500 Congress Ave, Suite 300, Austin, TX 78701 (demo address)
Prefer no more emails? Reply "unsubscribe" and we'll stop right away.`;

export const templates = {
  step1: ({ first, opening, street, signer }) =>
    `Hi ${first},

${opening}

I'm with Northwind Residential — we manage single-family homes and small multifamily across the Austin metro. Our homes lease in about 21 days on average, and we charge nothing while a home is vacant.

Would a 15-minute call be useful? Either way, I'm happy to send a free rent estimate for ${street}.

${signer}
Owner Relations, Northwind Residential

${FOOTER}`,

  step2: ({ first, street, signer }) =>
    `Hi ${first},

Following up in case my last note got buried — happy to send a free rent estimate for ${street}, no strings attached. Just reply "estimate".

${signer}

${FOOTER}`,

  step3: ({ first, street, signer }) =>
    `Hi ${first},

I'll close the loop here so I don't crowd your inbox. If ${street} ever needs a hand — leasing, maintenance, or a second opinion on rent — just reply to this email.

${signer}

${FOOTER}`,

  offerSlots: ({ first, slots, answer }) =>
    `Hi ${first},

${answer ? `${answer}\n\n` : ""}Here are a few times for a 15-minute call (Central time):
${slots.map((s, i) => `  ${i + 1}) ${s}`).join("\n")}

Just reply 1, 2 or 3 — or suggest another time.

${FOOTER}`,

  booked: ({ first, when, signer, phone }) =>
    `Hi ${first},

You're booked for ${when} (Central). ${signer} will call ${phone ? formatPhone(phone) : "you"} — talk soon!

${FOOTER}`,

  reminder: ({ first, when, signer }) => `Hi ${first}, a quick reminder of your call with ${signer} tomorrow, ${when} (Central). Reply here if you need to move it.\n\n${FOOTER}`,

  checkBack: ({ first, street, signer }) =>
    `Hi ${first},

Checking back as promised — is now a better time to talk about ${street}? Happy to send a rent estimate either way.

${signer}

${FOOTER}`,

  notNowAck: ({ first, when }) => `Totally understand, ${first} — I'll check back around ${when}. Thanks for the reply!\n\n${FOOTER}`,
  closingAck: ({ first }) => `Thanks for letting me know, ${first} — I won't follow up. Wishing you the best with your rentals.\n\n${FOOTER}`,
  referralThanks: ({ first }) => `Thanks so much, ${first} — I really appreciate the introduction. I'll reach out to them directly.\n\n${FOOTER}`,
};

/** Deterministic opener from the strongest signal — the fallback when no model runs. */
export function fallbackOpener({ property, features, mailingCity }) {
  if (features.domOver30) return `I noticed ${property.address} has been listed for rent for about ${Math.max(1, Math.round(property.daysOnMarket / 7))} weeks.`;
  if (features.absentee) return `Managing a rental in ${property.city} from ${mailingCity} means a lot of long-distance coordination.`;
  if (features.listedForRent) return `I saw ${property.address} is up for rent in ${property.city}.`;
  return `I work with a number of owners near ${property.address} and wanted to introduce myself.`;
}
