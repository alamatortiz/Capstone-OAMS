import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
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

import api from "../../utils/api";
import { toast } from "sonner";

// ─── Time-slot options shown in the booking dialog ─────────────────────────────
const TIME_SLOTS = [
  "08:00:00",
  "09:00:00",
  "10:00:00",
  "11:00:00",
  "13:00:00",
  "14:00:00",
  "15:00:00",
  "16:00:00",
];

/** Converts "HH:MM:SS" to "8:00 AM" for display in the dropdown labels. */
function label12h(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

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

  // ── UI state ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showBookDialog, setShowBookDialog] = useState(false);

  // ── Chat state ──────────────────────────────────────────────────────────────
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

  // ── Data state ──────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptError, setApptError] = useState(null);

  // Cascading dropdown data for the booking dialog
  const [departmentList, setDepartmentList] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [serviceList, setServiceList] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  // Booking form — now includes departmentId and serviceId
  const [formData, setFormData] = useState({
    departmentId: "",
    serviceId: "",
    facultyId: "",
    date: "",
    time: "",
    purpose: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Cancel in-flight guard
  const [cancellingId, setCancellingId] = useState(null);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // Fetch the student's appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // 1. Fetch all departments (colleges) when the dialog opens
  useEffect(() => {
    if (!showBookDialog) return;
    const load = async () => {
      setDeptLoading(true);
      try {
        // Departments are static master data — fetch directly from the DB via a
        // dedicated lightweight query on the student routes.
        const { data } = await api.get("/student/appointments/departments");
        setDepartmentList(data.departments ?? []);
      } catch {
        toast.error("Could not load college list. Please try again.");
      } finally {
        setDeptLoading(false);
      }
    };
    load();
  }, [showBookDialog]);

  // 2. Fetch services whenever the selected department changes
  useEffect(() => {
    if (!formData.departmentId) {
      setServiceList([]);
      setFacultyList([]);
      return;
    }
    const load = async () => {
      setServiceLoading(true);
      setServiceList([]);
      setFacultyList([]);
      try {
        const { data } = await api.get(
          `/student/appointments/services?departmentId=${formData.departmentId}`,
        );
        setServiceList(data.services ?? []);
      } catch {
        toast.error("Could not load services. Please try again.");
      } finally {
        setServiceLoading(false);
      }
    };
    load();
  }, [formData.departmentId]);

  // 3. Fetch faculty whenever the selected service changes
  useEffect(() => {
    if (!formData.serviceId) {
      setFacultyList([]);
      return;
    }
    const load = async () => {
      setFacultyLoading(true);
      setFacultyList([]);
      try {
        const { data } = await api.get(
          `/student/appointments/faculty?serviceId=${formData.serviceId}`,
        );
        setFacultyList(data.faculty ?? []);
      } catch {
        toast.error("Could not load faculty list. Please try again.");
      } finally {
        setFacultyLoading(false);
      }
    };
    load();
  }, [formData.serviceId]);

  // ── API helpers ──────────────────────────────────────────────────────────────
  const fetchAppointments = async () => {
    setApptLoading(true);
    setApptError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setAppointments(data.appointments ?? []);
    } catch {
      setApptError(
        "Could not load your appointments. Please refresh the page.",
      );
    } finally {
      setApptLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
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
    const i = userInput.toLowerCase();
    if (i.includes("appointment") || i.includes("book")) {
      const pending = appointments.filter((a) => a.status === "pending").length;
      return `You have ${appointments.length} appointment(s). ${pending} are pending confirmation. Would you like to book a new one?`;
    }
    if (i.includes("confirm")) {
      const c = appointments.filter((a) => a.status === "approved");
      return c.length > 0
        ? `You have ${c.length} approved appointment(s). The next one is with ${c[0].person} on ${new Date(c[0].date).toLocaleDateString()}.`
        : "You don't have any approved appointments yet.";
    }
    if (i.includes("pending")) {
      const p = appointments.filter((a) => a.status === "pending");
      return p.length > 0
        ? `You have ${p.length} pending appointment(s) waiting for confirmation.`
        : "You don't have any pending appointments.";
    }
    if (i.includes("cancel") || i.includes("reschedule"))
      return "To cancel an appointment, click the Cancel button on the appointment card. To reschedule, cancel first and then book a new one.";
    return "I can help you with appointment information, booking, and cancellations. What would you like to know?";
  };

  const handleOpenBookDialog = () => {
    setFormData({
      departmentId: "",
      serviceId: "",
      facultyId: "",
      date: "",
      time: "",
      purpose: "",
    });
    setServiceList([]);
    setFacultyList([]);
    setShowBookDialog(true);
  };

  const handleCreateAppointment = async () => {
    const { departmentId, serviceId, facultyId, date, time, purpose } =
      formData;
    if (
      !departmentId ||
      !serviceId ||
      !facultyId ||
      !date ||
      !time ||
      !purpose.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/student/appointments", {
        facultyId: Number(facultyId),
        serviceId: Number(serviceId),
        appointmentDate: date,
        appointmentTime: time,
        notes: purpose.trim(),
      });
      toast.success("Appointment request submitted successfully!");
      setShowBookDialog(false);
      await fetchAppointments();
    } catch (err) {
      const msg =
        err?.response?.data?.error ??
        "Failed to submit the appointment. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      toast.info("Appointment cancelled.");
      await fetchAppointments();
    } catch (err) {
      const msg =
        err?.response?.data?.error ?? "Failed to cancel the appointment.";
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  // ── Derived lists ────────────────────────────────────────────────────────────
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
    (apt) => apt.status !== "cancelled",
  );
  const pastAppointments = appointments.filter(
    (apt) => apt.status === "cancelled",
  );

  // Today's date string for the date picker minimum
  const todayISO = new Date().toISOString().split("T")[0];

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

            <button className="book-btn" onClick={handleOpenBookDialog}>
              <PlusIcon />
              Book Appointment
            </button>
          </div>

          {/* Book Dialog */}
          {showBookDialog && (
            <div
              className="dialog-overlay"
              onClick={() => setShowBookDialog(false)}
            >
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
                  {/* Step 1 — College */}
                  <div className="form-group">
                    <label>College *</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          departmentId: e.target.value,
                          serviceId: "",
                          facultyId: "",
                        })
                      }
                      disabled={deptLoading}
                    >
                      <option value="">
                        {deptLoading ? "Loading colleges…" : "Select college"}
                      </option>
                      {departmentList.map((d) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.department_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2 — Service (enabled only after a college is picked) */}
                  <div className="form-group">
                    <label>Service *</label>
                    <select
                      value={formData.serviceId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serviceId: e.target.value,
                          facultyId: "",
                        })
                      }
                      disabled={!formData.departmentId || serviceLoading}
                    >
                      <option value="">
                        {!formData.departmentId
                          ? "Select a college first"
                          : serviceLoading
                            ? "Loading services…"
                            : serviceList.length === 0
                              ? "No services available"
                              : "Select service"}
                      </option>
                      {serviceList.map((s) => (
                        <option key={s.service_id} value={s.service_id}>
                          {s.service_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3 — Faculty/Staff (enabled only after a service is picked) */}
                  <div className="form-group">
                    <label>Faculty / Staff *</label>
                    <select
                      value={formData.facultyId}
                      onChange={(e) =>
                        setFormData({ ...formData, facultyId: e.target.value })
                      }
                      disabled={!formData.serviceId || facultyLoading}
                    >
                      <option value="">
                        {!formData.serviceId
                          ? "Select a service first"
                          : facultyLoading
                            ? "Loading faculty…"
                            : facultyList.length === 0
                              ? "No faculty available"
                              : "Select faculty / staff"}
                      </option>
                      {facultyList.map((f) => (
                        <option key={f.faculty_id} value={f.faculty_id}>
                          {f.name}
                          {f.specialization ? ` — ${f.specialization}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      min={todayISO}
                    />
                  </div>

                  {/* Time */}
                  <div className="form-group">
                    <label>Time *</label>
                    <select
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                    >
                      <option value="">Select time slot</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {label12h(slot)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Purpose / Notes */}
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
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit Request"}
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

            {/* Loading state */}
            {apptLoading && (
              <div className="empty-state">
                <CalendarIcon />
                <h3>Loading your appointments…</h3>
              </div>
            )}

            {/* Error state */}
            {!apptLoading && apptError && (
              <div className="empty-state">
                <CalendarIcon />
                <h3>Could not load appointments</h3>
                <p>{apptError}</p>
                <button
                  className="book-btn book-btn-small"
                  onClick={fetchAppointments}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Data */}
            {!apptLoading && !apptError && upcomingAppointments.length > 0 && (
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
                            <p className="detail-label">Date &amp; Time</p>
                            <p className="detail-value">
                              {new Date(
                                apt.date + "T00:00:00",
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
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
                    </div>

                    {(apt.status === "pending" ||
                      apt.status === "approved") && (
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelAppointment(apt.id)}
                        disabled={cancellingId === apt.id}
                      >
                        <XIcon />
                        {cancellingId === apt.id
                          ? "Cancelling…"
                          : "Cancel Appointment"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!apptLoading &&
              !apptError &&
              upcomingAppointments.length === 0 && (
                <div className="empty-state">
                  <CalendarIcon />
                  <h3>No upcoming appointments</h3>
                  <p>Schedule your first appointment to get started</p>
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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
