import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./adm-dashboard.css";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";
import { getCollegeLogo } from "../../data/collegeLogo";
import { parseOfficeHoursSchedule } from "../../utils/dateTime";
import AdminPageShell from "../../components/AdminPageShell";

// ── Icons (all unchanged from original) ──────────────────────────────────────
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
const FileTextIcon = () => <FileText className="icon" />;
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
const CheckIcon = () => (
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
const AlertIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
  </svg>
);
const DatabaseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: "1.5rem", height: "1.5rem" }}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" />
    <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" fill="none" />
    <path d="M21 11v6c0 1.66-4.03 3-9 3S3 18.66 3 17v-6" fill="none" />
  </svg>
);
const QueueAnalyticsIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const QRCodeIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
  </svg>
);
const HostQueueIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

// ── Static tool/action arrays ─────────────────────────────────────────────────
// User Management and Pinnacle Sync moved to the separate superadmin area
// (see pages/superadmin/) -- both are system-wide, cross-department tools,
// not the kind of thing a department-scoped admin ("secretary" role)
// should be managing.
const adminTools = [
  {
    icon: DatabaseIcon,
    iconColor: "bg-data-mgmt",
    title: "Data Management",
    description: "Configure settings",
    path: "/admin/data-management",
  },
  {
    icon: QueueAnalyticsIcon,
    iconColor: "bg-blue-600",
    title: "Queue Analytics",
    description: "Performance metrics",
    path: "/admin/queue-analytics",
  },
];
const quickActions = [
  {
    icon: QRCodeIcon,
    iconColor: "bg-scan-doc",
    title: "Scan Document",
    description: "Verify QR codes and view document details.",
    path: "/admin/scan-document",
  },
  {
    icon: HostQueueIcon,
    iconColor: "bg-blue-500",
    title: "Host Queue",
    description: "Manage and host student queues.",
    path: "/admin/queue-hosting",
  },
];

