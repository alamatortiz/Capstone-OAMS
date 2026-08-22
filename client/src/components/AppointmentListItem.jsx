import { Calendar, XCircle } from "lucide-react";
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
}) {
  const { label, cls } = STATUS_META[appointment.status] ?? {
    label: appointment.status,
    cls: "apt-badge-pending",
  };
  const canCancel = appointment.status === "pending" || appointment.status === "approved";

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
          <h3 className="apt-list-name">{appointment.person}</h3>
          <p className="apt-list-college">{appointment.college}</p>
        </div>
        <span className={`apt-badge ${cls}`}>{label}</span>
      </div>

      {appointment.appointmentType && (
        <div className="apt-list-appt-type">
          <span className="apt-list-appt-type-label">Type:</span>
          <span className="apt-list-appt-type-value">{appointment.appointmentType}</span>
        </div>
      )}

      <div className="apt-list-card-grid">
        <div className="apt-list-card-field">
          <label>Date</label>
          <p>{formatDate(appointment.date)}</p>
        </div>
        <div className="apt-list-card-field">
          <label>Time Slot</label>
          <p>
            {appointment.windowStart && appointment.windowEnd
              ? `${appointment.windowStart} – ${appointment.windowEnd}`
              : "—"}
          </p>
        </div>
        <div className="apt-list-card-field">
          <label>Location</label>
          <p>{appointment.location}</p>
        </div>
        {appointment.purpose && (
          <div className="apt-list-card-field-full">
            <label>Purpose</label>
            <p>{appointment.purpose}</p>
          </div>
        )}
      </div>

      {showCancelButton && canCancel && (
        <button
          type="button"
          className="apt-list-cancel-btn"
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
