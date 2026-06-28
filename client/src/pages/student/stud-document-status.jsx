import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  FileText,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  MessageSquare,
  Megaphone as LucideMegaphone,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import { getCollegeLogo } from "../../data/collegeLogo";
import "./stud-queue-status.css";
import "./stud-queue-tracking.css";
import "./stud-document-status.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
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
const MegaphoneNavIcon = () => <LucideMegaphone />;
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
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusMeta = (status) => {
  switch (status) {
    case "pending":    return { label: "Pending",          cls: "dss-badge-pending" };
    case "processing": return { label: "Processing",       cls: "dss-badge-processing" };
    case "ready":      return { label: "Ready for Pickup", cls: "dss-badge-ready" };
    case "claimed":    return { label: "Claimed",          cls: "dss-badge-claimed" };
    case "rejected":   return { label: "Rejected",         cls: "dss-badge-rejected" };
    default:           return { label: status,             cls: "dss-badge-pending" };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function DocumentDetail({ doc, onBack, onCancel, cancelling, backLabel = "All Documents" }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const statusMeta = getStatusMeta(doc.status);
  const canCancel = doc.status === "pending" || doc.status === "processing";

  return (
    <div className="queue-status-container">
      {/* Page Header */}
      <div className="queue-header">
        <div className="queue-breadcrumb">
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        </div>
        <div className="queue-title-section">
          <div className="dss-title-icon">
            <FileText style={{ width: "1.75rem", height: "1.75rem" }} />
          </div>
          <div>
            <h1 className="queue-title">Document Details</h1>
            <p className="queue-subtitle">Track your document request status</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="dss-hero-card">
        <div className="dss-hero-content">
          <div className="dss-hero-logo">
            <img src={getCollegeLogo(doc.college)} alt={doc.college} />
          </div>
          <div className="dss-hero-text">
            <div className="dss-hero-header">
              <div className="dss-hero-title">
                <p className="dss-hero-doc-name">{doc.type}</p>
                <p>{doc.college}</p>
              </div>
              <div className="dss-hero-badge">{doc.trackingNumber}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready alert */}
      {doc.status === "ready" && (
        <div
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "1rem",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}
        >
          <CheckCircle2 style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }} />
          Your document is ready for pickup — please visit the registrar's office!
        </div>
      )}

      {/* Detail Grid */}
      <div className="queue-detail-grid">
        {/* Main column */}
        <div className="queue-detail-main">
          {/* Request details card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <FileText style={{ width: "1.25rem", height: "1.25rem" }} />
                Request Details
              </h3>
              <span className={`dss-badge ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="qss-card-content">
              <div className="dss-detail-row">
                <span className="dss-detail-label">Request Date</span>
                <span className="dss-detail-value">{formatDate(doc.requestDate)}</span>
              </div>
              {doc.status === "claimed" && doc.claimedDate ? (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Date Acquired</span>
                  <span className="dss-detail-value">{formatDate(doc.claimedDate)}</span>
                </div>
              ) : doc.estimatedCompletion ? (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Estimated Completion</span>
                  <span className="dss-detail-value">{formatDate(doc.estimatedCompletion)}</span>
                </div>
              ) : null}
              <div className="dss-detail-row" style={{ borderBottom: "none" }}>
                <span className="dss-detail-label">Purpose</span>
                <span className="dss-detail-value">{doc.purpose}</span>
              </div>
            </div>
          </div>

          {/* Notes card */}
          {doc.notes && (
            <div className="qss-card">
              <div className="qss-card-header">
                <h3 className="qss-card-title">
                  <MessageSquare style={{ width: "1.25rem", height: "1.25rem" }} />
                  Notes
                </h3>
              </div>
              <div className="qss-card-content">
                <p className="queue-concern-text">{doc.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="queue-detail-sidebar">
          {/* Tracking number card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Hash style={{ width: "1.25rem", height: "1.25rem" }} />
                Tracking Number
              </h3>
            </div>
            <div className="qss-card-content" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--primary-color)",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {doc.trackingNumber}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  marginTop: "0.25rem",
                }}
              >
                {doc.college}
              </div>
            </div>
          </div>

          {/* Cancel card (only for pending/processing) */}
          {canCancel && (
            <div className="qss-card queue-cancel-card">
              <div className="qss-card-header">
                <h3 className="qss-card-title queue-cancel-title">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                  Cancel Request
                </h3>
              </div>
              <div className="qss-card-content">
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Cancelling will permanently remove this request. You'll need
                  to resubmit if you change your mind.
                </p>
                <button
                  className="queue-cancel-btn"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirm Dialog */}
      <ActionConfirmModal
        show={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => onCancel(doc.id)}
        title="Cancel Request?"
        message={
          <>
            You are about to cancel your request for{" "}
            <strong>{doc.type}</strong>. This will permanently remove your
            request — you will need to submit a new one if you change your mind.
          </>
        }
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="10" y1="13" x2="14" y2="17"></line>
            <line x1="14" y1="13" x2="10" y2="17"></line>
          </svg>
        }
        cancelText="Keep Request"
        confirmText={cancelling ? "Cancelling…" : "Cancel Request"}
        confirmDisabled={cancelling}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();

  const navState = location.state ?? {};

  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A",
      }
    : { name: "Student", role: "student", college: "", departmentAbbrev: "" };

  const fromDocuments = navState.from === "documents";

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState(navState.docId ?? null);
  const [detailOpenedFromExternal, setDetailOpenedFromExternal] = useState(
    fromDocuments && !!navState.docId,
  );
  const [activeTab, setActiveTab] = useState("active");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your document requests?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(1);

  const selectedDoc = selectedDocId
    ? (documents.find((d) => d.id === selectedDocId) ?? null)
    : null;

  useEffect(() => {
    if (!loading && selectedDocId && !selectedDoc) setSelectedDocId(null);
  }, [loading, selectedDocId, selectedDoc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await api.get("/student/documents");
        setDocuments(res.data.documents ?? []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        setError("Could not load your documents.");
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const handleCancel = async (docId) => {
    setCancelling(true);
    try {
      await api.delete(`/student/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Document request cancelled.");
      setSelectedDocId(null);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: ++messageIdRef.current,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const captured = inputValue;
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: ++messageIdRef.current,
        type: "bot",
        text: generateBotResponse(captured),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pending = documents.filter((d) => d.status === "pending").length;
    const ready = documents.filter((d) => d.status === "ready").length;
    if (i.includes("status") || i.includes("document")) {
      return pending > 0
        ? `You have ${pending} pending request(s) and ${ready} ready for pickup.`
        : ready > 0
          ? `You have ${ready} document(s) ready for pickup!`
          : "All your document requests have been completed.";
    }
    if (i.includes("cancel")) {
      return "Click on a pending or processing request, then use the 'Cancel Request' button to cancel it.";
    }
    if (i.includes("ready") || i.includes("pickup")) {
      return ready > 0
        ? `You have ${ready} document(s) ready for pickup. Please visit the registrar's office.`
        : "None of your documents are ready for pickup yet.";
    }
    return "I can help with document statuses. Try: 'What documents are ready?' or 'How many pending requests?'";
  };

  const activeDocuments = documents.filter(
    (d) => d.status !== "claimed" && d.status !== "rejected",
  );
  const completedDocuments = documents.filter(
    (d) => d.status === "claimed" || d.status === "rejected",
  );

  const navItems = [
    { icon: HomeIcon, label: "Home", path: "/student/dashboard" },
    { icon: MegaphoneNavIcon, label: "Announcements", path: "/student/announcements" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/student/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/student/transactions" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
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
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
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
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
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
      <main className="dashboard-main doc-status-page">
        {selectedDoc ? (
          <DocumentDetail
            doc={selectedDoc}
            backLabel={detailOpenedFromExternal ? "Document Requests" : "All Documents"}
            onBack={() =>
              detailOpenedFromExternal
                ? navigate("/student/documents")
                : setSelectedDocId(null)
            }
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        ) : (
          <div className="queue-status-container">
            {/* Page Header */}
            <div className="queue-header">
              <div className="queue-breadcrumb">
                <Link
                  to={navState.from === "documents" ? "/student/documents" : "/student/dashboard"}
                  className="breadcrumb-link"
                >
                  <ChevronLeft className="breadcrumb-icon" />
                  {navState.from === "documents" ? "Documents" : "Home"}
                </Link>
              </div>
              <div className="queue-title-section">
                <div className="dss-title-icon">
                  <FileText style={{ width: "1.75rem", height: "1.75rem" }} />
                </div>
                <div>
                  <h1 className="queue-title">My Document Requests</h1>
                  <p className="queue-subtitle">Track and manage all your document requests</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="queue-empty-state"
                style={{ borderColor: "rgba(239,68,68,0.3)" }}
              >
                <AlertCircle
                  className="queue-empty-icon"
                  style={{ color: "#ef4444" }}
                />
                <p className="queue-empty-text">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="queue-empty-state">
                <Loader2
                  className="queue-empty-icon"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <p className="queue-empty-text">Loading your documents…</p>
              </div>
            )}

            {/* Document Tabs */}
            {!loading && !error && (
              <div className="qt-tabs-container">
                <div className="qt-tabs-list">
                  <button
                    className={`qt-tab ${activeTab === "active" ? "active" : ""}`}
                    onClick={() => setActiveTab("active")}
                  >
                    <AlertCircle />
                    Active Requests <span className="doc-tab-count">{activeDocuments.length}</span>
                  </button>
                  <button
                    className={`qt-tab ${activeTab === "completed" ? "active" : ""}`}
                    onClick={() => setActiveTab("completed")}
                  >
                    <CheckCircleIcon />
                    Completed <span className="doc-tab-count">{completedDocuments.length}</span>
                  </button>
                </div>

                {/* Active Tab */}
                {activeTab === "active" && (
                  <div className="dss-list-container">
                    {activeDocuments.length > 0 ? (
                      activeDocuments.map((doc) => {
                        const statusMeta = getStatusMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "#f97316" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">{doc.college}</p>
                                <p className="dss-list-tracking">
                                  Tracking: <span>{doc.trackingNumber}</span>
                                </p>
                              </div>
                              <span className={`dss-badge ${statusMeta.cls}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="dss-list-card-grid">
                              <div className="dss-list-card-field">
                                <label>Request Date</label>
                                <p>{formatDateShort(doc.requestDate)}</p>
                              </div>
                              {doc.estimatedCompletion && (
                                <div className="dss-list-card-field">
                                  <label>Est. Completion</label>
                                  <p>{formatDateShort(doc.estimatedCompletion)}</p>
                                </div>
                              )}
                              <div className="dss-list-card-field-full">
                                <label>Purpose</label>
                                <p>{doc.purpose}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="queue-empty-state">
                        <FileText className="queue-empty-icon" />
                        <h3 className="queue-empty-title">No Active Requests</h3>
                        <p className="queue-empty-text">
                          You have no active document requests.
                        </p>
                        <button
                          onClick={() => navigate("/student/documents")}
                          style={{
                            marginTop: "1rem",
                            background: "linear-gradient(135deg, #f97316, #ea580c)",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "0.75rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                          Request a Document
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed Tab */}
                {activeTab === "completed" && (
                  <div className="dss-list-container">
                    {completedDocuments.length > 0 ? (
                      completedDocuments.map((doc) => {
                        const statusMeta = getStatusMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item dss-list-item-completed"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "var(--text-tertiary)" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">{doc.college}</p>
                                <p className="dss-list-tracking">
                                  Tracking: <span>{doc.trackingNumber}</span>
                                </p>
                              </div>
                              <span className={`dss-badge ${statusMeta.cls}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="dss-list-card-grid">
                              <div className="dss-list-card-field">
                                <label>Date Requested</label>
                                <p>{formatDateShort(doc.requestDate)}</p>
                              </div>
                              {doc.claimedDate && (
                                <div className="dss-list-card-field">
                                  <label>Date Acquired</label>
                                  <p>{formatDateShort(doc.claimedDate)}</p>
                                </div>
                              )}
                              <div className="dss-list-card-field-full">
                                <label>Purpose</label>
                                <p>{doc.purpose}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="queue-empty-state">
                        <CheckCircle2 className="queue-empty-icon" />
                        <h3 className="queue-empty-title">No Completed Requests</h3>
                        <p className="queue-empty-text">
                          Your completed and rejected requests will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* AI Chat */}
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
              <button type="submit" className="chat-send-btn" aria-label="Send">
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
