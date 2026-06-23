import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
import "./admin_dashboard.css";
import "./admin_announcements.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { Link } from "react-router-dom";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
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

// ── Page-only icons ───────────────────────────────────────────────────────────
const PlusIconSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const MegaphoneIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 11l18-5v12L3 13v-2z"></path>
    <path d="M11.6 16.8a3 3 0 0 1-5.8-1.6"></path>
  </svg>
);
const PinIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5"></path>
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
  </svg>
);
const AlertCircleIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);
const CalendarIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const BellIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
const InfoIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
const SearchIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EyeIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const XIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const CheckCircleIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

// ── Static reference data ─────────────────────────────────────────────────────
const COLLEGES = [
  { name: "College of Computing Studies", shortName: "CCS", color: "#f97316" },
  { name: "College of Business Accountancy and Administration", shortName: "CBAA", color: "#facc15" },
  { name: "College of Education", shortName: "COED", color: "#2563eb" },
  { name: "College of Engineering", shortName: "COE", color: "#ef4444" },
  { name: "College of Arts and Sciences", shortName: "CAS", color: "#7f1d1d" },
  { name: "College of Health and Allied Sciences", shortName: "CHAS", color: "#22c55e" },
];

const TYPE_META = {
  important: { label: "Important", icon: AlertCircleIcon, iconClass: "ann-icon-important", badgeClass: "ann-badge-important" },
  event:     { label: "Event",     icon: CalendarIcon,    iconClass: "ann-icon-event",     badgeClass: "ann-badge-event"     },
  reminder:  { label: "Reminder",  icon: BellIcon,        iconClass: "ann-icon-reminder",  badgeClass: "ann-badge-reminder"  },
  general:   { label: "General",   icon: InfoIcon,        iconClass: "ann-icon-general",   badgeClass: "ann-badge-general"   },
};

const EMPTY_FORM = { title: "", content: "", type: "general", isPinned: false };

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

