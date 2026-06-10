import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQueue } from "../../contexts/QueueContext";
import { Link, useNavigate } from "react-router-dom";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./appointments.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ===== ICONS =====
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

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const UserIconSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
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

export default function AppointmentsPage() {
  const { user: authUser, logout } = useAuth();
  useQueue();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        studentNumber: authUser.studentNumber ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showBookDialog, setShowBookDialog] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your appointments?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [appointments, setAppointments] = useState([
    {
      id: "1",
      title: "Academic Consultation",
      college: "College of Computing Studies",
      person: "Prof. Maria Santos",
      personRole: "Department Chair",
      date: "2026-03-28",
      time: "2:00 PM",
      location: "CCS Faculty Room 201",
      purpose: "Discuss thesis proposal",
      status: "confirmed",
      notes: "Please bring your thesis outline",
    },
    {
      id: "2",
      title: "Clearance Processing",
      college: "College of Computing Studies",
      person: "Ms. Ana Cruz",
      personRole: "Student Affairs Officer",
      date: "2026-03-29",
      time: "10:00 AM",
      location: "Student Affairs Office",
      purpose: "Complete clearance requirements",
      status: "pending",
    },
  ]);

  const [formData, setFormData] = useState({
    college: "",
    service: "",
    person: "",
    date: "",
    time: "",
    purpose: "",
  });

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

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
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
      lowerInput.includes("appointment") ||
      lowerInput.includes("book")
    ) {
      return `You have ${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}. ${appointments.filter((a) => a.status === "pending").length} are pending confirmation. Would you like to book a new appointment?`;
    } else if (
      lowerInput.includes("confirm") ||
      lowerInput.includes("confirmed")
    ) {
      const confirmed = appointments.filter(
        (a) => a.status === "confirmed"
      );
      return confirmed.length > 0
        ? `You have ${confirmed.length} confirmed appointment${confirmed.length !== 1 ? "s" : ""}. ${confirmed[0].title} with ${confirmed[0].person} on ${new Date(confirmed[0].date).toLocaleDateString()}.`
        : "You don't have any confirmed appointments yet.";
    } else if (lowerInput.includes("pending")) {
      const pending = appointments.filter((a) => a.status === "pending");
      return pending.length > 0
        ? `You have ${pending.length} pending appointment${pending.length !== 1 ? "s" : ""} waiting for confirmation.`
        : "You don't have any pending appointments.";
    } else if (
      lowerInput.includes("cancel") ||
      lowerInput.includes("reschedule")
    ) {
      return "To cancel or reschedule an appointment, please click the cancel button on the appointment card and book a new one.";
    } else {
      return "I can help you with appointment information, booking, cancellations, and more. What would you like to know?";
    }
  };

  const handleCreateAppointment = () => {
    if (
      !formData.college ||
      !formData.service ||
      !formData.person ||
      !formData.date ||
      !formData.time ||
      !formData.purpose
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const newAppointment = {
      id: Date.now().toString(),
      title: formData.service,
      college: formData.college,
      person: formData.person,
      personRole: "Faculty/Staff",
      date: formData.date,
      time: formData.time,
      location: "TBA",
      purpose: formData.purpose,
      status: "pending",
    };

    setAppointments([...appointments, newAppointment]);
    setShowBookDialog(false);
    setFormData({
      college: "",
      service: "",
      person: "",
      date: "",
      time: "",
      purpose: "",
    });
  };

  const handleCancelAppointment = (id) => {
    setAppointments(
      appointments.map((apt) =>
        apt.id === id ? { ...apt, status: "cancelled" } : apt
      )
    );
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

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status !== "cancelled"
  );
  const pastAppointments = appointments.filter(
    (apt) => apt.status === "cancelled"
  );

  const services = [
    "Academic Consultation",
    "Grade Inquiry",
    "Clearance Processing",
    "Document Signing",
    "Thesis/Capstone Consultation",
  ];

  const professors = [
    { name: "Prof. Maria Santos", role: "Department Chair" },
    { name: "Prof. Juan Reyes", role: "Faculty Member" },
    { name: "Ms. Ana Cruz", role: "Student Affairs Officer" },
    { name: "Dr. Pedro Garcia", role: "Dean" },
  ];

  const timeSlots = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  const colleges = [
    "College of Computing Studies",
    "College of Education",
    "College of Science",
    "College of Engineering",
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
              title={
                isDark ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
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
        <div className="appointments-page">
          {/* Header */}
          <div className="appointments-header">
            <div className="header-content">
              <Link to="/student/dashboard" className="back-link">
                <ChevronLeftIcon />
                <span className="back-link-text">Dashboard</span>
              </Link>

              <div className="header-title-row">
                <div className="header-icon">
                  <CalendarIcon />
                </div>
                <div className="header-text">
                  <h1>Appointments</h1>
                  <p>Schedule and manage your appointments</p>
                </div>
              </div>
            </div>

            <button
              className="book-btn"
              onClick={() => setShowBookDialog(true)}
            >
              <PlusIcon />
              Book Appointment
            </button>
          </div>

          {/* Book Dialog */}
          {showBookDialog && (
            <div className="dialog-overlay" onClick={() => setShowBookDialog(false)}>
              <div
                className="dialog-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="dialog-header">
                  <h2>Book New Appointment</h2>
                  <button
                    className="dialog-close"
                    onClick={() => setShowBookDialog(false)}
                  >
                    <XIcon />
                  </button>
                </div>

                <div className="dialog-body">
                  <div className="form-group">
                    <label>College *</label>
                    <select
                      value={formData.college}
                      onChange={(e) =>
                        setFormData({ ...formData, college: e.target.value })
                      }
                    >
                      <option value="">Select college</option>
                      {colleges.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Service *</label>
                    <select
                      value={formData.service}
                      onChange={(e) =>
                        setFormData({ ...formData, service: e.target.value })
                      }
                    >
                      <option value="">Select service</option>
                      {services.map((svc) => (
                        <option key={svc} value={svc}>
                          {svc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Faculty/Staff *</label>
                    <select
                      value={formData.person}
                      onChange={(e) =>
                        setFormData({ ...formData, person: e.target.value })
                      }
                    >
                      <option value="">Select person</option>
                      {professors.map((prof) => (
                        <option key={prof.name} value={prof.name}>
                          {prof.name} - {prof.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Time *</label>
                    <select
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                    >
                      <option value="">Select time</option>
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Purpose *</label>
                    <textarea
                      placeholder="Brief description of your appointment purpose"
                      value={formData.purpose}
                      onChange={(e) =>
                        setFormData({ ...formData, purpose: e.target.value })
                      }
                      rows="3"
                    ></textarea>
                  </div>

                  <button
                    className="submit-btn"
                    onClick={handleCreateAppointment}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Appointments */}
          <section className="appointments-section">
            <div className="section-header">
              <h2>
                <ClockIcon />
                Upcoming Appointments
              
                <span className="badge">{upcomingAppointments.length}</span>
              </h2>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="appointments-list">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="appointment-card">
                    <div className="card-top">
                      <div className="card-info">
                        <div className="appointment-header">
                          <div className="appointment-header-content">
                            <h3>{apt.title}</h3>
                          </div>
                          <span className={`status-badge status-${apt.status}`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="college-name">{apt.college}</p>
                      </div>
                    </div>

                    <div className="card-details">
                      <div className="detail-row">
                        <div className="detail-item">
                          <UserIconSmall />
                          <div>
                            <p className="detail-label">Person</p>
                            <p className="detail-value">{apt.person}</p>
                            <p className="detail-role">{apt.personRole}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <CalendarIcon />
                          <div>
                            <p className="detail-label">Date & Time</p>
                            <p className="detail-value">
                              {new Date(apt.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                            <p className="detail-time">
                              <ClockIcon />
                              {apt.time}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="detail-row">
                        <div className="detail-item">
                          <MapPinIcon />
                          <div>
                            <p className="detail-label">Location</p>
                            <p className="detail-value">{apt.location}</p>
                          </div>
                        </div>

                        <div className="detail-item">
                          <CheckCircleIcon />
                          <div>
                            <p className="detail-label">Purpose</p>
                            <p className="detail-value">{apt.purpose}</p>
                          </div>
                        </div>
                      </div>

                      {apt.notes && (
                        <div className="notes-section">
                          <p className="notes-title">
                            📝 Note from {apt.person}
                          </p>
                          <p className="notes-text">{apt.notes}</p>
                        </div>
                      )}
                    </div>

                    {apt.status === "pending" && (
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelAppointment(apt.id)}
                      >
                        <XIcon />
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarIcon />
                <h3>No upcoming appointments</h3>
                <p>Schedule your first appointment to get started</p>
                <button
                  className="book-btn book-btn-small"
                  onClick={() => setShowBookDialog(true)}
                >
                  <PlusIcon />
                  Book Appointment
                </button>
              </div>
            )}
          </section>

          {/* Past Appointments */}
          {pastAppointments.length > 0 && (
            <section className="appointments-section">
              <h2>Past Appointments</h2>

              <div className="appointments-list">
                {pastAppointments.map((apt) => (
                  <div key={apt.id} className="appointment-card past">
                    <div className="card-top">
                      <div className="card-info">
                        <div className="appointment-header">
                          <div className="appointment-header-content">
                            <h3>{apt.title}</h3>
                          </div>
                          <span className={`status-badge status-${apt.status}`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="college-name">{apt.college}</p>
                      </div>
                    </div>

                    <div className="card-details">
                      <p className="detail-value">
                        {apt.person} • {apt.personRole}
                      </p>
                      <p className="detail-time">
                        {new Date(apt.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at {apt.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Widget */}
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