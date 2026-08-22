import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./adm-dashboard.css";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";
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
const BellIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
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
const PlusIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
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
    description: "Verify QR codes and view document details",
    path: "/admin/scan-document",
  },
  {
    icon: HostQueueIcon,
    iconColor: "bg-blue-500",
    title: "Host Queue",
    description: "Manage and host student queues",
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

  // ── Derived values ────────────────────────────────────────────────────────
  const s = dashStats?.stats;
  const loading = dashLoading;

  const stats = [
    {
      title: "Active Queues",
      value: loading ? "—" : String(s?.activeQueues ?? 0),
      description: "Across all colleges",
      icon: ClockIcon,
      bgColor: "bg-blue-50",
      isClickable: true,
      ctaAriaLabel: "View queue management for active queues",
    },
    {
      title: "Pending Documents",
      value: loading ? "—" : String(s?.pendingDocuments ?? 0),
      description: "Awaiting processing",
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
      title: "Announcements",
      value: loading ? "—" : String(s?.announcements ?? 0),
      description: "Published",
      icon: BellIcon,
      bgColor: "bg-green-50",
      isClickable: true,
      ctaAriaLabel: "View announcement management",
    },
  ];

  const pendingDocuments = dashStats?.pendingDocuments ?? [];
  const hostedQueues = dashStats?.hostedQueues ?? [];
  const facultyAvailability = dashStats?.facultyAvailability ?? [];
  const announcements = dashStats?.announcements ?? [];

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
    if (statTitle === "Announcements") {
      navigate("/admin/announcements");
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
              <h1 className="banner-title">Admin Dashboard</h1>
              <p className="banner-subtitle">{user?.college}</p>
              <div className="banner-badges">
                <div className="welcome-admin-badge">
                  <img
                    src={
                      new URL(
                        `../../assets/${user?.departmentAbbrev || "CCS"}.png`,
                        import.meta.url,
                      ).href
                    }
                    alt="College Logo"
                    className="welcome-admin-logo"
                  />
                  <span className="badge">Administrator</span>
                </div>
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
                    System administration and configuration tools
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
                    Access frequently used admin tools
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

          {/* Announcement Management */}
          <section className="announcement-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <BellIcon />
                <h2>Announcement Management</h2>
              </div>
              <button
                className="btn-new-announcement"
                onClick={() => navigate("/admin/announcements")}
              >
                <PlusIcon />
                New Announcement
              </button>
            </div>
            <div className="announcements-list">
              {loading ? (
                <p className="activity-loading">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                <p className="activity-empty">No announcements yet.</p>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="announcement-item">
                    <div className="announcement-content">
                      <h4 className="announcement-title">
                        {ann.isPinned && (
                          <span style={{ marginRight: "0.3rem" }}>📌</span>
                        )}
                        {ann.title}
                      </h4>
                      <p className="announcement-description">
                        {ann.description}
                      </p>
                      <div className="announcement-important-date">
                        <span className={`announcement-tag tag-audience-${ann.audience || "students"}`}>
                          {ann.audience === "faculty" ? "Faculty" : "Students"}
                        </span>
                        {(ann.audience || "students") === "students" && (
                          <span
                            className={`announcement-tag tag-${ann.isPinned ? "pinned" : ann.tag || "general"}`}
                          >
                            {ann.tag || "general"}
                          </span>
                        )}
                        <span className="announcement-date">{ann.date}</span>
                      </div>
                    </div>
                    <div className="announcement-actions">
                      <button
                        type="button"
                        className="btn-announcement-icon btn-announcement-edit"
                        aria-label={`Edit: ${ann.title}`}
                        onClick={() => navigate("/admin/announcements")}
                      >
                        <img
                          className="btn-announcement-icon-img"
                          src={editIcon}
                          alt=""
                        />
                      </button>
                      <button
                        type="button"
                        className="btn-announcement-icon btn-announcement-delete"
                        aria-label={`Delete: ${ann.title}`}
                        onClick={() => navigate("/admin/announcements")}
                      >
                        <img
                          className="btn-announcement-icon-img"
                          src={deleteIcon}
                          alt=""
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Two Column: Pending Docs + Hosted Queues */}
          <div className="admin-grid-2col">
            <section className="pending-documents-section">
              <div className="card-header-admin">
                <h3>Pending Requested Documents</h3>
                <a
                  href="/admin/document-processing"
                  className="view-all-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/document-processing");
                  }}
                >
                  View All <ChevronRightIcon />
                </a>
              </div>
              <div className="documents-list">
                {loading ? (
                  <p className="activity-loading">Loading...</p>
                ) : pendingDocuments.length === 0 ? (
                  <p className="activity-empty">No pending documents.</p>
                ) : (
                  pendingDocuments.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-info">
                        <p className="document-name">
                          {doc.name}
                          {doc.requesterType === "faculty" && (
                            <span className="document-requester-badge">Faculty</span>
                          )}
                        </p>
                        <p className="document-type">{doc.document}</p>
                        <div className="document-meta-row">
                          <span
                            className={`document-college college-${doc.college}`}
                          >
                            {doc.college}
                          </span>
                          <span className="document-date">{doc.date}</span>
                        </div>
                      </div>
                      <span className={`document-badge badge-${doc.status}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="hosted-queues-section">
              <div className="card-header-admin">
                <h3>Current Hosted Queues</h3>
                <a
                  href="/admin/queue"
                  className="view-all-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/queue");
                  }}
                >
                  Manage <ChevronRightIcon />
                </a>
              </div>
              <div className="admin-queues-list">
                {loading ? (
                  <p className="activity-loading">Loading...</p>
                ) : hostedQueues.length === 0 ? (
                  <p className="activity-empty">No active queues today.</p>
                ) : (
                  hostedQueues.map((queue) => (
                    <div key={queue.id} className="queue-item">
                      <div className="queue-info">
                        <p className="queue-name">{queue.name}</p>
                      </div>
                      <div className="queue-status-info">
                        <span
                          className={`queue-badge badge-${queue.status.toLowerCase()}`}
                        >
                          {queue.status}
                        </span>
                        <span className="queue-count">{queue.count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Faculty Availability */}
          <section className="faculty-availability-section">
            <div className="card-header-admin">
              <h3>Faculty Availability Today</h3>
              <a
                href="/admin/professor-availability"
                className="view-all-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/admin/professor-availability");
                }}
              >
                View All Faculty <ChevronRightIcon />
              </a>
            </div>
            <div className="faculty-grid">
              {loading ? (
                <p className="activity-loading">Loading...</p>
              ) : facultyAvailability.length === 0 ? (
                <p className="activity-empty">No faculty data available.</p>
              ) : (
                facultyAvailability.map((f) => (
                  <div key={f.id} className="faculty-card">
                    <div
                      className={`faculty-indicator ${f.status.toLowerCase()}`}
                    ></div>
                    <p className="faculty-name">{f.name}</p>
                    <p className="faculty-college">{f.college}</p>
                    <p className="faculty-time">{f.time}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
    </AdminPageShell>
  );
}
