import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin-professor-availability.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ── Icons ──────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
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
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const CalendarSmallIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16v16H4z" opacity="0"></path>
    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
    <polyline points="22 6 12 13 2 6"></polyline>
  </svg>
);
const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

// ── Faculty data ──────────────────────────────────────────────────────────
const facultyData = [
  {
    id: "f1",
    name: "Prof. Maria Santos",
    position: "Department Chair",
    college: "College of Computing Studies (CCS)",
    status: "available",
    nextAvailableSlot: "10:00 AM - 11:00 AM",
    email: "maria.santos@ucab.edu.ph",
    contactNumber: "0912-345-6789",
    todaySchedule: [
      { time: "9:00 AM - 10:00 AM", activity: "Consultation", location: "CCS Faculty Room 201", status: "booked" },
      { time: "10:00 AM - 11:00 AM", activity: "Available", location: "CCS Faculty Room 201", status: "free" },
      { time: "11:00 AM - 12:00 PM", activity: "Meeting", location: "Conference Room", status: "booked" },
      { time: "2:00 PM - 3:00 PM", activity: "Available", location: "CCS Faculty Room 201", status: "free" },
      { time: "3:00 PM - 4:00 PM", activity: "Consultation", location: "CCS Faculty Room 201", status: "booked" },
    ],
  },
  {
    id: "f2",
    name: "Prof. Juan Reyes",
    position: "Faculty Member",
    college: "College of Computing Studies (CCS)",
    status: "busy",
    currentActivity: "In consultation with student",
    nextAvailableSlot: "2:00 PM - 3:00 PM",
    email: "juan.reyes@ucab.edu.ph",
    contactNumber: "0923-456-7890",
    todaySchedule: [
      { time: "10:00 AM - 11:00 AM", activity: "Consultation", location: "CCS Faculty Room 203", status: "booked" },
      { time: "11:00 AM - 12:00 PM", activity: "Class", location: "Room 305", status: "booked" },
      { time: "2:00 PM - 3:00 PM", activity: "Available", location: "CCS Faculty Room 203", status: "free" },
      { time: "3:00 PM - 4:00 PM", activity: "Available", location: "CCS Faculty Room 203", status: "free" },
    ],
  },
  {
    id: "f3",
    name: "Dr. Roberto Cruz",
    position: "Dean",
    college: "College of Business Accountancy and Administration (CBAA)",
    status: "available",
    nextAvailableSlot: "2:00 PM - 3:00 PM",
    email: "roberto.cruz@ucab.edu.ph",
    contactNumber: "0934-567-8901",
    todaySchedule: [
      { time: "9:00 AM - 10:00 AM", activity: "Administrative Work", location: "Dean's Office", status: "booked" },
      { time: "10:00 AM - 11:00 AM", activity: "Meeting", location: "Dean's Office", status: "booked" },
      { time: "2:00 PM - 3:00 PM", activity: "Available", location: "Dean's Office", status: "free" },
      { time: "3:00 PM - 4:00 PM", activity: "Available", location: "Dean's Office", status: "free" },
    ],
  },
  {
    id: "f4",
    name: "Prof. Linda Gomez",
    position: "Faculty Member",
    college: "College of Business Accountancy and Administration (CBAA)",
    status: "available",
    nextAvailableSlot: "1:00 PM - 2:00 PM",
    email: "linda.gomez@ucab.edu.ph",
    contactNumber: "0945-678-9012",
    todaySchedule: [
      { time: "1:00 PM - 2:00 PM", activity: "Available", location: "CBAA Faculty Room 105", status: "free" },
      { time: "2:00 PM - 3:00 PM", activity: "Consultation", location: "CBAA Faculty Room 105", status: "booked" },
      { time: "3:00 PM - 4:00 PM", activity: "Available", location: "CBAA Faculty Room 105", status: "free" },
      { time: "4:00 PM - 5:00 PM", activity: "Available", location: "CBAA Faculty Room 105", status: "free" },
    ],
  },
  {
    id: "f5",
    name: "Dr. Carmen Ramos",
    position: "Department Chair",
    college: "College of Education (COED)",
    status: "busy",
    currentActivity: "In class",
    nextAvailableSlot: "3:00 PM - 4:00 PM",
    email: "carmen.ramos@ucab.edu.ph",
    contactNumber: "0956-789-0123",
    todaySchedule: [
      { time: "8:00 AM - 9:00 AM", activity: "Class", location: "Room 401", status: "booked" },
      { time: "9:00 AM - 10:00 AM", activity: "Consultation", location: "COED Faculty Room 301", status: "booked" },
      { time: "10:00 AM - 11:00 AM", activity: "Meeting", location: "Conference Room", status: "booked" },
      { time: "3:00 PM - 4:00 PM", activity: "Available", location: "COED Faculty Room 301", status: "free" },
      { time: "4:00 PM - 5:00 PM", activity: "Available", location: "COED Faculty Room 301", status: "free" },
    ],
  },
  {
    id: "f6",
    name: "Engr. Pedro Villanueva",
    position: "Dean",
    college: "College of Engineering (COE)",
    status: "available",
    nextAvailableSlot: "1:00 PM - 2:00 PM",
    email: "pedro.villanueva@ucab.edu.ph",
    contactNumber: "0967-890-1234",
    todaySchedule: [
      { time: "10:00 AM - 11:00 AM", activity: "Meeting", location: "Dean's Office", status: "booked" },
      { time: "11:00 AM - 12:00 PM", activity: "Administrative Work", location: "Dean's Office", status: "booked" },
      { time: "1:00 PM - 2:00 PM", activity: "Available", location: "Dean's Office", status: "free" },
      { time: "2:00 PM - 3:00 PM", activity: "Available", location: "Dean's Office", status: "free" },
      { time: "3:00 PM - 4:00 PM", activity: "Consultation", location: "Dean's Office", status: "booked" },
    ],
  },
  {
    id: "f7",
    name: "Dr. Elena Mendoza",
    position: "Department Chair",
    college: "College of Arts and Sciences (CAS)",
    status: "unavailable",
    currentActivity: "On leave",
    nextAvailableSlot: "Tomorrow, 9:00 AM",
    email: "elena.mendoza@ucab.edu.ph",
    contactNumber: "0978-901-2345",
    todaySchedule: [
      { time: "8:00 AM - 5:00 PM", activity: "On Leave", location: "N/A", status: "unavailable" },
    ],
  },
  {
    id: "f8",
    name: "Dr. Grace Santos",
    position: "Dean",
    college: "College of Health and Allied Sciences (CHAS)",
    status: "available",
    nextAvailableSlot: "8:00 AM - 9:00 AM",
    email: "grace.santos@ucab.edu.ph",
    contactNumber: "0989-012-3456",
    todaySchedule: [
      { time: "8:00 AM - 9:00 AM", activity: "Available", location: "Dean's Office", status: "free" },
      { time: "9:00 AM - 10:00 AM", activity: "Meeting", location: "Dean's Office", status: "booked" },
      { time: "10:00 AM - 11:00 AM", activity: "Available", location: "Dean's Office", status: "free" },
      { time: "1:00 PM - 2:00 PM", activity: "Available", location: "Dean's Office", status: "free" },
    ],
  },
];