export default function AdminDashboard() {
  const { user: authUser, token } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Admin",
        role: "admin",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();

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
      const res = await api.get("/admin/dashboard-stats");
      setDashStats(res.data);
    } catch (err) {
      console.error("Failed to fetch admin dashboard stats:", err);
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

  // ── Live updates: the "Active Queues" stat and "Current Hosted Queues"
  // list previously only populated on mount with no socket or poll, so they
  // could sit arbitrarily stale until the admin navigated away and back.
  useEffect(() => {
    if (!authUser || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const events = [
      "queue:slot-opened",
      "queue:slot-status",
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:student-joined",
      "queue:student-left",
    ];
    events.forEach((event) => socket.on(event, fetchStats));
    return () => {
      events.forEach((event) => socket.off(event, fetchStats));
    };
  }, [authUser, token, fetchStats]);

  // ── Fallback poll: covers a silently-dropped/blocked WebSocket connection,
  // same pattern as QueueProvider.jsx / stud-dashboard.jsx ──
  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [authUser, fetchStats]);

  // ── Office hours (mirrors stud-dashboard.jsx / prof-dashboard.jsx) ────────
  const [officeHours, setOfficeHours] = useState(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true);
  const [officeHoursError, setOfficeHoursError] = useState(null);

  const fetchOfficeHours = useCallback(async () => {
    try {
      setOfficeHoursLoading(true);
      const res = await api.get("/admin/office-hours");
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
      title: "Active Queues",
      value: loading ? "—" : String(s?.activeQueues ?? 0),
      description: loading
        ? ""
        : `${s?.activeQueuesFull ?? 0} full · ${s?.activeQueuesPaused ?? 0} paused`,
      icon: ClockIcon,
      bgColor: "bg-blue-50",
      isClickable: true,
      ctaAriaLabel: "View queue management for active queues",
    },
    {
      title: "Pending Documents",
      value: loading ? "—" : String(s?.pendingDocuments ?? 0),
      description: loading ? "" : `${s?.pendingProcessing ?? 0} processing`,
      icon: FileTextIcon,
      bgColor: "bg-orange-50",
      isClickable: true,
      ctaAriaLabel: "View document processing for pending documents",
    },
    {
      title: "Faculty Available",
      value: loading ? "—" : String(s?.facultyAvailable ?? 0),
      description: "Today",
      icon: UsersIcon,
      bgColor: "bg-emerald-50",
      isClickable: true,
      ctaAriaLabel: "View faculty availability",
    },
    {
      title: "Completed",
      value: loading ? "—" : String(s?.completedToday ?? 0),
      description: "Completed today",
      icon: CheckIcon,
      bgColor: "bg-green-50",
      isClickable: true,
      ctaAriaLabel: "View transactions",
    },
  ];

  const facultyAvailability = dashStats?.facultyAvailability ?? [];

  // ── Handler for clicking stat cards ────────────────────────────────────────
  const handleStatCardClick = (statTitle) => {
    if (statTitle === "Active Queues") {
      navigate("/admin/queue");
      return;
    }
    if (statTitle === "Pending Documents") {
      navigate("/admin/document-processing");
      return;
    }
    if (statTitle === "Faculty Available") {
      navigate("/admin/professor-availability");
      return;
    }
    if (statTitle === "Completed") {
      navigate("/admin/transactions");
    }
  };

  return (
    <AdminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
    >
        <div className="admin-dashboard">
          {dashError && <div className="dash-error-banner">{dashError}</div>}

          {/* Welcome Banner */}
          <div className="welcome-banner admin-banner">
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
                <h1 className="banner-title">{user?.name ?? "Administrator"}</h1>
              </div>
              <div className="banner-badges">
                <span className="badge">Admin Portal</span>
                <span className="badge">{user?.employeeId}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className={`stat-card ${stat.isClickable ? "stat-card-clickable" : ""}`}
                onClick={() =>
                  stat.isClickable && handleStatCardClick(stat.title)
                }
                role={stat.isClickable ? "button" : undefined}
                tabIndex={stat.isClickable ? 0 : undefined}
                aria-label={stat.isClickable ? stat.ctaAriaLabel : undefined}
                onKeyPress={(e) => {
                  if (
                    stat.isClickable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    handleStatCardClick(stat.title);
                  }
                }}
              >
                <div className="stat-header">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                </div>
                <p className="stat-title">{stat.title}</p>
                <p className={`stat-value ${loading ? "stat-loading" : ""}`}>
                  {stat.value}
                </p>
                <p className="stat-description">{stat.description}</p>
              </div>
            ))}
          </div>

          {/* Admin Management */}
          <section className="admin-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <AlertIcon />
                <div className="section-title-admin-text">
                  <h2>Admin Management</h2>
                  <p className="section-subtitle">
                    System administration and configuration tools.
                  </p>
                </div>
              </div>
            </div>
            <div className="admin-tools-grid">
              {adminTools.map((tool) => (
                <div
                  key={tool.title}
                  className="admin-tool-card"
                  onClick={() => tool.path && navigate(tool.path)}
                  role={tool.path ? "button" : undefined}
                  tabIndex={tool.path ? 0 : undefined}
                  style={tool.path ? { cursor: "pointer" } : undefined}
                  onKeyPress={(e) => {
                    if (tool.path && (e.key === "Enter" || e.key === " ")) {
                      navigate(tool.path);
                    }
                  }}
                >
                  <div className={`admin-tool-icon ${tool.iconColor}`}>
                    <tool.icon />
                  </div>
                  <div className="admin-tool-text">
                    <h3 className="tool-title">{tool.title}</h3>
                    <p className="tool-description">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <CheckIcon />
                <div className="section-title-admin-text">
                  <h2>Quick Actions</h2>
                  <p className="section-subtitle">
                    Access frequently used admin tools.
                  </p>
                </div>
              </div>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="quick-action-card"
                  onClick={() => action.path && navigate(action.path)}
                  role={action.path ? "button" : undefined}
                  tabIndex={action.path ? 0 : undefined}
                  style={action.path ? { cursor: "pointer" } : undefined}
                  onKeyPress={(e) => {
                    if (action.path && (e.key === "Enter" || e.key === " ")) {
                      navigate(action.path);
                    }
                  }}
                >
                  <div className={`action-icon ${action.iconColor}`}>
                    <action.icon />
                  </div>
                  <div className="quick-action-text">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Faculty Availability — professor-dashboard "appointments preview" style, purple */}
          <section className="faculty-avail-preview-card">
            <div className="faculty-avail-card-header">
              <h3 className="faculty-avail-card-title">
                <UsersIcon />
                Faculty Availability Today
              </h3>
              <a
                href="/admin/professor-availability"
                className="faculty-avail-view-all"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/admin/professor-availability");
                }}
              >
                View All <ChevronRightIcon />
              </a>
            </div>
            <div className="faculty-avail-card-content">
              {loading ? (
                <p className="activity-loading">Loading faculty availability...</p>
              ) : facultyAvailability.length === 0 ? (
                <div className="faculty-avail-empty">
                  <div className="faculty-avail-empty-icon">
                    <UsersIcon />
                  </div>
                  <p>No faculty data available.</p>
                </div>
              ) : (
                facultyAvailability.map((f) => (
                  <div key={f.id} className="faculty-avail-item">
                    <div className="faculty-avail-item-icon">
                      <UsersIcon />
                    </div>
                    <div className="faculty-avail-item-details">
                      <p className="faculty-avail-item-name">{f.name}</p>
                      <p className="faculty-avail-item-college">{f.college}</p>
                    </div>
                    <span
                      className={`faculty-avail-item-badge faculty-avail-item-badge--${f.status}`}
                    >
                      <span className="faculty-avail-item-dot"></span>
                      {f.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Office Hours — mirrors stud/prof dashboards */}
          <section className="adm-office-hours-card">
            <div className="adm-hours-header">
              <h2 className="adm-hours-title">
                <ClockIcon />
                Office Hours
              </h2>
              {!officeHoursLoading && officeHours && (
                <span className="adm-hours-dept">
                  {officeHours.departmentName} ({officeHours.departmentAbbrev})
                </span>
              )}
            </div>
            <div className="adm-hours-body">
              {officeHoursLoading ? (
                <p className="adm-hours-loading">Loading office hours...</p>
              ) : officeHoursError ? (
                <p className="adm-hours-empty">
                  {officeHoursError}{" "}
                  <button
                    type="button"
                    className="adm-hours-retry"
                    onClick={fetchOfficeHours}
                  >
                    Retry
                  </button>
                </p>
              ) : !officeHours ? (
                <p className="adm-hours-empty">No office hours available.</p>
              ) : (
                <>
                  <div className="adm-hours-schedule">
                    {parseOfficeHoursSchedule(officeHours.officeHours).map(
                      (entry, i) => (
                        <div key={i} className="adm-hours-item">
                          <p className="adm-hours-day">{entry.day}</p>
                          <p className="adm-hours-time">{entry.time}</p>
                        </div>
                      ),
                    )}
                  </div>
                  {officeHours.officeLocation && (
                    <div className="adm-hours-location">
                      <span className="adm-hours-location-label">Location:</span>
                      <span className="adm-hours-location-value">
                        {officeHours.officeLocation}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
    </AdminPageShell>
  );
}
