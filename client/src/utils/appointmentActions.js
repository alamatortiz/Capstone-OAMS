import { getManilaDateString } from "./dateTime";

// Single source of truth for which student actions an appointment offers.
// Mirrors the server guards in server/routes/studentRoutes.js:
//   DELETE  /appointments/:id                 (cancel: pending|approved)
//   PATCH   /appointments/:id/complete        (approved only)
//   PATCH   /appointments/:id/report-not-served (approved, no shared comment,
//                                               appointment date not in the future)
export function getAppointmentActions(appt) {
  const status = appt?.status;
  const dateStr = appt?.date ? String(appt.date).split("T")[0] : null;
  const notInFuture = !dateStr || dateStr <= getManilaDateString();
  return {
    canCancel: status === "pending" || status === "approved",
    canComplete: status === "approved",
    canReportNotServed:
      status === "approved" && !appt.sharedComment && notInFuture,
  };
}
