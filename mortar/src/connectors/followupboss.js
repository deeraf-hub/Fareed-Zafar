import { basicAuth, request } from "./http.js";

/**
 * Follow Up Boss (live), REST v1.
 *
 *  - Leads go in through POST /v1/events (not /v1/people): it dedupes on email/phone
 *    and triggers the account's lead flow, action plans and automations.
 *    201 = new person, 200 = matched existing, 204 = source archived (nothing created).
 *  - Auth: Basic with the API key as username. X-System / X-System-Key identify Mortar
 *    as a registered system (higher rate limits; the key also signs FUB webhooks).
 *  - PUT /v1/people/{id} replaces tags unless ?mergeTags=true — we always merge.
 */
export function followUpBossConnector({ apiKey, systemName, systemKey }) {
  const base = "https://api.followupboss.com/v1";
  const headers = {
    authorization: basicAuth(apiKey),
    "content-type": "application/json",
    "x-system": systemName,
    ...(systemKey ? { "x-system-key": systemKey } : {}),
  };
  const call = (path, method, body) =>
    request(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, label: `FUB ${method} ${path.split("?")[0]}` });

  async function findPersonId({ email, phone }) {
    const query = email ? `email=${encodeURIComponent(email)}` : `phone=${encodeURIComponent(phone)}`;
    const { data } = await call(`/people?${query}&limit=1&fields=id`, "GET");
    return data?.people?.[0]?.id ?? null;
  }

  return {
    async upsertLead({ person, source, type, message, tags = [], property }) {
      const { status, data } = await call("/events", "POST", {
        source,
        system: systemName,
        type,
        message,
        person: { ...person, tags },
        ...(property ? { property } : {}),
      });
      if (status === 204) return { personId: null, skipped: "lead flow for this source is archived in FUB" };
      const personId =
        data?.personId ?? data?.person?.id ?? (await findPersonId({ email: person.emails?.[0]?.value, phone: person.phones?.[0]?.value }));
      return { personId, created: status === 201 };
    },

    /** Outbound prospects: POST /v1/people?deduplicate=true runs no lead-flow automations. */
    async createPerson({ person, source, tags = [], stage = "Prospect" }) {
      const { data } = await call("/people?deduplicate=true", "POST", { ...person, source, tags, stage });
      return { personId: data?.id };
    },

    async updatePerson({ personId, stage, tags }) {
      await call(`/people/${personId}?mergeTags=true`, "PUT", { ...(stage ? { stage } : {}), ...(tags ? { tags } : {}) });
      return { personId, stage };
    },

    async addNote({ personId, subject, body }) {
      const { data } = await call("/notes", "POST", { personId, subject, body, isHtml: false });
      return { noteId: data?.id };
    },

    async createTask({ personId, name, dueDate, assignedTo, type = "Follow Up" }) {
      const { data } = await call("/tasks", "POST", { personId, name, type, assignedTo, dueDateTime: dueDate });
      return { taskId: data?.id };
    },

    async createAppointment({ personId, title, start, end, location, personName, personEmail }) {
      const { data } = await call("/appointments", "POST", {
        title,
        start,
        end,
        location,
        invitees: [{ personId, name: personName, email: personEmail }],
      });
      return { appointmentId: data?.id };
    },
  };
}
