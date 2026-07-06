import { useState, useEffect } from "react";
import { FileText, Megaphone as LucideMegaphone, GraduationCap as LucideGraduationCap } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useQueue } from "../../contexts/QueueContext";
import StudentPageShell from "../../components/StudentPageShell";
import QueueProgressBars from "../../components/QueueProgressBars";
import ChatWidget from "../../components/ChatWidget";

import { Link } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

import "./stud-dashboard.css";
import api from "../../utils/api";

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
const AlertCircleIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
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
const GraduationCapIcon = () => <LucideGraduationCap className="icon" />;
const TimerIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="13" r="8"></circle>
    <path d="M12 9v4l3 2"></path>
    <path d="M7 2h10"></path>
  </svg>
);
const MegaphoneIcon = () => <LucideMegaphone className="icon" />;

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user: authUser } = useAuth();
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

  const { getActiveQueues } = useQueue();

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

  // ── Fetch dashboard stats from backend ───────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setDashLoading(true);
        const res = await api.get("/student/dashboard-stats");
        setDashStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setDashError("Could not load dashboard data.");
      } finally {
        setDashLoading(false);
      }
    };

    if (authUser) fetchStats();
  }, [authUser]);

  // ── Fetch announcements from backend ──────────────────────────────────────
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const res = await api.get("/student/announcements");
        setAnnouncements(res.data?.announcements ?? []);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
        setAnnouncementsError("Could not load announcements.");
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    if (authUser) fetchAnnouncements();
  }, [authUser]);

  // ── Fetch office hours from backend ───────────────────────────────────────
  useEffect(() => {
    const fetchOfficeHours = async () => {
      try {
        const res = await api.get("/student/office-hours");
        setOfficeHours(res.data);
      } catch (err) {
        console.error("Failed to fetch office hours:", err);
      } finally {
        setOfficeHoursLoading(false);
      }
    };
    if (authUser) fetchOfficeHours();
  }, [authUser]);

  const parseSchedule = (hoursStr) => {
    if (!hoursStr) return [];
    return hoursStr.split(/,\s*(?=[A-Z])/).map((entry) => {
      const colonIdx = entry.indexOf(": ");
      if (colonIdx === -1) return { day: entry.trim(), time: "" };
      return {
        day: entry.substring(0, colonIdx).trim(),
        time: entry.substring(colonIdx + 2).trim(),
      };
    });
  };

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

  // ── Derived values from API response ─────────────────────────────────────
  const apiQueue = dashStats?.activeQueue ?? null;
  // Fallback to QueueContext (for locally-joined queues before page refresh)
  const contextQueues = getActiveQueues();
  // Sort by position ascending so index [0] is always the closest to being served
  const closestContextQueue = contextQueues.length > 0
    ? [...contextQueues].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity))[0]
    : null;
  const mostRecentQueue = apiQueue ?? closestContextQueue ?? null;
  const activeQueueCount =
    dashStats?.stats?.activeQueueCount ?? contextQueues.length;

  // Two distinct progress measures, mirroring the Queue Management page:
  // 1) how full the queue is (people in queue vs. max capacity)
  // 2) how far along the queue has been serviced (serviced vs. total in queue)
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
      value: dashLoading ? "—" : String(dashStats?.stats?.queuePosition ?? 0),
      badge: dashLoading ? null : (dashStats?.stats?.queueNumberBadge ?? null),
      description: dashLoading
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
      description: dashLoading
        ? "Loading..."
        : dashStats?.stats?.appointments?.pending > 0
          ? `${dashStats.stats.appointments.pending} pending approval`
          : "No pending appointments",
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
      description: dashLoading
        ? "Loading..."
        : dashStats?.stats?.documents?.pending > 0
          ? `${dashStats.stats.documents.pending} pending approval`
          : "No pending documents",
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

  // ── Quick actions (badge for active queues is now live) ───────────────────
  const quickActions = [
    {
      title: "Announcements",
      description: "Stay updated with the latest notices from all colleges.",
      icon: MegaphoneIcon,
      link: "/student/announcements",
      gradient: "from-violet-500 to-purple-600",
      badge: `${allPinnedAnnouncements.length} Pinned`,
    },
    {
      title: "Appointment Booking",
      description:
        "Schedule appointments with professors and view available slots.",
      icon: CalendarIcon,
      link: "/student/appointments",
      gradient: "from-indigo-500 to-purple-600",
      badge: "New Slots",
    },
    {
      title: "Queue Tracking",
      description:
        "View detailed analytics and history of all your queue activities.",
      icon: ActivityIcon,
      link: "/student/queue-tracking",
      gradient: "from-cyan-500 to-blue-600",
      badge: "Analytics",
    },
    {
      title: "Professor Schedules",
      description: "Check faculty consultation hours and room availability.",
      icon: GraduationCapIcon,
      link: "/student/professor-schedules",
      gradient: "from-sky-500 to-blue-600",
      badge: "13 Faculty",
    },
  ];

  // ── Recent activity (live from API, fallback to empty) ────────────────────
  const recentActivity = dashStats?.recentActivity ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes("queue") || lowerInput.includes("position")) {
      return mostRecentQueue
        ? `You're currently at position ${mostRecentQueue.position} in the ${mostRecentQueue.service} queue. Estimated wait: ${mostRecentQueue.estimatedWaitTime}.`
        : "You don't have any active queues. Would you like to join one?";
    } else if (lowerInput.includes("appointment")) {
      const count = dashStats?.stats?.appointments?.upcoming ?? 0;
      return `You have ${count} upcoming appointment${count !== 1 ? "s" : ""} this week. Visit the Appointments section for details.`;
    } else if (lowerInput.includes("document")) {
      const total = dashStats?.stats?.documents?.total ?? 0;
      const pending = dashStats?.stats?.documents?.pending ?? 0;
      return `You have ${total} document${total !== 1 ? "s" : ""} on file${pending > 0 ? `, with ${pending} pending approval` : ""}.`;
    } else if (lowerInput.includes("service") || lowerInput.includes("help")) {
      return "I can help you with queue information, appointments, documents, announcements, and more. What would you like to know?";
    } else {
      return "That's a great question! For more detailed assistance, please visit the respective section or contact your college office.";
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="dash-with-sidebar"
      mainClassName="dash-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
          getBotResponse={generateBotResponse}
          accent="dark"
        />
      }
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
                  src={
                    new URL(
                      `../../assets/${user?.departmentAbbrev || "CCS"}.png`,
                      import.meta.url,
                    ).href
                  }
                  alt="College Logo"
                  className="banner-ccs-logo"
                />
                <h1 className="banner-title">{user?.name ?? "Student"}</h1>
              </div>
              <div className="banner-badges">
                <span className="dash-badge">Student Portal</span>
                <span className="dash-badge">AY 2025–2026</span>
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
                    className={`dash-stat-value ${dashLoading ? "stat-loading" : ""}`}
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
              <span className="section-count">
                {quickActions.length} features available
              </span>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <Link
                  key={action.title}
                  to={action.link}
                  className="quick-action-link"
                >
                  <div className="quick-action-card">
                    <div className="action-main">
                      <div
                        className={`action-icon action-gradient-${index + 1}`}
                      >
                        <action.icon />
                      </div>
                      <div className="action-body">
                        <span className="action-badge action-badge-right">
                          {action.badge}
                        </span>
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
                    <TimerIcon />
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
                        <span className="queue-number">
                          {mostRecentQueue.queueNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="queue-stats">
                    <div className="dash-queue-stat">
                      <p className="stat-num">{mostRecentQueue.position}</p>
                      <p className="dash-stat-label">Position</p>
                    </div>
                    <div className="dash-queue-stat">
                      <p className="stat-num">{mostRecentQueue.totalWaiting}</p>
                      <p className="dash-stat-label">Waiting</p>
                    </div>
                    <div className="dash-queue-stat">
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
                    <TimerIcon />
                    Active Queue
                  </h3>
                </div>
                <div className="card-content empty-content">
                  <div className="empty-icon">
                    <ClockIcon />
                  </div>
                  <p>No Active Queues</p>
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
                  <p className="announcement-empty">
                    No pinned announcements.
                  </p>
                ) : (
                  pinnedPreview.map((ann) => (
                    <Link
                      key={ann.id}
                      to="/student/announcements"
                      className={`pinned-announcement-card pinned-announcement-${ann.category || "general"}`}
                    >
                      <div className="pinned-announcement-icon">
                        {getAnnouncementIcon(ann.category)}
                      </div>
                      <div className="pinned-announcement-content">
                        <p className="pinned-announcement-title">
                          {ann.title}
                        </p>
                        {ann.description && (
                          <p className="pinned-announcement-description">
                            {ann.description}
                          </p>
                        )}
                        <div className="pinned-announcement-meta">
                          <span className="pinned-announcement-college">
                            {ann.college}
                          </span>
                          <span className="pinned-announcement-date">
                            {new Date(ann.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`pinned-announcement-badge pinned-badge-${ann.category || "general"}`}
                      >
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
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div
                        className={`activity-icon activity-${activity.type}`}
                      >
                        {activity.type === "queue" && <ClockIcon />}
                        {activity.type === "appointment" && <CalendarIcon />}
                        {activity.type === "document" && <FileTextIcon />}
                      </div>
                      <div className="activity-details">
                        <p className="activity-title">{activity.title}</p>
                        <p className="activity-college">{activity.college}</p>
                        <p className="activity-time">{activity.time}</p>
                      </div>
                      <span
                        className={`activity-badge activity-status-${activity.status}`}
                      >
                        {activity.status}
                      </span>
                    </div>
                  ))}
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
              ) : !officeHours ? (
                <p className="stud-hours-empty">No office hours available.</p>
              ) : (
                <>
                  <div className="stud-hours-schedule">
                    {parseSchedule(officeHours.officeHours).map((entry, i) => (
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
