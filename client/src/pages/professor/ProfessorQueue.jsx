import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_queue.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ── Icons ──────────────────────────────────────────────────────────────────
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

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const UserCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="8.5" cy="7" r="4"></circle>
    <polyline points="17 11 19 13 23 9"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
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

export default function ProfessorQueue() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("all");
  const [currentlyServing, setCurrentlyServing] = useState(null);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  // ── Chat Widget State ──────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with queue management today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [queueRequests, setQueueRequests] = useState([
    {
      id: "1",
      studentName: "Juan Dela Cruz",
      studentId: "2100123",
      service: "Academic Consultation",
      queueNumber: "CCS-CON-047",
      position: 1,
      purpose: "Thesis consultation and guidance",
      joinedAt: "10:30 AM",
      waitTime: "5 mins",
      status: "waiting",
      priority: "normal",
    },
    {
      id: "2",
      studentName: "Maria Santos",
      studentId: "2100456",
      service: "Grade Inquiry",
      queueNumber: "CCS-GRD-048",
      position: 2,
      purpose: "Question about midterm grades",
      joinedAt: "10:35 AM",
      waitTime: "10 mins",
      status: "waiting",
      priority: "urgent",
    },
    {
      id: "3",
      studentName: "Pedro Garcia",
      studentId: "2000789",
      service: "Academic Consultation",
      queueNumber: "CCS-CON-049",
      position: 3,
      purpose: "Capstone project discussion",
      joinedAt: "10:40 AM",
      waitTime: "15 mins",
      status: "waiting",
      priority: "normal",
    },
  ]);

  const services = [
    "Academic Consultation",
    "Grade Inquiry",
    "Make-up Class Request",
    "Research Guidance",
    "Document Signing",
  ];

  const stats = {
    waiting: queueRequests.filter((q) => q.status === "waiting").length,
    beingServed: currentlyServing ? 1 : 0,
    completedToday: 12,
    averageWaitTime: "8 mins",
  };

  // ── Theme & Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setInputValue("");

    setTimeout(() => {
      const botMsg = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();

    if (i.includes("queue") || i.includes("students"))
      return `You currently have ${stats.waiting} students waiting in queue with an average wait time of ${stats.averageWaitTime}.`;

    if (i.includes("being served"))
      return `You have ${stats.beingServed} student(s) currently being served.`;

    if (i.includes("completed"))
      return `You have completed service for ${stats.completedToday} students today.`;

    if (i.includes("next"))
      return `Click the "Call Next" button to serve the first student waiting in the queue.`;

    if (i.includes("skip"))
      return `You can skip a student by clicking the refresh icon (↻) next to their name. They will move to the end of the queue.`;

    if (i.includes("cancel") || i.includes("remove"))
      return `To cancel a student, click the X icon (✕) next to their name. They will be removed from the queue.`;

    if (i.includes("service") || i.includes("filter"))
      return `Use the service dropdown to filter students by service type. This helps you prioritize specific request types.`;

    if (i.includes("help") || i.includes("what"))
      return "I can help you with queue management, calling students, filtering by service, and answering questions about your current queue status. What do you need?";

    return "I can help you manage the queue, call students, skip or cancel requests, and view statistics. How can I assist you?";
  };

  const handleCallNext = () => {
    const nextStudent = queueRequests.find((q) => q.status === "waiting");
    if (nextStudent) {
      setCurrentlyServing(nextStudent);
      setQueueRequests(
        queueRequests.map((q) =>
          q.id === nextStudent.id ? { ...q, status: "being-served" } : q
        )
      );
    }
  };

  const handleCallStudent = (request) => {
    setCurrentlyServing(request);
    setQueueRequests(
      queueRequests.map((q) =>
        q.id === request.id ? { ...q, status: "being-served" } : q
      )
    );
  };

  const handleComplete = () => {
    if (currentlyServing) {
      setQueueRequests(
        queueRequests.filter((q) => q.id !== currentlyServing.id)
      );
      setCurrentlyServing(null);
    }
  };

  const handleSkip = (id) => {
    const skipped = queueRequests.find((q) => q.id === id);
    if (skipped) {
      setQueueRequests(
        queueRequests.map((q) =>
          q.id === id ? { ...q, position: queueRequests.length } : q
        )
      );
    }
  };

  const handleCancel = (id) => {
    setQueueRequests(queueRequests.filter((q) => q.id !== id));
  };

  const filteredRequests = queueRequests.filter(
    (q) =>
      q.status === "waiting" &&
      (selectedService === "all" || q.service === selectedService)
  );

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/professor/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/professor/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/professor/transactions",
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
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
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
        <div className="professor-queue-container">
          {/* Header */}
          <div className="queue-header">
            <div>
              <h1 className="queue-title">Queue Management</h1>
              <p className="queue-subtitle">
                Manage student queue requests and consultations
              </p>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="queue-stats-grid">
            <div className="queue-stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-content">
                  <p className="stat-card-label">Waiting</p>
                  <p className="stat-card-value" style={{ color: "#3b82f6" }}>
                    {stats.waiting}
                  </p>
                </div>
                <div className="stat-card-icon" style={{ color: "#3b82f6" }}>
                  <UsersIcon />
                </div>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-content">
                  <p className="stat-card-label">Being Served</p>
                  <p className="stat-card-value" style={{ color: "#10b981" }}>
                    {stats.beingServed}
                  </p>
                </div>
                <div className="stat-card-icon" style={{ color: "#10b981" }}>
                  <UserCheckIcon />
                </div>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-content">
                  <p className="stat-card-label">Completed Today</p>
                  <p className="stat-card-value" style={{ color: "#a855f7" }}>
                    {stats.completedToday}
                  </p>
                </div>
                <div className="stat-card-icon" style={{ color: "#a855f7" }}>
                  <CheckCircleIcon />
                </div>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-content">
                  <p className="stat-card-label">Avg Wait Time</p>
                  <p className="stat-card-value" style={{ color: "#f59e0b" }}>
                    {stats.averageWaitTime}
                  </p>
                </div>
                <div className="stat-card-icon" style={{ color: "#f59e0b" }}>
                  <ClockIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Currently Serving Section */}
          {currentlyServing && (
            <div className="currently-serving-card">
              <div className="serving-card-header">
                <div className="serving-header-title">
                  <UserCheckIcon />
                  <h3>Currently Serving</h3>
                </div>
                <span className="serving-badge">Active</span>
              </div>
              <div className="serving-card-content">
                <div className="serving-details-grid">
                  <div className="serving-detail-item">
                    <p className="serving-detail-label">Student Name</p>
                    <p className="serving-detail-value">
                      {currentlyServing.studentName}
                    </p>
                  </div>
                  <div className="serving-detail-item">
                    <p className="serving-detail-label">Student ID</p>
                    <p className="serving-detail-value">
                      {currentlyServing.studentId}
                    </p>
                  </div>
                  <div className="serving-detail-item">
                    <p className="serving-detail-label">Queue Number</p>
                    <p
                      className="serving-detail-value"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {currentlyServing.queueNumber}
                    </p>
                  </div>
                </div>
                <div className="serving-purpose">
                  <p className="serving-detail-label">Purpose</p>
                  <p className="serving-detail-value">
                    {currentlyServing.purpose}
                  </p>
                </div>
                <div className="serving-actions">
                  <button
                    className="btn btn-complete"
                    onClick={handleComplete}
                  >
                    <CheckCircleIcon />
                    Complete Service
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setCurrentlyServing(null)}
                  >
                    Return to Queue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting Queue Section */}
          <div className="waiting-queue-card">
            <div className="queue-card-header">
              <div className="queue-card-header-title">
                <h2>Waiting Queue ({filteredRequests.length})</h2>
                <p>Students waiting for service</p>
              </div>
              <div className="queue-card-header-actions">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="service-filter"
                >
                  <option value="all">All Service</option>
                  {services.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-call-next"
                  onClick={handleCallNext}
                  disabled={!filteredRequests.length || !!currentlyServing}
                >
                  <PhoneIcon />
                  Call Next
                </button>
              </div>
            </div>

            <div className="queue-list">
              {filteredRequests.length === 0 ? (
                <div className="queue-empty">
                  <UsersIcon />
                  <p>No students waiting in queue</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="queue-item">
                    <div className="queue-item-header">
                      <div className="queue-item-id-name">
                        <span className="queue-number">
                          {request.queueNumber}
                        </span>
                        <span className="queue-name">
                          {request.studentName}
                        </span>
                        <span className="queue-id">({request.studentId})</span>
                        {request.priority === "urgent" && (
                          <span className="priority-badge urgent">
                            <AlertCircleIcon />
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="queue-item-details">
                      <div className="detail-row">
                        <div className="detail-col">
                          <span className="detail-label">Position:</span>
                          <span className="detail-value">
                            #{request.position}
                          </span>
                        </div>
                        <div className="detail-col">
                          <span className="detail-label">Service:</span>
                          <span className="detail-value">
                            {request.service}
                          </span>
                        </div>
                        <div className="detail-col">
                          <span className="detail-label">Joined:</span>
                          <span className="detail-value">
                            {request.joinedAt}
                          </span>
                        </div>
                        <div className="detail-col">
                          <span className="detail-label">Waiting:</span>
                          <span className="detail-value waiting">
                            {request.waitTime}
                          </span>
                        </div>
                      </div>

                      <div className="queue-purpose">
                        <span className="detail-label">Purpose:</span>
                        <span className="detail-value">{request.purpose}</span>
                      </div>
                    </div>

                    <div className="queue-item-actions">
                      <button
                        className="btn btn-sm btn-call"
                        onClick={() => handleCallStudent(request)}
                        disabled={!!currentlyServing}
                      >
                        <PhoneIcon />
                        Call
                      </button>
                      <button
                        className="btn btn-sm btn-skip"
                        onClick={() => handleSkip(request.id)}
                      >
                        <RefreshIcon />
                      </button>
                      <button
                        className="btn btn-sm btn-cancel"
                        onClick={() => handleCancel(request.id)}
                      >
                        <XCircleIcon />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* AI Chatbot Widget */}
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
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}>
                  <div className="message-content">{m.text}</div>
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