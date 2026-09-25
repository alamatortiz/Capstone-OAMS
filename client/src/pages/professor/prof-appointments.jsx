import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import QueueReasonModal from "../../components/QueueReasonModal";
import "./prof-dashboard.css";
import "./prof-appointments.css";
import { toast } from "sonner";
import api from "../../utils/api";
import {
  formatManilaDate,
  formatManilaTime,
  getManilaDateString,
  getManilaTimeString,
} from "../../utils/dateTime";
import { filterByRange } from "../../utils/dateRange";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  LayoutList,
  Loader2,
  CalendarClock,
  MessageSquare,
  AlertCircle,
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
  today: "Today",
  week: "This Week",
  nextWeek: "Next Week",
  all: "All Time",
};

// ── Confirmation modal copy, keyed by action type ──────────────────────────────
const CONFIRM_META = {
  approve: (apt) => ({
    title: "Approve Appointment?",
    message: (
      <>
        Approve the appointment request from <strong>{apt.studentName}</strong>?
      </>
    ),
    confirmText: "Approve",
    icon: <CheckCircle2 style={{ width: 22, height: 22 }} />,
    variant: "success",
  }),
  complete: (apt) => ({
    title: "Mark as Completed?",
    message: (
      <>
        Mark the appointment with <strong>{apt.studentName}</strong> as
        completed?
      </>
    ),
    confirmText: "Mark Complete",
    icon: <CheckCircle2 style={{ width: 22, height: 22 }} />,
    variant: "success",
  }),
  cancel: (apt) => ({
    title: "Cancel Appointment?",
    message: (
      <>
        Cancel the appointment with <strong>{apt.studentName}</strong>? This
        action cannot be undone.
      </>
    ),
    confirmText: "Cancel Appointment",
    cancelText: "Keep Appointment",
    icon: <XCircle style={{ width: 22, height: 22 }} />,
  }),
};

