// Rules + context-aware wording for appointments the system resolves on its
// own once their scheduled time has passed (see
// jobs/appointmentReminderSweeper.js's resolvePastDueAppointments):
//
//   pending                      -> rejected, at the window's end
//   approved + actions taken     -> completed, APPROVED_RESOLUTION_GRACE_MINUTES after the end
//   approved + no actions taken  -> cancelled, APPROVED_RESOLUTION_GRACE_MINUTES after the end
//
// Pure functions only (no DB access), so they're unit-tested directly.
const { formatTime12h, formatManilaDateLabel } = require("./dateTime");

// How long after an approved appointment's window ends the professor still
// has to record actions taken before the system decides its outcome.
const APPROVED_RESOLUTION_GRACE_MINUTES = 60;

// appointments.cancelled_by marker written alongside status='rejected' when
// the system (not the professor) rejected an unanswered request. A manual
// rejection leaves cancelled_by NULL. See the column comment in oams_db.sql.
const AUTO_REJECTED_UNANSWERED = "system_expired";

// The exact rejection_reason the sweeper wrote before these messages became
// context-aware -- used once at boot to label those older rows (which have
// cancelled_by NULL) as automatic rejections too.
const LEGACY_UNANSWERED_REASON =
  "This request was not answered before its scheduled time passed, so it was automatically declined.";

function formatGraceLabel(minutes) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// "HH:MM[:SS]" + minutes -> "HH:MM:SS", wrapping past midnight.
function addMinutesToTime(timeStr, minutes) {
  const [h, m] = String(timeStr).split(":").map((part) => parseInt(part, 10) || 0);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

// "Mon, Oct 5, 2026, 2:17 PM – 8:00 PM", or "Mon, Oct 5, 2026 at 2:17 PM"
// when the consultation window can't be resolved (legacy rows).
function buildScheduleLabel({ appointmentDate, windowStart, windowEnd, appointmentTime }) {
  const dateLabel = formatManilaDateLabel(appointmentDate);
  if (windowStart && windowEnd) {
    return `${dateLabel}, ${formatTime12h(windowStart)} – ${formatTime12h(windowEnd)}`;
  }
  const time = windowStart || appointmentTime;
  return time ? `${dateLabel} at ${formatTime12h(time)}` : dateLabel;
}

// "(Thesis Consultation · Mon, Oct 5, 2026, 2:17 PM – 8:00 PM)"
function buildDetailsLabel(ctx) {
  const schedule = buildScheduleLabel(ctx);
  return ctx.serviceName ? `(${ctx.serviceName} · ${schedule})` : `(${schedule})`;
}

function refPart(ctx) {
  return ctx.trackingNumber ? `${ctx.trackingNumber} ` : "";
}

// Stored in appointments.rejection_reason -- shown to the student, the
// professor and admins, so it's neutral and reads naturally after a
// "Reason:" label.
function buildUnansweredRejectReason(ctx) {
  return `This request was not approved before its scheduled time (${buildScheduleLabel(ctx)}) ended, so the system rejected it automatically.`;
}

// Stored in appointments.cancel_reason (shown after a "Details:" label).
function buildNoActionsCancelReason(ctx, graceMinutes = APPROVED_RESOLUTION_GRACE_MINUTES) {
  return (
    `This appointment was approved, but no actions taken were recorded within ` +
    `${formatGraceLabel(graceMinutes)} after its scheduled time (${buildScheduleLabel(ctx)}) ended, ` +
    `so the system cancelled it automatically.`
  );
}

// Per-audience notification text. `outcome` is "unanswered",
// "no_actions_taken" or "completed".
function buildAutoResolutionNotifications(outcome, ctx, graceMinutes = APPROVED_RESOLUTION_GRACE_MINUTES) {
  const ref = refPart(ctx);
  const details = buildDetailsLabel(ctx);
  const grace = formatGraceLabel(graceMinutes);

  if (outcome === "unanswered") {
    return {
      student:
        `Your appointment request ${ref}with ${ctx.facultyName} ${details} was automatically rejected ` +
        `because it was not approved before its scheduled time ended. You can book another slot anytime.`,
      faculty:
        `The appointment request ${ref}from ${ctx.studentName} ${details} was automatically rejected ` +
        `because it was not approved before its scheduled time ended.`,
    };
  }

  if (outcome === "no_actions_taken") {
    const anchor = ctx.windowEnd || ctx.windowStart || ctx.appointmentTime;
    const deadline = anchor ? formatTime12h(addMinutesToTime(anchor, graceMinutes)) : null;
    const facultyDeadline = deadline
      ? `by ${deadline} (${grace} after its scheduled time ended)`
      : `within ${grace} after its scheduled time ended`;
    return {
      student:
        `Your appointment ${ref}with ${ctx.facultyName} ${details} was automatically cancelled ` +
        `because no actions taken were recorded within ${grace} after its scheduled time ended.`,
      faculty:
        `Your approved appointment ${ref}with ${ctx.studentName} ${details} was automatically cancelled ` +
        `because no actions taken were recorded ${facultyDeadline}.`,
    };
  }

  if (outcome === "completed") {
    return {
      student:
        `Your appointment ${ref}with ${ctx.facultyName} ${details} was automatically marked as completed ` +
        `using the actions taken the professor recorded. You can now leave feedback for it in Appointments.`,
      faculty:
        `Your appointment ${ref}with ${ctx.studentName} ${details} was automatically marked as completed ` +
        `using the actions taken you recorded.`,
    };
  }

  throw new Error(`Unknown auto-resolution outcome: ${outcome}`);
}

module.exports = {
  APPROVED_RESOLUTION_GRACE_MINUTES,
  AUTO_REJECTED_UNANSWERED,
  LEGACY_UNANSWERED_REASON,
  formatGraceLabel,
  addMinutesToTime,
  buildScheduleLabel,
  buildUnansweredRejectReason,
  buildNoActionsCancelReason,
  buildAutoResolutionNotifications,
};
