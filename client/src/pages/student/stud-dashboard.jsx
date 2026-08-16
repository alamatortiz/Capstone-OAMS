import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText, Megaphone as LucideMegaphone, GraduationCap as LucideGraduationCap, Users as LucideUsers, ClipboardList as LucideClipboardList } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useQueue } from "../../contexts/QueueContext";
import StudentPageShell from "../../components/StudentPageShell";
import { QueueIconNav, CalendarIconNav } from "../../components/StudentSidebar";
import QueueProgressBars from "../../components/QueueProgressBars";
import { Link } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

import "./stud-dashboard.css";
import api from "../../utils/api";
import { formatManilaDateTime, parseOfficeHoursSchedule } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";

// ─── Dashboard Content Icons ──────────────────────────────────────────────────
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
const AlertCircleIcon = (props) => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
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
const ListIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);
const GraduationCapIcon = () => <LucideGraduationCap className="icon" />;
const MegaphoneIcon = () => <LucideMegaphone className="icon" />;
const QueueIcon = () => <LucideUsers className="icon" />;
const DocumentsIcon = () => <FileText className="icon" />;
const TransactionsIcon = () => <LucideClipboardList className="icon" />;

const formatActivityStatus = (status, type) => {
  if (!status) return "";
  if (status === "no_show") return "No Show";
  if (type === "document" && status === "generated") return "Ready";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user: authUser, token } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        studentNumber: authUser.studentNumber ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
        course: authUser.course ?? "N/A Course",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        studentId: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
        course: "",
      };

  const { getActiveQueues, isLoading: queueLoading } = useQueue();

  // ── Dashboard data state ──────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  // ── Pinned announcements state ────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState(null);

  // ── Office hours state ────────────────────────────────────────────────────
  const [officeHours, setOfficeHours] = useState(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true);
  const [officeHoursError, setOfficeHoursError] = useState(null);

  // Mirror the latest data for the catch blocks below, without making the
  // fetch callbacks depend on (and change identity with) the state itself.
  const dashStatsRef = useRef(dashStats);
  useEffect(() => { dashStatsRef.current = dashStats; }, [dashStats]);
  const announcementsRef = useRef(announcements);
  useEffect(() => { announcementsRef.current = announcements; }, [announcements]);

  // ── Fetch dashboard stats from backend ───────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/student/dashboard-stats");
      setDashStats(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
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

  // ── Fetch announcements from backend ──────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get("/student/announcements");
      setAnnouncements(res.data?.announcements ?? []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      if (announcementsRef.current.length === 0) {
        setAnnouncementsError("Could not load announcements.");
      } else {
        toast.error("Could not refresh announcements.");
      }
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchAnnouncements();
  }, [authUser, fetchAnnouncements]);

  // ── Live updates: refetch dashboard data when relevant socket events fire ──
  useEffect(() => {
    if (!authUser || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const statsEvents = [
      "document:status-updated",
      "appointment:status-updated",
      "queue:called",
      "queue:served",
      "queue:no-show",
    ];
    statsEvents.forEach((event) => socket.on(event, fetchStats));
    socket.on("announcement:changed", fetchAnnouncements);

    return () => {
      statsEvents.forEach((event) => socket.off(event, fetchStats));
      socket.off("announcement:changed", fetchAnnouncements);
    };
  }, [authUser, token, fetchStats, fetchAnnouncements]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  // Unlike QueueProvider, this page had no such safety net: if the socket
  // never connects (e.g. a network that blocks WebSocket upgrades), stats
  // and announcements would never update again without a manual reload.
  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
        fetchAnnouncements();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [authUser, fetchStats, fetchAnnouncements]);

  // ── Fetch office hours from backend ───────────────────────────────────────
  const fetchOfficeHours = useCallback(async () => {
    try {
      setOfficeHoursLoading(true);
      const res = await api.get("/student/office-hours");
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

  // Pinned announcements only, capped to the top 2 for the dashboard preview
  const allPinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const pinnedPreview = allPinnedAnnouncements.slice(0, 2);
  const morePinnedCount = allPinnedAnnouncements.length - pinnedPreview.length;

  const getAnnouncementIcon = (category) => {
    switch (category) {
      case "event":
        return <CalendarIcon />;
      case "reminder":
        return <BellIcon />;
      default:
        return <AlertCircleIcon />;
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  // The "Active Queue" preview reads exclusively from QueueContext (the same
  // source stud-queue-status.jsx uses) instead of also considering
  // dashStats.activeQueue -- the two used to be refreshed by different,
  // non-identical socket event sets and could show contradictory
  // position/status for the same queue. dashStats is still used below for
  // the other stat tiles (appointments/documents/completed) that have no
  // QueueContext equivalent. Field names are normalized (serviceName ->
  // service, departmentName -> college, estimatedWait -> estimatedWaitTime)
  // to match what the preview card below renders.
  const contextQueues = getActiveQueues();
  // Sort so index [0] is always the closest to being served -- a 'serving'
  // entry always wins (its position is null, not a sortable number), then
  // fall back to position ascending among the rest.
  const closestContextQueue = contextQueues.length > 0
    ? [...contextQueues].sort((a, b) => {
        if (a.status === "serving" && b.status !== "serving") return -1;
        if (b.status === "serving" && a.status !== "serving") return 1;
        return (a.position ?? Infinity) - (b.position ?? Infinity);
      })[0]
    : null;
  const mostRecentQueue = closestContextQueue
    ? {
        ...closestContextQueue,
        service: closestContextQueue.serviceName,
        college: closestContextQueue.departmentName,
        estimatedWaitTime: closestContextQueue.estimatedWait,
      }
    : null;
  const activeQueueCount = contextQueues.length;

  // Two distinct progress measures, mirroring the Queue Management page:
  // 1) how full the queue is (occupied slots vs. max capacity)
  // 2) how far along the queue has been serviced (serviced people vs. total occupied slots)
  const queueOccupancyPercent = mostRecentQueue
    ? mostRecentQueue.queueOccupancyPercent ?? 0
    : 0;
  const servicedPercent = mostRecentQueue
    ? mostRecentQueue.servicedPercent ?? 0
    : 0;

  // ── Stats cards (live values) ─────────────────────────────────────────────
  const stats = [
    {
      title: "Queue Position",
      value: queueLoading
        ? "—"
        : mostRecentQueue?.status === "serving"
          ? (mostRecentQueue.arrivedAt ? <>Being<br />Served</> : "Called")
          : String(mostRecentQueue?.position ?? 0),
      isStatusValue: !queueLoading && mostRecentQueue?.status === "serving",
      badge: queueLoading ? null : (mostRecentQueue?.queueNumberBadge ?? null),
      description: queueLoading
        ? "Loading..."
        : activeQueueCount > 0
          ? `Waiting in ${activeQueueCount} queue${activeQueueCount > 1 ? "s" : ""}`
          : "No Active Queues",
      icon: ClockIcon,
      color: "text-blue-600",
      bgColor: "dash-bg-blue-50 dark:bg-blue-950",
      link: "/student/queue-status",
    },
    {
      title: "Appointments",
      value: dashLoading
        ? "—"
        : String(dashStats?.stats?.appointments?.upcoming ?? 0),
      description: (() => {
        if (dashLoading) return "Loading...";
        const parts = [];
        const pending = dashStats?.stats?.appointments?.pending ?? 0;
        const approved = dashStats?.stats?.appointments?.approved ?? 0;
        if (pending > 0) parts.push(`${pending} pending`);
        if (approved > 0) parts.push(`${approved} approved`);
        return parts.length ? parts.join(", ") : "No pending appointments";
      })(),
      icon: CalendarIcon,
      color: "text-purple-600",
      bgColor: "dash-bg-purple-50 dark:bg-purple-950",
      link: "/student/appointment-status",
    },
    {
      title: "Documents",
      value: dashLoading
        ? "—"
        : String(dashStats?.stats?.documents?.total ?? 0),
      description: (() => {
        if (dashLoading) return "Loading...";
        const parts = [];
        const docs = dashStats?.stats?.documents ?? {};
        if (docs.pendingOnly > 0) parts.push(`${docs.pendingOnly} pending`);
        if (docs.processing > 0) parts.push(`${docs.processing} processing`);
        if (docs.ready > 0) parts.push(`${docs.ready} ready`);
        if (docs.released > 0) parts.push(`${docs.released} released`);
        return parts.length ? parts.join(", ") : "No pending documents";
      })(),
      icon: FileText,
      color: "text-orange-600",
      bgColor: "dash-bg-orange-50 dark:bg-orange-950",
      link: "/student/document-status",
    },
    {
      title: "Completed",
      value: dashLoading ? "—" : String(dashStats?.stats?.completed ?? 0),
      description: "Total transactions",
      icon: CheckCircleIcon,
      color: "text-emerald-600",
      bgColor: "dash-bg-emerald-50 dark:bg-emerald-950",
      link: "/student/transactions",
    },
  ];

  // ── Quick actions (badges are live, sourced from the same status
  // definitions each destination page uses for its own counts) ─────────────
  const quickActions = [
    {
      title: "Announcements",
      description: "Stay updated with the latest notices from your department.",
      icon: MegaphoneIcon,
      link: "/student/announcements",
      gradientIndex: 1,
      badge: `${allPinnedAnnouncements.length} Pinned`,
    },
    {
      title: "Professor Schedules",
      description: "Check professor consultation hours and availability across all departments.",
      icon: GraduationCapIcon,
      link: "/student/professor-schedules",
      gradientIndex: 4,
      badge: `${dashStats?.stats?.totalFacultyCount ?? 0} Faculty`,
    },
    {
      title: "Queues",
      description: "Join queues and track your position in real-time.",
      icon: QueueIcon,
      link: "/student/queue",
      gradientIndex: 3,
      badge: `${activeQueueCount} Participating Queues`,
    },
    {
      title: "Appointments",
      description:
        "Schedule appointments with professors and view available slots.",
      icon: CalendarIcon,
      link: "/student/appointments",
      gradientIndex: 2,
      badge: `${dashStats?.stats?.appointments?.active ?? 0} Active Bookings`,
    },
    {
      title: "Document Requests",
      description: "Request documents and track their status.",
      icon: DocumentsIcon,
      link: "/student/documents",
      gradientIndex: 6,
      badge: `${dashStats?.stats?.documents?.total ?? 0} Active Requests`,
    },
    {
      title: "Transactions",
      description: "View all your activities and transactions.",
      icon: TransactionsIcon,
      link: "/student/transactions",
      gradientIndex: 1,
    },
  ];

  // ── Recent activity (live from API, fallback to empty) ────────────────────
  const recentActivity = dashStats?.recentActivity ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="dash-with-sidebar"
      mainClassName="dash-main"
    >
        <div className="student-dashboard">
          {/* Error banner */}
          {dashError && (
            <div className="dash-error-banner">
              <AlertCircleIcon /> {dashError}
            </div>
          )}

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
                <h1 className="banner-title">{user?.name ?? "Student"}</h1>
              </div>
              <div className="banner-badges">
                <span className="dash-badge">Student Portal</span>
                <span className="dash-badge">
                  {user?.studentNumber ?? "Student Number"}
                </span>
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
                  <p
                    className={`dash-stat-value ${dashLoading ? "stat-loading" : ""} ${stat.isStatusValue ? "dash-stat-value-status" : ""}`}
                  >
                    {stat.value}
                  </p>
                  {stat.badge && (
                    <span className="stat-queue-number-badge">
                      {stat.badge}
                    </span>
                  )}
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
                <Link
                  key={action.title}
                  to={action.link}
                  className="quick-action-link"
                >
                  <div className="quick-action-card">
                    <div className="action-main">
                      <div
                        className={`action-icon action-gradient-${action.gradientIndex}`}
                      >
                        <action.icon />
                      </div>
                      <div className="action-body">
                        {action.badge && (
                          <span className="action-badge action-badge-right">
                            {action.badge}
                          </span>
                        )}
                        <h3 className="action-title">{action.title}</h3>
                        <p className="action-description">
                          {action.description}
                        </p>
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

          {/* Live Preview Row */}
          <div className="preview-grid">
            {/* Active Queue Preview */}
            {mostRecentQueue ? (
              <div className="queue-preview-card">
                <div className="card-header">
                  <h3 className="dash-card-title">
                    <QueueIconNav />
                    Active Queue
                  </h3>
                  <Link to="/student/queue-status" className="view-all-btn">
                    View All <ChevronRightIcon />
                  </Link>
                </div>
                <div className="card-content">
                  <div className="queue-service-info">
                    <img
                      src={getCollegeLogo(mostRecentQueue.college)}
                      alt={mostRecentQueue.college}
                      className="college-logo"
                    />
                    <div className="queue-service-details">
                      <div className="service-row">
                        <div className="service-name-stack">
                          <p className="service-name">
                            {mostRecentQueue.service}
                          </p>
                          <p className="college-name">{mostRecentQueue.college}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {mostRecentQueue.slotStatus === "paused" && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "#f59e0b",
                        borderRadius: "999px",
                        padding: "0.2rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        margin: "0.5rem 0",
                      }}
                    >
                      <AlertCircleIcon style={{ width: "0.9rem", height: "0.9rem" }} />
                      Paused{mostRecentQueue.slotPauseReason ? `: ${mostRecentQueue.slotPauseReason}` : ""}
                    </div>
                  )}
                  <div className="queue-stats">
                    <div className="dash-queue-stat">
                      <p className="stat-num">
                        {mostRecentQueue.status === "serving"
                          ? (mostRecentQueue.arrivedAt ? "Being Served" : "Called")
                          : mostRecentQueue.position}
                      </p>
                      <p className="dash-stat-label">Position</p>
                    </div>
                    <div className="dash-queue-stat">
                      <p className="stat-num">{mostRecentQueue.totalWaiting}</p>
                      <p className="dash-stat-label">Waiting</p>
                    </div>
                    <div
                      className={`dash-queue-stat${
                        mostRecentQueue.status === "serving"
                          ? " dash-queue-stat--serving"
                          : ""
                      }`}
                    >
                      <p className="stat-num-sm">
                        {mostRecentQueue.estimatedWaitTime}
                      </p>
                      <p className="dash-stat-label">Est. Wait</p>
                    </div>
                  </div>
                  <QueueProgressBars
                    occupancyCurrent={mostRecentQueue.totalInQueue ?? 0}
                    occupancyTotal={mostRecentQueue.maxCapacity ?? 0}
                    occupancyPercent={queueOccupancyPercent}
                    servicedCurrent={mostRecentQueue.servicedCount ?? 0}
                    servicedTotal={mostRecentQueue.totalInQueue ?? 0}
                    servicedPercent={servicedPercent}
                  />
                </div>
              </div>
            ) : (
              <div className="queue-preview-card empty">
                <div className="card-header">
                  <h3 className="dash-card-title">
                    <QueueIconNav />
                    Active Queue
                  </h3>
                </div>
                <div className="card-content empty-content">
                  <div className="empty-icon">
                    <QueueIconNav />
                  </div>
                  <p>No Active Queues.</p>
                </div>
              </div>
            )}

            {/* Pinned Announcements */}
            <div className="announcements-card">
              <div className="card-header">
                <h3 className="dash-card-title">
                  <MegaphoneIcon />
                  Pinned Announcements
                </h3>
                <Link to="/student/announcements" className="view-all-btn">
                  View All <ChevronRightIcon />
                </Link>
              </div>
              <div className="card-content announcements-content">
                {announcementsLoading ? (
                  <p className="announcement-loading">
                    Loading announcements...
                  </p>
                ) : announcementsError ? (
                  <p className="announcement-empty">{announcementsError}</p>
                ) : allPinnedAnnouncements.length === 0 ? (
                  <div className="empty-content">
                    <div className="empty-icon">
                      <MegaphoneIcon />
                    </div>
                    <p>No pinned announcements.</p>
                  </div>
                ) : (
                  pinnedPreview.map((ann) => (
                    <Link
                      key={ann.id}
                      to="/student/announcements"
                      className="pinned-announcement-card pinned-announcement-pinned"
                    >
                      <div className="pinned-announcement-icon">
                        {getAnnouncementIcon(ann.category)}
                      </div>
                      <div className="pinned-announcement-content">
                        <p className="pinned-announcement-title">
                          {ann.title}
                        </p>
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
                        {ann.category
                          ? ann.category.charAt(0).toUpperCase() +
                            ann.category.slice(1)
                          : "Notice"}
                      </span>
                    </Link>
                  ))
                )}
                {morePinnedCount > 0 && (
                  <Link to="/student/announcements" className="pinned-more-link">
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
              <Link to="/student/transactions" className="view-all-link">
                See All <ChevronRightIcon />
              </Link>
            </div>
            <div className="activity-card">
              {dashLoading ? (
                <div className="activity-list">
                  <p className="activity-loading">Loading activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="activity-list">
                  <p className="activity-empty">No recent activity yet.</p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((activity) => {
                    // A sent document shares document's icon/badge treatment
                    // -- same visual family, just the opposite direction
                    // (already disambiguated by the "Sent: ..." title text).
                    const isDocLike = activity.type === "document" || activity.type === "submission";
                    return (
                      <div key={activity.id} className="activity-item">
                        <div
                          className={`activity-icon activity-${isDocLike ? "document" : activity.type}`}
                        >
                          {activity.type === "queue" && <QueueIconNav />}
                          {activity.type === "appointment" && <CalendarIconNav />}
                          {isDocLike && <FileText />}
                        </div>
                        <div className="activity-details">
                          <p className="activity-title">{activity.title}</p>
                          <p className="activity-college">{activity.college}</p>
                          <p className="activity-time">{activity.time}</p>
                        </div>
                        <span
                          className={`activity-badge ${
                            isDocLike
                              ? `activity-status-doc-${activity.status}`
                              : `activity-status-${activity.status}`
                          }`}
                        >
                          {formatActivityStatus(activity.status, activity.type)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Office Hours */}
          <section className="stud-office-hours-card">
            <div className="stud-hours-header">
              <h2 className="stud-hours-title">
                <ClockIcon />
                Office Hours
              </h2>
              {!officeHoursLoading && officeHours && (
                <span className="stud-hours-dept">
                  {officeHours.departmentName} ({officeHours.departmentAbbrev})
                </span>
              )}
            </div>
            <div className="stud-hours-body">
              {officeHoursLoading ? (
                <p className="stud-hours-loading">Loading office hours...</p>
              ) : officeHoursError ? (
                <p className="stud-hours-empty">
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
                <p className="stud-hours-empty">No office hours available.</p>
              ) : (
                <>
                  <div className="stud-hours-schedule">
                    {parseOfficeHoursSchedule(officeHours.officeHours).map((entry, i) => (
                      <div key={i} className="stud-hours-item">
                        <p className="stud-hours-day">{entry.day}</p>
                        <p className="stud-hours-time">{entry.time}</p>
                      </div>
                    ))}
                  </div>
                  {officeHours.officeLocation && (
                    <div className="stud-hours-location">
                      <span className="stud-hours-location-label">Location:</span>
                      <span className="stud-hours-location-value">{officeHours.officeLocation}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

        </div>
    </StudentPageShell>
  );
}
