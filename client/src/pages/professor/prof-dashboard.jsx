import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText, Megaphone } from "lucide-react";
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
const FileEditIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);
const CalendarClockIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <circle cx="17" cy="17" r="3"></circle>
    <polyline points="17 15.5 17 17 18 18"></polyline>
  </svg>
);
const MegaphoneIcon = () => <Megaphone className="icon" />;

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
      const res = await api.get("/faculty/dashboard-stats");
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
      const { data } = await api.get("/faculty/announcements");
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
      const res = await api.get("/faculty/office-hours");
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
      // This card always counts every upcoming pending/approved appointment,
      // not just this week -- the Appointment Manager page now defaults to a
      // "This Week" view, so the caption keeps the two numbers from looking
      // like a mismatch/bug.
      description: loading
        ? "Loading..."
        : `${s?.todayAppointments ?? 0} for today · All upcoming`,
      icon: CalendarIcon,
      bgColor: "bg-violet-50",
      link: "/professor/appointments",
    },
    {
      title: "Documents",
      value: loading ? "—" : String(s?.documentsToReview ?? 0),
      description: "Pending requests",
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

  // Position in this array is load-bearing: quick-actions-grid renders cards
  // via a positional `action-gradient-${index+1}` CSS class (prof-dashboard.css).
  const quickActions = [
    {
      label: "Announcements",
      description: "Notices and updates for faculty in your department",
      icon: MegaphoneIcon,
      path: "/professor/announcements",
      badge: `${allPinnedAnnouncements.length} Pinned`,
    },
    {
      label: "Appointments",
      description: "Review and manage student appointment requests.",
      icon: CalendarIcon,
      path: "/professor/appointments",
      // no badge — matches the student dashboard's badge-less "Appointment Booking" tile
    },
    {
      label: "Schedule Manager",
      description: "Set your consultation hours",
      icon: CalendarClockIcon,
      path: "/professor/schedule-manager",
      badge: "Schedule",
    },
    {
      label: "Document Request",
      description: "Submit a new document request",
      icon: FileEditIcon,
      path: "/professor/document-request",
      badge: "Documents",
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
          <div className="stats-grid">
            {stats.map((stat) => (
              <Link key={stat.title} to={stat.link} className="stat-card-link">
                <div className="stat-card">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                  <p className={`stat-value ${loading ? "stat-loading" : ""}`}>
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
              {quickActions.map((action, index) => (
                <Link key={action.path} to={action.path} className="quick-action-link">
                  <div className="quick-action-card">
                    <div className="action-main">
                      <div className={`action-icon action-gradient-${index + 1}`}>
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
                  <CalendarClockIcon />
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
                      <CalendarClockIcon />
                    </div>
                    <p>No appointments scheduled for today.</p>
                  </div>
                ) : (
                  <>
                    {todayAppointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="appointment-item">
                        <div className="appointment-icon">
                          <CalendarClockIcon />
                        </div>
                        <div className="appointment-details">
                          <p className="appointment-student">{apt.student}</p>
                          <p className="appointment-purpose">{apt.purpose}</p>
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
                  <p className="announcement-empty">No pinned announcements.</p>
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
              <div className="card-content">
                <div className="activity-list">
                  {loading ? (
                    <p className="activity-loading">Loading...</p>
                  ) : recentActivity.length === 0 ? (
                    <p className="activity-empty">No recent activity.</p>
                  ) : (
                    recentActivity.map((item) => (
                      <div key={item.id} className="activity-item">
                        <div className="activity-icon activity-appointment">
                          <CalendarClockIcon />
                        </div>
                        <div className="activity-details">
                          <p className="activity-title">{item.title}</p>
                          <p className="activity-time">{item.time}</p>
                        </div>
                        <span
                          className={`appt-status-badge appt-status-badge--${item.status}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
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
