import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_dashboard.css";
import "./admin_data_management.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";

// ── Shared sidebar / chatbot icons ────────────────────────────────────────────
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

// ── Page-specific icons ───────────────────────────────────────────────────────
const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" />
    <path d="M21 11v6c0 1.66-4.03 3-9 3S3 18.66 3 17v-6" />
  </svg>
);
const FileTypeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);
const ServiceClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const AuditHistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4" />
    <polyline points="3 3 3 7 7 7" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditSvgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ── Initial data ──────────────────────────────────────────────────────────────
const INITIAL_DOC_TYPES = [
  {
    id: "1",
    name: "Certificate of Grades",
    description: "Official transcript of academic records",
    processingTime: "3-5 business days",
    fee: 100,
    college: "All",
    status: "active",
  },
  {
    id: "2",
    name: "Certificate of Enrollment",
    description: "Proof of current enrollment status",
    processingTime: "1-2 business days",
    fee: 50,
    college: "All",
    status: "active",
  },
  {
    id: "3",
    name: "Good Moral Certificate",
    description: "Certificate of good moral character",
    processingTime: "2-3 business days",
    fee: 75,
    college: "All",
    status: "active",
  },
];

const INITIAL_SERVICES = [
  {
    id: "1",
    serviceName: "Subject Enrollment",
    college: "CCS",
    maxCapacity: 50,
    averageServiceTime: 15,
    autoClose: true,
    status: "active",
  },
  {
    id: "2",
    serviceName: "Document Request",
    college: "All",
    maxCapacity: 30,
    averageServiceTime: 10,
    autoClose: false,
    status: "active",
  },
  {
    id: "3",
    serviceName: "Payment Processing",
    college: "CBAA",
    maxCapacity: 40,
    averageServiceTime: 12,
    autoClose: true,
    status: "active",
  },
];

const INITIAL_AUDIT_LOGS = [
  {
    id: "1",
    action: "CREATE",
    user: "admin.ccs@pnc.edu.ph",
    target: "Document Type: Certificate of Grades",
    timestamp: "2026-05-20T10:30:00",
    details: "Created new document type with fee: 100 PHP",
  },
  {
    id: "2",
    action: "UPDATE",
    user: "admin.cbaa@pnc.edu.ph",
    target: "Service Setting: Payment Processing",
    timestamp: "2026-05-20T09:15:00",
    details: "Updated max capacity from 30 to 40",
  },
  {
    id: "3",
    action: "DELETE",
    user: "admin.ccs@pnc.edu.ph",
    target: "User Account: old.student@pnc.edu.ph",
    timestamp: "2026-05-19T16:45:00",
    details: "Removed inactive student account",
  },
];

