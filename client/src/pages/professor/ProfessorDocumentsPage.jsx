import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_documents.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";

// ── Nav Icons ─────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.25rem", height: "1.25rem" }}>
    <polyline points="15 18 9 12 15 6" />
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

// ── Document-specific icons ───────────────────────────────────────────────────
const AlertCircleIcon = ({ className = "docs-icon-sm" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const CheckCircle2Icon = ({ className = "docs-icon-sm" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const XCircleIcon = ({ className = "docs-icon-sm" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const ClockIcon = ({ className = "docs-icon-sm" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const FileTextIcon = ({ className = "docs-icon-sm" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  pending:    { badgeClass: "docs-badge-pending",    Icon: AlertCircleIcon },
  approved:   { badgeClass: "docs-badge-approved",   Icon: CheckCircle2Icon },
  rejected:   { badgeClass: "docs-badge-rejected",   Icon: XCircleIcon },
  processing: { badgeClass: "docs-badge-processing", Icon: ClockIcon },
  ready:      { badgeClass: "docs-badge-ready",      Icon: CheckCircle2Icon },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span className={`docs-badge ${cfg.badgeClass}`}>
      <cfg.Icon />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocumentCard({ doc, onApprove, onReject, onProcess, onMarkReady, onViewDetails }) {
  return (
    <div className="docs-card">
      <div className="docs-card-header-row">
        <div className="docs-card-icon-wrap">
          <FileTextIcon className="docs-icon-md" />
        </div>
        <div className="docs-card-title-section">
          <h3 className="docs-card-name">{doc.studentName}</h3>
          <p className="docs-card-sub">{doc.studentId}{doc.documentType ? ` · ${doc.documentType}` : ""}</p>
        </div>
        <div className="docs-card-badges">
          {doc.urgency === "urgent" && (
            <span className="docs-urgent-badge"><AlertCircleIcon /> Urgent</span>
          )}
          <StatusBadge status={doc.status} />
        </div>
      </div>

      <div className="docs-meta-grid">
        <div className="docs-meta-field">
          <label>Purpose</label>
          <p>{doc.purpose}</p>
        </div>
        <div className="docs-meta-field">
          <label>Request Date</label>
          <p>{doc.requestDate}</p>
        </div>
      </div>

      {doc.notes && (
        <div className="docs-notes-box">
          <p className="docs-meta-label" style={{ marginBottom: "0.25rem" }}>Notes</p>
          <p className="docs-notes-text">{doc.notes}</p>
        </div>
      )}

      <div className="docs-footer">
        {doc.status === "pending" && (
          <>
            <button className="docs-btn docs-btn-approve" onClick={() => onApprove(doc.id)}>
              <CheckCircle2Icon /> Approve
            </button>
            <button className="docs-btn docs-btn-process" onClick={() => onProcess(doc.id)}>
              <ClockIcon /> Process
            </button>
            <button className="docs-btn docs-btn-reject" onClick={() => onReject(doc.id)}>
              <XCircleIcon /> Reject
            </button>
          </>
        )}
        {(doc.status === "approved" || doc.status === "processing") && (
          <button className="docs-btn docs-btn-ready" onClick={() => onMarkReady(doc.id)}>
            <CheckCircle2Icon /> Mark Ready
          </button>
        )}
        <button className="docs-btn docs-btn-outline" onClick={() => onViewDetails(doc)}>
          View Details
        </button>
      </div>
    </div>
  );
}

// ── Details Dialog ────────────────────────────────────────────────────────────
function DetailsDialog({ doc, onClose }) {
  if (!doc) return null;
  return (
    <div className="docs-dialog-overlay">
      <div className="docs-dialog-box">
        <button className="docs-dialog-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <p className="docs-dialog-title">Document Details</p>
        <p className="docs-dialog-desc">Detailed information about this document request.</p>

        <div className="docs-name-row">
          <span className="docs-student-name">{doc.studentName}</span>
          <span className="docs-student-id">({doc.studentId})</span>
          {doc.urgency === "urgent" && (
            <span className="docs-urgent-badge"><AlertCircleIcon /> Urgent</span>
          )}
        </div>
        <p className="docs-doc-type" style={{ margin: "0.5rem 0 0.75rem" }}>{doc.documentType}</p>

        <div className="docs-meta-grid">
          <div>
            <p className="docs-meta-label">Purpose</p>
            <p className="docs-meta-value">{doc.purpose}</p>
          </div>
          <div>
            <p className="docs-meta-label">Request Date</p>
            <p className="docs-meta-value">{doc.requestDate}</p>
          </div>
          <div>
            <p className="docs-meta-label">Status</p>
            <StatusBadge status={doc.status} />
          </div>
          <div>
            <p className="docs-meta-label">Urgency</p>
            <p className="docs-meta-value">{doc.urgency === "urgent" ? "Urgent" : "Normal"}</p>
          </div>
        </div>

        {doc.notes && (
          <div className="docs-notes-box" style={{ marginTop: "0.5rem" }}>
            <p className="docs-meta-label" style={{ marginBottom: "0.25rem" }}>Notes</p>
            <p className="docs-notes-text">{doc.notes}</p>
          </div>
        )}
        <div className="docs-dialog-footer">
          <button className="docs-btn docs-btn-outline" onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ["all", "pending", "approved", "processing", "ready", "rejected"];

export default function ProfessorDocumentsPage() {
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
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await api.get("/faculty/document-requests");
      setDocuments(res.data);
    } catch {
      toast.error("Failed to load document requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const stats = {
    pending:    documents.filter((d) => d.status === "pending").length,
    approved:   documents.filter((d) => d.status === "approved").length,
    processing: documents.filter((d) => d.status === "processing").length,
    ready:      documents.filter((d) => d.status === "generated" || d.status === "released").length,
  };

  const filtered =
    activeTab === "all" ? documents : documents.filter((d) => d.status === activeTab);

  const updateDocStatus = async (id, status, successMsg) => {
    const doc = documents.find((d) => d.id === id);
    try {
      await api.patch(`/faculty/document-requests/${id}/status`, { status });
      await fetchDocuments();
      toast.success(successMsg.replace("{type}", doc?.documentType ?? "").replace("{name}", doc?.studentName ?? ""));
    } catch {
      toast.error("Failed to update document status");
    }
  };

  const handleApprove  = (id) => updateDocStatus(id, "processing", "Processing {type} for {name}");
  const handleReject   = (id) => updateDocStatus(id, "rejected",   "Rejected {type} for {name}");
  const handleProcess  = (id) => updateDocStatus(id, "processing", "Document moved to processing");
  const handleMarkReady = (id) => updateDocStatus(id, "generated", "Document marked as ready for pickup");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("document") || i.includes("request")) return `You have ${stats.pending} pending document requests.`;
    if (i.includes("pending")) return `There are ${stats.pending} pending requests awaiting your action.`;
    if (i.includes("ready")) return `${stats.ready} document(s) are ready for pickup.`;
    return "I can help you manage document requests. What do you need?";
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
    { icon: HomeIcon,        label: "Dashboard",    path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents",    path: "/professor/documents" },
    { icon: HistoryIconNav,  label: "Transactions", path: "/professor/transactions" },
  ];

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
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
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
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item${location.pathname === item.path ? " active" : ""}`}
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
        <div className="docs-page-content">

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="docs-page-header">
            <div className="docs-title-section">
              <div className="docs-title-icon">
                <FileTextIcon className="docs-icon-lg" />
              </div>
              <div>
                <h1 className="docs-page-title">Document Management</h1>
                <p className="docs-page-subtitle">Review and process student document requests</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="docs-tabs-nav">
            <div className="docs-tabs-list">
              {TABS.map((tab) => {
                const count = tab === "all" ? documents.length : documents.filter((d) => d.status === tab).length;
                return (
                  <button
                    key={tab}
                    className={`docs-tab-trigger${activeTab === tab ? " active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="docs-tab-count">{loading ? "—" : count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="docs-list">
            {loading ? (
              <div className="docs-empty">Loading document requests...</div>
            ) : filtered.length === 0 ? (
              <div className="docs-empty">No document requests found.</div>
            ) : (
              filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onProcess={handleProcess}
                  onMarkReady={handleMarkReady}
                  onViewDetails={setSelectedDoc}
                />
              ))
            )}
          </div>

        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Details Dialog */}
      {selectedDoc && (
        <DetailsDialog doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}

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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}