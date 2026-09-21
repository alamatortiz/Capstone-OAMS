import { Calendar, XCircle, CheckCircle2, AlertCircle, MapPin, Clock } from "lucide-react";
import "./AppointmentListItem.css";

const STATUS_META = {
  pending: { label: "Pending", cls: "apt-badge-pending" },
  approved: { label: "Approved", cls: "apt-badge-approved" },
  completed: { label: "Completed", cls: "apt-badge-completed" },
  rejected: { label: "Rejected", cls: "apt-badge-rejected" },
  cancelled: { label: "Cancelled", cls: "apt-badge-cancelled" },
};

// Shared card for both the appointment booking page's "Active Bookings" tab
// and the appointment status page's tab list -- same look, same data shape
// (GET /api/student/appointments), different optional behaviors per caller.
export default function AppointmentListItem({
  appointment,
  formatDate,
  onClick,
  showCancelButton = false,
  onCancel,
  isCancelling = false,
  showCompleteButton = false,
  onComplete,
  isCompleting = false,
  showReportButton = false,
  onReport,
  isReporting = false,
}) {
  const { label, cls } = STATUS_META[appointment.status] ?? {
    label: appointment.status,
    cls: "apt-badge-pending",
  };
  const canCancel = appointment.status === "pending" || appointment.status === "approved";
  const canComplete = appointment.status === "approved";
  const canReportNotServed = appointment.status === "approved" && !appointment.sharedComment;

  return (
    <div
      className={`apt-list-item ${onClick ? "apt-list-item--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="apt-list-header">
        <div className="apt-list-icon-wrap">
          <Calendar style={{ width: "1.5rem", height: "1.5rem" }} />
        </div>
        <div className="apt-list-title-section">
          <div className="apt-list-name-row">
            <h3 className="apt-list-name">{appointment.person}</h3>
            {appointment.appointmentType && (
              <span className="apt-list-appt-type-value">{appointment.appointmentType}</span>
            )}
          </div>
          <p className="apt-list-college">{appointment.college}</p>
        </div>
        <span className={`apt-badge ${cls}`}>{label}</span>
      </div>

      <div className="apt-list-datetime-row">
        <span className="apt-list-quick-meta-item">
          <MapPin style={{ width: "1rem", height: "1rem" }} /> {appointment.location}
        </span>
        <span className="apt-list-quick-meta-item">
          <Calendar style={{ width: "1rem", height: "1rem" }} /> {formatDate(appointment.date)}
        </span>
        <span className="apt-list-quick-meta-item">
          <Clock style={{ width: "1rem", height: "1rem" }} />
          {appointment.windowStart && appointment.windowEnd
            ? `${appointment.windowStart} – ${appointment.windowEnd}`
            : "—"}
        </span>
      </div>
      {appointment.purpose && (
        <div className="apt-list-card-grid">
          <div className="apt-list-card-field-full">
            <label>Purpose</label>
            <p>{appointment.purpose}</p>
          </div>
        </div>
      )}

      {appointment.sharedComment && (
        <div className="apt-list-comment-box">
          <p className="apt-list-comment-header">Actions Taken</p>
          <p className="apt-list-comment-text">{appointment.sharedComment}</p>
        </div>
      )}

      {((showCancelButton && canCancel) || (showCompleteButton && canComplete) || (showReportButton && canReportNotServed)) && (
        <div className="apt-list-btn-row">
          {showCompleteButton && canComplete && (
            <button
              type="button"
              className="apt-list-btn-sm apt-list-btn-sm-complete"
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.(appointment.id);
              }}
              disabled={isCompleting}
              title="Mark Appointment as Completed"
            >
              <CheckCircle2 />
              {isCompleting ? "Marking…" : "Complete"}
            </button>
          )}

          {showCancelButton && canCancel && (
            <button
              type="button"
              className="apt-list-btn-sm apt-list-btn-sm-cancel"
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.(appointment.id);
              }}
              disabled={isCancelling}
              title="Cancel Appointment"
            >
              <XCircle />
              {isCancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}

          {showReportButton && canReportNotServed && (
            <button
              type="button"
              className="apt-list-btn-sm apt-list-btn-sm-report"
              onClick={(e) => {
                e.stopPropagation();
                onReport?.(appointment.id);
              }}
              disabled={isReporting}
              title="Report as Not Served"
            >
              <AlertCircle />
              {isReporting ? "Reporting…" : "Not Served"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
