import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_user_management.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ─── Shared Layout Icons ──────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ─── Page-specific Icons ──────────────────────────────────────────────────────
const UsersHeaderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="30" height="30">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const EditIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const KeyIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const TrashIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const COLLEGES = [
  { value: "CCS",  label: "College of Computing Studies (CCS)" },
  { value: "CBAA", label: "College of Business, Accountancy and Administration (CBAA)" },
  { value: "COED", label: "College of Education (COED)" },
  { value: "COE",  label: "College of Engineering (COE)" },
  { value: "CAS",  label: "College of Arts and Sciences (CAS)" },
  { value: "CHAS", label: "College of Health and Allied Sciences (CHAS)" },
];

const INITIAL_USERS = [
  { id: "1", name: "Juan Dela Cruz",    email: "juan.delacruz@pnc.edu.ph",  role: "student",   college: "CCS",  studentId: "2100123",       status: "active",    lastLogin: "2026-05-20T08:30:00", createdDate: "2021-08-15" },
  { id: "2", name: "Maria Santos",      email: "maria.santos@pnc.edu.ph",   role: "student",   college: "CBAA", studentId: "2100456",       status: "active",    lastLogin: "2026-05-19T14:20:00", createdDate: "2021-08-15" },
  { id: "3", name: "Dr. Roberto Cruz",  email: "roberto.cruz@pnc.edu.ph",   role: "professor", college: "CCS",  employeeId: "EMP-2020-045", status: "active",    lastLogin: "2026-05-20T09:15:00", createdDate: "2020-06-01" },
  { id: "4", name: "Prof. Carmen Ramos",email: "carmen.ramos@pnc.edu.ph",   role: "professor", college: "CBAA", employeeId: "EMP-2019-023", status: "active",    lastLogin: "2026-05-20T07:45:00", createdDate: "2019-08-20" },
  { id: "5", name: "Admin Office CCS",  email: "admin.ccs@pnc.edu.ph",      role: "admin",     college: "CCS",  employeeId: "ADM-2021-001", status: "active",    lastLogin: "2026-05-20T10:00:00", createdDate: "2021-01-10" },
  { id: "6", name: "Pedro Garcia",      email: "pedro.garcia@pnc.edu.ph",   role: "student",   college: "COE",  studentId: "2200789",       status: "suspended", lastLogin: "2026-05-10T16:30:00", createdDate: "2022-08-20" },
];

