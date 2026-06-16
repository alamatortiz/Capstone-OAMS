import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Sample Announcements Data ─────────────────────────────────────────────────
const ANNOUNCEMENTS_DATA = [
  {
    id: "1",
    title: "Enrollment Period for Second Semester",
    description: "The enrollment period for the second semester AY 2025-2026 will be from April 1-15, 2026. Please prepare all necessary documents and settle any outstanding balances before enrollment.",
    college: "College of Computing Studies (CCS)",
    date: "2026-03-25",
    category: "important",
    isPinned: true,
    icon: "alert",
  },
  {
    id: "2",
    title: "System Maintenance Notice",
    description: "The OAMS system will undergo scheduled maintenance on March 29, 2026, from 12:00 to 6:00 AM. Services will be temporarily unavailable during this period.",
    college: "All Departments",
    date: "2026-03-26",
    category: "important",
    isPinned: true,
    icon: "alert",
  },
  {
    id: "3",
    title: "Career Fair 2026",
    description: "Join us for the University Career Fair on April 10, 2026, at the University Gymnasium. Meet with potential employers and learn about career opportunities.",
    college: "College of Business Accountancy and Administration (CBAA)",
    date: "2026-03-24",
    category: "event",
    isPinned: false,
    icon: "calendar",
  },
  {
    id: "4",
    title: "Thesis Defense Schedule",
    description: "Final thesis defense schedules for graduating students are now available. Please check with your respective department offices for your assigned date and time.",
    college: "College of Engineering (COE)",
    date: "2026-03-23",
    category: "reminder",
    isPinned: false,
    icon: "bell",
  },
  {
    id: "5",
    title: "Scholarship Application Open",
    description: "Scholarship applications for Academic Year 2026-2027 are now open. Deadline for submission is April 30, 2026. Visit the Scholarship Office for more details.",
    college: "All Departments",
    date: "2026-03-22",
    category: "general",
    isPinned: false,
    icon: "alert",
  },
  {
    id: "6",
    title: "Library Extended Hours",
    description: "The University Library will extend its operating hours during the examination period. Open from 7:00 AM to 10:00 PM starting April 1, 2026.",
    college: "All Departments",
    date: "2026-03-21",
    category: "general",
    isPinned: false,
    icon: "bell",
  },
  {
    id: "7",
    title: "Health and Wellness Week",
    description: "Join us for Health and Wellness Week from April 5-9, 2026. Free health screenings, fitness activities, and mental health awareness programs will be available.",
    college: "College of Health and Allied Sciences (CHAS)",
    date: "2026-03-20",
    category: "event",
    isPinned: false,
    icon: "calendar",
  },
  {
    id: "8",
    title: "Clearance Processing Reminder",
    description: "Graduating students are reminded to start their clearance processing. Please settle all obligations and return borrowed items to avoid delays.",
    college: "All Departments",
    date: "2026-03-19",
    category: "reminder",
    isPinned: false,
    icon: "bell",
  },
  {
    id: "9",
    title: "Research Symposium",
    description: "The Annual Research Symposium will be held on April 15, 2026. Students are encouraged to attend and learn from research presentations across all disciplines.",
    college: "College of Arts and Sciences (CAS)",
    date: "2026-03-18",
    category: "event",
    isPinned: false,
    icon: "calendar",
  },
  {
    id: "10",
    title: "Student Council Elections",
    description: "Filing of candidacy for Student Council Elections is now open until April 5, 2026. Voting will take place on April 20-22, 2026.",
    college: "All Departments",
    date: "2026-03-17",
    category: "general",
    isPinned: false,
    icon: "alert",
  },
  {
    id: "11",
    title: "Practicum Orientation",
    description: "Mandatory practicum orientation for education students will be held on April 8, 2026, at 2:00 PM in the AVR. Attendance is required.",
    college: "College of Education (COEd)",
    date: "2026-03-16",
    category: "important",
    isPinned: false,
    icon: "alert",
  },
  {
    id: "12",
    title: "No Classes on April 9",
    description: "In observance of the Day of Valor, there will be no classes on April 9, 2026. Regular schedule resumes on April 10, 2026.",
    college: "All Departments",
    date: "2026-03-15",
    category: "general",
    isPinned: false,
    icon: "bell",
  },
];

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

  // ── UI State ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [selectedFilter, setSelectedFilter] = useState("all");
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

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "important", label: "Important" },
    { id: "event", label: "Events" },
    { id: "reminder", label: "Reminders" },
    { id: "general", label: "General" },
  ];

  // ── Filtered announcements ──────────────────────────────────────────────────
  const pinnedAnnouncements = ANNOUNCEMENTS_DATA.filter(a => a.isPinned);
  const filteredAnnouncements = ANNOUNCEMENTS_DATA.filter(ann => {
    if (selectedFilter === "all") return true;
    return ann.category === selectedFilter;
  }).filter(a => !a.isPinned);

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
    if (lowerInput.includes("announcement")) {
      const total = ANNOUNCEMENTS_DATA.length;
      const pinned = pinnedAnnouncements.length;
      return `There are currently ${total} announcements, with ${pinned} pinned as important. You can filter by category using the tabs above!`;
    } else if (lowerInput.includes("important")) {
      return "Important announcements are marked with red badges. We have 3 important announcements currently visible. Check them out to stay updated!";
    } else if (lowerInput.includes("event") || lowerInput.includes("activity")) {
      const events = ANNOUNCEMENTS_DATA.filter(a => a.category === "event");
      return `There are ${events.length} upcoming events. Click on 'Events' tab to see all of them!`;
    } else if (lowerInput.includes("enrollment")) {
      return "The enrollment period for the second semester is from April 1-15, 2026. Make sure to prepare your documents and settle any outstanding balances!";
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
    { icon: CalendarIconNav, label: "Appointments", path: "/student/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/student/transactions" },
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

  const getAnnouncementIcon = (icon) => {
    switch (icon) {
      case "alert":
        return <AlertCircleIcon />;
      case "calendar":
        return <CalendarIcon />;
      case "bell":
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
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
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
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
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
          {/* Page Header */}
          <div className="announcements-header-section">
            <div className="announcements-header-top">
              <button
                className="announcements-back-link"
                onClick={() => navigate("/student/dashboard")}
              >
                <ChevronLeftIcon />
                Dashboard
              </button>

              <div className="header-badge">{ANNOUNCEMENTS_DATA.length} Total</div>
            </div>

            <div className="page-header">
              <div className="header-left">
                <div className="announcement-header-icon">
                  <MegaphoneIcon />
                </div>

                <div className="header-text">
                  <h1>Announcements</h1>
                  <p>Stay updated with the latest notices</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
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

          {/* Pinned Announcements Section */}
          {selectedFilter === "all" && pinnedAnnouncements.length > 0 && (
            <section className="announcements-section">
              <h2 className="section-title">Pinned Announcements</h2>
              <div className="announcements-list">
                {pinnedAnnouncements.map((announcement) => (
                  <div key={announcement.id} className={`announcement-card ${getCategoryColor(announcement.category)}`}>
                    <div className="announcement-header">
                      <div className="announcement-icon">
                        {getAnnouncementIcon(announcement.icon)}
                      </div>
                      <div className="announcement-content">
                        <h3 className="announcement-title">{announcement.title}</h3>
                        <p className="announcement-description">{announcement.description}</p>
                        <div className="announcement-meta">
                          <span className="announcement-college">{announcement.college}</span>
                          <span className="announcement-date">
                            {new Date(announcement.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <span className={`announcement-badge badge-${announcement.category}`}>
                        {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Announcements Section */}
          <section className="announcements-section">
            <h2 className="section-title">
              {selectedFilter === "all" ? "All Announcements" : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Announcements`}
            </h2>
            {filteredAnnouncements.length === 0 ? (
              <div className="empty-state">
                <BellIcon />
                <p>No announcements in this category</p>
              </div>
            ) : (
              <div className="announcements-list">
                {filteredAnnouncements.map((announcement) => (
                  <div key={announcement.id} className={`announcement-card ${getCategoryColor(announcement.category)}`}>
                    <div className="announcement-header">
                      <div className="announcement-icon">
                        {getAnnouncementIcon(announcement.icon)}
                      </div>
                      <div className="announcement-content">
                        <h3 className="announcement-title">{announcement.title}</h3>
                        <p className="announcement-description">{announcement.description}</p>
                        <div className="announcement-meta">
                          <span className="announcement-college">{announcement.college}</span>
                          <span className="announcement-date">
                            {new Date(announcement.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <span className={`announcement-badge badge-${announcement.category}`}>
                        {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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