import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import ChatWidget from "../../components/ChatWidget";
import "./prof-dashboard.css";
import api from "../../utils/api";

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
const UsersIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const FileTextIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
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
const ActivityIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setDashLoading(true);
        const res = await api.get("/faculty/dashboard-stats");
        setDashStats(res.data);
      } catch (err) {
        console.error("Failed to fetch faculty dashboard stats:", err);
        setDashError("Could not load dashboard data.");
      } finally {
        setDashLoading(false);
      }
    };
    if (authUser) fetchStats();
  }, [authUser]);

  // ── Derived values ────────────────────────────────────────────────────────
  const s = dashStats?.stats;
  const loading = dashLoading;

  const stats = [
    {
      title: "Pending Appointments",
      value: loading ? "—" : String(s?.pendingAppointments ?? 0),
      description: loading
        ? "Loading..."
        : `${s?.todayAppointments ?? 0} for today`,
      icon: CalendarIcon,
      bgColor: "bg-violet-50",
      link: "/professor/appointments",
    },
    {
      title: "Documents",
      value: loading ? "—" : String(s?.documentsToReview ?? 0),
      description: "Pending requests",
      icon: FileTextIcon,
      bgColor: "bg-orange-50",
      link: "/professor/documents",
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

  const quickActions = [
    {
      label: "Document Request",
      description: "Submit or track document requests",
      icon: FileEditIcon,
      path: "/professor/document-request",
      badge: "Documents",
    },
    {
      label: "Schedule Manager",
      description: "Set your consultation hours",
      icon: CalendarClockIcon,
      path: "/professor/schedule-manager",
      badge: "Schedule",
    },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("appointment"))
      return `You have ${s?.pendingAppointments ?? 0} pending appointments, with ${s?.todayAppointments ?? 0} scheduled for today.`;
    if (i.includes("student"))
      return `You have ${s?.pendingAppointments ?? 0} pending appointments from students.`;
    if (i.includes("document"))
      return `You have ${s?.documentsToReview ?? 0} pending document requests.`;
    if (i.includes("schedule") || i.includes("office hours"))
      return "Your office hours are Monday to Friday, 8:00 AM - 5:00 PM, and Saturday 8:00 AM - 12:00 PM.";
    return "I can help you with appointment management and document reviews. What do you need?";
  };

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
          getBotResponse={generateBotResponse}
        />
      }
    >
        <div className="professor-dashboard">
          {dashError && <div className="dash-error-banner">{dashError}</div>}

          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <p className="banner-greeting">
                Welcome back, Prof. {user?.name?.split(" ")[0]}!
              </p>
              <div className="banner-title-row">
                <img
                  src={
                    new URL(
                      `../../assets/${user?.departmentAbbrev || "CCS"}.png`,
                      import.meta.url,
                    ).href
                  }
                  alt="College Logo"
                  className="banner-ccs-logo"
                />
                <h1 className="banner-title">{user?.college ?? ""}</h1>
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
                        <span className="action-badge action-badge-right">
                          {action.badge}
                        </span>
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

          {/* Today's Appointments */}
          <section className="todays-appointments-section">
            <div className="section-header">
              <h2>Today's Appointments</h2>
              <Link to="/professor/appointments" className="view-all-link">
                View All <ChevronRightIcon />
              </Link>
            </div>
            <div className="appointments-card">
              <div className="appointments-list">
                {loading ? (
                  <p className="activity-loading">Loading appointments...</p>
                ) : todayAppointments.length === 0 ? (
                  <p className="appointment-empty">
                    No appointments scheduled for today.
                  </p>
                ) : (
                  todayAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-item">
                      <div className="appointment-icon">
                        <UsersIcon />
                      </div>
                      <div className="appointment-details">
                        <p
                          className="appointment-student"
                          style={{ textAlign: "justify" }}
                        >
                          {apt.student}
                        </p>
                        <p
                          className="appointment-purpose"
                          style={{ textAlign: "justify" }}
                        >
                          {apt.purpose}
                        </p>
                      </div>
                      <div className="appointment-time-status">
                        <p className="appointment-time">{apt.time}</p>
                        <span
                          className={`appointment-badge status-${apt.status}`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Bottom Grid */}
          <div className="preview-grid">
            {/* Recent Activity */}
            <div className="activity-card">
              <div className="card-header">
                <h3 className="card-title">
                  <ActivityIcon />
                  Recent Activity
                </h3>
                <Link to="/professor/transactions" className="view-all-link">
                  See All <ChevronRightIcon />
                </Link>
              </div>
              <div className="card-content">
                <div className="activity-list">
                  {loading ? (
                    <p className="activity-loading">Loading...</p>
                  ) : recentActivity.length === 0 ? (
                    <p className="activity-empty">No recent activity.</p>
                  ) : (
                    recentActivity.map((item) => (
                      <div key={item.id} className="activity-item-simple">
                        <div className={`activity-dot ${item.dot}`}></div>
                        <div>
                          <p className="activity-text">{item.title}</p>
                          <p className="activity-time">{item.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="service-hours-card">
              <div className="hours-header">
                <h3 className="hours-title">
                  <ClockIcon />
                  Office Hours
                </h3>
              </div>
              <div className="hours-grid">
                <div>
                  <p className="hours-label">Weekdays</p>
                  <p className="hours-time">
                    Monday – Friday: 8:00 AM – 5:00 PM
                  </p>
                </div>
                <div>
                  <p className="hours-label">Weekend</p>
                  <p className="hours-time">
                    Saturday: 8:00 AM – 12:00 PM
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </ProfessorPageShell>
  );
}