const BLANK_FORM = { name: "", email: "", role: "student", college: "", employeeId: "", studentId: "", status: "active" };

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUserManagement() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", employeeId: authUser.employeeId ?? "", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Admin", role: "admin", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();

  // ── Layout state ────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() }]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── User-management state ────────────────────────────────────────────────────
  const [users, setUsers]           = useState(INITIAL_USERS);
  const [showModal, setShowModal]   = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm]             = useState(BLANK_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab]   = useState("all");

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  // ── Handlers: layout ────────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => setIsDark((p) => { const n = !p; applyTheme(n ? "dark" : "light"); return n; });

  // ── Handlers: chat ───────────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages((p) => [...p, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((p) => [...p, bot]);
    }, 600);
  };
  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("student"))   return `There are ${users.filter(u => u.role === "student").length} student accounts in the system.`;
    if (i.includes("professor") || i.includes("faculty")) return `There are ${users.filter(u => u.role === "professor").length} professor accounts.`;
    if (i.includes("suspend"))   return `There are ${users.filter(u => u.status === "suspended").length} suspended accounts. Edit a user to reactivate.`;
    if (i.includes("user") || i.includes("account")) return "Use the Add User button to create accounts, or click the edit icon to modify existing ones.";
    return "I can help with user accounts, filtering, and password resets. What do you need?";
  };

  // ── Handlers: CRUD ───────────────────────────────────────────────────────────
  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openAddModal = () => { setForm(BLANK_FORM); setEditingUser(null); setShowModal(true); };
  const openEditModal = (u) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, college: u.college, employeeId: u.employeeId || "", studentId: u.studentId || "", status: u.status });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingUser(null); setForm(BLANK_FORM); };

  const handleSave = () => {
    if (!form.name || !form.email || !form.college) return toast.error("Please fill in all required fields");
    if (!form.email.endsWith("@pnc.edu.ph"))        return toast.error("Email must use @pnc.edu.ph domain");
    if (form.role === "student" && !form.studentId)  return toast.error("Student ID is required for students");
    if (form.role !== "student" && !form.employeeId) return toast.error("Employee ID is required for professors and admins");

    if (editingUser) {
      setUsers((p) => p.map((u) => u.id === editingUser.id ? { ...u, ...form } : u));
      toast.success("User updated successfully");
    } else {
      const newUser = { id: Date.now().toString(), ...form, employeeId: form.role !== "student" ? form.employeeId : undefined, studentId: form.role === "student" ? form.studentId : undefined, createdDate: new Date().toISOString().split("T")[0] };
      setUsers((p) => [newUser, ...p]);
      toast.success("User created successfully");
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return;
    setUsers((p) => p.filter((u) => u.id !== id));
    toast.success("User deleted successfully");
  };
  const handleResetPassword = (u) => {
    if (!window.confirm(`Reset password for ${u.name}? A temporary password will be sent to ${u.email}`)) return;
    toast.success(`Password reset email sent to ${u.email}`);
  };

  // ── Filtered / grouped users ─────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.studentId || "").toLowerCase().includes(q) || (u.employeeId || "").toLowerCase().includes(q);
    return matchSearch && (filterRole === "all" || u.role === filterRole) && (filterStatus === "all" || u.status === filterStatus);
  });
  const students   = filtered.filter((u) => u.role === "student");
  const professors = filtered.filter((u) => u.role === "professor");
  const admins     = filtered.filter((u) => u.role === "admin");

  const displayUsers = activeTab === "students" ? students : activeTab === "professors" ? professors : activeTab === "admins" ? admins : filtered;
  const tabMeta = { all: { title: "All Users", desc: "Complete list of all user accounts" }, students: { title: "Student Accounts", desc: "Manage student user accounts" }, professors: { title: "Professor Accounts", desc: "Manage professor/faculty user accounts" }, admins: { title: "Admin Accounts", desc: "Manage administrator user accounts" } };

  const statCards = [
    { label: "Total Users",  value: users.length,                                     cls: "aum-sv-blue" },
    { label: "Students",     value: users.filter((u) => u.role === "student").length,   cls: "aum-sv-green" },
    { label: "Professors",   value: users.filter((u) => u.role === "professor").length, cls: "aum-sv-purple" },
    { label: "Admins",       value: users.filter((u) => u.role === "admin").length,     cls: "aum-sv-orange" },
    { label: "Active",       value: users.filter((u) => u.status === "active").length,  cls: "aum-sv-emerald" },
    { label: "Suspended",    value: users.filter((u) => u.status === "suspended").length, cls: "aum-sv-red" },
  ];

  const navItems = [
    { icon: HomeIcon,        label: "Dashboard",    path: "/admin/dashboard" },
    { icon: QueueIconNav,    label: "Queue",         path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments",  path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents",     path: "/admin/documents" },
    { icon: HistoryIconNav,  label: "Transactions",  path: "/admin/transactions" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-with-sidebar">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />

      {/* ── AI Chatbot ─────────────────────────────────────────────────────────── */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat"><CloseIcon /></button>
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
              <input type="text" className="chat-input" placeholder="Ask me anything..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              <button type="submit" className="chat-send-btn" aria-label="Send message"><SendIcon /></button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat"><ChatIcon /></button>
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────────────────── */}
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
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
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
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
            <button className="logout-btn" onClick={handleLogout}><LogOutIcon /><span>Logout</span></button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ──────────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">{isDark ? <SunIcon /> : <MoonIcon />}</button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">{sidebarOpen ? <CloseIcon /> : <MenuIcon />}</button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────────── */}
      <main className="admin-dashboard-main">
        <div className="aum-content">
          <button onClick={() => navigate("/admin/dashboard")} style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.45rem 0.9rem",borderRadius:"8px",border:"1px solid var(--border,#e5e7eb)",background:"transparent",color:"var(--text-secondary,#6b7280)",fontSize:"0.82rem",fontWeight:500,cursor:"pointer",marginBottom:"1rem"}}>← Back to Dashboard</button>

          {/* Header Banner */}
          <div className="aum-header">
            <div className="aum-header-left">
              <div className="aum-header-title-row">
                <UsersHeaderIcon />
                <h1 className="aum-header-title">User Account Management</h1>
              </div>
              <p className="aum-header-subtitle">Manage all user accounts across the OAMS system</p>
            </div>
            <button className="aum-add-btn" onClick={openAddModal}>
              <PlusIcon /> Add User
            </button>
          </div>

          {/* Stats */}
          <div className="aum-stats-grid">
            {statCards.map((s) => (
              <div key={s.label} className="aum-stat-card">
                <p className="aum-stat-label">{s.label}</p>
                <p className={`aum-stat-value ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter & Search */}
          <div className="aum-filter-section">
            <div className="aum-filter-header">
              <div className="aum-filter-title-group">
                <FilterIcon />
                <div>
                  <h3 className="aum-filter-title">Filter &amp; Search</h3>
                  <p className="aum-filter-subtitle">Find and filter user accounts</p>
                </div>
              </div>
              <div className="aum-filter-actions">
                <button className="aum-sm-btn" onClick={() => toast.success("Export started")}><DownloadIcon /> Export</button>
                <button className="aum-sm-btn" onClick={() => toast.info("Import feature coming soon")}><UploadIcon /> Import</button>
                <button className="aum-sm-btn" onClick={() => toast.success("Data refreshed")}><RefreshIcon /> Refresh</button>
              </div>
            </div>
            <div className="aum-filter-inputs">
              <div className="aum-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  className="aum-search-input"
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="aum-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="professor">Professors</option>
                <option value="admin">Admins</option>
              </select>
              <select className="aum-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Tabs + User List */}
          <div className="aum-tabs-wrapper">
            <div className="aum-tab-list">
              {[
                { key: "all",        label: `All Users (${filtered.length})` },
                { key: "students",   label: `Students (${students.length})` },
                { key: "professors", label: `Professors (${professors.length})` },
                { key: "admins",     label: `Admins (${admins.length})` },
              ].map((t) => (
                <button key={t.key} className={`aum-tab-btn ${activeTab === t.key ? "aum-tab-active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="aum-users-section">
              <div className="aum-users-section-header">
                <h3 className="aum-users-title">{tabMeta[activeTab].title}</h3>
                <p className="aum-users-subtitle">{tabMeta[activeTab].desc}</p>
              </div>
              <div className="aum-users-list">
                {displayUsers.length === 0 ? (
                  <div className="aum-empty">No users found matching your filters.</div>
                ) : (
                  displayUsers.map((u) => (
                    <div key={u.id} className="aum-user-card">
                      <div className="aum-user-info">
                        <div className="aum-user-name-row">
                          <span className="aum-user-name">{u.name}</span>
                          <span className={`aum-badge aum-badge-role-${u.role}`}>{u.role}</span>
                          <span className={`aum-badge aum-badge-status-${u.status}`}>{u.status}</span>
                        </div>
                        <p className="aum-user-email">{u.email}</p>
                        <div className="aum-user-meta">
                          <span className="aum-college-badge">{u.college}</span>
                          {u.studentId  && <span className="aum-meta-text">ID: {u.studentId}</span>}
                          {u.employeeId && <span className="aum-meta-text">ID: {u.employeeId}</span>}
                          {u.lastLogin  && <span className="aum-meta-text">Last login: {new Date(u.lastLogin).toLocaleString()}</span>}
                          <span className="aum-meta-text">Created: {new Date(u.createdDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="aum-user-actions">
                        <button className="aum-icon-btn aum-icon-btn-edit"   onClick={() => openEditModal(u)}      title="Edit user"><EditIconSvg /></button>
                        <button className="aum-icon-btn aum-icon-btn-key"    onClick={() => handleResetPassword(u)} title="Reset password"><KeyIconSvg /></button>
                        <button className="aum-icon-btn aum-icon-btn-delete" onClick={() => handleDelete(u.id)}    title="Delete user"><TrashIconSvg /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <div className="aum-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="aum-modal">
            <div className="aum-modal-header">
              <div>
                <h2 className="aum-modal-title">{editingUser ? "Edit User Account" : "Create New User Account"}</h2>
                <p className="aum-modal-desc">{editingUser ? "Update user account information" : "Add a new user to the OAMS system"}</p>
              </div>
              <button className="aum-modal-close" onClick={closeModal} aria-label="Close modal"><CloseIcon /></button>
            </div>
            <div className="aum-modal-body">
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  <label className="aum-form-label">Full Name *</label>
                  <input type="text" className="aum-form-input" placeholder="e.g., Juan Dela Cruz" value={form.name} onChange={setField("name")} />
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">Email Address *</label>
                  <input type="email" className="aum-form-input" placeholder="user@pnc.edu.ph" value={form.email} onChange={setField("email")} />
                </div>
              </div>
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  <label className="aum-form-label">Role *</label>
                  <select className="aum-form-select" value={form.role} onChange={setField("role")}>
                    <option value="student">Student</option>
                    <option value="professor">Professor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">College *</label>
                  <select className="aum-form-select" value={form.college} onChange={setField("college")}>
                    <option value="">Select college</option>
                    {COLLEGES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  {form.role === "student" ? (
                    <>
                      <label className="aum-form-label">Student ID *</label>
                      <input type="text" className="aum-form-input" placeholder="e.g., 2312345" value={form.studentId} onChange={setField("studentId")} />
                    </>
                  ) : (
                    <>
                      <label className="aum-form-label">Employee ID *</label>
                      <input type="text" className="aum-form-input" placeholder="e.g., EMP-2020-045" value={form.employeeId} onChange={setField("employeeId")} />
                    </>
                  )}
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">Status *</label>
                  <select className="aum-form-select" value={form.status} onChange={setField("status")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="aum-modal-footer">
              <button className="aum-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="aum-btn-submit" onClick={handleSave}>{editingUser ? "Update User" : "Create User"}</button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}