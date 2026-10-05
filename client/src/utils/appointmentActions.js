import { getManilaDateString } from "./dateTime";

const hasActionsTaken = (appt) => !!appt?.sharedComment?.trim();

// Single source of truth for which student actions an appointment offers.
// Mirrors the server guards in server/routes/studentRoutes.js:
//   DELETE  /appointments/:id                 (cancel: pending, or approved
//                                               with no actions taken yet)
//   PATCH   /appointments/:id/complete        (approved only)
//   PATCH   /appointments/:id/report-not-served (approved, no shared comment,
//                                               appointment date not in the future)
export function getAppointmentActions(appt) {
  const status = appt?.status;
  const dateStr = appt?.date ? String(appt.date).split("T")[0] : null;
  const notInFuture = !dateStr || dateStr <= getManilaDateString();
  return {
    canCancel: status === "pending" || (status === "approved" && !hasActionsTaken(appt)),
    canComplete: status === "approved",
    canReportNotServed:
      status === "approved" && !hasActionsTaken(appt) && notInFuture,
  };
}

// True when the system (not the professor) rejected this request because it
// wasn't approved before its scheduled time ended -- the server marks those
// with cancelled_by = 'system_expired' (see server/utils/appointmentAutoResolution.js).
export function isAutoRejected(appt) {
  return appt?.status === "rejected" && appt?.cancelledBy === "system_expired";
}