const collegeOptions = Array.from(new Set(facultyData.map((f) => f.college)));

export default function AdminProfessorAvailability() {
  const { user: authUser, logout } = useAuth();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you check faculty availability today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [selectedCollege, setSelectedCollege] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

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
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("available"))
      return `There are currently ${facultyData.filter((f) => f.status === "available").length} faculty members available.`;
    if (i.includes("busy"))
      return `${facultyData.filter((f) => f.status === "busy").length} faculty members are busy right now.`;
    if (i.includes("leave") || i.includes("unavailable"))
      return `${facultyData.filter((f) => f.status === "unavailable").length} faculty members are unavailable today.`;
    if (i.includes("college") || i.includes("department"))
      return "You can filter faculty by college using the 'All Colleges' dropdown above the list.";
    return "I can help you check who's available, busy, or on leave, and filter by college. What do you need?";
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/admin/transactions" },
  ];

  const filteredFaculty = facultyData.filter((f) => {
    const matchesCollege = selectedCollege === "all" || f.college === selectedCollege;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesCollege && matchesStatus;
  });

  const stats = {
    total: facultyData.length,
    available: facultyData.filter((f) => f.status === "available").length,
    busy: facultyData.filter((f) => f.status === "busy").length,
    unavailable: facultyData.filter((f) => f.status === "unavailable").length,
  };

  const getStatusBadgeClass = (status) => `apa-status-badge apa-status-${status}`;
  const getSlotClass = (status) => `apa-slot apa-slot-${status}`;

  const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("");

  return (
    <div className="apa-dashboard-with-sidebar">
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

      {/* Sidebar */}
      <aside className={`apa-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="apa-sidebar-inner">
          <div className="apa-sidebar-logo">
            <div className="apa-logo-container">
              <img src={ucLogo} alt="UC Logo" className="apa-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="apa-logo-img apa-oams-logo-img" />
            </div>
            <button
              className="apa-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="apa-sidebar-user-section">
            <div className="apa-user-top-row">
              <div className="apa-user-avatar-large">
                <UserIcon />
              </div>
              <div className="apa-user-info-content">
                <p className="apa-user-name-large">{user?.name}</p>
                <span className="apa-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="apa-user-college-wrapper">
              <p className="apa-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="apa-sidebar-nav">
            <div className="apa-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="apa-nav-item"
                  title={item.label}
                >
                  <item.icon className="apa-nav-icon-medium" />
                  <span className="apa-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="apa-sidebar-logout">
            <button className="apa-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="apa-mobile-header">
        <div className="apa-mobile-header-content">
          <div className="apa-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="apa-logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="apa-logo-img apa-oams-logo-img" />
          </div>
          <div className="apa-mobile-header-actions">
            <button className="apa-theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="apa-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="apa-dashboard-main">
        <div className="apa-page-container">
          {/* Page Header */}
          <div className="apa-page-header">
            <h1 className="apa-page-title">Faculty Availability</h1>
            <p className="apa-page-subtitle">Monitor faculty consultation schedules and availability</p>
          </div>

          {/* Summary Stats */}
          <div className="apa-summary-grid">
            <div className="apa-summary-card apa-summary-total">
              <div className="apa-summary-text">
                <p className="apa-summary-label">Total Faculty</p>
                <p className="apa-summary-value">{stats.total}</p>
              </div>
              <UsersIcon className="apa-summary-icon" />
            </div>
            <div className="apa-summary-card apa-summary-available">
              <div className="apa-summary-text">
                <p className="apa-summary-label">Available</p>
                <p className="apa-summary-value">{stats.available}</p>
              </div>
              <CheckCircleIcon className="apa-summary-icon" />
            </div>
            <div className="apa-summary-card apa-summary-busy">
              <div className="apa-summary-text">
                <p className="apa-summary-label">Busy</p>
                <p className="apa-summary-value">{stats.busy}</p>
              </div>
              <ClockIcon className="apa-summary-icon" />
            </div>
            <div className="apa-summary-card apa-summary-unavailable">
              <div className="apa-summary-text">
                <p className="apa-summary-label">Unavailable</p>
                <p className="apa-summary-value">{stats.unavailable}</p>
              </div>
              <XCircleIcon className="apa-summary-icon" />
            </div>
          </div>

          {/* Filters */}
          <div className="apa-filters-card">
            <div className="apa-filter-group">
              <select
                className="apa-filter-select"
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                aria-label="Filter by college"
              >
                <option value="all">All Colleges</option>
                {collegeOptions.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
            </div>
            <div className="apa-filter-group apa-filter-group-narrow">
              <select
                className="apa-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          {/* Faculty List */}
          <div className="apa-faculty-list">
            {filteredFaculty.map((f) => (
              <div key={f.id} className="apa-faculty-card">
                <div className="apa-faculty-top">
                  <div className="apa-faculty-identity">
                    <div className="apa-faculty-avatar">{getInitials(f.name)}</div>
                    <div className="apa-faculty-identity-text">
                      <h3 className="apa-faculty-name">{f.name}</h3>
                      <p className="apa-faculty-position">{f.position}</p>
                      <p className="apa-faculty-college">{f.college}</p>
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(f.status)}>
                    <span className="apa-status-dot"></span>
                    {f.status}
                  </span>
                </div>

                {f.currentActivity && (
                  <div className="apa-current-activity">
                    <strong>Current:</strong>&nbsp;{f.currentActivity}
                  </div>
                )}

                <div className="apa-faculty-meta">
                  <div className="apa-meta-row">
                    <CalendarSmallIcon className="apa-meta-icon" />
                    <span className="apa-meta-label">Next Available:</span>
                    <span className="apa-meta-value">{f.nextAvailableSlot}</span>
                  </div>
                  <div className="apa-meta-row apa-meta-row-contact">
                    <span className="apa-meta-contact">
                      <MailIcon className="apa-meta-icon" />
                      {f.email}
                    </span>
                    <span className="apa-meta-contact">
                      <PhoneIcon className="apa-meta-icon" />
                      {f.contactNumber}
                    </span>
                  </div>
                </div>

                <div className="apa-schedule-section">
                  <p className="apa-schedule-label">Today's Schedule</p>
                  <div className="apa-schedule-grid">
                    {f.todaySchedule.map((slot, idx) => (
                      <div key={idx} className={getSlotClass(slot.status)}>
                        <div className="apa-slot-time-row">
                          <ClockIcon className="apa-slot-icon" />
                          <span className="apa-slot-time">{slot.time}</span>
                        </div>
                        <p className="apa-slot-activity">{slot.activity}</p>
                        {slot.location !== "N/A" && (
                          <div className="apa-slot-location-row">
                            <MapPinIcon className="apa-slot-icon" />
                            <span className="apa-slot-location">{slot.location}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {filteredFaculty.length === 0 && (
              <div className="apa-empty-state">
                <UsersIcon className="apa-empty-icon" />
                <h3 className="apa-empty-title">No faculty found</h3>
                <p className="apa-empty-text">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {sidebarOpen && <div className="apa-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}