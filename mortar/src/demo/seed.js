import { readFileSync } from "node:fs";
import { seedLeadgen } from "../playbooks/leadgen/learning-cycle.js";

/**
 * Demo directory for "Northwind Residential", a fictional Austin property manager.
 * In production this read-model is mirrored from Rentvine (properties, units,
 * tenants, owners, vendors) and Follow Up Boss (leads) by webhooks + a periodic
 * sync (see n8n/03-directory-sync.json). Phone numbers use the 555-01xx range
 * reserved for fiction; emails use example domains.
 */

const TZ = "America/Chicago";

export const LINES = {
  "+15125550199": { playbook: "maintenance", channel: "sms", label: "Maintenance line (24/7)" },
  "maintenance@northwind.example": { playbook: "maintenance", channel: "email", label: "Maintenance inbox" },
  "+15125550177": { playbook: "leasing", channel: "sms", label: "Leasing line" },
  "leasing@northwind.example": { playbook: "leasing", channel: "email", label: "Leasing inbox" },
  "+15125550155": { playbook: "leadgen", channel: "sms", label: "Owner services line" },
  "owners@northwind.example": { playbook: "leadgen", channel: "email", label: "Owner services inbox" },
};

const consent = { sms: "granted", email: "granted" };

export const PROPERTIES = [
  {
    id: "P-1001",
    name: "Maple Court",
    address: "4100 Maple Ave, Austin, TX 78751",
    kind: "multifamily",
    timezone: TZ,
    ownerId: "O-01",
    attributes: { approvalLimitUsd: 750, ownerNotify: { P1: "immediate", P2: "daily_digest", P3: "weekly" }, unitCount: 12, yearBuilt: 1986 },
    external: { rentvine: "301" },
  },
  {
    id: "P-2001",
    name: "12 Cedar Lane",
    address: "12 Cedar Lane, Round Rock, TX 78664",
    kind: "single_family",
    timezone: TZ,
    ownerId: "O-02",
    attributes: {
      approvalLimitUsd: 500,
      ownerNotify: { P1: "immediate", P2: "daily_digest", P3: "weekly" },
      listing: {
        status: "available",
        rent: 2150,
        deposit: 2150,
        beds: 3,
        baths: 2,
        sqft: 1480,
        availableOn: "2026-11-01",
        daysOnMarket: 26,
        pets: { cats: true, dogsMaxLb: 40, petDeposit: 300, petRent: 35, maxPets: 2 },
        criteria: { incomeMultiple: 3, minCredit: 620, noEvictionsYears: 5 },
        selfTourUrl: "https://showmojo.example/l/12-cedar-lane",
        applyUrl: "https://northwind.example/apply/cedar-lane",
        tourHours: { start: 8, end: 20 },
      },
    },
    external: { rentvine: "302", showmojo: "SM-12CL" },
  },
];

const stacked = [
  ["U-1A", "1A", 1, "U-2A"],
  ["U-2A", "2A", 2, "U-3A"],
  ["U-3A", "3A", 3, null],
  ["U-1B", "1B", 1, "U-2B"],
  ["U-2B", "2B", 2, "U-3B"],
  ["U-3B", "3B", 3, null],
];

export const UNITS = [
  ...stacked.map(([id, label, floor, aboveUnitId], i) => ({ id, propertyId: "P-1001", label, floor, aboveUnitId, attributes: {}, external: { rentvine: String(7101 + i) } })),
  { id: "U-CL", propertyId: "P-2001", label: "House", floor: 1, aboveUnitId: null, attributes: { shutoff: "at the front-yard meter box" }, external: { rentvine: "7201" } },
];

const tenant = (id, name, unitId, phone, email, extra = {}) => ({
  id,
  role: "tenant",
  name,
  phone,
  email,
  propertyId: "P-1001",
  unitId,
  external: { rentvine: `C-${id}`, rentvineLease: `L-${id}` },
  attributes: { consent, preferredChannel: "sms", ...extra },
});

const staff = (id, name, title, phone, email) => ({ id, role: "staff", name, phone, email, external: {}, attributes: { title } });

