import { useState, useRef, useEffect, useMemo } from "react";
import { GraduationCap as LucideGraduationCap } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";
import api from "../../utils/api";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";

import "./professor-schedules.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ─── Sidebar Icons (unchanged) ─────────────────────────────────────────────
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
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
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

// ─── Content Icons ─────────────────────────────────────────────────────────
const GraduationCapIcon = () => <LucideGraduationCap />;
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
const ChevronLeftIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const BuildingIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="2" width="18" height="20" rx="2" ry="2"></rect>
    <line x1="9" y1="2" x2="9" y2="22"></line>
    <line x1="15" y1="2" x2="15" y2="22"></line>
    <line x1="3" y1="7" x2="21" y2="7"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
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
const MapPinIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
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
const Loader2Icon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
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
const AlertCircleIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfessorSchedule() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate(); // FIX: was missing in the original file
  const location = useLocation();

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

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [viewMode, setViewMode] = useState("departments");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
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

  // ── Live data state ───────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get("/student/professor-schedules");
      setDepartments(data.departments ?? []);
    } catch (err) {
      console.error("Fetch professor schedules error:", err);
      setLoadError("Could not load professor schedules. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // The department currently selected, derived from live data
  const selectedDepartment = useMemo(
    () => departments.find((d) => d.departmentId === selectedDeptId) ?? null,
    [departments, selectedDeptId],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const handleDepartmentSelect = (deptId) => {
    setSelectedDeptId(deptId);
    setViewMode("schedules");
  };

  const handleBack = () => {
    setViewMode("departments");
    setSelectedDeptId(null);
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
    if (
      lowerInput.includes("schedule") ||
      lowerInput.includes("professor") ||
      lowerInput.includes("faculty")
    ) {
      return "You're currently viewing faculty consultation schedules. Each professor has multiple consultation hours throughout the week. Click on any department to see available professors and their availability.";
    } else if (lowerInput.includes("appointment")) {
      return "To book an appointment with a professor, check their consultation hours and visit the Appointment Booking section. You can schedule a meeting during their available times.";
    } else if (lowerInput.includes("help") || lowerInput.includes("service")) {
      return "I can help you with professor schedules, faculty information, consultation hours, and appointment booking. What would you like to know?";
    } else {
      return "That's a great question! For more detailed assistance, please visit the respective section or contact your college office.";
    }
  };

  // Groups a faculty member's flat availability[] into day-ordered buckets
  const getDaySchedules = (professor) => {
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const groupedByDay = {};

    (professor.availability ?? []).forEach((schedule) => {
      if (!groupedByDay[schedule.day]) groupedByDay[schedule.day] = [];
      groupedByDay[schedule.day].push(schedule);
    });

    return dayOrder
      .filter((day) => groupedByDay[day])
      .map((day) => ({ day, schedules: groupedByDay[day] }));
  };

  const navItems = [
    { icon: HomeIcon, label: "Home", path: "/student/dashboard" },
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
        <div className="professor-schedule-page">
          {/* Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              {viewMode === "schedules" ? (
                <button className="breadcrumb-link" onClick={handleBack}>
                  <ChevronLeftIcon />
                  Back to Departments
                </button>
              ) : (
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeftIcon />
                  Home
                </Link>
              )}
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <GraduationCapIcon />
              </div>
              <div>
                <h1 className="queue-title">Professor Schedules</h1>
                <p className="queue-subtitle">View faculty consultation hours and availability</p>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="empty-state">
              <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading professor schedules…</p>
            </div>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="empty-state">
              <AlertCircleIcon />
              <p>{loadError}</p>
              <button
                className="breadcrumb-link"
                style={{ marginTop: "0.5rem" }}
                onClick={fetchSchedules}
              >
                Retry
              </button>
            </div>
          )}

          {/* Departments View */}
          {!loading && !loadError && viewMode === "departments" && (
            <div className="departments-grid">
              {departments.length === 0 ? (
                <div className="empty-state">
                  <AlertCircleIcon />
                  <p>No faculty schedules are available yet.</p>
                </div>
              ) : (
                departments.map((dept) => {
                  const logoSrc = getCollegeLogo(dept.departmentName);
                  const professorCount = dept.faculty?.length ?? 0;

                  return (
                    <div
                      key={dept.departmentId}
                      className="department-card"
                      onClick={() => handleDepartmentSelect(dept.departmentId)}
                    >
                      <div className="card-image-wrapper">
                        <img
                          src={logoSrc}
                          alt={`${dept.departmentName} logo`}
                          className="college-logo-img"
                        />
                      </div>
                      <div className="card-content">
                        <div className="card-right">
                          <div className="card-right-text">
                            <h3 className="card-title">
                              {dept.departmentName}
                            </h3>
                            <p className="card-abbrev">
                              {dept.departmentAbbrev}
                            </p>
                            <div className="card-badge">
                              {professorCount}{" "}
                              {professorCount === 1
                                ? "Faculty"
                                : "Faculty Members"}
                            </div>
                          </div>
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Schedules View */}
          {!loading &&
            !loadError &&
            viewMode === "schedules" &&
            selectedDepartment && (
              <div className="schedules-view">
                {/* Department Header */}
                <div className="department-header-card">
                  <div className="department-header-content">
                    <div className="department-logo-wrapper">
                      <img
                        src={getCollegeLogo(selectedDepartment.departmentName)}
                        alt={selectedDepartment.departmentName}
                        className="department-logo"
                      />
                    </div>
                    <div>
                      <div className="department-header-top">
                        <BuildingIcon />
                        <h2>{selectedDepartment.departmentName}</h2>
                      </div>
                      <p>Faculty consultation schedules and availability</p>
                    </div>
                  </div>
                </div>

                {/* Professors List */}
                <div className="professors-list">
                  {selectedDepartment.faculty.length === 0 ? (
                    <div className="empty-state">
                      <AlertCircleIcon />
                      <p>No faculty members found for this department.</p>
                    </div>
                  ) : (
                    selectedDepartment.faculty.map((professor) => (
                      <div key={professor.facultyId} className="professor-card">
                        <div className="professor-header">
                          <div className="professor-avatar">
                            <UserIcon />
                          </div>
                          <div className="professor-info">
                            <h3 className="professor-name">{professor.name}</h3>
                            <p className="professor-position">
                              {professor.position}
                            </p>
                            <p className="professor-specialization">
                              {professor.specialization}
                            </p>
                            <p className="professor-email">{professor.email}</p>
                          </div>
                        </div>

                        {/* Consultation Hours */}
                        <div className="consultation-section">
                          <h4 className="consultation-title">
                            Consultation Hours
                          </h4>
                          {getDaySchedules(professor).length === 0 ? (
                            <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
                              No consultation hours have been set yet.
                            </p>
                          ) : (
                            <div className="schedule-list">
                              {getDaySchedules(professor).map(
                                ({ day, schedules }) => (
                                  <div key={day} className="day-schedule">
                                    <div className="day-header">
                                      <CalendarIcon />
                                      <span className="day-name">{day}</span>
                                    </div>
                                    <div className="day-slots">
                                      {schedules.map((schedule, idx) => (
                                        <div
                                          key={idx}
                                          className="schedule-slot"
                                        >
                                          <div className="time-block">
                                            <ClockIcon />
                                            <span className="time-range">
                                              {schedule.timeStart} –{" "}
                                              {schedule.timeEnd}
                                            </span>
                                          </div>
                                          <div className="location-block">
                                            <MapPinIcon />
                                            <span className="location">
                                              {schedule.location}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
