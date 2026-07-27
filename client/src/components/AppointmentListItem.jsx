import { Calendar, XCircle } from "lucide-react";
import "./AppointmentListItem.css";

const STATUS_META = {
  pending: { label: "Pending", cls: "apst-badge-pending" },
  approved: { label: "Approved", cls: "apst-badge-approved" },
  completed: { label: "Completed", cls: "apst-badge-completed" },
  rejected: { label: "Rejected", cls: "apst-badge-rejected" },
  cancelled: { label: "Cancelled", cls: "apst-badge-cancelled" },
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
}) {
  const { label, cls } = STATUS_META[appointment.status] ?? {
    label: appointment.status,
    cls: "apst-badge-pending",
  };
  const isDim =
    appointment.status === "completed" ||
    appointment.status === "rejected" ||
    appointment.status === "cancelled";
  const canCancel = appointment.status === "pending" || appointment.status === "approved";

  return (
    <div
      className={`apst-list-item ${onClick ? "apst-list-item--clickable" : ""} ${isDim ? "apst-list-item-completed" : ""}`}
      onClick={onClick}
    >
      <div className="apst-list-header">
        <div className={isDim ? "apst-list-icon-wrap-completed" : "apst-list-icon-wrap"}>
          <Calendar
            style={{ width: "1.5rem", height: "1.5rem", color: isDim ? "var(--text-tertiary)" : undefined }}
          />
        </div>
        <div className="apst-list-title-section">
          <h3 className="apst-list-name" style={isDim ? { color: "var(--text-tertiary)" } : undefined}>
            {appointment.person}
          </h3>
          <p className="apst-list-college">{appointment.college}</p>
        </div>
        <span className={`apst-badge ${cls}`}>{label}</span>
      </div>

      {appointment.appointmentType && (
        <div className="apst-list-appt-type">
          <span className="apst-list-appt-type-label">Type:</span>
          <span className="apst-list-appt-type-value">{appointment.appointmentType}</span>
        </div>
      )}

      <div className="apst-list-card-grid">
        <div className="apst-list-card-field">
          <label>Date</label>
          <p>{formatDate(appointment.date)}</p>
        </div>
        <div className="apst-list-card-field">
          <label>Time Slot</label>
          <p>
            {appointment.windowStart && appointment.windowEnd
              ? `${appointment.windowStart} – ${appointment.windowEnd}`
              : "—"}
          </p>
        </div>
        <div className="apst-list-card-field">
          <label>Location</label>
          <p>{appointment.location}</p>
        </div>
        {appointment.purpose && (
          <div className="apst-list-card-field-full">
            <label>Purpose</label>
            <p>{appointment.purpose}</p>
          </div>
        )}
      </div>

      {showCancelButton && canCancel && (
        <button
          type="button"
          className="apst-list-cancel-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCancel?.(appointment.id);
          }}
          disabled={isCancelling}
        >
          <XCircle style={{ width: "1.3rem", height: "1.3rem", color: "#ef4444", flexShrink: 0 }} />
          {isCancelling ? "Cancelling…" : "Cancel"}
        </button>
      )}
    </div>
  );
}
