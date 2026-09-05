import { useState, useEffect, useCallback, useRef } from "react";
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
import AppointmentListItem from "../../components/AppointmentListItem";
import { formatManilaDate } from "../../utils/dateTime";
import { filterByRange } from "../../utils/dateRange";
import { connectSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
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
  return formatManilaDate(dateStr, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
};
const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  return formatManilaDate(dateStr, {
    month: "short", day: "numeric", year: "numeric",
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function AppointmentDetail({ appt, onBack, onCancel, cancelling, onComplete, completing, backLabel = "My Appointments" }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const { label: statusLabel, cls: statusCls } = getStatusMeta(appt.status);
  const canCancel = appt.status === "pending" || appt.status === "approved";
  const canComplete = appt.status === "approved";

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
        subtitle="Your appointment details and status."
        headerClassName="apst-header"
        breadcrumbClassName="page-breadcrumb"
        titleSectionClassName="apst-title-section"
        titleClassName="apst-title"
        subtitleClassName="apst-subtitle"
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
                Appointment Details
              </h3>
            </div>
            <div className="apst-card-content">
              <div className="apst-detail-row">
                <p className="apst-detail-label">Professor</p>
                <p className="apst-detail-value">{appt.person}</p>
              </div>
              {appt.appointmentType && (
                <div className="apst-detail-row">
                  <p className="apst-detail-label">Appointment Type</p>
                  <p className="apst-detail-value">{appt.appointmentType}</p>
                </div>
              )}
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
            {appt.status === "rejected" && appt.rejectionReason && (
              <div className="apst-card-content">
                <div className="apst-reject-notice">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                  <div>
                    <p>This appointment request was rejected.</p>
                    <p className="apst-reject-reason">Reason: {appt.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}
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

          {canComplete && (
            <div className="apst-card apst-complete-card">
              <div className="apst-card-header">
                <h3 className="apst-card-title apst-complete-title">
                  <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem", color: "#22c55e" }} />
                  Mark as Completed
                </h3>
              </div>
              <div className="apst-card-content">
                <p className="apst-cancel-desc">
                  If your concern has already been addressed and the professor hasn't closed this
                  out yet, you can mark it completed yourself.
                </p>
                <button
                  className="apst-complete-btn"
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={completing === appt.id}
                >
                  <CheckCircle2 style={{ width: "1rem", height: "1rem" }} />
                  {completing === appt.id ? "Marking…" : "Mark Appointment as Completed"}
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
        message={
          <>
            You are about to cancel your appointment with <strong>{appt.person}</strong> on{" "}
            <strong>{formatDate(appt.date)}</strong>. This will permanently remove it — you'll need to book a new one if you change your mind.
          </>
        }
        icon={<XCircle width={22} height={22} />}
        cancelText="Keep Appointment"
        confirmText="Cancel Appointment"
      />

      <ActionConfirmModal
        show={showCompleteDialog}
        variant="success"
        onCancel={() => setShowCompleteDialog(false)}
        onConfirm={() => { setShowCompleteDialog(false); onComplete(appt.id); }}
        title="Mark Appointment as Completed?"
        message={
          <>
            Mark your appointment with <strong>{appt.person}</strong> on{" "}
            <strong>{formatDate(appt.date)}</strong> as completed? Use this only if your concern
            has already been addressed.
          </>
        }
        icon={<CheckCircle2 width={22} height={22} />}
        cancelText="Not Yet"
        confirmText="Mark as Completed"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const navState = location.state ?? {};
  const fromBookings = navState.fromBookings ?? false;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(navState.appointmentId ?? null);
  const [cancelling, setCancelling] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [allRange, setAllRange] = useState("week");

  // Mirrors `appointments` for the catch block below, without making
  // fetchAppointments depend on (and change identity with) the state itself.
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const fetchAppointments = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setAppointments(data.appointments ?? []);
    } catch (err) {
      // Only take over the whole view with a blocking error on the true
      // first load. A background refresh (poll/socket) failing shouldn't
      // wipe out an already-good, visible list -- just note it quietly.
      if (appointmentsRef.current.length === 0) {
        setError("Could not load your appointments. Please try again.");
      } else {
        toast.error("Could not refresh your appointments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Live updates: refetch when an appointment's status changes ────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const handleStatusUpdate = (payload) => {
      if (payload?.reason === "schedule_removed" || payload?.reason === "schedule_changed") {
        toast.error("An appointment was cancelled because the professor changed their schedule. Please book a new time.");
      } else if (payload?.reason === "slot_adjusted") {
        toast.message("A professor adjusted one of your appointment slots — check the new time and location.");
      }
      fetchAppointments();
    };

    socket.on("appointment:status-updated", handleStatusUpdate);

    return () => {
      socket.off("appointment:status-updated", handleStatusUpdate);
    };
  }, [fetchAppointments, token]);

  // Fallback poll: a missed/reconnecting socket event shouldn't leave this
  // page stale until the next manual reload.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchAppointments();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      toast.success("Appointment cancelled successfully.");
      setSelectedId(null);
      await fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to cancel the appointment.");
    } finally {
      setCancelling(null);
    }
  };

  const handleComplete = async (id) => {
    setCompleting(id);
    try {
      await api.patch(`/student/appointments/${id}/complete`);
      toast.success("Appointment marked as completed.");
      await fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to mark the appointment as completed.");
    } finally {
      setCompleting(null);
    }
  };

  // Defaults to "This Week" across every tab -- the range control below lets
  // a student switch to "This Month"/"All Time" to see everything else.
  const rangeFilteredAppointments = filterByRange(appointments, allRange);
  const byStatus = (status) => rangeFilteredAppointments.filter((a) => a.status === status);
  const tabLists = {
    all:       rangeFilteredAppointments,
    pending:   byStatus("pending"),
    approved:  byStatus("approved"),
    completed: byStatus("completed"),
    rejected:  byStatus("rejected"),
    cancelled: byStatus("cancelled"),
  };

  const RANGE_LABELS = { week: "This Week", month: "This Month", all: "All Time" };

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
    >
        {selectedAppt ? (
          <AppointmentDetail
            appt={selectedAppt}
            backLabel={fromBookings ? "Appointments" : "My Appointments"}
            onBack={() => fromBookings ? navigate("/student/appointments", { state: { activeTab: "bookings" } }) : setSelectedId(null)}
            onCancel={handleCancel}
            cancelling={cancelling}
            onComplete={handleComplete}
            completing={completing}
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
              subtitle="Track all of your appointments."
              headerClassName="apst-header"
              breadcrumbClassName="page-breadcrumb"
              titleSectionClassName="apst-title-section"
              titleClassName="apst-title"
              subtitleClassName="apst-subtitle"
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
                <span className="apst-prof-sched-card-subtitle">Check professor consultation hours and availability across all departments.</span>
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

                      // The "All" tab doubles as the This Week/This Month/All
                      // Time range control, governing every tab -- same
                      // placement/pattern as prof-appointments.jsx's Appointment
                      // Manager, so the two pages look and behave consistently.
                      if (key === "all") {
                        return (
                          <div
                            key={key}
                            role="button"
                            tabIndex={0}
                            className={`apst-tab ${activeTab === key ? "active" : ""}`}
                            onClick={() => setActiveTab("all")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") setActiveTab("all");
                            }}
                          >
                            {TabIcon && <TabIcon className="apst-tab-icon" />}
                            <select
                              className="apst-range-select"
                              value={allRange}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setAllRange(e.target.value);
                                setActiveTab("all");
                              }}
                            >
                              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <span className="apst-tab-count">{tabLists[key].length}</span>
                          </div>
                        );
                      }

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
                    tabLists[activeTab].map((appt) => (
                      <AppointmentListItem
                        key={appt.id}
                        appointment={appt}
                        formatDate={formatDateShort}
                        onClick={() => setSelectedId(appt.id)}
                      />
                    ))
                  ) : (
                    <div className="apst-empty-state">
                      <Calendar className="apst-empty-icon" />
                      <h3 className="apst-empty-title">
                        {activeTab === "all" ? "No Appointments Booked" : `No ${TABS.find(t => t.key === activeTab)?.label} Appointments`}
                        {allRange !== "all" ? ` ${RANGE_LABELS[allRange]}` : ""}
                      </h3>
                      <p className="apst-empty-text">
                        {allRange !== "all"
                          ? `Nothing in this range — switch to "All Time" to see all your appointments.`
                          : activeTab === "all"
                            ? "You have no active appointments yet."
                            : activeTab === "pending"
                              ? "You have no records of pending appointments."
                              : `You have no records of ${activeTab} appointments.`}
                      </p>
                      {(activeTab === "all" || activeTab === "pending") && (
                        <button
                          onClick={() => navigate("/student/appointments")}
                          style={{
                            marginTop: "0.5rem",
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
