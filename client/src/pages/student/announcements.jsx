import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";
import api from "../../utils/api";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";

import "./announcements.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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

// ─── Content Icons ────────────────────────────────────────────────────────────
const MegaphoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11v2" />
    <path d="M6 10v4" />
    <path d="M10 8l8-3v14l-8-3H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4z" />
    <path d="M10 16l1.5 4" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg
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

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Loader2Icon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
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
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
        course: "",
      };

  const navigate = useNavigate();
  const location = useLocation();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCollege, setSelectedCollege] = useState("all");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. Ask me about announcements or any college updates!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Live data state (replaces the old static ANNOUNCEMENTS_DATA array) ────
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState(null);

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    setAnnError(null);
    try {
      const { data } = await api.get("/student/announcements");
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      console.error("Fetch announcements error:", err);
      setAnnError("Could not load announcements. Please try again.");
    } finally {
      setAnnLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "important", label: "Important" },
    { id: "event", label: "Events" },
    { id: "reminder", label: "Reminders" },
    { id: "general", label: "General" },
  ];

  // ── College options derived from live data: each department that actually
  //    has at least one announcement, keyed by abbreviation (e.g. "CCS").
  //    Global notices (departmentAbbrev "ALL") are excluded from the option
  //    list itself but always remain visible regardless of which college is
  //    selected, since they apply to every department by definition. ───────
  const collegeOptions = useMemo(() => {
    const seen = new Map();
    announcements.forEach((a) => {
      if (a.departmentAbbrev !== "ALL" && !seen.has(a.departmentAbbrev)) {
        seen.set(a.departmentAbbrev, a.departmentName);
      }
    });
    return [...seen.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([abbrev, name]) => ({ abbrev, name }));
  }, [announcements]);

  // ── Filtered announcements (category tab + department dropdown both apply).
  //    Selecting a college (e.g. "CCS") shows that college's announcements
  //    PLUS global ("All Departments") ones -- never hides global notices. ──
  const pinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const filteredAnnouncements = announcements
    .filter((a) => selectedFilter === "all" || a.category === selectedFilter)
    .filter(
      (a) =>
        selectedCollege === "all" ||
        a.departmentAbbrev === selectedCollege ||
        a.departmentAbbrev === "ALL",
    )
    .filter((a) => !a.isPinned);

  // ── Chat handlers ──────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };

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
    if (lowerInput.includes("announcement")) {
      const total = announcements.length;
      const pinned = pinnedAnnouncements.length;
      return `There are currently ${total} announcements, with ${pinned} pinned as important. You can filter by category or college using the controls above!`;
    } else if (lowerInput.includes("important")) {
      const importantCount = announcements.filter(
        (a) => a.category === "important",
      ).length;
      return `Important announcements are marked with red badges. We have ${importantCount} important announcement(s) currently visible. Check them out to stay updated!`;
    } else if (
      lowerInput.includes("event") ||
      lowerInput.includes("activity")
    ) {
      const events = announcements.filter((a) => a.category === "event");
      return `There are ${events.length} upcoming events. Click on 'Events' tab to see all of them!`;
    } else if (
      lowerInput.includes("college") ||
      lowerInput.includes("department")
    ) {
      return "Use the College dropdown to filter announcements down to a specific department, or leave it on 'All Colleges' to see everything.";
    } else {
      return "I can help you find announcements, learn about upcoming events, deadlines, and more. What would you like to know?";
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

  const getCategoryColor = (category) => {
    const colors = {
      important: "announcement-important",
      event: "announcement-event",
      reminder: "announcement-reminder",
      general: "announcement-general",
    };
    return colors[category] || colors.general;
  };

  const getAnnouncementIcon = (category) => {
    switch (category) {
      case "important":
        return <AlertCircleIcon />;
      case "event":
        return <CalendarIcon />;
      case "reminder":
        return <BellIcon />;
      default:
        return <AlertCircleIcon />;
    }
  };

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
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
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
        <div className="announcements-page">
          {/* Header */}
          <div className="ann-page-header">
            <div className="ann-breadcrumb">
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeftIcon />
                Dashboard
              </Link>
            </div>
            <div className="ann-title-row">
              <div className="ann-header-icon">
                <MegaphoneIcon />
              </div>
              <div>
                <h1 className="ann-page-title">Announcements</h1>
                <p className="ann-page-subtitle">Stay updated with the latest notices</p>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {annError && (
            <div className="empty-state">
              <AlertCircleIcon />
              <p>{annError}</p>
              <button className="filter-tab" onClick={fetchAnnouncements}>
                Retry
              </button>
            </div>
          )}

          {/* Filter Tabs + College Filter */}
          <div className="ann-filters-card">
            <div className="filter-tabs">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`filter-tab ${selectedFilter === tab.id ? "active" : ""}`}
                  onClick={() => setSelectedFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="ann-college-wrapper">
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                aria-label="Filter by college"
                className="ann-college-select"
              >
                <option value="all">All Colleges</option>
                {collegeOptions.map((opt) => (
                  <option key={opt.abbrev} value={opt.abbrev}>
                    {opt.name} ({opt.abbrev})
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>

          {/* Loading state */}
          {annLoading && (
            <div className="empty-state">
              <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading announcements…</p>
            </div>
          )}

          {/* Pinned Announcements Section */}
          {!annLoading &&
            selectedFilter === "all" &&
            selectedCollege === "all" &&
            pinnedAnnouncements.length > 0 && (
              <section className="announcements-section">
                <h2 className="section-title">Pinned Announcements</h2>
                <div className="announcements-list">
                  {pinnedAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-card ${getCategoryColor(announcement.category)}`}
                    >
                      <div className="announcement-header">
                        <div className="announcement-icon">
                          {getAnnouncementIcon(announcement.category)}
                        </div>
                        <div className="announcement-content">
                          <h3 className="announcement-title">
                            {announcement.title}
                          </h3>
                          <p className="announcement-description">
                            {announcement.description}
                          </p>
                          <div className="announcement-meta">
                            <span className="announcement-college">
                              {announcement.college}
                            </span>
                            <span className="announcement-date">
                              {new Date(announcement.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`announcement-badge badge-${announcement.category}`}
                        >
                          {announcement.category.charAt(0).toUpperCase() +
                            announcement.category.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* All Announcements Section */}
          {!annLoading && (
            <section className="announcements-section">
              <h2 className="section-title">
                {selectedFilter === "all"
                  ? "All Announcements"
                  : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Announcements`}
              </h2>
              {filteredAnnouncements.length === 0 ? (
                <div className="empty-state">
                  <BellIcon />
                  <p>No announcements match these filters</p>
                </div>
              ) : (
                <div className="announcements-list">
                  {filteredAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-card ${getCategoryColor(announcement.category)}`}
                    >
                      <div className="announcement-header">
                        <div className="announcement-icon">
                          {getAnnouncementIcon(announcement.category)}
                        </div>
                        <div className="announcement-content">
                          <h3 className="announcement-title">
                            {announcement.title}
                          </h3>
                          <p className="announcement-description">
                            {announcement.description}
                          </p>
                          <div className="announcement-meta">
                            <span className="announcement-college">
                              {announcement.college}
                            </span>
                            <span className="announcement-date">
                              {new Date(announcement.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`announcement-badge badge-${announcement.category}`}
                        >
                          {announcement.category.charAt(0).toUpperCase() +
                            announcement.category.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
