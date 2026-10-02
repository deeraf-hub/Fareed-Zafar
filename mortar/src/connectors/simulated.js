import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { ConnectorError } from "../core/outbox.js";

const ENRICHMENT = JSON.parse(readFileSync(new URL("../../data/enrichment.json", import.meta.url), "utf8"));

/**
 * The simulated world: in-memory stand-ins for Twilio, email, Rentvine and
 * Follow Up Boss with the same operation names and result shapes as the live
 * adapters. The demo console reads this world to show every phone, inbox, work
 * order and CRM record the agent touches — and can inject outages to show retries.
 */
export function createSimulatedWorld({ clock, onChange = () => {} }) {
  const state = {
    messages: [], // sms + email, both directions
    calls: [],
    workOrders: [],
    fubPeople: [],
    fubNotes: [],
    fubTasks: [],
    fubAppointments: [],
    enrichmentLookups: [],
  };
  const failures = new Map(); // "twilio.sendSms" → remaining forced failures
  let woSeq = 5510;
  let fubSeq = 1040;

  const now = () => clock.now().toISOString();
  const sid = (prefix) => `${prefix}${randomBytes(8).toString("hex")}`;

  function maybeFail(operation) {
    const remaining = failures.get(operation) ?? 0;
    if (remaining > 0) {
      failures.set(operation, remaining - 1);
      throw new ConnectorError(`Simulated outage: ${operation} returned HTTP 503`, { retryable: true, status: 503 });
    }
  }

  const changed = (kind, item) => {
    onChange({ kind, item });
    return item;
  };

  const twilio = {
    async sendSms({ to, body, from }) {
      maybeFail("twilio.sendSms");
      if (!/^\+\d{8,15}$/.test(to ?? "")) throw new ConnectorError(`Invalid 'To' number ${to}`, { retryable: false, status: 400 });
      const message = changed("message", { sid: sid("SM"), direction: "outbound", channel: "sms", to, from, body, at: now() });
      state.messages.push(message);
      return { sid: message.sid };
    },
    async placeCall({ to, say, gather, caseId, from }) {
      maybeFail("twilio.placeCall");
      const call = changed("call", { sid: sid("CA"), to, from, say, gather, caseId, status: "ringing", at: now() });
      state.calls.push(call);
      return { sid: call.sid };
    },
  };

  const email = {
    async sendEmail({ to, subject, body, from }) {
      maybeFail("email.sendEmail");
      const message = changed("message", { sid: sid("EM"), direction: "outbound", channel: "email", to, from, subject, body, at: now() });
      state.messages.push(message);
      return { messageId: message.sid };
    },
  };

  const rentvine = {
    async createWorkOrder({ unitId, priority, category, description, vendorId = null, scheduledFor = null }) {
      maybeFail("rentvine.createWorkOrder");
      const wo = changed("workOrder", {
        workOrderId: `WO-${++woSeq}`,
        unitId,
        priority,
        category,
        description,
        vendorId,
        scheduledFor,
        status: "open",
        notes: [],
        createdAt: now(),
      });
      state.workOrders.push(wo);
      return { workOrderId: wo.workOrderId };
    },
    async updateWorkOrder({ workOrderId, status, vendorId, note }) {
      maybeFail("rentvine.updateWorkOrder");
      const wo = state.workOrders.find((w) => w.workOrderId === workOrderId);
      if (!wo) throw new ConnectorError(`Work order ${workOrderId} not found`, { retryable: false, status: 404 });
      if (status) wo.status = status;
      if (vendorId) wo.vendorId = vendorId;
      if (note) wo.notes.push({ at: now(), note });
      changed("workOrder", wo);
      return { workOrderId, status: wo.status };
    },
  };

  const fub = {
    /** POST /v1/events — FUB's recommended lead intake; dedupes on email/phone. */
    async upsertLead({ person, source, type, message, tags = [] }) {
      maybeFail("fub.upsertLead");
      const email = person.emails?.[0]?.value?.toLowerCase();
      const phone = person.phones?.[0]?.value;
      let record = state.fubPeople.find((p) => (email && p.email === email) || (phone && p.phone === phone));
      if (!record) {
        record = { id: ++fubSeq, name: `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(), email, phone, stage: "Lead", tags: [], source, events: [] };
        state.fubPeople.push(record);
      }
      record.tags = [...new Set([...record.tags, ...tags])];
      record.events.push({ type, message, at: now() });
      changed("fubPerson", record);
      return { personId: record.id };
    },
    /** POST /v1/people?deduplicate=true — for OUTBOUND prospects: no lead-flow automations fire. */
    async createPerson({ person, source, tags = [], stage = "Prospect" }) {
      maybeFail("fub.createPerson");
      const email = person.emails?.[0]?.value?.toLowerCase();
      let record = state.fubPeople.find((p) => email && p.email === email);
      if (!record) {
        record = { id: ++fubSeq, name: `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(), email, phone: person.phones?.[0]?.value, stage, tags: [], source, events: [] };
        state.fubPeople.push(record);
      }
      record.tags = [...new Set([...record.tags, ...tags])];
      changed("fubPerson", record);
      return { personId: record.id };
    },
    async updatePerson({ personId, stage, tags }) {
      maybeFail("fub.updatePerson");
      const record = state.fubPeople.find((p) => p.id === personId);
      if (!record) throw new ConnectorError(`FUB person ${personId} not found`, { retryable: false, status: 404 });
      if (stage) record.stage = stage;
      if (tags) record.tags = [...new Set([...record.tags, ...tags])];
      changed("fubPerson", record);
      return { personId, stage: record.stage };
    },
    async addNote({ personId, subject, body }) {
      maybeFail("fub.addNote");
      const note = changed("fubNote", { id: state.fubNotes.length + 1, personId, subject, body, at: now() });
      state.fubNotes.push(note);
      return { noteId: note.id };
    },
    async createTask({ personId, name, dueDate, assignedTo }) {
      maybeFail("fub.createTask");
      const task = changed("fubTask", { id: state.fubTasks.length + 1, personId, name, dueDate, assignedTo, at: now() });
      state.fubTasks.push(task);
      return { taskId: task.id };
    },
    async createAppointment({ personId, title, start, end, location }) {
      maybeFail("fub.createAppointment");
      const appt = changed("fubAppointment", { id: state.fubAppointments.length + 1, personId, title, start, end, location, at: now() });
      state.fubAppointments.push(appt);
      return { appointmentId: appt.id };
    },
  };

  /** Contact-enrichment provider (skip-trace / people-data API). Paid per lookup. */
  const enrichment = {
    async lookup({ recordId, name }) {
      maybeFail("enrichment.lookup");
      const contact = ENRICHMENT.contacts[recordId] ?? null;
      const lookup = changed("enrichment", { recordId, name, found: Boolean(contact?.email || contact?.phone), costUsd: ENRICHMENT.costPerLookupUsd, at: now() });
      state.enrichmentLookups.push(lookup);
      return contact ? { found: true, ...contact, costUsd: ENRICHMENT.costPerLookupUsd } : { found: false, costUsd: ENRICHMENT.costPerLookupUsd };
    },
  };

  return {
    connectors: { twilio, email, rentvine, fub, enrichment },
    state,
    /** Record a message a person sent us (the console's "reply as…" buttons). */
    recordInbound({ channel, from, to, body, subject }) {
      const message = changed("message", { sid: sid(channel === "email" ? "EM" : "SM"), direction: "inbound", channel, from, to, subject, body, at: now() });
      state.messages.push(message);
      return message;
    },
    /** A person changed a work order inside Rentvine (its webhook then tells Mortar). */
    changeWorkOrder(workOrderId, status) {
      const wo = state.workOrders.find((w) => w.workOrderId === workOrderId);
      if (wo) changed("workOrder", Object.assign(wo, { status }));
      return wo;
    },
    markCall(callSid, status) {
      const call = state.calls.find((c) => c.sid === callSid);
      if (call) changed("call", Object.assign(call, { status }));
      return call;
    },
    injectFailures(operation, count) {
      failures.set(operation, count);
    },
    reset() {
      for (const key of Object.keys(state)) state[key].length = 0;
      failures.clear();
    },
  };
}