export default function AdminAnnouncements() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Admin", college: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();

  // ── Sidebar / theme / chat ─────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. Ask me about announcements, pinning, or filters.", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Logout confirmation ────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("pin")) return "Use the Pin button on any active announcement to keep it at the top, or Unpin to remove it.";
    if (i.includes("archive")) return "Archiving moves an announcement out of the active list. You can restore it anytime from the Archived tab.";
    if (i.includes("delete")) return "Deleting an archived announcement removes it permanently — this can't be undone.";
    if (i.includes("filter") || i.includes("college") || i.includes("type"))
      return "Use the search bar and the Type dropdown above the list to narrow down announcements.";
    if (i.includes("create") || i.includes("new")) return "Click 'New Announcement' at the top right to publish a new one.";
    return "I can help with creating, pinning, filtering, archiving, or deleting announcements. What do you need?";
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const navItems = [
    { icon: HomeIcon,        label: "Dashboard",    path: "/admin/dashboard"    },
    { icon: QueueIconNav,    label: "Queue",        path: "/admin/queue"        },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents",    path: "/admin/documents"    },
    { icon: HistoryIconNav,  label: "Transactions", path: "/admin/transactions" },
  ];

  // ── Announcements state ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [toasts, setToasts] = useState([]);
  const showToast = (message, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // ── Fetch from API ─────────────────────────────────────────────────────────
  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/admin/announcements");
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      showToast("Failed to load announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = {
    total:     announcements.filter((a) => a.status === "active").length,
    pinned:    announcements.filter((a) => a.isPinned && a.status === "active").length,
    important: announcements.filter((a) => a.type === "important" && a.status === "active").length,
    archived:  announcements.filter((a) => a.status === "archived").length,
  };

  const getFiltered = (status) => {
    let list = announcements.filter((a) => a.status === status);
    if (selectedType !== "all") list = list.filter((a) => a.type === selectedType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          (a.createdBy || "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleTogglePin = async (id) => {
    try {
      const { data } = await api.patch(`/admin/announcements/${id}/pin`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isPinned: data.isPinned } : a)));
      showToast("Pin status updated");
    } catch {
      showToast("Failed to update pin status", "error");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/admin/announcements/${id}/archive`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status: "archived" } : a)));
      showToast("Announcement archived");
    } catch {
      showToast("Failed to archive announcement", "error");
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/admin/announcements/${id}/restore`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)));
      showToast("Announcement restored");
    } catch {
      showToast("Failed to restore announcement", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement permanently? This can't be undone.")) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("Announcement deleted permanently");
    } catch {
      showToast("Failed to delete announcement", "error");
    }
  };

  const openEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setEditForm({ title: announcement.title, content: announcement.content, type: announcement.type, isPinned: announcement.isPinned });
  };
  const closeEdit = () => { setEditingAnnouncement(null); setEditForm(EMPTY_FORM); };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    try {
      await api.put(`/admin/announcements/${editingAnnouncement.id}`, {
        title: editForm.title,
        content: editForm.content,
        type: editForm.type,
      });
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === editingAnnouncement.id
            ? { ...a, title: editForm.title, content: editForm.content, type: editForm.type }
            : a,
        ),
      );
      showToast("Announcement updated successfully");
      closeEdit();
    } catch {
      showToast("Failed to update announcement", "error");
    }
  };

  const closeCreate = () => { setIsCreating(false); setCreateForm(EMPTY_FORM); };

  const saveCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    try {
      const { data } = await api.post("/admin/announcements", {
        title:    createForm.title,
        content:  createForm.content,
        type:     createForm.type,
        isPinned: createForm.isPinned,
      });
      setAnnouncements((prev) => [data.announcement, ...prev]);
      showToast("Announcement created successfully");
      closeCreate();
    } catch {
      showToast("Failed to create announcement", "error");
    }
  };

  const list = getFiltered(activeTab);

  return (
    <div className="admin-dashboard-with-sidebar">
      {/* Logout Confirmation */}
      <LogoutConfirmModal
        show={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Toasts */}
      <div className="ann-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`ann-toast ${t.kind === "error" ? "ann-toast-error" : ""}`}>
            {t.message}
          </div>
        ))}
      </div>

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
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
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

      {/* Sidebar */}
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name}</p>
                <span className="user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college}</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="nav-item" title={item.label}>
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
      <main className="admin-dashboard-main">
        <div className="ann-page">
          {/* Back button */}
          <button className="admin-back-btn" onClick={() => navigate("/admin/dashboard")}><ChevronLeftIcon /><span>Dashboard</span></button>

          {/* Header */}
          <div className="ann-header-row">
            <div>
              <h1 className="ann-page-title">Announcements Management</h1>
              <p className="ann-page-subtitle">
                Manage announcements for {user?.college || "your department"}
              </p>
            </div>
            <button className="ann-btn-new" onClick={() => setIsCreating(true)}>
              <PlusIconSmall />
              New Announcement
            </button>
          </div>

          {/* Stats */}
          <div className="ann-stats-grid">
            <div className="ann-stat-card ann-stat-total">
              <div><p className="ann-stat-label">Total Active</p><p className="ann-stat-value">{stats.total}</p></div>
              <MegaphoneIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-pinned">
              <div><p className="ann-stat-label">Pinned</p><p className="ann-stat-value">{stats.pinned}</p></div>
              <PinIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-important">
              <div><p className="ann-stat-label">Important</p><p className="ann-stat-value">{stats.important}</p></div>
              <AlertCircleIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-archived">
              <div><p className="ann-stat-label">Archived</p><p className="ann-stat-value">{stats.archived}</p></div>
              <XIcon className="ann-stat-icon" />
            </div>
          </div>

          {/* Filters */}
          <div className="ann-filters-card">
            <div className="ann-search-wrap">
              <SearchIcon className="ann-search-icon" />
              <input
                className="ann-search-input"
                placeholder="Search announcements by title, content, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="ann-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="important">Important</option>
              <option value="event">Events</option>
              <option value="reminder">Reminders</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* List */}
          <div className="ann-list-card">
            <div className="ann-list-header">
              <h2>Announcements — {user?.college || "Your Department"}</h2>
              <p>View and manage your department's announcements</p>
            </div>

            <div className="ann-tabs">
              <button className={`ann-tab ${activeTab === "active" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("active")}>
                Active
              </button>
              <button className={`ann-tab ${activeTab === "archived" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("archived")}>
                Archived
              </button>
            </div>

            {isLoading ? (
              <div className="ann-loading">
                <div className="ann-loading-spinner" />
                <p>Loading announcements…</p>
              </div>
            ) : (
              <div className="ann-items">
                {list.length === 0 ? (
                  <div className="ann-empty">
                    <MegaphoneIcon />
                    <p>No {activeTab} announcements found.</p>
                  </div>
                ) : (
                  list.map((a) => {
                    const meta = TYPE_META[a.type] || TYPE_META.general;
                    const TypeIcon = meta.icon;
                    return (
                      <div key={a.id} className={`ann-item ${a.isPinned ? "ann-item-pinned" : ""}`}>
                        <div className={`ann-item-icon ${meta.iconClass}`}>
                          <TypeIcon />
                        </div>
                        <div className="ann-item-body">
                          <div className="ann-item-top">
                            <div className="ann-item-title-row">
                              <h3 className="ann-item-title">{a.title}</h3>
                              {a.isPinned && <PinIcon className="ann-pin-flag" />}
                            </div>
                            <span className={`ann-badge ${meta.badgeClass}`}>{meta.label}</span>
                          </div>
                          <p className="ann-item-desc">{a.content}</p>
                          <div className="ann-item-meta">
                            <span><CalendarIcon />{formatDate(a.date)}</span>
                            <span>•</span>
                            <span>By: {a.createdBy || "Admin Office"}</span>
                          </div>
                          <div className="ann-item-actions">
                            <button className="ann-action-btn" onClick={() => setViewingAnnouncement(a)}>
                              <EyeIcon /> View
                            </button>
                            <button className="ann-action-btn" onClick={() => openEdit(a)}>
                              <img src={editIcon} alt="" /> Edit
                            </button>
                            {a.status === "active" ? (
                              <>
                                <button
                                  className={`ann-action-btn ${a.isPinned ? "ann-action-pin-on" : ""}`}
                                  onClick={() => handleTogglePin(a.id)}
                                >
                                  <PinIcon /> {a.isPinned ? "Unpin" : "Pin"}
                                </button>
                                <button className="ann-action-btn ann-action-archive" onClick={() => handleArchive(a.id)}>
                                  <img src={deleteIcon} alt="" /> Archive
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="ann-action-btn ann-action-restore" onClick={() => handleRestore(a.id)}>
                                  Restore
                                </button>
                                <button className="ann-action-btn ann-action-delete" onClick={() => handleDelete(a.id)}>
                                  <img src={deleteIcon} alt="" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* View Modal */}
      {viewingAnnouncement && (
        <div className="ann-modal-overlay" onClick={() => setViewingAnnouncement(null)}>
          <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ann-modal-header">
              <div>
                <h3 className="ann-modal-title"><EyeIcon /> Announcement Details</h3>
                <p className="ann-modal-desc">View complete information about this announcement</p>
              </div>
              <button className="ann-modal-close" onClick={() => setViewingAnnouncement(null)} aria-label="Close">
                <XIcon />
              </button>
            </div>

            <div className="ann-view-banner">
              <div>
                <h2>{viewingAnnouncement.title}</h2>
                <div className="ann-view-banner-date"><CalendarIcon />{formatDate(viewingAnnouncement.date)}</div>
              </div>
              <div className="ann-view-banner-badges">
                <span className={`ann-badge ${TYPE_META[viewingAnnouncement.type].badgeClass}`}>
                  {TYPE_META[viewingAnnouncement.type].label}
                </span>
                {viewingAnnouncement.isPinned && (
                  <span className="ann-pinned-pill"><PinIcon /> Pinned</span>
                )}
              </div>
            </div>

            <p className="ann-view-label">Content</p>
            <div className="ann-view-block"><p>{viewingAnnouncement.content}</p></div>

            <div className="ann-view-grid">
              <div>
                <p className="ann-view-label">Created By</p>
                <p className="ann-view-value">{viewingAnnouncement.createdBy || "Admin Office"}</p>
              </div>
              <div>
                <p className="ann-view-label">Status</p>
                <p className="ann-view-value">
                  <span className={`ann-status-pill ${viewingAnnouncement.status === "active" ? "ann-status-active" : "ann-status-archived"}`}>
                    {viewingAnnouncement.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="ann-view-label">Published Date</p>
                <p className="ann-view-value">{formatDate(viewingAnnouncement.date)}</p>
              </div>
            </div>

            <div className="ann-modal-footer">
              <button className="ann-btn-secondary" onClick={() => { const a = viewingAnnouncement; setViewingAnnouncement(null); openEdit(a); }}>
                Edit Announcement
              </button>
              <button className="ann-btn-primary" onClick={() => setViewingAnnouncement(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAnnouncement && (
        <div className="ann-modal-overlay" onClick={closeEdit}>
          <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ann-modal-header">
              <div>
                <h3 className="ann-modal-title">Edit Announcement</h3>
                <p className="ann-modal-desc">Make changes and save when you're done.</p>
              </div>
              <button className="ann-modal-close" onClick={closeEdit} aria-label="Close"><XIcon /></button>
            </div>

            <div className="ann-field">
              <label htmlFor="edit-title">Title *</label>
              <input id="edit-title" className="ann-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="ann-field">
              <label htmlFor="edit-content">Content *</label>
              <textarea id="edit-content" className="ann-textarea" value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} />
            </div>
            <div className="ann-field-row">
              <div className="ann-field">
                <label htmlFor="edit-type">Type *</label>
                <select id="edit-type" className="ann-select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="important">Important</option>
                  <option value="event">Event</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
            </div>

            <div className="ann-modal-footer">
              <button className="ann-btn-secondary" onClick={closeEdit}>Cancel</button>
              <button className="ann-btn-primary" onClick={saveEdit}><CheckCircleIcon /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="ann-modal-overlay" onClick={closeCreate}>
          <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ann-modal-header">
              <div>
                <h3 className="ann-modal-title"><PlusIconSmall /> New Announcement</h3>
                <p className="ann-modal-desc">Create a new announcement for your department.</p>
              </div>
              <button className="ann-modal-close" onClick={closeCreate} aria-label="Close"><XIcon /></button>
            </div>

            <div className="ann-field">
              <label htmlFor="create-title">Title *</label>
              <input id="create-title" className="ann-input" placeholder="Enter announcement title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
            </div>
            <div className="ann-field">
              <label htmlFor="create-content">Content *</label>
              <textarea id="create-content" className="ann-textarea" placeholder="Enter announcement content" value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} />
            </div>
            <div className="ann-field-row">
              <div className="ann-field">
                <label htmlFor="create-type">Type *</label>
                <select id="create-type" className="ann-select" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="important">Important</option>
                  <option value="event">Event</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div className="ann-field">
                <label htmlFor="create-pinned">Pin Announcement</label>
                <select id="create-pinned" className="ann-select" value={createForm.isPinned ? "true" : "false"} onChange={(e) => setCreateForm({ ...createForm, isPinned: e.target.value === "true" })}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div className="ann-modal-footer">
              <button className="ann-btn-secondary" onClick={closeCreate}>Cancel</button>
              <button className="ann-btn-primary" onClick={saveCreate}><CheckCircleIcon /> Save Announcement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
