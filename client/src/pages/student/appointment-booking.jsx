import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./appointment-booking.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import { toast } from "sonner";

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
const CalendarIcon = () => (
  <svg
    className="appointment-icon"
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

const ClockIcon = () => (
  <svg
    className="appointment-icon"
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
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const UsersIcon = () => (
  <svg
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const SearchIcon = ({ className = "", style = {} }) => (
  <svg
    className={`icon ${className}`.trim()}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const ChatIcon = () => (
  <svg
    className="appointment-icon"
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
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg
    className="appointment-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const Loader2Icon = () => (
  <svg
    className="appointment-icon"
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
// Color-coded so status is readable at a glance instead of reusing the
// generic green "college-badge" pill for every state.
const STATUS_STYLES = {
  pending: {
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)",
    color: "#f59e0b",
  },
  approved: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.4)",
    color: "#3b82f6",
  },
  completed: {
    bg: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.4)",
    color: "#22c55e",
  },
  rejected: {
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
    color: "#ef4444",
  },
  cancelled: {
    bg: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.4)",
    color: "#94a3b8",
  },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.25rem 0.7rem",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
      }}
    >
      <span
        style={{
          width: "0.4rem",
          height: "0.4rem",
          borderRadius: "50%",
          background: s.color,
          flexShrink: 0,
        }}
      />
      {status}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AppointmentBookingPage() {
  const { user: authUser, logout } = useAuth();
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
        studentId: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
      };

  const navigate = useNavigate();

  // ── Live data state (replaces INITIAL_SLOTS / local bookings array) ───────
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(null);

  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I can help you find and book appointments. Just ask!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Appointment / filter state ─────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [activeTab, setActiveTab] = useState("slots"); // "slots" | "bookings"

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  const fetchSlots = async () => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const { data } = await api.get("/student/appointments/available-slots");
      setSlots(data.slots ?? []);
    } catch (err) {
      console.error("Fetch available slots error:", err);
      setSlotsError("Could not load available slots. Please try again.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      // Reuses the same endpoint the Appointments page uses — every row
      // here is a real `appointments` table record for this student.
      const { data } = await api.get("/student/appointments");
      setMyBookings(data.appointments ?? []);
    } catch (err) {
      console.error("Fetch my bookings error:", err);
      setBookingsError("Could not load your bookings. Please try again.");
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchMyBookings();
  }, []);

  // ── Derived / filtered slots (replaces getAvailableSlots()) ───────────────
  const availableSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesDate = !selectedDate || slot.date === selectedDate;
      const matchesCollege =
        selectedCollege === "all" || slot.college === selectedCollege;
      const matchesSearch =
        !searchQuery ||
        slot.professorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesCollege && matchesSearch;
    });
  }, [slots, selectedDate, selectedCollege, searchQuery]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    return availableSlots.reduce((acc, slot) => {
      (acc[slot.date] ||= []).push(slot);
      return acc;
    }, {});
  }, [availableSlots]);

  // Only pending/approved bookings count as "active" for the My Bookings tab
  const activeBookings = myBookings.filter(
    (b) => b.status === "pending" || b.status === "approved",
  );

  // Group bookings by status (pending shown first) instead of stamping a
  // badge on every single card — mirrors how slots are grouped by date.
  const STATUS_ORDER = [
    "pending",
    "approved",
    "completed",
    "rejected",
    "cancelled",
  ];
  const STATUS_LABELS = {
    pending: "Pending Approval",
    approved: "Approved",
    completed: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  const bookingsByStatus = useMemo(() => {
    const grouped = activeBookings.reduce((acc, b) => {
      (acc[b.status] ||= []).push(b);
      return acc;
    }, {});
    // Sort each group by date, then return entries in STATUS_ORDER
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => a.date.localeCompare(b.date)),
    );
    return STATUS_ORDER.filter((s) => grouped[s]?.length).map((s) => [
      s,
      grouped[s],
    ]);
  }, [activeBookings]);

  const colleges = [
    { value: "all", label: "All Colleges" },
    { value: "CCS", label: "CCS" },
    { value: "CBAA", label: "CBAA" },
    { value: "COED", label: "COED" },
    { value: "COE", label: "COE" },
    { value: "CAS", label: "CAS" },
    { value: "CHAS", label: "CHAS" },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    if (lowerInput.includes("slot") || lowerInput.includes("available")) {
      return `We have ${availableSlots.length} available slots. You can filter by professor, college, or date to find the perfect time!`;
    } else if (
      lowerInput.includes("book") ||
      lowerInput.includes("appointment")
    ) {
      return `I can help you book an appointment! Select a slot from the available slots section and provide your consultation purpose.`;
    } else if (lowerInput.includes("professor")) {
      const professorCount = new Set(availableSlots.map((s) => s.professorId))
        .size;
      return `There are ${professorCount} professors with available consultation slots.`;
    } else if (lowerInput.includes("cancel")) {
      return `To cancel an appointment, go to your bookings and click the cancel button on the appointment you want to remove.`;
    } else {
      return "I can help you with booking appointments, finding slots, or managing your consultations. What would you like to know?";
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !purpose.trim()) {
      toast.error("Please provide a purpose for consultation");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/student/appointments/book-slot", {
        facultyId: selectedSlot.professorId,
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        purpose: purpose.trim(),
      });

      toast.success("Appointment booked successfully!");
      setPurpose("");
      setSelectedSlot(null);
      setShowBookDialog(false);

      // Refresh both lists — the booked slot's capacity changes, and the
      // new booking needs to show up under "My Appointments".
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err) {
      const msg =
        err?.response?.data?.error ??
        "Failed to book appointment. The slot may no longer be available.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = (appointmentId) => {
    setCancelConfirmId(appointmentId);
  };

  const doCancel = async () => {
    const appointmentId = cancelConfirmId;
    setCancelConfirmId(null);
    if (!appointmentId || cancellingId) return;

    setCancellingId(appointmentId);
    try {
      await api.delete(`/student/appointments/${appointmentId}`);
      toast.success("Appointment cancelled successfully");
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err) {
      const msg =
        err?.response?.data?.error ?? "Failed to cancel the appointment.";
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Slots from the API arrive as "HH:MM:SS"; bookings from /appointments
  // already arrive pre-formatted (e.g. "9:00 AM") by the backend.
  const formatTime = (time) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isToday = (dateString) => {
    const today = new Date();
    const slotDate = new Date(`${dateString}T00:00:00`);
    return today.toDateString() === slotDate.toDateString();
  };

  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slotDate = new Date(`${dateString}T00:00:00`);
    return tomorrow.toDateString() === slotDate.toDateString();
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="appointment-with-sidebar">
      {/* Sidebar */}
      <aside className={`appointment-sidebar ${sidebarOpen ? "open" : ""}`}>
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
      <header className="appointment-mobile-header">
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
      <main className="appointment-main">
        <div className="appointment-content">
          {/* Header */}
          <div className="appointment-header">
            <div className="header-backdrop header-backdrop-1"></div>
            <div className="header-backdrop header-backdrop-2"></div>
            <div className="header-content">
              <h1 className="header-title">
                <CalendarIcon />
                Book Appointment
              </h1>
              <p className="header-subtitle">
                Schedule consultations with professors
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="appointment-stats">
            <div className="appointment-stat-card">
              <div className="appointment-stat-icon">
                <ChevronRightIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">Available Slots</p>
                <p className="stat-value">
                  {slotsLoading ? "—" : availableSlots.length}
                </p>
              </div>
            </div>
            <div className="appointment-stat-card">
              <div className="appointment-stat-icon">
                <CheckCircleIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">My Bookings</p>
                <p className="stat-value">
                  {bookingsLoading ? "—" : activeBookings.length}
                </p>
              </div>
            </div>
            <div className="appointment-stat-card">
              <div className="appointment-stat-icon">
                <UsersIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">Professors</p>
                <p className="stat-value">
                  {slotsLoading
                    ? "—"
                    : new Set(availableSlots.map((s) => s.professorId)).size}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <h2>Filter & Search</h2>
              <p>Find the perfect time slot</p>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="searchQuery">
                  Search Professor or Location
                </label>
                <div
                  className="search-input-wrapper"
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <SearchIcon
                    style={{
                      position: "absolute",
                      left: "0.85rem",
                      width: "1rem",
                      height: "1rem",
                      opacity: 0.55,
                      pointerEvents: "none",
                    }}
                  />

                  <input
                    id="searchQuery"
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: "2.5rem", width: "100%" }}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label htmlFor="selectedCollege">College</label>
                <select
                  id="selectedCollege"
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="filter-select"
                >
                  {colleges.map((college) => (
                    <option key={college.value} value={college.value}>
                      {college.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="selectedDate">Date</label>
                <input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="filter-input"
                />
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tabs-navigation">
            <div className="tabs-header">
              <button
                type="button"
                className={`tab-button ${activeTab === "slots" ? "active" : ""}`}
                onClick={() => setActiveTab("slots")}
              >
                <ChevronRightIcon />
                Available Slots ({slotsLoading ? "—" : availableSlots.length})
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === "bookings" ? "active" : ""}`}
                onClick={() => setActiveTab("bookings")}
              >
                <CheckCircleIcon />
                My Bookings ({bookingsLoading ? "—" : activeBookings.length})
              </button>
            </div>
          </div>

          {/* Available Slots */}
          {activeTab === "slots" && (
            <div className="slots-container">
              {slotsLoading ? (
                <div className="empty-state">
                  <Loader2Icon
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <h3>Loading available slots…</h3>
                </div>
              ) : slotsError ? (
                <div className="empty-state">
                  <CalendarIcon />
                  <h3>Could not load slots</h3>
                  <p>{slotsError}</p>
                  <button
                    className="book-btn"
                    style={{ marginTop: "0.5rem" }}
                    onClick={fetchSlots}
                  >
                    Retry
                  </button>
                </div>
              ) : Object.keys(slotsByDate).length === 0 ? (
                <div className="empty-state">
                  <CalendarIcon />
                  <h3>No Available Slots</h3>
                  <p>
                    {selectedDate || selectedCollege !== "all" || searchQuery
                      ? "Try adjusting your filters to see more results"
                      : "No professors have published consultation hours yet"}
                  </p>
                </div>
              ) : (
                <div className="slots-list">
                  {Object.keys(slotsByDate)
                    .sort()
                    .map((date) => (
                      <div key={date} className="slots-date-group">
                        <div className="date-header">
                          <CalendarIcon />
                          <h3>{formatDate(date)}</h3>
                          {isToday(date) && (
                            <span className="appointment-booking-badge today">
                              Today
                            </span>
                          )}
                          {isTomorrow(date) && (
                            <span className="appointment-booking-badge tomorrow">
                              Tomorrow
                            </span>
                          )}
                        </div>
                        <p className="date-count">
                          {slotsByDate[date].length} slots available
                        </p>
                        <div className="slots-grid">
                          {slotsByDate[date].map((slot) => (
                            <div key={slot.id} className="slot-card">
                              <div className="slot-header">
                                <h4>{slot.professorName}</h4>
                                <span className="college-badge">
                                  {slot.college}
                                </span>
                              </div>
                              <div className="slot-details">
                                <div className="slot-detail">
                                  <ClockIcon />
                                  <span>
                                    {formatTime(slot.startTime)} -{" "}
                                    {formatTime(slot.endTime)}
                                  </span>
                                </div>
                                <div className="slot-detail">
                                  <MapPinIcon />
                                  <span>{slot.location}</span>
                                </div>
                                <div className="slot-detail">
                                  <UsersIcon />
                                  <span>
                                    {slot.maxSlots - slot.currentBookings} of{" "}
                                    {slot.maxSlots} available
                                  </span>
                                </div>
                              </div>
                              <button
                                className="book-btn"
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setShowBookDialog(true);
                                }}
                              >
                                Book This Slot
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          {/* My Bookings */}
          <div className="bookings-container">
            <div className="bookings-header">
              <h2>My Appointments</h2>
              <p>Your scheduled consultations</p>
            </div>
            {bookingsLoading ? (
              <div className="empty-state">
                <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
                <h3>Loading your appointments…</h3>
              </div>
            ) : bookingsError ? (
              <div className="empty-state">
                <CheckCircleIcon />
                <h3>Could not load your appointments</h3>
                <p>{bookingsError}</p>
                <button
                  className="book-btn"
                  style={{ marginTop: "0.5rem" }}
                  onClick={fetchMyBookings}
                >
                  Retry
                </button>
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="empty-state">
                <CheckCircleIcon />
                <h3>No Appointments Booked</h3>
                <p>
                  Browse available slots to schedule your first consultation
                </p>
              </div>
            ) : (
              <div className="bookings-list">
                {bookingsByStatus.map(([status, bookings]) => (
                  <div key={status} className="slots-date-group">
                    <div
                      className="date-header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <StatusBadge status={status} />
                      <h3 style={{ margin: 0 }}>{STATUS_LABELS[status]}</h3>
                    </div>
                    <p className="date-count">
                      {bookings.length}{" "}
                      {bookings.length === 1 ? "appointment" : "appointments"}
                    </p>

                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="booking-card"
                        style={{ marginBottom: "0.75rem" }}
                      >
                        <div className="booking-header">
                          <h4>{booking.person}</h4>
                          <span className="college-badge">
                            {booking.college}
                          </span>
                        </div>
                        <div className="booking-details">
                          <div className="booking-detail">
                            <CalendarIcon />
                            <span>{formatDate(booking.date)}</span>
                          </div>
                          <div className="booking-detail">
                            <ClockIcon />
                            {/* booking.time already arrives pre-formatted
                                (e.g. "9:00 AM") from the backend */}
                            <span>{booking.time}</span>
                          </div>
                          <div className="booking-detail">
                            <MapPinIcon />
                            <span>{booking.location}</span>
                          </div>
                        </div>
                        {booking.purpose && (
                          <div className="purpose-box">
                            <span className="purpose-label">Purpose:</span>
                            <span className="purpose-text">
                              {booking.purpose}
                            </span>
                          </div>
                        )}
                        {(status === "pending" || status === "approved") && (
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                          >
                            <XCircleIcon />
                            {cancellingId === booking.id
                              ? "Cancelling…"
                              : "Cancel"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
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

      {/* Book Appointment Dialog */}
      {showBookDialog && selectedSlot && (
        <div
          className="dialog-overlay"
          onClick={() => !submitting && setShowBookDialog(false)}
        >
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Confirm Appointment</h3>
              <button
                className="dialog-close"
                onClick={() => setShowBookDialog(false)}
                disabled={submitting}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="dialog-body">
              <div className="slot-summary">
                <h4>{selectedSlot.professorName}</h4>
                <div className="summary-details">
                  <div className="summary-item">
                    <CalendarIcon />
                    <span>{formatDate(selectedSlot.date)}</span>
                  </div>
                  <div className="summary-item">
                    <ClockIcon />
                    <span>
                      {formatTime(selectedSlot.startTime)} -{" "}
                      {formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <MapPinIcon />
                    <span>{selectedSlot.location}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="purpose">Purpose of Consultation *</label>
                <textarea
                  id="purpose"
                  placeholder="e.g., Thesis consultation, Grade inquiry, Academic advising..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={4}
                  className="textarea"
                ></textarea>
              </div>
              <div className="dialog-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowBookDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleBookSlot}
                  disabled={submitting}
                >
                  {submitting ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
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
      <ActionConfirmModal
        show={cancelConfirmId !== null}
        onCancel={() => setCancelConfirmId(null)}
        onConfirm={doCancel}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="10" y1="14" x2="14" y2="18"></line>
            <line x1="14" y1="14" x2="10" y2="18"></line>
          </svg>
        }
        cancelText="Keep Appointment"
        confirmText="Cancel Appointment"
      />
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
