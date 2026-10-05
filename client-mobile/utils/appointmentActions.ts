// Mirrors web's client/src/utils/appointmentActions.js -- the server guards
// in server/routes/studentRoutes.js are the source of truth.

type AppointmentLike = {
  status?: string | null;
  sharedComment?: string | null;
  cancelledBy?: string | null;
};

export const hasActionsTaken = (appt: AppointmentLike) => !!appt?.sharedComment?.trim();

// DELETE /student/appointments/:id allows pending, or approved with no
// actions taken recorded yet (once the professor has written what was done,
// the meeting happened and can't be cancelled).
export const canStudentCancel = (appt: AppointmentLike) =>
  appt?.status === 'pending' || (appt?.status === 'approved' && !hasActionsTaken(appt));

// True when the system (not the professor) rejected this request because it
// wasn't approved before its scheduled time ended -- the server marks those
// with cancelled_by = 'system_expired' (see server/utils/appointmentAutoResolution.js).
export const isAutoRejected = (appt: AppointmentLike) =>
  appt?.status === 'rejected' && appt?.cancelledBy === 'system_expired';
