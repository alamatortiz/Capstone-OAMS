import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_document_processing.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import { toast } from "sonner";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg className="adp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg className="adp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg className="adp-sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg className="adp-moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const FileTextIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
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
const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);


export default function AdminDocumentProcessing() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  // ── Chatbot state ─────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Document processing state ─────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingNotes, setProcessingNotes] = useState("");

  // ── Effects ───────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/document-processing");
      setDocuments(res.data.documents ?? []);
    } catch (err) {
      toast.error("Failed to load document requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Derived values ────────────────────────────────────────────────────────
  // Search applied first so tab counts reflect the current search context.
  const baseFiltered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.trackingNumber.toLowerCase().includes(q) ||
      doc.studentName.toLowerCase().includes(q) ||
      doc.studentId.toLowerCase().includes(q)
    );
  });

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
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
    const count = (status) => documents.filter((d) => d.status === status).length;
    if (i.includes("pending")) return `There are ${count("pending")} pending documents awaiting processing.`;
    if (i.includes("processing")) return `${count("processing")} document(s) are currently being processed.`;
    if (i.includes("ready")) return `${count("ready")} document(s) are ready for student pickup.`;
    if (i.includes("completed")) return `${count("completed")} document request(s) have been completed.`;
    if (i.includes("search") || i.includes("find")) return "Use the search bar to look up by tracking number, student name, or student ID.";
    return "I can help you with document processing. Ask about pending, processing, ready, or completed documents!";
  };

  const handleViewDetails = (doc) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes || "");
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedDocument) return;
    try {
      await api.patch(`/admin/document-processing/${selectedDocument.id}/status`, {
        status: newStatus,
        notes: processingNotes,
      });
      toast.success(`Document marked as ${newStatus}`);
      setShowDetailsModal(false);
      setSelectedDocument(null);
      setProcessingNotes("");
      await fetchDocuments();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update document status");
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedDocument(null);
    setProcessingNotes("");
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":     return { label: "Pending",    cls: "adp-badge-pending",    Icon: AlertCircleIcon };
      case "processing":  return { label: "Processing", cls: "adp-badge-processing", Icon: ClockIcon };
      case "ready":       return { label: "Ready",      cls: "adp-badge-ready",      Icon: CheckCircleIcon };
      case "completed":   return { label: "Completed",  cls: "adp-badge-completed",  Icon: CheckCircleIcon };
      case "rejected":    return { label: "Rejected",   cls: "adp-badge-rejected",   Icon: XCircleIcon };
      default:            return { label: status,       cls: "",                     Icon: ClockIcon };
    }
  };

  const TABS = ["all", "pending", "processing", "ready", "completed", "rejected"];

  const navItems = [
    { icon: HomeIcon,        label: "Dashboard",    path: "/admin/dashboard" },
    { icon: QueueIconNav,    label: "Queue",        path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents",    path: "/admin/documents" },
    { icon: HistoryIconNav,  label: "Transactions", path: "/admin/transactions" },
  ];

  return (
    <div className="adp-layout">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      {/* ── AI Chatbot ──────────────────────────────────────────────────────── */}
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

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`adp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="adp-sidebar-inner">
          <div className="adp-sidebar-logo">
            <div className="adp-logo-container">
              <img src={ucLogo} alt="UC Logo" className="adp-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="adp-logo-img adp-oams-logo-img" />
            </div>
            <button className="adp-theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="adp-sidebar-user-section">
            <div className="adp-user-top-row">
              <div className="adp-user-avatar-large"><UserIcon /></div>
              <div className="adp-user-info-content">
                <p className="adp-user-name-large">{user?.name}</p>
                <span className="adp-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="adp-user-college-wrapper">
              <p className="adp-user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
            </div>
          </div>
          <nav className="adp-sidebar-nav">
            <div className="adp-nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="adp-nav-item" title={item.label}>
                  <item.icon />
                  <span className="adp-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="adp-sidebar-logout">
            <button className="adp-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────────────── */}
      <header className="adp-mobile-header">
        <div className="adp-mobile-header-content">
          <div className="adp-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="adp-logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="adp-logo-img adp-oams-logo-img" />
          </div>
          <div className="adp-mobile-header-actions">
            <button className="adp-theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="adp-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="adp-main">
        <div className="adp-content">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="adp-page-header">
            <div className="adp-title-section">
              <div className="adp-title-icon">
                <FileTextIcon className="adp-icon-lg" />
              </div>
              <div>
                <h1 className="adp-page-title">Document Processing</h1>
                <p className="adp-page-subtitle">Process and manage document requests</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="adp-filter-bar">
            <div className="adp-search-wrap">
              <span className="adp-search-icon"><SearchIcon /></span>
              <input
                type="text"
                className="adp-search-input"
                placeholder="Search by tracking number, student name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="adp-tabs">
            {TABS.map((tab) => {
              const count =
                tab === "all"
                  ? baseFiltered.length
                  : baseFiltered.filter((d) => d.status === tab).length;
              return (
                <button
                  key={tab}
                  className={`adp-tab ${activeTab === tab ? "adp-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="adp-tab-count">{loading ? "—" : count}</span>
                </button>
              );
            })}
          </div>

          {/* Documents List */}
          <div className="adp-documents-list">
            {loading ? (
              <div className="adp-empty-state">
                <p className="adp-empty-desc">Loading document requests...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="adp-empty-state">
                <div className="adp-empty-icon"><FileTextIcon /></div>
                <h3 className="adp-empty-title">No documents found</h3>
                <p className="adp-empty-desc">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const { label, cls, Icon } = getStatusMeta(doc.status);
                return (
                  <div key={doc.id} className="adp-doc-card">
                    <div className="adp-doc-card-inner">
                      <div className="adp-doc-file-icon">
                        <FileTextIcon />
                      </div>
                      <div className="adp-doc-info">
                        <div className="adp-doc-header-row">
                          <div>
                            <div className="adp-doc-name-row">
                              <h3 className="adp-doc-student-name">{doc.studentName}</h3>
                              <span className="adp-college-badge adp-college-badge--outline">{doc.college}</span>
                            </div>
                            <p className="adp-doc-type">{doc.documentType}</p>
                            <p className="adp-doc-meta">ID: {doc.studentId} • Purpose: {doc.purpose}</p>
                          </div>
                        </div>
                        <div className="adp-doc-tags-row">
                          <span className="adp-tracking-badge">{doc.trackingNumber}</span>
                          <span className={`adp-status-badge ${cls}`}>
                            <Icon />
                            {label}
                          </span>
                          <span className="adp-doc-date">
                            Requested: {new Date(doc.requestDate).toLocaleDateString()}
                          </span>
                          {doc.processedBy && (
                            <span className="adp-doc-date">By: {doc.processedBy}</span>
                          )}
                        </div>
                      </div>
                      <div className="adp-doc-action">
                        <button className="adp-view-btn" onClick={() => handleViewDetails(doc)}>
                          <EyeIcon />
                          <span>View &amp; Process</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ── Sidebar Overlay (mobile) ─────────────────────────────────────────── */}
      {sidebarOpen && <div className="adp-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Details Modal ────────────────────────────────────────────────────── */}
      {showDetailsModal && selectedDocument && (
        <div className="adp-modal-backdrop" onClick={handleCloseModal}>
          <div className="adp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adp-modal-header">
              <div>
                <h2 className="adp-modal-title">Document Request Details</h2>
                <p className="adp-modal-subtitle">Review and process document request</p>
              </div>
              <button className="adp-modal-close-btn" onClick={handleCloseModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="adp-modal-body">
              <div className="adp-modal-grid">
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Tracking Number</label>
                  <p className="adp-modal-value">{selectedDocument.trackingNumber}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Status</label>
                  <div className="adp-modal-value">
                    <span className={`adp-status-badge ${getStatusMeta(selectedDocument.status).cls}`}>
                      {getStatusMeta(selectedDocument.status).label}
                    </span>
                  </div>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Student Name</label>
                  <p className="adp-modal-value">{selectedDocument.studentName}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Student ID</label>
                  <p className="adp-modal-value">{selectedDocument.studentId}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">College</label>
                  <p className="adp-modal-value">{selectedDocument.college}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Document Type</label>
                  <p className="adp-modal-value">{selectedDocument.documentType}</p>
                </div>
                <div className="adp-modal-field adp-modal-field--full">
                  <label className="adp-modal-label">Purpose</label>
                  <p className="adp-modal-value">{selectedDocument.purpose}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Request Date</label>
                  <p className="adp-modal-value">{new Date(selectedDocument.requestDate).toLocaleDateString()}</p>
                </div>
                {selectedDocument.completedDate && (
                  <div className="adp-modal-field">
                    <label className="adp-modal-label">Completed Date</label>
                    <p className="adp-modal-value">{new Date(selectedDocument.completedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="adp-modal-notes-wrap">
                <label className="adp-modal-label" htmlFor="adp-notes">Processing Notes</label>
                <textarea
                  id="adp-notes"
                  className="adp-modal-textarea"
                  placeholder="Add notes about the processing status..."
                  rows={4}
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                />
              </div>

              <div className="adp-modal-actions">
                {selectedDocument.status === "pending" && (
                  <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => handleUpdateStatus("processing")}>
                    Start Processing
                  </button>
                )}
                {selectedDocument.status === "processing" && (
                  <button className="adp-modal-btn adp-modal-btn--success" onClick={() => handleUpdateStatus("ready")}>
                    Mark as Ready
                  </button>
                )}
                {selectedDocument.status === "ready" && (
                  <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => handleUpdateStatus("completed")}>
                    Mark as Completed
                  </button>
                )}
                {(selectedDocument.status === "pending" || selectedDocument.status === "processing") && (
                  <button className="adp-modal-btn adp-modal-btn--danger" onClick={() => handleUpdateStatus("rejected")}>
                    Reject Request
                  </button>
                )}
                <button className="adp-modal-btn adp-modal-btn--outline" onClick={handleCloseModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}