import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import "./prof-dashboard.css";
import "./prof-appointments.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaDateString } from "../../utils/dateTime";
import { filterByRange } from "../../utils/dateRange";
import { connectSocket } from "../../utils/socket";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  LayoutList,
  Loader2,
  CalendarClock,
} from "lucide-react";

// ── Appointment-specific icons ─────────────────────────────────────────────────
const CheckCircle2Icon = () => (
  <svg
    className="appt-icon-sm"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const XCircleIcon = () => (
  <svg
    className="appt-icon-sm"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const TAB_ICON_MAP = {
  all: LayoutList,
  pending: Clock,
  approved: CheckCircle2,
  completed: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
};

const ALL_RANGE_LABELS = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

// ── Confirmation modal copy, keyed by action type ──────────────────────────────
const CONFIRM_META = {
  approve: (apt) => ({
    title: "Approve Appointment?",
    message: <>Approve the appointment request from <strong>{apt.studentName}</strong>?</>,
    confirmText: "Approve",
    icon: <CheckCircle2 style={{ width: 22, height: 22 }} />,
    variant: "success",
  }),
  reject: (apt) => ({
    title: "Reject Appointment?",
    message: <>Reject the appointment request from <strong>{apt.studentName}</strong>? This action cannot be undone.</>,
    confirmText: "Reject",
    icon: <XCircle style={{ width: 22, height: 22 }} />,
  }),
  complete: (apt) => ({
    title: "Mark as Completed?",
    message: <>Mark the appointment with <strong>{apt.studentName}</strong> as completed?</>,
    confirmText: "Mark Complete",
    icon: <CheckCircle2 style={{ width: 22, height: 22 }} />,
    variant: "success",
  }),
  cancel: (apt) => ({
    title: "Cancel Appointment?",
    message: <>Cancel the appointment with <strong>{apt.studentName}</strong>? This action cannot be undone.</>,
    confirmText: "Cancel Appointment",
    cancelText: "Keep Appointment",
    icon: <XCircle style={{ width: 22, height: 22 }} />,
  }),
};

// ── AppointmentCard ────────────────────────────────────────────────────────────
function AppointmentCard({
  appointment,
  onApprove,
  onReject,
  onComplete,
  onCancel,
}) {
  const dateStr = (() => {
    try {
      return formatManilaDate(appointment.date);
    } catch {
      return appointment.date;
    }
  })();

  // The server rejects marking a future-dated appointment as completed --
  // disable the button here too so the click doesn't just bounce off an error.
  const isFutureDate = appointment.date > getManilaDateString();

  const statusLabel =
    appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);

  return (
    <div className="appt-card">
      {/* Header: icon + student name/purpose + badge */}
      <div className="appt-card-header-row">
        <div className="appt-card-icon-wrap">
          <Calendar style={{ width: "1.5rem", height: "1.5rem" }} />
        </div>
        <div className="appt-card-title-section">
          <h3 className="appt-card-name">{appointment.studentName}</h3>
          {appointment.studentId && (
            <span className="appt-card-student-id-badge">{appointment.studentId}</span>
          )}
          {appointment.course && (
            <p className="appt-card-sub">{appointment.course}</p>
          )}
        </div>
        <span
          className={`appt-status-badge appt-status-badge--${appointment.status}`}
        >
          {statusLabel}
        </span>
      </div>

      {appointment.appointmentType && (
        <div className="appt-card-appt-type">
          <span className="appt-card-appt-type-label">Type:</span>
          <span className="appt-card-appt-type-value">
            {appointment.appointmentType}
          </span>
        </div>
      )}

      {/* Info grid */}
      <div className="appt-info-grid">
        <div className="appt-info-field">
          <label>Date</label>
          <p>{dateStr}</p>
        </div>
        <div className="appt-info-field">
          <label>Time</label>
          <p>{appointment.time}</p>
        </div>
        <div className="appt-info-field appt-info-field--full">
          <label>Location</label>
          <p>{appointment.location}</p>
        </div>
        {appointment.purpose && (
          <div className="appt-info-field appt-info-field--full">
            <label>Purpose</label>
            <p className="appt-notes-text">{appointment.purpose}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="appt-footer">
        {appointment.status === "pending" && (
          <>
            <button
              className="appt-btn appt-btn-approve"
              onClick={() => onApprove(appointment.id)}
            >
              <CheckCircle2Icon /> Approve
            </button>
            <button
              className="appt-btn appt-btn-reject"
              onClick={() => onReject(appointment.id)}
            >
              <XCircleIcon /> Reject
            </button>
          </>
        )}
        {appointment.status === "approved" && (
          <>
            <button
              className="appt-btn appt-btn-complete"
              onClick={() => onComplete(appointment.id)}
              disabled={isFutureDate}
              title={isFutureDate ? "This appointment hasn't happened yet" : undefined}
            >
              <CheckCircle2Icon /> Mark Complete
            </button>
            <button
              className="appt-btn appt-btn-cancel"
              onClick={() => onCancel(appointment.id)}
            >
              Cancel
            </button>
          </>
        )}
        <div className="appt-requested-meta">
          <span className="appt-requested-label">Requested</span>
          {appointment.requestedAtRaw ? (
            <>
              <span className="appt-requested-date">
                <Calendar />
                {formatManilaDate(appointment.requestedAtRaw, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="appt-requested-time">
                <Clock />
                {formatManilaTime(appointment.requestedAtRaw)}
              </span>
            </>
          ) : (
            <span className="appt-requested-date">{appointment.requestedAt}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessorAppointmentsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [allRange, setAllRange] = useState("week");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Action confirmation (approve / reject / complete / cancel) ─────────────
  const [confirmAction, setConfirmAction] = useState(null); // { type, apt } or null
  const [confirmSaving, setConfirmSaving] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get("/professor/appointments");
      setAppointments(res.data);
    } catch (err) {
      toast.error("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Live updates: refetch when a student books or cancels an appointment ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["appointment:slot-updated", "appointment:status-updated"];
    events.forEach((event) => socket.on(event, fetchAppointments));

    return () => {
      events.forEach((event) => socket.off(event, fetchAppointments));
    };
  }, [fetchAppointments]);

  const TABS = ["all", "pending", "approved", "completed", "rejected", "cancelled"];

  // The This Week/This Month/All Time control governs every tab, not just
  // "All" — otherwise a tab's badge count and its rendered list would come
  // from two different-shaped arrays and visibly disagree with each other.
  const rangeFilteredAppointments = filterByRange(appointments, allRange);

  const filteredAppointments =
    activeTab === "all"
      ? rangeFilteredAppointments
      : rangeFilteredAppointments.filter((a) => a.status === activeTab);

  const updateStatus = async (id, status, successMsg, errorMsg) => {
    const apt = appointments.find((a) => a.id === id);
    try {
      await api.patch(`/professor/appointments/${id}/status`, { status });
      await fetchAppointments();
      if (successMsg)
        toast.success(successMsg.replace("{name}", apt?.studentName ?? ""));
    } catch (err) {
      toast.error(err?.response?.data?.error ?? errorMsg ?? "Failed to update appointment.");
    }
  };

  const requestAction = (type, id) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt) setConfirmAction({ type, apt });
  };

  const handleApprove = (id) => requestAction("approve", id);
  const handleReject = (id) => requestAction("reject", id);
  const handleComplete = (id) => requestAction("complete", id);
  const handleCancel = (id) => requestAction("cancel", id);

  const STATUS_BY_ACTION = {
    approve: ["approved", "Approved appointment with {name}."],
    reject: ["rejected", null],
    complete: ["completed", "Appointment marked as completed."],
    cancel: ["cancelled", "Appointment cancelled."],
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, apt } = confirmAction;
    const [status, successMsg] = STATUS_BY_ACTION[type];
    setConfirmSaving(true);
    await updateStatus(apt.id, status, successMsg);
    setConfirmSaving(false);
    setConfirmAction(null);
  };

  const confirmMeta = confirmAction ? CONFIRM_META[confirmAction.type](confirmAction.apt) : null;

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <>
          <ActionConfirmModal
            show={!!confirmAction}
            onCancel={() => setConfirmAction(null)}
            onConfirm={runConfirmAction}
            title={confirmMeta?.title}
            message={confirmMeta?.message}
            icon={confirmMeta?.icon}
            confirmText={confirmSaving ? "Please wait…" : confirmMeta?.confirmText}
            cancelText={confirmMeta?.cancelText}
            confirmDisabled={confirmSaving}
            variant={confirmMeta?.variant ?? "danger"}
          />
        </>
      }
    >
        <div className="appt-page-content">
          {/* Header */}
          <PageHeader
            breadcrumb={
              <Link to="/professor/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<Calendar style={{ width: "1.75rem", height: "1.75rem" }} />}
            iconClassName="appt-title-icon"
            title="Appointment Manager"
            subtitle="Review and manage student appointment requests."
            headerClassName="appt-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="appt-title-section"
            titleClassName="appt-title"
            subtitleClassName="appt-subtitle"
          />

          {/* Schedule Manager card */}
          <Link
            to="/professor/schedule-manager"
            state={{ from: "/professor/appointments", fromLabel: "Appointment Manager" }}
            className="appt-sched-avail-card"
          >
            <div className="appt-sched-avail-card-icon">
              <CalendarClock />
            </div>
            <div className="appt-sched-avail-card-text">
              <span className="appt-sched-avail-card-title">Schedule Manager</span>
              <span className="appt-sched-avail-card-subtitle">Set your weekly availability schedule for appointments.</span>
            </div>
            <ChevronRight className="appt-sched-avail-card-chevron" />
          </Link>

          {/* Tabs */}
          <div className="appt-tabs-nav">
            <div className="appt-tabs-list">
              {TABS.map((tab) => {
                const TabIcon = TAB_ICON_MAP[tab];

                if (tab === "all") {
                  return (
                    <div
                      key={tab}
                      role="button"
                      tabIndex={0}
                      className={`appt-tab-trigger appt-tab-trigger--dropdown${activeTab === tab ? " active" : ""}`}
                      onClick={() => setActiveTab("all")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setActiveTab("all");
                      }}
                    >
                      {TabIcon && <TabIcon className="appt-tab-icon" />}
                      <select
                        className="appt-range-select"
                        value={allRange}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setAllRange(e.target.value);
                          setActiveTab("all");
                        }}
                      >
                        {Object.entries(ALL_RANGE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <span className="appt-tab-count">
                        {loading ? "—" : rangeFilteredAppointments.length}
                      </span>
                    </div>
                  );
                }

                const count = rangeFilteredAppointments.filter((a) => a.status === tab).length;
                return (
                  <button
                    key={tab}
                    className={`appt-tab-trigger${activeTab === tab ? " active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TabIcon && <TabIcon className="appt-tab-icon" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="appt-tab-count">
                      {loading ? "—" : count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="appt-list">
            {loading ? (
              <div className="appt-empty-state">
                <Loader2
                  className="appt-empty-icon"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <p className="appt-empty-text">Loading appointments…</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="appt-empty-state">
                <Calendar className="appt-empty-icon" />
                <h3 className="appt-empty-title">
                  {activeTab === "all"
                    ? "No Appointments"
                    : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Appointments`}
                  {allRange !== "all"
                    ? ` ${ALL_RANGE_LABELS[allRange]}`
                    : activeTab === "all"
                      ? " Yet"
                      : ""}
                </h3>
                <p className="appt-empty-text">
                  {allRange !== "all"
                    ? `You have no appointments in this range — switch to "All Time" to see everything.`
                    : activeTab === "all"
                      ? "New appointment requests from students will appear here."
                      : `You have no ${activeTab} appointments.`}
                </p>
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                />
              ))
            )}
          </div>
        </div>
    </ProfessorPageShell>
  );
}
