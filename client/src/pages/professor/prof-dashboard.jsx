import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText, Megaphone, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import "./prof-dashboard.css";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";
import { getCollegeLogo } from "../../data/collegeLogo";
import { formatManilaDateTime, parseOfficeHoursSchedule } from "../../utils/dateTime";

// ── Icons (unchanged from original) ──────────────────────────────────────────
const CalendarIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const MegaphoneIcon = () => <Megaphone className="icon" />;
const ClipboardListIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
  </svg>
);

// Mirrors stud-dashboard.jsx's own formatActivityStatus: title-cases the raw
// status and special-cases the same two words, so Recent Activity's badge
// text reads the same way on both dashboards ("No Show" not "NO_SHOW").
function formatActivityStatus(status, type) {
  if (status === "no_show") return "No Show";
  if (type === "document" && status === "generated") return "Ready";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ProfessorDashboard() {
  const { user: authUser } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Faculty",
        role: "faculty",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  // ── Dashboard data state ──────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  // Mirrors `dashStats` for the catch block below, without making fetchStats
  // depend on (and change identity with) the state itself.
  const dashStatsRef = useRef(dashStats);
  useEffect(() => { dashStatsRef.current = dashStats; }, [dashStats]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/professor/dashboard-stats");
      setDashStats(res.data);
    } catch (err) {
      console.error("Failed to fetch faculty dashboard stats:", err);
      if (!dashStatsRef.current) {
        setDashError("Could not load dashboard data.");
      } else {
        toast.error("Could not refresh dashboard data.");
      }
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchStats();
  }, [authUser, fetchStats]);

  // ── Live updates: refetch when an appointment or document status changes ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!authUser || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["appointment:slot-updated", "appointment:status-updated", "document:status-updated"];
    events.forEach((event) => socket.on(event, fetchStats));

    return () => {
      events.forEach((event) => socket.off(event, fetchStats));
    };
  }, [authUser, fetchStats]);

  // ── Announcements (for the Quick Actions tile's live pinned count) ────────
  // Kept separate from fetchStats/dashStats since it's an unrelated resource
  // (mirrors stud-dashboard.jsx's own separate announcements fetch).
  const [announcements, setAnnouncements] = useState([]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get("/professor/announcements");
      setAnnouncements(data?.announcements ?? []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchAnnouncements();
  }, [authUser, fetchAnnouncements]);

  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!authUser || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    socket.on("announcement:changed", fetchAnnouncements);
    return () => {
      socket.off("announcement:changed", fetchAnnouncements);
    };
  }, [authUser, fetchAnnouncements]);

  // ── Office hours state (mirrors stud-dashboard.jsx's own fetch) ───────────
  const [officeHours, setOfficeHours] = useState(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true);
  const [officeHoursError, setOfficeHoursError] = useState(null);

  const fetchOfficeHours = useCallback(async () => {
    try {
      setOfficeHoursLoading(true);
      const res = await api.get("/professor/office-hours");
      setOfficeHours(res.data);
      setOfficeHoursError(null);
    } catch (err) {
      console.error("Failed to fetch office hours:", err);
      setOfficeHoursError("Could not load office hours.");
    } finally {
      setOfficeHoursLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchOfficeHours();
  }, [authUser, fetchOfficeHours]);

  // ── Derived values ────────────────────────────────────────────────────────
  const s = dashStats?.stats;
  const loading = dashLoading;

  const stats = [
    {
      title: "Pending Appointments",
      value: loading ? "—" : String(s?.pendingAppointments ?? 0),
      // Same conditional-list-building pattern as stud-dashboard.jsx's own
      // Appointments card description, over s.appointments.{pending,approved}.
      description: (() => {
        if (loading) return "Loading...";
        const parts = [];
        const pending = s?.appointments?.pending ?? 0;
        const approved = s?.appointments?.approved ?? 0;
        if (pending > 0) parts.push(`${pending} pending`);
        if (approved > 0) parts.push(`${approved} approved`);
        return parts.length ? parts.join(", ") : "No pending appointments";
      })(),
      icon: CalendarIcon,
      bgColor: "bg-violet-50",
      link: "/professor/appointments",
    },
    {
      title: "Documents",
      value: loading ? "—" : String(s?.documents?.total ?? 0),
      // Same conditional-list-building pattern as stud-dashboard.jsx's own
      // Documents card description, over s.documents.{pendingOnly,processing,ready,released}.
      description: (() => {
        if (loading) return "Loading...";
        const parts = [];
        const docs = s?.documents ?? {};
        if (docs.pendingOnly > 0) parts.push(`${docs.pendingOnly} pending`);
        if (docs.processing > 0) parts.push(`${docs.processing} processing`);
        if (docs.ready > 0) parts.push(`${docs.ready} ready`);
        if (docs.released > 0) parts.push(`${docs.released} released`);
        return parts.length ? parts.join(", ") : "No pending documents";
      })(),
      icon: FileText,
      bgColor: "bg-orange-50",
      link: "/professor/document-status",
    },
    {
      title: "Completed",
      value: loading ? "—" : String(s?.completedThisMonth ?? 0),
      description: "This month",
      icon: CheckCircleIcon,
      bgColor: "bg-green-50",
      link: "/professor/transactions",
    },
  ];

  const todayAppointments = dashStats?.todayAppointments ?? [];
  const recentActivity = dashStats?.recentActivity ?? [];

  // Pinned announcements only, capped to the top 2 for the dashboard preview
  // (mirrors stud-dashboard.jsx's own pinned-announcements derivation).
  const allPinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const pinnedPreview = allPinnedAnnouncements.slice(0, 2);
  const morePinnedCount = allPinnedAnnouncements.length - pinnedPreview.length;

  // Each tile carries its own stable `gradientIndex` (rather than deriving
  // color from array position) so reordering this array never silently
  // changes a tile's color — mirrors stud-dashboard.jsx's own approach.
  const quickActions = [
    {
      label: "Announcements",
      description: "Stay updated with the latest notices from your department.",
      icon: MegaphoneIcon,
      path: "/professor/announcements",
      gradientIndex: 1,
      badge: `${allPinnedAnnouncements.length} Pinned`,
    },
    {
      label: "Schedule Manager",
      description: "Set your weekly recurring availability by day. It repeats every week until you edit or remove it.",
      icon: CalendarIcon,
      path: "/professor/schedule-manager",
      gradientIndex: 3,
      // no badge — the professor's schedule doesn't have a single live count
      // worth surfacing here the way pending appointments/documents do
    },
    {
      label: "Appointments",
      description: "Review and manage student appointment requests.",
      icon: Calendar,
      path: "/professor/appointments",
      gradientIndex: 2,
      badge: `${s?.pendingAppointments ?? 0} Pending`,
    },
    {
      label: "Document Requests",
      description: "Request documents and track their status.",
      icon: FileText,
      path: "/professor/document-request",
      gradientIndex: 4,
      badge: `${s?.documentsToReview ?? 0} Pending`,
    },
    {
      label: "Transactions",
      description: "View all your activities and transactions.",
      icon: ClipboardListIcon,
      path: "/professor/transactions",
      gradientIndex: 1,
      // no badge — matches the student dashboard's badge-less Transactions tile
    },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────
  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
    >
        <div className="professor-dashboard">
          {dashError && <div className="dash-error-banner">{dashError}</div>}

          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <p className="banner-greeting">Good day!</p>
              <div className="banner-title-row">
                <img
                  src={getCollegeLogo(user?.college)}
                  alt="College Logo"
                  className="banner-ccs-logo"
                />
                <h1 className="banner-title">Prof. {user?.name ?? "Faculty"}</h1>
              </div>
              <div className="banner-badges">
                <span className="badge">Professor Portal</span>
                <span className="badge">{user?.employeeId ?? ""}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="dash-stats-grid">
            {stats.map((stat) => (
              <Link key={stat.title} to={stat.link} className="dash-stat-card-link">
                <div className="dash-stat-card">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                  <p className={`dash-stat-value ${loading ? "stat-loading" : ""}`}>
                    {stat.value}
                  </p>
                  <p className="stat-title">{stat.title}</p>
                  <p className="stat-description">{stat.description}</p>
                </div>
              </Link>
            ))}
          </div>


          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="section-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <Link key={action.path} to={action.path} className="quick-action-link">
                  <div className="quick-action-card">
                    <div className="action-main">
                      <div className={`action-icon action-gradient-${action.gradientIndex}`}>
                        <action.icon />
                      </div>
                      <div className="action-body">
                        {action.badge && (
                          <span className="action-badge action-badge-right">
                            {action.badge}
                          </span>
                        )}
                        <h3 className="action-title">{action.label}</h3>
                        <p className="action-description">{action.description}</p>
                        <div className="action-cta">
                          <span>Open</span>
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Preview Grid: Today's Appointments + Pinned Announcements */}
          <div className="preview-grid">
            {/* Today's Appointments */}
            <div className="appointments-preview-card">
              <div className="card-header">
                <h3 className="card-title">
                  <CalendarIcon />
                  Today's Appointments
                </h3>
                <Link to="/professor/appointments" className="view-all-btn">
                  View All <ChevronRightIcon />
                </Link>
              </div>
              <div className="card-content">
                {loading ? (
                  <p className="activity-loading">Loading appointments...</p>
                ) : todayAppointments.length === 0 ? (
                  <div className="empty-content">
                    <div className="empty-icon">
                      <CalendarIcon />
                    </div>
                    <p>No appointments scheduled for today.</p>
                  </div>
                ) : (
                  <>
                    {todayAppointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="appointment-item">
                        <div className="appointment-icon">
                          <CalendarIcon />
                        </div>
                        <div className="appointment-details">
                          <p className="appointment-student">{apt.student}</p>
                          <span className="appointment-student-id-badge">{apt.studentNumber}</span>
                          <p className="appointment-consult-type">{apt.appointmentType}</p>
                        </div>
                        <div className="appointment-time-status">
                          <p className="appointment-time">{apt.time}</p>
                          <span
                            className={`appt-status-badge appt-status-badge--${apt.status}`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {todayAppointments.length > 3 && (
                      <Link to="/professor/appointments" className="pinned-more-link">
                        + {todayAppointments.length - 3} more today
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Pinned Announcements */}
            <div className="announcements-card">
              <div className="card-header">
                <h3 className="card-title">
                  <MegaphoneIcon />
                  Pinned Announcements
                </h3>
                <Link to="/professor/announcements" className="view-all-btn">
                  View All <ChevronRightIcon />
                </Link>
              </div>
              <div className="card-content announcements-content">
                {allPinnedAnnouncements.length === 0 ? (
                  <div className="empty-content">
                    <div className="empty-icon">
                      <MegaphoneIcon />
                    </div>
                    <p>No pinned announcements</p>
                  </div>
                ) : (
                  pinnedPreview.map((ann) => (
                    <Link
                      key={ann.id}
                      to="/professor/announcements"
                      className="pinned-announcement-card pinned-announcement-pinned"
                    >
                      <div className="pinned-announcement-icon">
                        <MegaphoneIcon />
                      </div>
                      <div className="pinned-announcement-content">
                        <p className="pinned-announcement-title">{ann.title}</p>
                        <div className="pinned-announcement-meta">
                          <span className="pinned-announcement-college">
                            {ann.college}
                          </span>
                          <span className="pinned-announcement-date">
                            {formatManilaDateTime(ann.date)}
                          </span>
                        </div>
                        {ann.description && (
                          <p className="pinned-announcement-description">
                            {ann.description}
                          </p>
                        )}
                      </div>
                      <span className="pinned-announcement-badge pinned-badge-pinned">
                        Pinned
                      </span>
                    </Link>
                  ))
                )}
                {morePinnedCount > 0 && (
                  <Link to="/professor/announcements" className="pinned-more-link">
                    + {morePinnedCount} more pinned
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <section className="recent-activity-section">
            <div className="section-header">
              <h2>Recent Activity</h2>
              <Link to="/professor/transactions" className="view-all-link">
                See All <ChevronRightIcon />
              </Link>
            </div>
            <div className="activity-card">
              <div className="activity-list">
                {loading ? (
                  <p className="activity-loading">Loading...</p>
                ) : recentActivity.length === 0 ? (
                  <p className="activity-empty">No recent activity.</p>
                ) : (
                  recentActivity.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className={`activity-icon ${item.type === "document" ? "activity-document" : "activity-appointment"}`}>
                        {item.type === "document" ? <FileText /> : <CalendarIcon />}
                      </div>
                      <div className="activity-details">
                        <p className="activity-title">{item.title}</p>
                        <p className="activity-time">{item.time}</p>
                      </div>
                      <span
                        className={
                          item.type === "document"
                            ? `appt-status-badge activity-status-doc-${item.status}`
                            : `appt-status-badge appt-status-badge--${item.status}`
                        }
                      >
                        {formatActivityStatus(item.status, item.type)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Office Hours */}
          <section className="prof-office-hours-card">
            <div className="prof-hours-header">
              <h2 className="prof-hours-title">
                <ClockIcon />
                Office Hours
              </h2>
              {!officeHoursLoading && officeHours && (
                <span className="prof-hours-dept">
                  {officeHours.departmentName} ({officeHours.departmentAbbrev})
                </span>
              )}
            </div>
            <div className="prof-hours-body">
              {officeHoursLoading ? (
                <p className="prof-hours-loading">Loading office hours...</p>
              ) : officeHoursError ? (
                <p className="prof-hours-empty">
                  {officeHoursError}{" "}
                  <button
                    className="breadcrumb-link"
                    style={{ display: "inline", padding: 0 }}
                    onClick={fetchOfficeHours}
                  >
                    Retry
                  </button>
                </p>
              ) : !officeHours ? (
                <p className="prof-hours-empty">No office hours available.</p>
              ) : (
                <>
                  <div className="prof-hours-schedule">
                    {parseOfficeHoursSchedule(officeHours.officeHours).map((entry, i) => (
                      <div key={i} className="prof-hours-item">
                        <p className="prof-hours-day">{entry.day}</p>
                        <p className="prof-hours-time">{entry.time}</p>
                      </div>
                    ))}
                  </div>
                  {officeHours.officeLocation && (
                    <div className="prof-hours-location">
                      <span className="prof-hours-location-label">Location:</span>
                      <span className="prof-hours-location-value">{officeHours.officeLocation}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
    </ProfessorPageShell>
  );
}