const vendor = (id, name, trades, { afterHours, priority, calloutUsd, phone }) => ({
  id,
  role: "vendor",
  name,
  phone,
  email: `dispatch@${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
  external: { rentvine: `V-${id}` },
  attributes: { trades, afterHours, priority, calloutUsd },
});

export const PARTIES = [
  tenant("T-1A", "Denise Carter", "U-1A", "+15125550131", "denise.carter@example.com", {
    maintenanceHistory: [
      { caseId: "MC-0412", date: "2026-08-14", category: "mold", summary: "Mold on bathroom ceiling", resolution: "Surface treated; exhaust fan cleaned" },
      { caseId: "MC-0467", date: "2026-09-09", category: "mold", summary: "Mold around the tub", resolution: "Tub re-caulked" },
    ],
  }),
  tenant("T-2A", "Omar Haddad", "U-2A", "+15125550133", "omar.haddad@example.com"),
  tenant("T-3A", "Grace Liu", "U-3A", "+15125550134", "grace.liu@example.com"),
  tenant("T-1B", "Leo Martins", "U-1B", "+15125550132", "leo.martins@example.com"),
  tenant("T-2B", "Maya Thompson", "U-2B", "+15125550142", "maya.t@example.com"),
  tenant("T-3B", "Jordan Reyes", "U-3B", "+15125550143", "jordan.reyes@example.com"),

  { id: "O-01", role: "owner", name: "Dana Whitfield", phone: "+15125550121", email: "dana@lindenholdings.example", external: { rentvine: "C-O-01" }, attributes: { company: "Linden Holdings LLC", consent } },
  { id: "O-02", role: "owner", name: "Marcus Bell", phone: "+15125550122", email: "marcus.bell@example.com", external: { rentvine: "C-O-02" }, attributes: { consent } },

  staff("S-01", "Sam Patel", "Property Manager", "+15125550101", "sam@northwind.example"),
  staff("S-02", "Alex Kim", "Maintenance Coordinator", "+15125550102", "alex@northwind.example"),
  staff("S-03", "Rosa Diaz", "Director of Operations", "+15125550103", "rosa@northwind.example"),
  staff("S-04", "Taylor Brooks", "Leasing Manager", "+15125550104", "taylor@northwind.example"),
  staff("S-05", "Jamie Lee", "Owner Relations", "+15125550105", "jamie@northwind.example"),

  vendor("V-01", "Apex Plumbing", ["plumbing"], { afterHours: true, priority: 1, calloutUsd: 350, phone: "+15125550111" }),
  vendor("V-02", "Hill Country Plumbing", ["plumbing"], { afterHours: true, priority: 2, calloutUsd: 295, phone: "+15125550112" }),
  vendor("V-03", "RapidDry Restoration", ["water_mitigation"], { afterHours: true, priority: 1, calloutUsd: 425, phone: "+15125550113" }),
  vendor("V-04", "Lone Star Electric", ["electrical"], { afterHours: true, priority: 1, calloutUsd: 300, phone: "+15125550114" }),
  vendor("V-05", "Brightline HVAC", ["hvac"], { afterHours: true, priority: 1, calloutUsd: 275, phone: "+15125550115" }),
  vendor("V-06", "Capitol Drywall & Paint", ["drywall", "paint"], { afterHours: false, priority: 1, calloutUsd: 0, phone: "+15125550116" }),
  vendor("V-07", "SureLock Locksmith", ["locksmith"], { afterHours: true, priority: 1, calloutUsd: 150, phone: "+15125550117" }),
  vendor("V-08", "Clearview Mold Specialists", ["mold"], { afterHours: false, priority: 1, calloutUsd: 250, phone: "+15125550118" }),
  vendor("V-09", "Handy Hands Repairs", ["handyman", "appliance", "pest"], { afterHours: false, priority: 1, calloutUsd: 125, phone: "+15125550119" }),
];

export const ON_CALL = {
  afterHours: ["S-01", "S-02", "S-03"],
  businessHours: ["S-02", "S-01", "S-03"],
};

export function seed(store, now = new Date()) {
  const at = now.toISOString();
  store.tx(() => {
    for (const p of PROPERTIES) store.upsertProperty(p);
    for (const u of UNITS) store.upsertUnit(u);
    for (const p of PARTIES) store.upsertParty({ ...p, updatedAt: at });
    store.setKV("lines", LINES);
    store.setKV("oncall", ON_CALL);
    store.setKV("weather", { tempF: 68, observedAt: at, source: "demo" }); // live: n8n → NWS hourly
    seedLeadgen(store);
  });
}

/** Owner prospects for the lead-generation demo (fictional; see data/prospects.json). */
export const PROSPECTS = JSON.parse(readFileSync(new URL("../../data/prospects.json", import.meta.url), "utf8"));
