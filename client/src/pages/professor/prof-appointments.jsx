import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ProfessorSidebar from "../../components/ProfessorSidebar";
import "./prof-dashboard.css";
import "./prof-appointments.css";
import { toast } from "sonner";
import api from "../../utils/api";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutList,
} from "lucide-react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.25rem", height: "1.25rem" }}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChatIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

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

// Week starts on Sunday, matching the appointment booking calendar elsewhere in the app.
function getWeekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(now = new Date()) {
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
      return new Date(`${appointment.date}T00:00:00`).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      );
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
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [allRange, setAllRange] = useState("week");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleApprove = (id) =>
    updateStatus(id, "approved", "Approved appointment with {name}");
  const handleReject = (id) =>
    updateStatus(id, "rejected", null, "Rejected appointment");
  const handleComplete = (id) =>
    updateStatus(id, "completed", "Appointment marked as completed");
  const handleCancel = (id) =>
    updateStatus(id, "cancelled", "Appointment cancelled");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pending = appointments.filter((a) => a.status === "pending").length;
    const approved = appointments.filter((a) => a.status === "approved").length;
    const today = new Date().toISOString().slice(0, 10);
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
    <div className="dashboard-with-sidebar">
      <ProfessorSidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="appt-page-content">
          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="appt-page-header">
            <div className="appt-title-section">
              <div className="appt-title-icon">
                <Calendar style={{ width: "1.75rem", height: "1.75rem" }} />
              </div>
              <div>
                <h1 className="appt-page-title">Appointment Management</h1>
                <p className="appt-page-subtitle">
                  Review and manage student appointment requests
                </p>
              </div>
            </div>
          </div>

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
              <div className="appt-empty">Loading appointments...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="appt-empty">No appointments found.</div>
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
      </main>

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}>
                  <div className="message-content">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`chat-fab ${chatOpen ? "hidden" : ""}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>
    </div>
  );
}
