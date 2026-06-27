import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_slot_management.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import { toast } from "sonner";

// ── Icons ──────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.25rem", height: "1.25rem" }}>
    <polyline points="15 18 9 12 15 6"></polyline>
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
const ClockIconSM = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const RepeatIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);
const PlusIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const MapPinIcon = () => (
  <svg style={{ width: "0.875rem", height: "0.875rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
const UsersIconSM = () => (
  <svg style={{ width: "0.875rem", height: "0.875rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const BanIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
  </svg>
);
const CheckCircleIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const TrashIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4h6v2"></path>
  </svg>
);
const XIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const CalendarSmIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
const getDayName = (n) =>
  ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][n];

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

const getStatusStyle = (status) => {
  switch (status) {
    case "available": return { background: "rgba(34,197,94,0.15)", color: "#22c55e" };
    case "booked":    return { background: "rgba(59,130,246,0.15)", color: "#3b82f6" };
    case "blocked":   return { background: "rgba(239,68,68,0.15)", color: "#ef4444" };
    default:          return { background: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  }
};

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ show, title, description, onClose, children }) {
  if (!show) return null;
  return (
    <div className="sm-modal-overlay">
      <div className="sm-modal">
        <div className="sm-modal-header">
          <div>
            <h3 className="sm-modal-title">{title}</h3>
            {description && <p className="sm-modal-desc">{description}</p>}
          </div>
          <button className="sm-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="sm-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ProfessorSlotManagement() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Faculty", role: "faculty", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState("slots");

  // ── Slot state ────────────────────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [templates, setTemplates] = useState([]);

  // ── Dialog state ──────────────────────────────────────────────────────
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // ── Slot form ─────────────────────────────────────────────────────────
  const [slotDate, setSlotDate] = useState("");
  const [slotStartTime, setSlotStartTime] = useState("");
  const [slotEndTime, setSlotEndTime] = useState("");
  const [slotLocation, setSlotLocation] = useState("");
  const [slotMaxBookings, setSlotMaxBookings] = useState("1");

  // ── Template form ─────────────────────────────────────────────────────
  const [templateDay, setTemplateDay] = useState("1");
  const [templateStartTime, setTemplateStartTime] = useState("");
  const [templateEndTime, setTemplateEndTime] = useState("");
  const [templateLocation, setTemplateLocation] = useState("");
  const [templateMaxSlots, setTemplateMaxSlots] = useState("1");

  // ── Generate form ─────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");

  // ── Computed ──────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingSlots = [...slots]
    .filter((s) => new Date(s.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const slotStats = [
    { label: "Total Slots",  value: upcomingSlots.length, color: "#3b82f6" },
    { label: "Available",    value: upcomingSlots.filter(s => s.status === "available" && s.currentBookings < s.maxSlots).length, color: "#22c55e" },
    { label: "Booked",       value: upcomingSlots.filter(s => s.currentBookings > 0).length, color: "#a855f7" },
    { label: "Blocked",      value: upcomingSlots.filter(s => s.status === "blocked").length, color: "#ef4444" },
  ];

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const DAY_NAME_TO_NUM = { Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/faculty/availability");
      setTemplates(res.data.map((r) => ({
        id: String(r.availability_id),
        availability_id: r.availability_id,
        dayOfWeek: DAY_NAME_TO_NUM[r.day_of_week] ?? 1,
        day_of_week: r.day_of_week,
        startTime: r.start_time,
        endTime: r.end_time,
        location: r.location ?? "",
        maxSlots: 1,
        isActive: true,
      })));
    } catch {
      toast.error("Failed to load templates");
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("slot")) return `You currently have ${upcomingSlots.length} upcoming slot(s).`;
    if (i.includes("template")) return `You have ${templates.length} template(s) created.`;
    if (i.includes("available")) return `You have ${slotStats[1].value} available slot(s).`;
    return "I can help you manage your time slots and templates. What do you need?";
  };

  // ── Slot CRUD ─────────────────────────────────────────────────────────
  const handleCreateSlot = () => {
    if (!slotDate || !slotStartTime || !slotEndTime || !slotLocation) {
      alert("Please fill in all required fields."); return;
    }
    if (slotEndTime <= slotStartTime) {
      alert("End time must be after start time."); return;
    }
    const newSlot = {
      id: `slot-${Date.now()}`,
      professorId: user.employeeId || "prof-001",
      date: slotDate, startTime: slotStartTime, endTime: slotEndTime,
      status: "available", location: slotLocation,
      maxSlots: parseInt(slotMaxBookings), currentBookings: 0,
    };
    setSlots((prev) => [...prev, newSlot]);
    resetSlotForm();
  };

  const handleBlockSlot = (id) => {
    if (window.confirm("Block this time slot?"))
      setSlots((prev) => prev.map(s => s.id === id ? { ...s, status: "blocked" } : s));
  };
  const handleUnblockSlot = (id) => {
    setSlots((prev) => prev.map(s => s.id === id ? { ...s, status: "available" } : s));
  };
  const handleDeleteSlot = (id) => {
    if (window.confirm("Delete this time slot? This cannot be undone."))
      setSlots((prev) => prev.filter(s => s.id !== id));
  };

  const resetSlotForm = () => {
    setSlotDate(""); setSlotStartTime(""); setSlotEndTime(""); setSlotLocation(""); setSlotMaxBookings("1");
    setShowSlotDialog(false);
  };

  // ── Template CRUD ─────────────────────────────────────────────────────
  const DAY_NAMES_ARR = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const handleCreateTemplate = async () => {
    if (!templateStartTime || !templateEndTime || !templateLocation) {
      toast.error("Please fill in all required fields."); return;
    }
    try {
      await api.post("/faculty/availability", {
        day_of_week: DAY_NAMES_ARR[parseInt(templateDay)],
        start_time: templateStartTime,
        end_time: templateEndTime,
        location: templateLocation,
      });
      await fetchTemplates();
      toast.success("Template created");
    } catch {
      toast.error("Failed to create template");
    }
    resetTemplateForm();
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    const tmpl = templates.find(t => t.id === id);
    try {
      await api.delete(`/faculty/availability/${tmpl?.availability_id ?? id}`);
      await fetchTemplates();
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleToggleTemplate = (id, current) => {
    // Toggle is UI-only (availability rows have no active/inactive flag)
    setTemplates((prev) => prev.map(t => t.id === id ? { ...t, isActive: !current } : t));
  };

  const resetTemplateForm = () => {
    setTemplateDay("1"); setTemplateStartTime(""); setTemplateEndTime(""); setTemplateLocation(""); setTemplateMaxSlots("1");
    setShowTemplateDialog(false);
  };

  // ── Generate slots from template ──────────────────────────────────────
  const handleGenerateSlots = () => {
    if (!selectedTemplate || !generateStartDate || !generateEndDate) {
      alert("Please fill in all required fields."); return;
    }
    if (generateEndDate < generateStartDate) {
      alert("End date must be after start date."); return;
    }
    const tmpl = templates.find(t => t.id === selectedTemplate);
    if (!tmpl) return;
    const generated = [];
    const cur = new Date(generateStartDate);
    const end = new Date(generateEndDate);
    while (cur <= end) {
      if (cur.getDay() === tmpl.dayOfWeek) {
        generated.push({
          id: `slot-${Date.now()}-${cur.toISOString()}`,
          professorId: tmpl.professorId,
          date: cur.toISOString().split("T")[0],
          startTime: tmpl.startTime, endTime: tmpl.endTime,
          status: "available", location: tmpl.location,
          maxSlots: tmpl.maxSlots, currentBookings: 0,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    setSlots((prev) => [...prev, ...generated]);
    setShowGenerateDialog(false);
    setSelectedTemplate(""); setGenerateStartDate(""); setGenerateEndDate("");
    alert(`${generated.length} slot(s) generated.`);
  };

  const navItems = [
    { icon: HomeIcon,        label: "Dashboard",    path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents",    path: "/professor/documents" },
    { icon: HistoryIconNav,  label: "Transactions", path: "/professor/transactions" },
  ];

  const todayStr = new Date().toISOString().split("T")[0];

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
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                  className={`nav-item${location.pathname === item.path ? " active" : ""}`} title={item.label}>
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon /><span>Logout</span>
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
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="sm-page">

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Header Banner */}
          <div className="sm-banner">
            <div className="sm-banner-bg sm-banner-bg-1"></div>
            <div className="sm-banner-bg sm-banner-bg-2"></div>
            <div className="sm-banner-content">
              <div className="sm-banner-icon">
                <ClockIconSM />
              </div>
              <div>
                <h1 className="sm-banner-title">Slot Management</h1>
                <p className="sm-banner-subtitle">Manage your consultation time slots and availability</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="sm-stats-grid">
            {slotStats.map((stat) => (
              <div key={stat.label} className="sm-stat-card">
                <p className="sm-stat-label">{stat.label}</p>
                <p className="sm-stat-value" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="sm-actions-row">
            <button className="sm-btn-primary" onClick={() => setShowSlotDialog(true)}>
              <PlusIcon /> Create Single Slot
            </button>
            <button className="sm-btn-outline" onClick={() => setShowTemplateDialog(true)}>
              <RepeatIcon /> Create Template
            </button>
            {templates.filter(t => t.isActive).length > 0 && (
              <button className="sm-btn-outline" onClick={() => setShowGenerateDialog(true)}>
                <CalendarSmIcon /> Generate from Template
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="sm-tabs">
            <button
              className={`sm-tab ${activeTab === "slots" ? "sm-tab-active" : ""}`}
              onClick={() => setActiveTab("slots")}
            >
              <ClockIconSM /> Time Slots ({upcomingSlots.length})
            </button>
            <button
              className={`sm-tab ${activeTab === "templates" ? "sm-tab-active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              <RepeatIcon /> Templates ({templates.length})
            </button>
          </div>

          {/* Time Slots Tab */}
          {activeTab === "slots" && (
            <div className="sm-card">
              <div className="sm-card-header">
                <h2 className="sm-card-title">Your Time Slots</h2>
                <p className="sm-card-desc">Manage your consultation availability</p>
              </div>
              <div className="sm-card-body">
                {upcomingSlots.length === 0 ? (
                  <div className="sm-empty-state">
                    <div className="sm-empty-icon"><ClockIconSM /></div>
                    <h3 className="sm-empty-title">No Time Slots Created</h3>
                    <p className="sm-empty-desc">Create your first time slot to start accepting appointments</p>
                    <button className="sm-btn-primary" onClick={() => setShowSlotDialog(true)}>
                      <PlusIcon /> Create Time Slot
                    </button>
                  </div>
                ) : (
                  <div className="sm-list">
                    {upcomingSlots.map((slot) => (
                      <div key={slot.id} className="sm-slot-item">
                        <div className="sm-slot-main">
                          <div className="sm-slot-top">
                            <h4 className="sm-slot-date">{formatDate(slot.date)}</h4>
                            <span className="sm-status-badge" style={getStatusStyle(slot.status)}>
                              {slot.status}
                            </span>
                          </div>
                          <div className="sm-slot-meta">
                            <span className="sm-meta-item"><ClockIconSM />{slot.startTime} – {slot.endTime}</span>
                            <span className="sm-meta-item"><MapPinIcon />{slot.location}</span>
                            <span className="sm-meta-item"><UsersIconSM />{slot.currentBookings}/{slot.maxSlots} booked</span>
                          </div>
                          {slot.bookedByName && (
                            <p className="sm-booked-by">
                              Booked by: <strong>{slot.bookedByName}</strong>
                              {slot.purpose && <span style={{ color: "var(--text-tertiary)" }}> – {slot.purpose}</span>}
                            </p>
                          )}
                        </div>
                        <div className="sm-slot-actions">
                          {slot.status === "blocked" ? (
                            <button className="sm-icon-btn sm-btn-green" onClick={() => handleUnblockSlot(slot.id)} title="Unblock">
                              <CheckCircleIcon />
                            </button>
                          ) : slot.currentBookings === 0 && (
                            <button className="sm-icon-btn sm-btn-orange" onClick={() => handleBlockSlot(slot.id)} title="Block">
                              <BanIcon />
                            </button>
                          )}
                          <button
                            className="sm-icon-btn sm-btn-red"
                            onClick={() => handleDeleteSlot(slot.id)}
                            title="Delete"
                            disabled={slot.currentBookings > 0}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="sm-card">
              <div className="sm-card-header">
                <h2 className="sm-card-title">Slot Templates</h2>
                <p className="sm-card-desc">Recurring time slot patterns</p>
              </div>
              <div className="sm-card-body">
                {templates.length === 0 ? (
                  <div className="sm-empty-state">
                    <div className="sm-empty-icon"><RepeatIcon /></div>
                    <h3 className="sm-empty-title">No Templates Created</h3>
                    <p className="sm-empty-desc">Create templates to quickly generate recurring time slots</p>
                    <button className="sm-btn-primary" onClick={() => setShowTemplateDialog(true)}>
                      <PlusIcon /> Create Template
                    </button>
                  </div>
                ) : (
                  <div className="sm-list">
                    {templates.map((tmpl) => (
                      <div key={tmpl.id} className="sm-slot-item">
                        <div className="sm-slot-main">
                          <div className="sm-slot-top">
                            <h4 className="sm-slot-date">Every {getDayName(tmpl.dayOfWeek)}</h4>
                            <span className="sm-status-badge"
                              style={tmpl.isActive
                                ? { background: "rgba(34,197,94,0.15)", color: "#22c55e" }
                                : { background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>
                              {tmpl.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="sm-slot-meta">
                            <span className="sm-meta-item"><ClockIconSM />{tmpl.startTime} – {tmpl.endTime}</span>
                            <span className="sm-meta-item"><MapPinIcon />{tmpl.location}</span>
                            <span className="sm-meta-item"><UsersIconSM />Max {tmpl.maxSlots} students</span>
                          </div>
                        </div>
                        <div className="sm-slot-actions">
                          <button
                            className={`sm-icon-btn ${tmpl.isActive ? "sm-btn-orange" : "sm-btn-green"}`}
                            onClick={() => handleToggleTemplate(tmpl.id, tmpl.isActive)}
                            title={tmpl.isActive ? "Deactivate" : "Activate"}
                          >
                            {tmpl.isActive ? <XIcon /> : <CheckCircleIcon />}
                          </button>
                          <button className="sm-icon-btn sm-btn-red" onClick={() => handleDeleteTemplate(tmpl.id)} title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Create Single Slot Modal ── */}
      <Modal show={showSlotDialog} title="Create Time Slot" description="Add a new consultation time slot" onClose={resetSlotForm}>
        <div className="sm-form-group">
          <label className="sm-label">Date *</label>
          <input className="sm-input" type="date" value={slotDate}
            min={todayStr} onChange={(e) => setSlotDate(e.target.value)} />
        </div>
        <div className="sm-form-row">
          <div className="sm-form-group">
            <label className="sm-label">Start Time *</label>
            <input className="sm-input" type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} />
          </div>
          <div className="sm-form-group">
            <label className="sm-label">End Time *</label>
            <input className="sm-input" type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} />
          </div>
        </div>
        <div className="sm-form-group">
          <label className="sm-label">Location *</label>
          <input className="sm-input" type="text" placeholder="e.g., Room 301, Faculty Office"
            value={slotLocation} onChange={(e) => setSlotLocation(e.target.value)} />
        </div>
        <div className="sm-form-group">
          <label className="sm-label">Max Students *</label>
          <input className="sm-input" type="number" min="1" max="10"
            value={slotMaxBookings} onChange={(e) => setSlotMaxBookings(e.target.value)} />
        </div>
        <div className="sm-modal-footer">
          <button className="sm-btn-outline" onClick={resetSlotForm}>Cancel</button>
          <button className="sm-btn-primary" onClick={handleCreateSlot}>Create Slot</button>
        </div>
      </Modal>

      {/* ── Create Template Modal ── */}
      <Modal show={showTemplateDialog} title="Create Slot Template" description="Create a recurring slot pattern" onClose={resetTemplateForm}>
        <div className="sm-form-group">
          <label className="sm-label">Day of Week *</label>
          <select className="sm-input sm-select" value={templateDay} onChange={(e) => setTemplateDay(e.target.value)}>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
        <div className="sm-form-row">
          <div className="sm-form-group">
            <label className="sm-label">Start Time *</label>
            <input className="sm-input" type="time" value={templateStartTime} onChange={(e) => setTemplateStartTime(e.target.value)} />
          </div>
          <div className="sm-form-group">
            <label className="sm-label">End Time *</label>
            <input className="sm-input" type="time" value={templateEndTime} onChange={(e) => setTemplateEndTime(e.target.value)} />
          </div>
        </div>
        <div className="sm-form-group">
          <label className="sm-label">Location *</label>
          <input className="sm-input" type="text" placeholder="e.g., Room 301"
            value={templateLocation} onChange={(e) => setTemplateLocation(e.target.value)} />
        </div>
        <div className="sm-form-group">
          <label className="sm-label">Max Students *</label>
          <input className="sm-input" type="number" min="1" max="10"
            value={templateMaxSlots} onChange={(e) => setTemplateMaxSlots(e.target.value)} />
        </div>
        <div className="sm-modal-footer">
          <button className="sm-btn-outline" onClick={resetTemplateForm}>Cancel</button>
          <button className="sm-btn-primary" onClick={handleCreateTemplate}>Create Template</button>
        </div>
      </Modal>

      {/* ── Generate from Template Modal ── */}
      <Modal show={showGenerateDialog} title="Generate Slots from Template"
        description="Create multiple slots based on a template" onClose={() => setShowGenerateDialog(false)}>
        <div className="sm-form-group">
          <label className="sm-label">Select Template *</label>
          <select className="sm-input sm-select" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
            <option value="">Choose a template</option>
            {templates.filter(t => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{getDayName(t.dayOfWeek)} {t.startTime}–{t.endTime}</option>
            ))}
          </select>
        </div>
        <div className="sm-form-group">
          <label className="sm-label">Start Date *</label>
          <input className="sm-input" type="date" value={generateStartDate}
            min={todayStr} onChange={(e) => setGenerateStartDate(e.target.value)} />
        </div>
        <div className="sm-form-group">
          <label className="sm-label">End Date *</label>
          <input className="sm-input" type="date" value={generateEndDate}
            min={generateStartDate || todayStr} onChange={(e) => setGenerateEndDate(e.target.value)} />
        </div>
        <div className="sm-modal-footer">
          <button className="sm-btn-outline" onClick={() => setShowGenerateDialog(false)}>Cancel</button>
          <button className="sm-btn-primary" onClick={handleGenerateSlots}>Generate Slots</button>
        </div>
      </Modal>

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat">
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
              <input type="text" className="chat-input" placeholder="Ask me anything..."
                value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              <button type="submit" className="chat-send-btn" aria-label="Send message">
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat">
          <ChatIcon />
        </button>
      </div>

      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}