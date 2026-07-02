import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_documents.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Icons (all unchanged from original) ──────────────────────────────────────
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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
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
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const FileTextIcon = ({ className = "icon" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CheckCircle2Icon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { badgeClass: "admin-documents-status-pending", Icon: AlertCircleIcon, label: "Pending" },
  processing: { badgeClass: "admin-documents-status-processing", Icon: ClockIcon, label: "Processing" },
  ready: { badgeClass: "admin-documents-status-ready", Icon: FileTextIcon, label: "Ready" },
  released: { badgeClass: "admin-documents-status-released", Icon: CheckCircle2Icon, label: "Released" },
  rejected: { badgeClass: "admin-documents-status-rejected", Icon: XCircleIcon, label: "Rejected" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`admin-documents-status-badge ${cfg.badgeClass}`}>
      <cfg.Icon />
      {cfg.label}
    </span>
  );
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TABS = ["all", "pending", "processing", "ready", "released", "rejected"];
const COLLEGES = ["All Colleges", "CCS", "CBAA", "COED", "COE", "CAS", "CHAS"];

export default function AdminDocuments() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Demo Admin",
        role: "admin",
        college: "College of Computing Studies (CCS)",
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
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with document management?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Document data state ──────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setDocLoading(true);
        const res = await api.get("/admin/documents/monitoring");
        setDocuments(res.data.documents ?? []);
        setDocError(null);
      } catch (err) {
        console.error("Failed to fetch document monitoring data:", err);
        setDocError("Could not load document requests.");
      } finally {
        setDocLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pendingCount = documents.filter((d) => d.status === "pending").length;
    const processingCount = documents.filter((d) => d.status === "processing").length;
    const readyCount = documents.filter((d) => d.status === "ready").length;
    if (i.includes("pending") || i.includes("status"))
      return `There are ${pendingCount} pending documents. Use the filters to view them.`;
    if (i.includes("process") || i.includes("processing"))
      return `Currently ${processingCount} documents are being processed.`;
    if (i.includes("ready"))
      return `${readyCount} documents are ready for release.`;
    if (i.includes("export") || i.includes("download"))
      return "You can export the currently filtered document list using the Export button in the toolbar.";
    return "I can help with document status, filtering, exporting, and document details. What do you need?";
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

  // ── Derived values ────────────────────────────────────────────────────────
  // Search + college filters applied first so tab counts reflect the current context.
  const baseFiltered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.studentName?.toLowerCase().includes(q) ||
      doc.studentId?.toString().includes(searchQuery) ||
      doc.documentType?.toLowerCase().includes(q) ||
      doc.trackingNumber?.toLowerCase().includes(q);
    const matchesCollege =
      selectedCollege === "All Colleges" || doc.college === selectedCollege;
    return matchesSearch && matchesCollege;
  });

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  const handleExport = () => {
    const header = ["Tracking Number", "Student", "Student ID", "College", "Document Type", "Purpose", "Status", "Request Date"];
    const rows = filteredDocuments.map((d) => [
      d.trackingNumber, d.studentName, d.studentId, d.college, d.documentType, d.purpose, d.status, formatDate(d.requestDate),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `document-requests-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/admin/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/admin/transactions",
    },
  ];

  return (
    <div className="admin-documents-with-sidebar">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
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
      <aside className={`admin-documents-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-documents-sidebar-inner">
          <div className="admin-documents-sidebar-logo">
            <div className="admin-documents-logo-container">
              <img src={ucLogo} alt="UC Logo" className="admin-documents-logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="admin-documents-logo-img admin-documents-oams-logo-img"
              />
            </div>
            <button
              className="admin-documents-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="admin-documents-sidebar-user-section">
            <div className="admin-documents-user-top-row">
              <div className="admin-documents-user-avatar-large">
                <UserIcon />
              </div>
              <div className="admin-documents-user-info-content">
                <p className="admin-documents-user-name-large">{user?.name}</p>
                <span className="admin-documents-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="admin-documents-user-college-wrapper">
              <p className="admin-documents-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="admin-documents-sidebar-nav">
            <div className="admin-documents-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`admin-documents-nav-item ${
                    item.path === "/admin/documents" ? "active" : ""
                  }`}
                  title={item.label}
                >
                  <item.icon className="admin-documents-nav-icon-medium" />
                  <span className="admin-documents-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="admin-documents-sidebar-logout">
            <button className="admin-documents-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="admin-documents-mobile-header">
        <div className="admin-documents-mobile-header-content">
          <div className="admin-documents-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="admin-documents-logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="admin-documents-logo-img admin-documents-oams-logo-img"
            />
          </div>
          <div className="admin-documents-mobile-header-actions">
            <button
              className="admin-documents-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="admin-documents-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-documents-main">
        <div className="admin-documents">
          {docError && (
            <div className="admin-documents-error-banner">{docError}</div>
          )}

          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="admin-documents-page-header">
            <div className="admin-documents-title-section">
              <div className="admin-documents-title-icon">
                <FileTextIcon className="admin-documents-icon-lg" />
              </div>
              <div>
                <h1 className="admin-documents-page-title">
                  Centralized Document Management
                </h1>
                <p className="admin-documents-page-subtitle">
                  Monitor document processing workflow across all colleges
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="admin-documents-toolbar">
            <div className="admin-documents-toolbar-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by student name, ID, or document type..."
                className="admin-documents-toolbar-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="admin-documents-toolbar-actions">
              <div className="admin-documents-dropdown-wrapper">
                <select
                  className="admin-documents-dropdown"
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                >
                  {COLLEGES.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
              <button className="admin-documents-export-btn" onClick={handleExport}>
                <DownloadIcon />
                Export
              </button>
            </div>
          </div>

          {/* Document Requests Section */}
          <section className="admin-documents-section">
            <div className="admin-documents-section-header">
              <div className="admin-documents-section-title">
                <h2>Document Requests</h2>
                <p>System-wide document tracking and workflow management</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="admin-documents-tabs">
              {TABS.map((tab) => {
                const count =
                  tab === "all"
                    ? baseFiltered.length
                    : baseFiltered.filter((d) => d.status === tab).length;
                return (
                  <button
                    key={tab}
                    className={`admin-documents-tab ${
                      activeTab === tab ? "admin-documents-tab-active" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="admin-documents-tab-count">
                      {docLoading ? "—" : count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Documents List */}
            <div className="admin-documents-list">
              {docLoading ? (
                <p className="admin-documents-loading">Loading documents...</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="admin-documents-empty">
                  No documents found in this category.
                </p>
              ) : (
                filteredDocuments.map((doc) => (
                  <div key={doc.id} className="admin-documents-card">
                    <div className="admin-documents-card-header">
                      <div className="admin-documents-card-top">
                        <div className="admin-documents-student-info">
                          <div className="admin-documents-student-avatar">
                            <UserIcon />
                          </div>
                          <div className="admin-documents-student-text">
                            <p className="admin-documents-student-name">
                              {doc.studentName}
                            </p>
                            <p className="admin-documents-student-id">
                              ({doc.studentId}) &middot; {doc.college}
                            </p>
                          </div>
                        </div>
                        <div className="admin-documents-card-badges">
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                      <h3 className="admin-documents-document-title">
                        {doc.documentType}
                      </h3>
                    </div>

                    <div className="admin-documents-card-details">
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Purpose
                        </span>
                        <span className="admin-documents-detail-value">
                          {doc.purpose}
                        </span>
                      </div>
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Request Date
                        </span>
                        <span className="admin-documents-detail-value">
                          {formatDate(doc.requestDate)}
                        </span>
                      </div>
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Tracking Number
                        </span>
                        <span className="admin-documents-detail-value">
                          {doc.trackingNumber}
                        </span>
                      </div>
                    </div>

                    <div className="admin-documents-card-footer">
                      <button
                        className="admin-documents-view-details-btn"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Details Modal */}
      {selectedDoc && (
        <div
          className="admin-documents-dialog-overlay"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="admin-documents-dialog-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="admin-documents-dialog-close"
              onClick={() => setSelectedDoc(null)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <p className="admin-documents-dialog-title">Request Details</p>
            <p className="admin-documents-dialog-desc">
              Full details for this document request.
            </p>

            <div className="admin-documents-dialog-name-row">
              <span className="admin-documents-dialog-student-name">
                {selectedDoc.studentName}
              </span>
              <span className="admin-documents-dialog-student-id">
                ({selectedDoc.studentId})
              </span>
            </div>
            <p className="admin-documents-dialog-doc-type">
              {selectedDoc.documentType} &middot; {selectedDoc.trackingNumber}
            </p>

            <div className="admin-documents-meta-grid">
              <div>
                <p className="admin-documents-meta-label">College</p>
                <p className="admin-documents-meta-value">{selectedDoc.college}</p>
              </div>
              <div>
                <p className="admin-documents-meta-label">Status</p>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div>
                <p className="admin-documents-meta-label">Purpose</p>
                <p className="admin-documents-meta-value">{selectedDoc.purpose}</p>
              </div>
              <div>
                <p className="admin-documents-meta-label">Request Date</p>
                <p className="admin-documents-meta-value">
                  {formatDate(selectedDoc.requestDate)}
                </p>
              </div>
            </div>

            {selectedDoc.notes && (
              <div className="admin-documents-notes-box">
                <p className="admin-documents-meta-label" style={{ marginBottom: "0.25rem" }}>
                  Notes
                </p>
                <p className="admin-documents-notes-text">{selectedDoc.notes}</p>
              </div>
            )}

            <div className="admin-documents-dialog-footer">
              <button
                className="admin-documents-view-details-btn"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div
          className="admin-documents-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
