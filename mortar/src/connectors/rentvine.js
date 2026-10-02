import { basicAuth, request } from "./http.js";

// Rentvine work-order source types: 1 Portal, 2 In person, 3 Email, 4 Text, 5 Phone.
const SOURCE_TYPES = { email: 3, sms: 4, voice: 5 };

/**
 * Rentvine (live) — work orders.
 *
 *  - Base URL https://{account}.rentvine.com/api/manager, Basic auth (access key : secret).
 *  - Create: POST /maintenance/work-orders. Update: POST (not PUT) to
 *    /maintenance/work-orders/{workOrderID} with bare fields — a wrapped
 *    {workOrder:{…}} body is accepted but silently ignored.
 *  - Priority and status ids differ per account (read them once from
 *    GET /maintenance/work-order/statuses) and are passed in via config.
 *  - Rentvine exposes no work-order notes endpoint that we could confirm, so Mortar
 *    keeps the full timeline itself and writes the outcome to closingDescription.
 */
export function rentvineConnector({ baseUrl, apiKey, apiSecret, priorityIds, statusIds }) {
  const headers = { authorization: basicAuth(apiKey, apiSecret), "content-type": "application/json" };
  const call = (path, body) =>
    request(`${baseUrl.replace(/\/$/, "")}${path}`, { method: "POST", headers, body: JSON.stringify(body), label: `Rentvine POST ${path}` });

  return {
    async createWorkOrder({ description, priority, channel, rentvine = {}, vendorRentvineId, estimatedAmount, scheduledFor }) {
      const { data } = await call("/maintenance/work-orders", {
        description,
        propertyID: rentvine.propertyID,
        unitID: rentvine.unitID,
        leaseID: rentvine.leaseID,
        priorityID: priorityIds[priority],
        sourceTypeID: SOURCE_TYPES[channel] ?? 5,
        ...(vendorRentvineId ? { vendorContactID: vendorRentvineId } : {}),
        ...(estimatedAmount ? { estimatedAmount } : {}),
        ...(scheduledFor ? { scheduledStartDate: scheduledFor.slice(0, 10) } : {}),
        isSharedWithTenant: "1",
      });
      const workOrder = data?.workOrder ?? data;
      return { workOrderId: String(workOrder?.workOrderID ?? workOrder?.id) };
    },

    async updateWorkOrder({ workOrderId, status, vendorRentvineId, note, estimatedAmount }) {
      await call(`/maintenance/work-orders/${encodeURIComponent(workOrderId)}`, {
        ...(status && statusIds[status] ? { primaryWorkOrderStatusID: statusIds[status] } : {}),
        ...(vendorRentvineId ? { vendorContactID: vendorRentvineId } : {}),
        ...(estimatedAmount ? { estimatedAmount } : {}),
        ...(note && status === "completed" ? { closingDescription: note } : {}),
      });
      return { workOrderId, status };
    },
  };
}
