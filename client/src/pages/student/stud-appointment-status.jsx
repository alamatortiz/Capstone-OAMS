import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Calendar,
  XCircle,
  Loader2,
  AlertCircle,
  LayoutList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import api from "../../utils/api";
import { getCollegeLogo } from "../../data/collegeLogo";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import "./stud-appointment-status.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusMeta = (status) => {
  switch (status) {
    case "pending":   return { label: "Pending",   cls: "apst-badge-pending" };
    case "approved":  return { label: "Approved",  cls: "apst-badge-approved" };
    case "completed": return { label: "Completed", cls: "apst-badge-completed" };
    case "rejected":  return { label: "Rejected",  cls: "apst-badge-rejected" };
    case "cancelled": return { label: "Cancelled", cls: "apst-badge-cancelled" };
    default:          return { label: status,      cls: "apst-badge-pending" };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
};
const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function AppointmentDetail({ appt, onBack, onCancel, cancelling, backLabel = "My Appointments" }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { label: statusLabel, cls: statusCls } = getStatusMeta(appt.status);
  const canCancel = appt.status === "pending" || appt.status === "approved";

  return (
    <div className="apst-status-container">
      <PageHeader
        breadcrumb={
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        }
        icon={<Calendar style={{ width: "1.75rem", height: "1.75rem" }} />}
        iconClassName="apst-title-icon"
        title="Appointment Details"
        subtitle="View the status of your appointment"
      />

      {/* Hero */}
      <div className="apst-hero-card">
        <div className="apst-hero-content">
          <div className="apst-hero-logo">
            <img src={getCollegeLogo(appt.college)} alt={appt.college} />
          </div>
          <div className="apst-hero-text">
            <div className="apst-hero-header">
              <div className="apst-hero-title">
                <p className="apst-hero-service-name">{appt.person}</p>
                <p>{appt.college}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="apst-detail-grid">
        <div className="apst-detail-main">
          <div className="apst-card">
            <div className="apst-card-header">
              <h3 className="apst-card-title">
                <Calendar style={{ width: "1.25rem", height: "1.25rem" }} />
                Appointment Information
              </h3>
            </div>
            <div className="apst-card-content">
              <div className="apst-detail-row">
                <p className="apst-detail-label">Professor</p>
                <p className="apst-detail-value">{appt.person}</p>
              </div>
              <div className="apst-detail-row">
                <p className="apst-detail-label">College / Department</p>
                <p className="apst-detail-value">{appt.college}</p>
              </div>
              <div className="apst-detail-row">
                <p className="apst-detail-label">Date</p>
                <p className="apst-detail-value">{formatDate(appt.date)}</p>
              </div>
              <div className="apst-detail-row">
                <p className="apst-detail-label">Time Slot</p>
                <p className="apst-detail-value">{appt.windowStart && appt.windowEnd ? `${appt.windowStart} – ${appt.windowEnd}` : "—"}</p>
              </div>
              <div className="apst-detail-row">
                <p className="apst-detail-label">Location</p>
                <p className="apst-detail-value">{appt.location}</p>
              </div>
              {appt.purpose && (
                <div className="apst-detail-row">
                  <p className="apst-detail-label">Purpose</p>
                  <p className="apst-detail-value">{appt.purpose}</p>
                </div>
              )}
              {appt.createdAt && (
                <div className="apst-detail-row" style={{ borderBottom: "none" }}>
                  <p className="apst-detail-label">Booked On</p>
                  <p className="apst-detail-value">{formatDateShort(appt.createdAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="apst-detail-sidebar">
          <div className="apst-card">
            <div className="apst-card-header">
              <h3 className="apst-card-title">
                <AlertCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                Status
              </h3>
              <span className={`apst-badge ${statusCls}`}>{statusLabel}</span>
            </div>
          </div>

          {canCancel && (
            <div className="apst-card apst-cancel-card">
              <div className="apst-card-header">
                <h3 className="apst-card-title apst-cancel-title">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem", color: "#ef4444" }} />
                  Cancel Appointment
                </h3>
              </div>
              <div className="apst-card-content">
                <p className="apst-cancel-desc">
                  Cancelling will permanently remove this appointment. You will need to book a new one if you change your mind.
                </p>
                <button
                  className="apst-cancel-btn"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelling === appt.id}
                >
                  <XCircle style={{ width: "1rem", height: "1rem" }} />
                  {cancelling === appt.id ? "Cancelling…" : "Cancel Appointment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionConfirmModal
        show={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => { setShowCancelDialog(false); onCancel(appt.id); }}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        icon={<Calendar style={{ width: "22px", height: "22px" }} />}
        cancelText="Keep Appointment"
        confirmText="Cancel Appointment"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state ?? {};

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(navState.appointmentId ?? null);
  const [cancelling, setCancelling] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setAppointments(data.appointments ?? []);
    } catch (err) {
      setError("Could not load your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      toast.success("Appointment cancelled successfully");
      setSelectedId(null);
      await fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to cancel the appointment.");
    } finally {
      setCancelling(null);
    }
  };

  const generateBotResponse = () => "I can help you track your appointments. Click on any appointment card for details.";

  const byStatus = (status) => appointments.filter((a) => a.status === status);
  const tabLists = {
    all:       appointments,
    pending:   byStatus("pending"),
    approved:  byStatus("approved"),
    completed: byStatus("completed"),
    rejected:  byStatus("rejected"),
    cancelled: byStatus("cancelled"),
  };

  const TAB_ICON_MAP = {
    all:       LayoutList,
    pending:   Clock,
    approved:  CheckCircle2,
    completed: CheckCircle2,
    rejected:  XCircle,
    cancelled: XCircle,
  };

  const TABS = [
    { key: "all",       label: "All" },
    { key: "pending",   label: "Pending" },
    { key: "approved",  label: "Approved" },
    { key: "completed", label: "Completed" },
    { key: "rejected",  label: "Rejected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? null;

  return (
    <StudentPageShell
      outerClassName="apst-with-sidebar"
      mainClassName="apst-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! I can help you with your appointments."
          getBotResponse={generateBotResponse}
          sendButtonAriaLabel="Send"
        />
      }
    >
        {selectedAppt ? (
          <AppointmentDetail
            appt={selectedAppt}
            backLabel="My Appointments"
            onBack={() => setSelectedId(null)}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        ) : (
          <div className="apst-status-container">
            {/* Header */}
            <PageHeader
              breadcrumb={
                <Link
                  to="/student/dashboard"
                  className="breadcrumb-link"
                >
                  <ChevronLeft className="breadcrumb-icon" />
                  Home
                </Link>
              }
              icon={<Calendar style={{ width: "1.75rem", height: "1.75rem" }} />}
              iconClassName="apst-title-icon"
              title="My Appointments"
              subtitle="Track and manage all your appointment bookings"
            />

            {/* Professor Schedules card */}
            <Link
              to="/student/professor-schedules"
              state={{ from: "/student/appointment-status", fromLabel: "My Appointments" }}
              className="apst-prof-sched-card"
            >
              <div className="apst-prof-sched-card-icon">
                <GraduationCap />
              </div>
              <div className="apst-prof-sched-card-text">
                <span className="apst-prof-sched-card-title">Professor Schedules</span>
                <span className="apst-prof-sched-card-subtitle">Browse when your professors are available before booking</span>
              </div>
              <ChevronRight style={{ width: "1.375rem", height: "1.375rem", color: "#a855f7", opacity: 0.7, flexShrink: 0 }} />
            </Link>

            {error && (
              <div className="apst-empty-state" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                <AlertCircle className="apst-empty-icon" style={{ color: "#ef4444" }} />
                <p className="apst-empty-text">{error}</p>
              </div>
            )}

            {loading && (
              <div className="apst-empty-state">
                <Loader2 className="apst-empty-icon" style={{ animation: "spin 1s linear infinite" }} />
                <p className="apst-empty-text">Loading your appointments…</p>
              </div>
            )}

            {!loading && !error && (
              <div className="apst-tabs-container">
                <div className="apst-tabs-scrollable">
                  <div className="apst-tabs-list">
                    {TABS.map(({ key, label }) => {
                      const TabIcon = TAB_ICON_MAP[key];
                      return (
                        <button
                          key={key}
                          className={`apst-tab ${activeTab === key ? "active" : ""}`}
                          onClick={() => setActiveTab(key)}
                        >
                          {TabIcon && <TabIcon className="apst-tab-icon" />}
                          {label}
                          <span className="apst-tab-count">{tabLists[key].length}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="apst-list-container">
                  {tabLists[activeTab].length > 0 ? (
                    tabLists[activeTab].map((appt) => {
                      const { label, cls } = getStatusMeta(appt.status);
                      const isDim = appt.status === "completed" || appt.status === "rejected" || appt.status === "cancelled";
                      return (
                        <div
                          key={appt.id}
                          className={`apst-list-item ${isDim ? "apst-list-item-completed" : ""}`}
                          onClick={() => setSelectedId(appt.id)}
                        >
                          <div className="apst-list-header">
                            <div className={isDim ? "apst-list-icon-wrap-completed" : "apst-list-icon-wrap"}>
                              <Calendar style={{ width: "1.5rem", height: "1.5rem", color: isDim ? "var(--text-tertiary)" : undefined }} />
                            </div>
                            <div className="apst-list-title-section">
                              <h3 className="apst-list-name" style={isDim ? { color: "var(--text-tertiary)" } : undefined}>{appt.person}</h3>
                              <p className="apst-list-college">{appt.college}</p>
                            </div>
                            <span className={`apst-badge ${cls}`}>{label}</span>
                          </div>
                          <div className="apst-list-card-grid">
                            <div className="apst-list-card-field">
                              <label>Date</label>
                              <p>{formatDateShort(appt.date)}</p>
                            </div>
                            <div className="apst-list-card-field">
                              <label>Time Slot</label>
                              <p>{appt.windowStart && appt.windowEnd ? `${appt.windowStart} – ${appt.windowEnd}` : "—"}</p>
                            </div>
                            <div className="apst-list-card-field">
                              <label>Location</label>
                              <p>{appt.location}</p>
                            </div>
                            {appt.purpose && (
                              <div className="apst-list-card-field-full">
                                <label>Purpose</label>
                                <p>{appt.purpose}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="apst-empty-state">
                      <Calendar className="apst-empty-icon" />
                      <h3 className="apst-empty-title">
                        {activeTab === "all" ? "No Appointments Yet" : `No ${TABS.find(t => t.key === activeTab)?.label} Appointments`}
                      </h3>
                      <p className="apst-empty-text">
                        {activeTab === "all" || activeTab === "pending"
                          ? "Book an appointment to get started."
                          : `You have no ${activeTab} appointments.`}
                      </p>
                      {(activeTab === "all" || activeTab === "pending") && (
                        <button
                          onClick={() => navigate("/student/appointments")}
                          style={{
                            marginTop: "1rem",
                            background: "linear-gradient(135deg, #a855f7, #9333ea)",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "0.75rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                          Book an Appointment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
    </StudentPageShell>
  );
}