// One shared, overwritable note either party can read -- see the read-only
// mirror in stud-appointment-status.jsx; this professor-side route is the
// field's only writer. Only editable once the appointment is approved (not
// while still pending -- server-enforced too), and stays editable without
// needing to also flag the appointment as completed. Editing happens in a
// popup instead of inline, so this renders as its own dedicated section
// rather than a small inline field.
function CommentBlock({ appointment, onSaved }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const canEdit = appointment.status === "approved";

  const save = async (draft) => {
    setSaving(true);
    try {
      await api.patch(`/professor/appointments/${appointment.id}/comment`, {
        comment: draft,
      });
      toast.success("Actions taken saved.");
      setShowModal(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to save actions taken.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="appt-comment-section">
      <div className="appt-comment-section-header">
        <button
          type="button"
          className="appt-comment-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <MessageSquare style={{ width: "1.1rem", height: "1.1rem" }} />
          <span className="appt-comment-section-title">Actions Taken</span>
          {appointment.sharedComment && !open && (
            <span className="appt-comment-recorded">Recorded</span>
          )}
          <ChevronDown
            className={`appt-comment-chevron${open ? " appt-comment-chevron--open" : ""}`}
            style={{ width: "1rem", height: "1rem" }}
          />
        </button>
        {canEdit && (
          <button type="button" className="appt-comment-edit-link" onClick={() => setShowModal(true)}>
            {appointment.sharedComment ? "Edit Actions Taken" : "Add Actions Taken"}
          </button>
        )}
      </div>
      {open && (
        appointment.sharedComment ? (
          <div className="appt-comment-body">
            <p className="appt-comment-text">{appointment.sharedComment}</p>
            {appointment.commentUpdatedAt && (
              <p className="appt-comment-meta">
                Last updated by {appointment.commentUpdatedBy === "student" ? "the student" : "you"} on{" "}
                {formatManilaDate(appointment.commentUpdatedAt, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        ) : (
          <p className="appt-comment-empty appt-comment-body">No actions taken recorded yet.</p>
        )
      )}
      <QueueReasonModal
        show={showModal}
        onCancel={() => setShowModal(false)}
        onConfirm={save}
        title="Edit Actions Taken"
        message={<>Describe the actions taken for <strong>{appointment.studentName}</strong>'s appointment.</>}
        confirmText={saving ? "Saving…" : "Save Actions Taken"}
        submitting={saving}
        icon={<MessageSquare style={{ width: 22, height: 22 }} />}
        variant="primary"
        accentTheme="purple"
        required={false}
        initialValue={appointment.sharedComment ?? ""}
        placeholder="Describe the actions taken for this appointment…"
      />
    </div>
  );
}

// ── AppointmentCard ────────────────────────────────────────────────────────────
function AppointmentCard({
  appointment,
  onApprove,
  onReject,
  onComplete,
  onCancel,
  onCommentSaved,
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

  // Mirrors the server's approve rule: only on the appointment's date and
  // within its consultation window (skipped if the window is unknown).
  const approveBlockedReason = (() => {
    const start = appointment.windowStartRaw?.slice(0, 5);
    const end = appointment.windowEndRaw?.slice(0, 5);
    if (!start || !end) return null;
    if (appointment.date !== getManilaDateString())
      return `You can only approve on the scheduled date (${appointment.date}).`;
    const now = getManilaTimeString();
    if (now < start) return `The consultation window hasn't opened yet (opens ${start}).`;
    if (now > end) return "The consultation window has already ended.";
    return null;
  })();

  const statusLabel =
    appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);

  return (
    <div className="appt-card">
      {/* Header: icon + name/type/status, then Date/Time, Location, Purpose,
          the action buttons, and finally Actions Taken, all stacked on the
          left -- Purpose and the buttons sit near the BOTTOM of that stack
          deliberately, so a professor's eye crosses the purpose before
          reaching Approve/Reject instead of the buttons being one of the
          first things seen; Actions Taken comes last as its own section
          below the actions. The right column stays lightweight: just
          Requested-at. */}
      <div className="appt-card-header-row">
        <div className="appt-card-icon-wrap">
          <Calendar style={{ width: "1.5rem", height: "1.5rem" }} />
        </div>
        <div className="appt-card-title-section">
          <div className="appt-card-name-row">
            <h3 className="appt-card-name">{appointment.studentName}</h3>
            {appointment.studentId && (
              <span className="appt-card-student-id-badge">
                {appointment.studentId}
              </span>
            )}
            {appointment.trackingNumber && (
              <span className="appt-card-tracking-badge">
                {appointment.trackingNumber}
              </span>
            )}
            {appointment.appointmentType && (
              <span className="appt-card-appt-type-value">
                {appointment.appointmentType}
              </span>
            )}
            <span
              className={`appt-status-badge appt-status-badge--${appointment.status}`}
            >
              {statusLabel}
            </span>
          </div>
          {appointment.course && (
            <p className="appt-card-sub">{appointment.course}</p>
          )}
          <div className="appt-card-datetime-row">
            <span className="appt-quick-meta-item">
              <MapPin /> {appointment.location}
            </span>
            <span className="appt-quick-meta-item">
              <Calendar /> {dateStr}
            </span>
            <span className="appt-quick-meta-item">
              <Clock /> {appointment.time}
            </span>
          </div>
          {/* Year & Program, Course Code, and Purpose grouped on one row,
              then the action buttons at the very bottom of the left column. */}
          <div className="appt-info-grid">
            {(appointment.bookingYearProgram || appointment.courseCode || appointment.purpose) && (
              <div className="appt-info-row">
                {appointment.bookingYearProgram && (
                  <div className="appt-info-field">
                    <label>Year &amp; Program</label>
                    <p>{appointment.bookingYearProgram}</p>
                  </div>
                )}
                {appointment.courseCode && (
                  <div className="appt-info-field">
                    <label>Course Code</label>
                    <p>{appointment.courseCode}</p>
                  </div>
                )}
                {appointment.purpose && (
                  <div className="appt-info-field">
                    <label>Purpose</label>
                    <p>{appointment.purpose}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <CommentBlock appointment={appointment} onSaved={onCommentSaved} />
          {appointment.status === "pending" && (
            <div className="appt-header-btn-row">
              <button
                className="appt-btn-sm appt-btn-sm-approve"
                onClick={() => onApprove(appointment.id)}
                disabled={!!approveBlockedReason}
                title={approveBlockedReason ?? "Approve"}
              >
                <CheckCircle2Icon /> Approve
              </button>
              <button
                className="appt-btn-sm appt-btn-sm-reject"
                onClick={() => onReject(appointment.id)}
                title="Reject"
              >
                <XCircleIcon /> Reject
              </button>
            </div>
          )}
          {appointment.status === "approved" && (
            <div className="appt-header-btn-row">
              <button
                className="appt-btn-sm appt-btn-sm-complete"
                onClick={() => onComplete(appointment.id)}
                disabled={isFutureDate}
                title={isFutureDate ? "This appointment hasn't happened yet" : "Mark Complete"}
              >
                <CheckCircle2Icon /> Complete
              </button>
              <button
                className="appt-btn-sm appt-btn-sm-cancel"
                onClick={() => onCancel(appointment.id)}
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )}
          {(appointment.approvedAtRaw || appointment.completedAtRaw) && (
            <div className="appt-timeline-section">
              {appointment.approvedAtRaw && (
                <div className="appt-timeline-row">
                  <span className="appt-timeline-label">Approved</span>
                  <span className="appt-timeline-date">
                    <Calendar />
                    {formatManilaDate(appointment.approvedAtRaw, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="appt-timeline-time">
                    <Clock />
                    {formatManilaTime(appointment.approvedAtRaw)}
                  </span>
                </div>
              )}
              {appointment.completedAtRaw && (
                <div className="appt-timeline-row">
                  <span className="appt-timeline-label">Completed</span>
                  <span className="appt-timeline-date">
                    <Calendar />
                    {formatManilaDate(appointment.completedAtRaw, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="appt-timeline-time">
                    <Clock />
                    {formatManilaTime(appointment.completedAtRaw)}
                  </span>
                </div>
              )}
            </div>
          )}
          {appointment.status === "cancelled" && appointment.cancelledBy === "student_no_show" && (
            <div className="appt-not-served-notice">
              <AlertCircle style={{ width: "1.1rem", height: "1.1rem" }} />
              <div>
                <p>The student reported that you did not serve this appointment.</p>
                {appointment.cancelReason && (
                  <p className="appt-not-served-reason">Details: {appointment.cancelReason}</p>
                )}
              </div>
            </div>
          )}
          {appointment.status === "cancelled" && appointment.cancelledBy === "system_not_entertained" && (
            <div className="appt-not-served-notice">
              <AlertCircle style={{ width: "1.1rem", height: "1.1rem" }} />
              <div>
                <p>This appointment was automatically cancelled — no actions taken were recorded before the scheduled time passed.</p>
                {appointment.cancelReason && (
                  <p className="appt-not-served-reason">Details: {appointment.cancelReason}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="appt-card-header-actions">
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
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessorAppointmentsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [allRange, setAllRange] = useState("today");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Action confirmation (approve / reject / complete / cancel) ─────────────
  const [confirmAction, setConfirmAction] = useState(null); // { type, apt } or null
  const [confirmSaving, setConfirmSaving] = useState(false);
  // Reject is routed separately from the other actions above -- it needs a
  // required reason (the student sees it), which ActionConfirmModal has no
  // room for. QueueReasonModal is the app's existing required-reason prompt
  // (already used for admin queue pause/stop and the professor-unavailable
  // toggle).
  const [rejectTarget, setRejectTarget] = useState(null); // apt being rejected, or null
  const [rejectSaving, setRejectSaving] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get("/professor/appointments");
      setAppointments(res.data);
    } catch {
      toast.error("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const TABS = [
    "all",
    "pending",
    "approved",
    "completed",
    "rejected",
    "cancelled",
  ];

  // The Today/This Week/Next Week/All Time control governs every tab, not
  // just "All" — otherwise a tab's badge count and its rendered list would
  // come from two different-shaped arrays and visibly disagree with each
  // other.
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
      toast.error(
        err?.response?.data?.error ??
          errorMsg ??
          "Failed to update appointment.",
      );
    }
  };

  const requestAction = (type, id) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt) setConfirmAction({ type, apt });
  };

  const handleApprove = (id) => requestAction("approve", id);
  const handleComplete = (id) => requestAction("complete", id);
  const handleCancel = (id) => requestAction("cancel", id);

  const handleReject = (id) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt) setRejectTarget(apt);
  };

  const confirmReject = async (reason) => {
    if (!rejectTarget) return;
    setRejectSaving(true);
    try {
      await api.patch(`/professor/appointments/${rejectTarget.id}/status`, {
        status: "rejected",
        reason,
      });
      await fetchAppointments();
      toast.success(`Rejected appointment with ${rejectTarget.studentName}.`);
      setRejectTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to reject appointment.");
    } finally {
      setRejectSaving(false);
    }
  };

  const STATUS_BY_ACTION = {
    approve: ["approved", "Approved appointment with {name}."],
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

  const confirmMeta = confirmAction
    ? CONFIRM_META[confirmAction.type](confirmAction.apt)
    : null;

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
            confirmText={
              confirmSaving ? "Please wait…" : confirmMeta?.confirmText
            }
            cancelText={confirmMeta?.cancelText}
            confirmDisabled={confirmSaving}
            variant={confirmMeta?.variant ?? "danger"}
          />

          <QueueReasonModal
            show={!!rejectTarget}
            onCancel={() => setRejectTarget(null)}
            onConfirm={confirmReject}
            title="Reject Appointment?"
            message={
              rejectTarget && (
                <>
                  Reject the appointment request from{" "}
                  <strong>{rejectTarget.studentName}</strong>? The student will
                  see this reason.
                </>
              )
            }
            confirmText={rejectSaving ? "Please wait…" : "Reject"}
            submitting={rejectSaving}
            icon={<XCircle style={{ width: 22, height: 22 }} />}
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
          state={{
            from: "/professor/appointments",
            fromLabel: "Appointment Manager",
          }}
          className="appt-sched-avail-card"
        >
          <div className="appt-sched-avail-card-icon">
            <CalendarClock />
          </div>
          <div className="appt-sched-avail-card-text">
            <span className="appt-sched-avail-card-title">
              Schedule Manager
            </span>
            <span className="appt-sched-avail-card-subtitle">
              Set your weekly availability schedule for appointments.
            </span>
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
                      if (e.key === "Enter" || e.key === " ")
                        setActiveTab("all");
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
                      {Object.entries(ALL_RANGE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                    <span className="appt-tab-count">
                      {loading ? "—" : rangeFilteredAppointments.length}
                    </span>
                  </div>
                );
              }

              const count = rangeFilteredAppointments.filter(
                (a) => a.status === tab,
              ).length;
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
                onCommentSaved={fetchAppointments}
              />
            ))
          )}
        </div>
      </div>
    </ProfessorPageShell>
  );
}
