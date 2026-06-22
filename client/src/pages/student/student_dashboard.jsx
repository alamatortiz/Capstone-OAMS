import { useState, useRef, useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { useQueue } from "../../contexts/QueueContext";

import { Link, useNavigate } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";

import "./student_dashboard.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36"></path>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const SunIcon = () => (
  <svg
    className="sun-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
const MoonIcon = () => (
  <svg
    className="moon-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

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
const GraduationCapIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21.21 15.89A10 10 0 1 1 8.11 2.05"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
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
const MegaphoneIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
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
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user: authUser, logout } = useAuth();
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
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
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

  // ── Dashboard data state ──────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  // ── Pinned announcements state ────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState(null);

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

  // Pinned announcements only, capped to the top 2 for the dashboard preview
  const pinnedAnnouncements = announcements
    .filter((a) => a.isPinned)
    .slice(0, 2);

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
          : "No active queues",
      icon: ClockIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
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
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      link: "/student/appointments",
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
      icon: FileTextIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      link: "/student/document-status",
    },
    {
      title: "Completed",
      value: dashLoading ? "—" : String(dashStats?.stats?.completed ?? 0),
      description: "Total transactions",
      icon: CheckCircleIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
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
      badge: `${pinnedAnnouncements.length} Pinned`,
    },
    {
      title: "Appointment Booking",
      description:
        "Schedule appointments with professors and view available slots.",
      icon: CalendarIcon,
      link: "/student/appointment-booking",
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
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;
    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInputValue("");
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

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

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/student/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/student/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/student/transactions",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="logo-img oams-logo-img"
              />
            </div>
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? "Student"}</p>
                <span className="user-role-badge">Student</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="nav-item"
                  title={item.label}
                >
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="logo-img oams-logo-img"
            />
          </div>
          <div className="mobile-header-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
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
                <span className="badge">Student Portal</span>
                <span className="badge">AY 2025–2026</span>
                <span className="badge">
                  {user?.studentNumber ?? "Student Number"}
                </span>
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
                  <div className="stat-header"></div>

                  <p
                    className={`stat-value ${dashLoading ? "stat-loading" : ""}`}
                  >
                    {stat.value}
                  </p>
                  {stat.badge && (
                    <span
                      style={{
                        display: "inline-block",
                        background: "rgba(34,197,94,0.15)",
                        color: "var(--primary-color)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "0.375rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                        padding: "0.2rem 0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
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
                  <h3 className="card-title">
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
                        <p className="service-name">
                          {mostRecentQueue.service}
                        </p>
                        <span className="queue-number">
                          {mostRecentQueue.queueNumber}
                        </span>
                      </div>
                      <p className="college-name">{mostRecentQueue.college}</p>
                    </div>
                  </div>
                  <div className="queue-stats">
                    <div className="queue-stat">
                      <p className="stat-num">{mostRecentQueue.position}</p>
                      <p className="stat-label">Position</p>
                    </div>
                    <div className="queue-stat">
                      <p className="stat-num">{mostRecentQueue.totalWaiting}</p>
                      <p className="stat-label">Waiting</p>
                    </div>
                    <div className="queue-stat">
                      <p className="stat-num-sm">
                        {mostRecentQueue.estimatedWaitTime}
                      </p>
                      <p className="stat-label">Est. Wait</p>
                    </div>
                  </div>
                  <div className="qs-progress-card">
                    <div className="queue-progress-group">
                      <div className="queue-progress-wrapper">
                        <div className="qs-progress-label-row">
                          <p className="qs-progress-label">People in Queue</p>
                          <p className="qs-progress-value">
                            {mostRecentQueue.totalInQueue ?? 0}/
                            {mostRecentQueue.maxCapacity ?? 0}
                            <span className="qs-progress-percent">
                              &nbsp;({queueOccupancyPercent}%)
                            </span>
                          </p>
                        </div>
                        <div className="qs-progress-bar">
                          <div
                            className="qs-progress-fill"
                            style={{ width: `${queueOccupancyPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="queue-progress-wrapper">
                        <div className="qs-progress-label-row">
                          <p className="qs-progress-label">Serviced</p>
                          <p className="qs-progress-value">
                            {mostRecentQueue.servicedCount ?? 0}/
                            {mostRecentQueue.totalInQueue ?? 0}
                            <span className="qs-progress-percent">
                              &nbsp;({servicedPercent}%)
                            </span>
                          </p>
                        </div>
                        <div className="qs-progress-bar">
                          <div
                            className="qs-progress-fill qs-progress-fill-serviced"
                            style={{ width: `${servicedPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link to="/student/queue-status" className="primary-btn">
                    View Full Queue Status
                  </Link>
                </div>
              </div>
            ) : (
              <div className="queue-preview-card empty">
                <div className="card-header">
                  <h3 className="card-title">
                    <TimerIcon />
                    Active Queue
                  </h3>
                </div>
                <div className="card-content empty-content">
                  <p>No active queues</p>
                  <Link to="/student/avail-service" className="primary-btn">
                    Join a Queue
                  </Link>
                </div>
              </div>
            )}

            {/* Pinned Announcements */}
            <div className="announcements-card">
              <div className="card-header">
                <h3 className="card-title">
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
                ) : pinnedAnnouncements.length === 0 ? (
                  <p className="announcement-empty">
                    No pinned announcements.
                  </p>
                ) : (
                  pinnedAnnouncements.map((ann) => (
                    <Link
                      key={ann.id}
                      to="/student/announcements"
                      className="announcement-item"
                    >
                      <div className="announcement-icon">
                        <AlertCircleIcon />
                      </div>
                      <div className="announcement-details">
                        <p className="announcement-title">{ann.title}</p>
                        <p className="announcement-college">{ann.college}</p>
                        <p className="announcement-date">
                          {new Date(ann.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="announcement-badge">
                        {ann.category
                          ? ann.category.charAt(0).toUpperCase() +
                            ann.category.slice(1)
                          : "Notice"}
                      </span>
                    </Link>
                  ))
                )}
                <Link to="/student/announcements" className="secondary-btn">
                  <BellIcon /> View All Announcements
                </Link>
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

          {/* Service Hours */}
          <div className="service-hours-card">
            <div className="hours-header">
              <h3 className="hours-title">
                <AlertCircleIcon />
                Service Hours
              </h3>
              <p className="hours-subtitle">
                Office operating hours for all colleges
              </p>
            </div>
            <div className="hours-grid">
              <div>
                <p className="hours-label">Weekdays</p>
                <p className="hours-time">Monday – Friday: 8:00 AM – 5:00 PM</p>
              </div>
              <div>
                <p className="hours-label">Weekends</p>
                <p className="hours-time">
                  Saturday: 8:00 AM – 12:00 PM
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message message-${message.type}`}
                >
                  <div className="message-content">{message.text}</div>
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
