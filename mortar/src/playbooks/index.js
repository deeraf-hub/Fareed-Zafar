import { maintenance } from "./maintenance/index.js";
import { leasing } from "./leasing/index.js";
import { leadgen } from "./leadgen/index.js";
import { approvalAnswer } from "./shared/consent.js";
import { sharedTasks } from "./shared/tasks.js";

/**
 * Playbook registry + event routing (pipeline stage 2: "which case is this?").
 *
 * Routing is deterministic and ordered:
 *   1. the event names its case (timers, action results, approvals, IVR callbacks)
 *   2. an approver answering YES/NO to a pending approval by SMS
 *   3. each playbook in turn may claim the event (existing case or a new one)
 */
export function createPlaybooks({ store, directory, clock, list = [maintenance, leasing, leadgen] }) {
  const byName = Object.fromEntries(list.map((p) => [p.name, p]));

  function senderOf(event) {
    const s = event.subject ?? {};
    if (s.partyId) return directory.party(s.partyId);
    if (s.phone) return directory.byPhone(s.phone);
    if (s.email) return directory.byEmail(s.email);
    return null;
  }

  function route(event) {
    const sender = senderOf(event);

    if (event.subject?.caseId) {
      const caseRecord = store.getCase(event.subject.caseId);
      if (caseRecord && byName[caseRecord.playbook]) return { playbook: byName[caseRecord.playbook], caseRecord, sender };
    }

    if (event.type === "approval.decided") {
      const approval = store.getApproval(event.payload.approvalId);
      const caseRecord = approval && store.getCase(approval.caseId);
      if (caseRecord) return { playbook: byName[caseRecord.playbook], caseRecord, sender };
    }

    if (event.type === "message.received" && sender) {
      const pending = store.pendingApprovalFor(sender.id);
      const decision = pending && approvalAnswer(event.payload.text);
      if (decision) {
        const caseRecord = store.getCase(pending.caseId);
        return {
          playbook: byName[caseRecord.playbook],
          caseRecord,
          sender,
          approvalReply: { approval: pending, decision, by: sender.name, note: event.payload.text, edits: {} },
        };
      }
    }

    for (const playbook of list) {
      const claim = playbook.claim(event, { sender, directory, store, now: clock.now() });
      if (claim) return { playbook, caseRecord: claim.caseRecord ?? null, sender };
    }
    return null;
  }

  return {
    list,
    byName,
    route,
    tasks: () => [...sharedTasks, ...list.flatMap((p) => p.tasks ?? [])],
  };
}