const COLLEGE_OPTIONS = ["All", "CCS", "CBAA", "COED", "COE", "CAS", "CHAS"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyDocForm = () => ({
  name: "",
  description: "",
  processingTime: "",
  fee: "",
  college: "All",
  status: "active",
});

const emptyServiceForm = () => ({
  serviceName: "",
  college: "",
  maxCapacity: "",
  averageServiceTime: "",
  autoClose: true,
  status: "active",
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDataManagement() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. Need help with Data Management?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Tabs
  const [activeTab, setActiveTab] = useState("documents");

  // Document Types state
  const [documentTypes, setDocumentTypes] = useState(INITIAL_DOC_TYPES);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(emptyDocForm());

  // Service Settings state
  const [serviceSettings, setServiceSettings] = useState(INITIAL_SERVICES);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm());

  // Audit Logs
  const [auditLogs] = useState(INITIAL_AUDIT_LOGS);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Handlers: sidebar / theme / chat ──────────────────────────────────────
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
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("document type") || i.includes("certificate"))
      return "You can add, edit or delete document types in the Document Types tab.";
    if (i.includes("service") || i.includes("capacity"))
      return "Manage queue service settings — capacity, timing, and auto-close — in the Service Settings tab.";
    if (i.includes("audit") || i.includes("log"))
      return "The Audit Logs tab shows all CREATE, UPDATE, and DELETE actions across the system. You can export them too.";
    return "I can help with document type configuration, service settings, and audit log exports. What do you need?";
  };

  // ── Handlers: Document Types ───────────────────────────────────────────────
  const openAddDocModal = () => {
    setEditingDoc(null);
    setDocForm(emptyDocForm());
    setShowDocModal(true);
  };

  const openEditDocModal = (doc) => {
    setEditingDoc(doc);
    setDocForm({ name: doc.name, description: doc.description, processingTime: doc.processingTime, fee: String(doc.fee), college: doc.college, status: doc.status });
    setShowDocModal(true);
  };

  const closeDocModal = () => {
    setShowDocModal(false);
    setEditingDoc(null);
    setDocForm(emptyDocForm());
  };

  const handleDocSubmit = () => {
    const { name, description, processingTime, fee } = docForm;
    if (!name || !description || !processingTime || !fee) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (editingDoc) {
      setDocumentTypes((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id
            ? { ...d, ...docForm, fee: parseFloat(docForm.fee) }
            : d
        )
      );
      toast.success("Document type updated.");
    } else {
      setDocumentTypes((prev) => [
        ...prev,
        { id: Date.now().toString(), ...docForm, fee: parseFloat(docForm.fee) },
      ]);
      toast.success("Document type created.");
    }
    closeDocModal();
  };

  const handleDeleteDoc = (id) => {
    if (!window.confirm("Delete this document type?")) return;
    setDocumentTypes((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document type deleted.");
  };

  // ── Handlers: Service Settings ─────────────────────────────────────────────
  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm());
    setShowServiceModal(true);
  };

  const openEditServiceModal = (s) => {
    setEditingService(s);
    setServiceForm({
      serviceName: s.serviceName,
      college: s.college,
      maxCapacity: String(s.maxCapacity),
      averageServiceTime: String(s.averageServiceTime),
      autoClose: s.autoClose,
      status: s.status,
    });
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm(emptyServiceForm());
  };

  const handleServiceSubmit = () => {
    const { serviceName, college, maxCapacity, averageServiceTime } = serviceForm;
    if (!serviceName || !college || !maxCapacity || !averageServiceTime) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (editingService) {
      setServiceSettings((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? {
                ...s,
                ...serviceForm,
                maxCapacity: parseInt(serviceForm.maxCapacity),
                averageServiceTime: parseInt(serviceForm.averageServiceTime),
              }
            : s
        )
      );
      toast.success("Service setting updated.");
    } else {
      setServiceSettings((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...serviceForm,
          maxCapacity: parseInt(serviceForm.maxCapacity),
          averageServiceTime: parseInt(serviceForm.averageServiceTime),
        },
      ]);
      toast.success("Service setting created.");
    }
    closeServiceModal();
  };

  const handleDeleteService = (id) => {
    if (!window.confirm("Delete this service setting?")) return;
    setServiceSettings((prev) => prev.filter((s) => s.id !== id));
    toast.success("Service setting deleted.");
  };

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/admin/transactions" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-with-sidebar">

      {/* ── AI Chatbot ── */}
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

      {/* ── Sidebar ── */}
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
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
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

      {/* ── Main Content ── */}
      <main className="admin-dashboard-main">
        <div className="admin-dashboard">

          {/* Banner */}
          <div className="adm-banner">
            <div className="adm-banner-icon">
              <DatabaseIcon />
            </div>
            <div className="adm-banner-text">
              <h1 className="adm-banner-title">Data Admin Management</h1>
              <p className="adm-banner-subtitle">Configure system-wide document types and service settings</p>
            </div>
          </div>

          {/* Tabs Container */}
          <div className="adm-tabs-container">
            {/* Tab Bar */}
            <div className="adm-tabs-bar">
              <button
                className={`adm-tab-btn ${activeTab === "documents" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("documents")}
              >
                <span className="adm-tab-icon"><FileTypeIcon /></span>
                Document Types
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "services" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("services")}
              >
                <span className="adm-tab-icon"><ServiceClockIcon /></span>
                Service Settings
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "audit" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("audit")}
              >
                <span className="adm-tab-icon"><AuditHistoryIcon /></span>
                Audit Logs
              </button>
            </div>

            {/* ── Document Types Tab ── */}
            {activeTab === "documents" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Document Type Management</h2>
                    <p className="adm-card-desc">Configure available document types and their requirements</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddDocModal}>
                    <PlusIcon />
                    Add Document Type
                  </button>
                </div>
                <div className="adm-items-list">
                  {documentTypes.length === 0 && (
                    <p className="adm-empty-state">No document types yet. Add one to get started.</p>
                  )}
                  {documentTypes.map((doc) => (
                    <div key={doc.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{doc.name}</p>
                          <span className="adm-badge adm-badge-outline">{doc.college}</span>
                          <span className={`adm-badge adm-badge-status-${doc.status}`}>{doc.status}</span>
                        </div>
                        <p className="adm-item-desc">{doc.description}</p>
                        <div className="adm-item-meta">
                          <span>Processing: {doc.processingTime}</span>
                          <span>Fee: ₱{doc.fee}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditDocModal(doc)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => handleDeleteDoc(doc.id)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Service Settings Tab ── */}
            {activeTab === "services" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Service Configuration</h2>
                    <p className="adm-card-desc">Manage service settings and parameters</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddServiceModal}>
                    <PlusIcon />
                    Add Service Setting
                  </button>
                </div>
                <div className="adm-items-list">
                  {serviceSettings.length === 0 && (
                    <p className="adm-empty-state">No service settings yet. Add one to get started.</p>
                  )}
                  {serviceSettings.map((s) => (
                    <div key={s.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{s.serviceName}</p>
                          <span className="adm-badge adm-badge-outline">{s.college}</span>
                          <span className={`adm-badge adm-badge-status-${s.status}`}>{s.status}</span>
                        </div>
                        <div className="adm-item-meta">
                          <span>Max Capacity: {s.maxCapacity}</span>
                          <span>Avg. Service Time: {s.averageServiceTime} min</span>
                          <span>{s.autoClose ? "Auto-close enabled" : "Manual close"}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditServiceModal(s)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => handleDeleteService(s.id)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Audit Logs Tab ── */}
            {activeTab === "audit" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">System Audit Logs</h2>
                    <p className="adm-card-desc">Track all administrative actions and changes</p>
                  </div>
                  <button className="adm-btn-outline" onClick={() => toast.success("Logs exported successfully.")}>
                    <DownloadIcon />
                    Export Logs
                  </button>
                </div>
                <div className="adm-items-list">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="adm-log-item">
                      <div className="adm-log-top-row">
                        <span className={`adm-badge adm-badge-${log.action.toLowerCase()}`}>{log.action}</span>
                        <span className="adm-log-user">{log.user}</span>
                      </div>
                      <p className="adm-log-target">{log.target}</p>
                      <p className="adm-log-details">{log.details}</p>
                      <p className="adm-log-timestamp">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Document Type Modal ── */}
      {showDocModal && (
        <div className="adm-modal-overlay" onClick={closeDocModal}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">{editingDoc ? "Edit Document Type" : "Add Document Type"}</h3>
                <p className="adm-modal-subtitle">{editingDoc ? "Update document type details" : "Create a new document type"}</p>
              </div>
              <button className="adm-modal-close-btn" onClick={closeDocModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label className="adm-form-label">Document Name *</label>
                <input
                  className="adm-form-input"
                  placeholder="e.g., Certificate of Grades"
                  value={docForm.name}
                  onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-form-label">Description *</label>
                <textarea
                  className="adm-form-textarea"
                  placeholder="Brief description of the document"
                  rows={3}
                  value={docForm.description}
                  onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">Processing Time *</label>
                  <input
                    className="adm-form-input"
                    placeholder="e.g., 3-5 business days"
                    value={docForm.processingTime}
                    onChange={(e) => setDocForm((p) => ({ ...p, processingTime: e.target.value }))}
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Fee (PHP) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    placeholder="e.g., 100"
                    value={docForm.fee}
                    onChange={(e) => setDocForm((p) => ({ ...p, fee: e.target.value }))}
                  />
                </div>
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">College *</label>
                  <select
                    className="adm-form-select"
                    value={docForm.college}
                    onChange={(e) => setDocForm((p) => ({ ...p, college: e.target.value }))}
                  >
                    {COLLEGE_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c === "All" ? "All Colleges" : c}</option>
                    ))}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Status *</label>
                  <select
                    className="adm-form-select"
                    value={docForm.status}
                    onChange={(e) => setDocForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-outline" onClick={closeDocModal}>Cancel</button>
              <button className="adm-btn-primary" onClick={handleDocSubmit}>
                {editingDoc ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Setting Modal ── */}
      {showServiceModal && (
        <div className="adm-modal-overlay" onClick={closeServiceModal}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">{editingService ? "Edit Service Setting" : "Add Service Setting"}</h3>
                <p className="adm-modal-subtitle">{editingService ? "Update service configuration" : "Create a new service configuration"}</p>
              </div>
              <button className="adm-modal-close-btn" onClick={closeServiceModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label className="adm-form-label">Service Name *</label>
                <input
                  className="adm-form-input"
                  placeholder="e.g., Subject Enrollment"
                  value={serviceForm.serviceName}
                  onChange={(e) => setServiceForm((p) => ({ ...p, serviceName: e.target.value }))}
                />
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">College *</label>
                  <select
                    className="adm-form-select"
                    value={serviceForm.college}
                    onChange={(e) => setServiceForm((p) => ({ ...p, college: e.target.value }))}
                  >
                    <option value="">Select college</option>
                    {COLLEGE_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c === "All" ? "All Colleges" : c}</option>
                    ))}
                  </select>
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Max Capacity *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    placeholder="e.g., 50"
                    value={serviceForm.maxCapacity}
                    onChange={(e) => setServiceForm((p) => ({ ...p, maxCapacity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">Avg. Service Time (min) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    placeholder="e.g., 15"
                    value={serviceForm.averageServiceTime}
                    onChange={(e) => setServiceForm((p) => ({ ...p, averageServiceTime: e.target.value }))}
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Status *</label>
                  <select
                    className="adm-form-select"
                    value={serviceForm.status}
                    onChange={(e) => setServiceForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <label className="adm-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={serviceForm.autoClose}
                  onChange={(e) => setServiceForm((p) => ({ ...p, autoClose: e.target.checked }))}
                />
                <span className="adm-checkbox-label">Auto-close when capacity is reached</span>
              </label>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-outline" onClick={closeServiceModal}>Cancel</button>
              <button className="adm-btn-primary" onClick={handleServiceSubmit}>
                {editingService ? "Update" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}