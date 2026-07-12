import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import "./prof-dashboard.css";
import "./prof-appointments.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { formatManilaDate, getManilaDateString, getManilaTodayAsLocalDate } from "../../utils/dateTime";
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

// ── Icons ─────────────────────────────────────────────────────────────────────

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
  }),
  cancel: (apt) => ({
    title: "Cancel Appointment?",
    message: <>Cancel the appointment with <strong>{apt.studentName}</strong>? This action cannot be undone.</>,
    confirmText: "Cancel Appointment",
    cancelText: "Keep Appointment",
    icon: <XCircle style={{ width: 22, height: 22 }} />,
  }),
};

// Week starts on Sunday, matching the appointment booking calendar elsewhere in the app.
function getWeekRange(now = getManilaTodayAsLocalDate()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(now = getManilaTodayAsLocalDate()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isWithinRange(dateStr, range) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d >= range.start && d <= range.end;
}

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
          <p className="appt-card-sub">
            {appointment.studentId}
            {appointment.appointmentType ? ` · ${appointment.appointmentType}` : ""}
          </p>
        </div>
        <span
          className={`appt-status-badge appt-status-badge--${appointment.status}`}
        >
          {statusLabel}
        </span>
      </div>

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
        <span className="appt-requested-at">
          Requested: {appointment.requestedAt}
        </span>
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

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/faculty/appointments");
      setAppointments(res.data);
    } catch (err) {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const TABS = ["all", "pending", "approved", "completed", "rejected"];

  const allRangeAppointments =
    allRange === "all"
      ? appointments
      : appointments.filter((a) =>
          isWithinRange(a.date, allRange === "week" ? getWeekRange() : getMonthRange()),
        );

  const filteredAppointments =
    activeTab === "all"
      ? allRangeAppointments
      : appointments.filter((a) => a.status === activeTab);

  const updateStatus = async (id, status, successMsg, errorMsg) => {
    const apt = appointments.find((a) => a.id === id);
    try {
      await api.patch(`/faculty/appointments/${id}/status`, { status });
      await fetchAppointments();
      if (successMsg)
        toast.success(successMsg.replace("{name}", apt?.studentName ?? ""));
    } catch {
      toast.error(errorMsg ?? "Failed to update appointment");
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
    approve: ["approved", "Approved appointment with {name}"],
    reject: ["rejected", null],
    complete: ["completed", "Appointment marked as completed"],
    cancel: ["cancelled", "Appointment cancelled"],
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

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pending = appointments.filter((a) => a.status === "pending").length;
    const approved = appointments.filter((a) => a.status === "approved").length;
    const today = getManilaDateString();
    const todayCount = appointments.filter(
      (a) =>
        a.date?.slice(0, 10) === today &&
        ["pending", "approved"].includes(a.status),
    ).length;
    if (i.includes("appointment"))
      return `You have ${pending} pending and ${approved} approved appointments.`;
    if (i.includes("pending"))
      return `There are ${pending} pending appointments awaiting your action.`;
    if (i.includes("approved"))
      return `You have ${approved} approved appointments.`;
    if (i.includes("today"))
      return `You have ${todayCount} appointments today.`;
    return "I can help you manage appointments, check statuses, and more. What do you need?";
  };

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <>
          <ChatWidget
            initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
            getBotResponse={generateBotResponse}
          />
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
            subtitle="Review and manage student appointment requests"
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
              <span className="appt-sched-avail-card-subtitle">Set your weekly consultation hours so students can book with you</span>
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
                        {loading ? "—" : allRangeAppointments.length}
                      </span>
                    </div>
                  );
                }

                const count = appointments.filter((a) => a.status === tab).length;
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
                    ? "No Appointments Yet"
                    : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Appointments`}
                </h3>
                <p className="appt-empty-text">
                  {activeTab === "all"
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
