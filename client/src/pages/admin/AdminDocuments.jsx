import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_documents.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
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
const FileTextIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

// ── Dummy Data ─────────────────────────────────────────────────────────────
const DUMMY_DOCUMENTS = [
  {
    id: 1,
    studentName: "Juan Dela Cruz",
    studentId: "100123",
    documentType: "Transcript of Records",
    purpose: "Job Application",
    requestDate: "2026-03-27 10:30 AM",
    status: "Pending",
    priority: "Urgent",
    college: "CCS",
    processor: null,
  },
  {
    id: 2,
    studentName: "Maria Garcia",
    studentId: "100456",
    documentType: "Certificate of Grades",
    purpose: "Scholarship Application",
    requestDate: "2026-03-26 02:15 PM",
    status: "Processing",
    priority: null,
    college: "CBAA",
    processor: "Prof. Ana Santos",
  },
  {
    id: 3,
    studentName: "Carlos Rodriguez",
    studentId: "100789",
    documentType: "Recommendation Letter",
    purpose: "Graduate School",
    requestDate: "2026-03-25 09:00 AM",
    status: "Ready",
    priority: null,
    college: "COED",
    processor: "Prof. Pedro Reyes",
  },
  {
    id: 4,
    studentName: "Lisa Fernandez",
    studentId: "100234",
    documentType: "Certificate of Enrollment",
    purpose: "Student Visa",
    requestDate: "2026-03-24 11:20 AM",
    status: "Released",
    priority: "Urgent",
    college: "COE",
    processor: "Prof. Maria Lopez",
  },
  {
    id: 5,
    studentName: "Marco Velasco",
    studentId: "100567",
    documentType: "Honorable Dismissal",
    purpose: "Transfer",
    requestDate: "2026-03-23 03:45 PM",
    status: "Approved",
    priority: null,
    college: "CAS",
    processor: "Prof. Sofia Cruz",
  },
];

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
  const [docStats, setDocStats] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    // Simulate loading with dummy data
    const loadDummyData = () => {
      setDocLoading(true);
      setTimeout(() => {
        const stats = {
          totalRequests: DUMMY_DOCUMENTS.length,
          pendingCount: DUMMY_DOCUMENTS.filter(
            (d) => d.status === "Pending"
          ).length,
          processingCount: DUMMY_DOCUMENTS.filter(
            (d) => d.status === "Processing"
          ).length,
          readyCount: DUMMY_DOCUMENTS.filter((d) => d.status === "Ready").length,
          approvedCount: DUMMY_DOCUMENTS.filter(
            (d) => d.status === "Approved"
          ).length,
          releasedCount: DUMMY_DOCUMENTS.filter(
            (d) => d.status === "Released"
          ).length,
        };
        setDocStats({
          stats,
          documents: DUMMY_DOCUMENTS,
        });
        setDocLoading(false);
      }, 500);
    };

    loadDummyData();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const s = docStats?.stats;
  const loading = docLoading;

  const stats = [
    {
      title: "Total Requests",
      value: loading ? "—" : String(s?.totalRequests ?? 0),
      icon: FileTextIcon,
      bgColor: "admin-documents-stat-bg-green",
    },
    {
      title: "Pending",
      value: loading ? "—" : String(s?.pendingCount ?? 0),
      icon: ClockIcon,
      bgColor: "admin-documents-stat-bg-orange",
    },
    {
      title: "Processing",
      value: loading ? "—" : String(s?.processingCount ?? 0),
      icon: SearchIcon,
      bgColor: "admin-documents-stat-bg-blue",
    },
    {
      title: "Ready",
      value: loading ? "—" : String(s?.readyCount ?? 0),
      icon: FileTextIcon,
      bgColor: "admin-documents-stat-bg-purple",
    },
  ];

  const documents = docStats?.documents ?? [];
  const colleges = ["All Colleges", "CCS", "CBAA", "COED", "COE", "CAS", "CHAS"];

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
    if (i.includes("pending") || i.includes("status"))
      return `There are ${s?.pendingCount ?? 0} pending documents. Use the filters to view them.`;
    if (i.includes("process") || i.includes("processing"))
      return `Currently ${s?.processingCount ?? 0} documents are being processed.`;
    if (i.includes("ready"))
      return `${s?.readyCount ?? 0} documents are ready for release.`;
    if (i.includes("export") || i.includes("download"))
      return "You can export document records using the Export button in the toolbar.";
    return "I can help with document status, filtering, exporting, and document details. What do you need?";
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.studentId?.toString().includes(searchQuery) ||
      doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "All" || doc.status?.toLowerCase() === activeTab.toLowerCase();
    const matchesCollege =
      selectedCollege === "All Colleges" || doc.college === selectedCollege;
    return matchesSearch && matchesTab && matchesCollege;
  });

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

          <button onClick={() => navigate("/admin/dashboard")} style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.45rem 0.9rem",borderRadius:"8px",border:"1px solid var(--border,#e5e7eb)",background:"transparent",color:"var(--text-secondary,#6b7280)",fontSize:"0.82rem",fontWeight:500,cursor:"pointer",marginBottom:"1rem"}}>← Back to Dashboard</button>
          {/* Page Header */}
          <div className="admin-documents-page-header">
            <h1 className="admin-documents-page-title">
              Centralized Document Management
            </h1>
            <p className="admin-documents-page-subtitle">
              Manage document processing workflow across all colleges
            </p>
          </div>

          {/* Stats Grid */}
          <div className="admin-documents-stats-grid">
            {stats.map((stat) => (
              <div key={stat.title} className="admin-documents-stat-card">
                <div className="admin-documents-stat-header">
                  <div className={`admin-documents-stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                </div>
                <p className="admin-documents-stat-title">{stat.title}</p>
                <p
                  className={`admin-documents-stat-value ${
                    loading ? "admin-documents-stat-loading" : ""
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
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
                  {colleges.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
              <button className="admin-documents-export-btn">
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
              {["All", "Pending", "Approved", "Processing", "Ready", "Released"].map(
                (tab) => (
                  <button
                    key={tab}
                    className={`admin-documents-tab ${
                      activeTab === tab ? "admin-documents-tab-active" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Documents List */}
            <div className="admin-documents-list">
              {loading ? (
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
                              ({doc.studentId})
                            </p>
                          </div>
                        </div>
                        <div className="admin-documents-card-badges">
                          {doc.priority && (
                            <span
                              className={`admin-documents-priority-badge admin-documents-priority-${doc.priority.toLowerCase()}`}
                            >
                              {doc.priority}
                            </span>
                          )}
                          <span
                            className={`admin-documents-status-badge admin-documents-status-${doc.status.toLowerCase()}`}
                          >
                            {doc.status}
                          </span>
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
                          {doc.requestDate}
                        </span>
                      </div>
                      {doc.processor && (
                        <div className="admin-documents-detail-row">
                          <span className="admin-documents-detail-label">
                            Processor
                          </span>
                          <span className="admin-documents-detail-value">
                            {doc.processor}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-documents-card-footer">
                      <button className="admin-documents-view-details-btn">
                        View Details
                      </button>
                      {doc.status === "Ready" && (
                        <button className="admin-documents-action-btn admin-documents-action-mark-released">
                          Mark Released
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="admin-documents-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}