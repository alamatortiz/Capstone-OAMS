import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import { toast } from "sonner";
import "./documents.css";
import "../../App.css";
import api from "../../utils/api";

import { applyTheme, getSavedTheme } from "../../utils/theme";

// ─── Document Object Structure (JSDoc) ────────────────────────────────────
/**
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} type
 * @property {string} college
 * @property {string} requestDate
 * @property {string} purpose
 * @property {'pending' | 'processing' | 'ready' | 'claimed' | 'rejected'} status
 * @property {string} trackingNumber
 * @property {string} [notes]
 * @property {string} [estimatedCompletion]
 */

// ─── Icons ────────────────────────────────────────────────────────────────
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

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
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
    <path d="M12 8v5"></path>
    <circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

// ─── Main Component ──────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        studentNumber: authUser.studentNumber ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
        course: authUser.course ?? "N/A Course",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        studentId: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
        course: "",
      };

  // ── State ───────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [servicesByDepartmentId, setServicesByDepartmentId] = useState({});
  const [collegesFromDB, setCollegesFromDB] = useState([]);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    college: "",
    purpose: "",
    copies: "1",
  });

  // ── AI Chatbot State ────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your documents?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const fetchServiceTypes = async () => {
      setFormOptionsLoading(true);
      try {
        const res = await api.get("/student/documents/service-types");
        setCollegesFromDB(res.data.departments ?? []);
        setServicesByDepartmentId(res.data.servicesByDepartmentId ?? {});
      } catch (err) {
        console.error("Failed to fetch document service types:", err);
      } finally {
        setFormOptionsLoading(false);
      }
    };
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setDocsLoading(true);
        const res = await api.get("/student/documents");
        setDocuments(res.data.documents ?? []);
        setDocsError(null);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        setDocsError("Could not load your documents.");
      } finally {
        setDocsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────
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

  const handleSubmitRequest = async () => {
    if (!formData.type || !formData.college || !formData.purpose) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/student/documents", formData);
      setDocuments((prev) => [res.data.document, ...prev]);
      setDialogOpen(false);
      setFormData({ type: "", college: "", purpose: "", copies: "1" });
      toast.success("Document request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit document request:", err);
      toast.error(
        err?.response?.data?.error ?? "Failed to submit document request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (docId) => {
    setCancellingId(docId);
    try {
      await api.delete(`/student/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setCancelTarget(null);
      toast.success("Document request cancelled.");
    } catch (err) {
      console.error("Failed to cancel document request:", err);
      toast.error(
        err?.response?.data?.error ?? "Failed to cancel document request",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const nextInput = inputValue;
    setInputValue("");

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(nextInput),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    const activeCount = documents.filter(
      (d) => d.status !== "claimed" && d.status !== "rejected",
    ).length;
    const readyCount = documents.filter((d) => d.status === "ready").length;
    const pendingCount = documents.filter((d) => d.status === "pending").length;

    if (lowerInput.includes("document") || lowerInput.includes("tracking")) {
      return pendingCount > 0
        ? `You have ${pendingCount} pending document request(s). You currently have ${activeCount} active request(s). If you need help, tell me the document type or tracking number.`
        : readyCount > 0
          ? `You have ${readyCount} document(s) ready for pickup. Tell me which one you're looking for and I can guide you.`
          : `Right now you have no pending requests. You have ${activeCount} active request(s). Want to request a new document?`;
    }

    if (
      lowerInput.includes("status") ||
      lowerInput.includes("where") ||
      lowerInput.includes("progress")
    ) {
      return activeCount > 0
        ? `You have ${activeCount} active request(s). Use the list to check each document's current status and estimated completion.`
        : 'You have no active requests right now. You can request a document using the "Request Document" button.';
    }

    if (
      lowerInput.includes("request") ||
      lowerInput.includes("apply") ||
      lowerInput.includes("new")
    ) {
      return 'To request a document, click "Request Document", choose the document type and college, then enter the purpose. Want help choosing what to request?';
    }

    return 'I can help with document requests, tracking, and statuses. Try asking: "What is my document status?" or "How do I request a document?"';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "doc-badge-pending";
      case "processing":
        return "doc-badge-processing";
      case "ready":
        return "doc-badge-ready";
      case "claimed":
        return "doc-badge-claimed";
      case "rejected":
        return "doc-badge-rejected";
      default:
        return "doc-badge-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <ClockIcon />;
      case "processing":
        return <AlertCircleIcon />;
      case "ready":
        return <CheckCircleIcon />;
      case "claimed":
        return <CheckCircleIcon />;
      case "rejected":
        return <XCircleIcon />;
      default:
        return <FileTextIcon />;
    }
  };

  const activeDocuments = documents.filter(
    (doc) => doc.status !== "claimed" && doc.status !== "rejected",
  );
  const completedDocuments = documents.filter(
    (doc) => doc.status === "claimed" || doc.status === "rejected",
  );

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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="documents-container">
      {/* Sidebar */}
      <aside className={`doc-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="doc-sidebar-inner">
          <div className="doc-sidebar-logo">
            <div className="doc-logo-container">
              <img src={ucLogo} alt="UC Logo" className="doc-logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="doc-logo-img doc-oams-logo"
              />
            </div>
            <button
              className="doc-theme-toggle"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <div className="doc-sidebar-user">
            <div className="doc-user-top">
              <div className="doc-user-avatar">
                <UserIcon />
              </div>
              <div className="doc-user-info">
                <p className="doc-user-name">{user?.name ?? "Student"}</p>
                <span className="doc-user-role">Student</span>
              </div>
            </div>
            <div className="doc-user-college">
              <p className="doc-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <nav className="doc-sidebar-nav">
            <div className="doc-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="doc-nav-item"
                  title={item.label}
                >
                  <item.icon className="doc-nav-icon" />
                  <span className="doc-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="doc-sidebar-logout">
            <button className="doc-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="doc-mobile-header">
        <div className="doc-mobile-header-content">
          <div className="doc-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="doc-logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="doc-logo-img doc-oams-logo"
            />
          </div>
          <div className="doc-mobile-header-actions">
            <button
              className="doc-theme-toggle"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="doc-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="doc-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="doc-main">
        <div className="doc-content">
          {/* Header */}
          {docsError && <div className="doc-error-banner">{docsError}</div>}
          <div className="doc-header-section">
            <div className="doc-header-top">
              <Link to="/student/dashboard" className="doc-back-link">
                <ChevronLeftIcon /> Dashboard
              </Link>
            </div>
            <div className="doc-header-title">
              <div className="doc-title-icon">
                <FileTextIcon />
              </div>
              <div className="doc-title-text">
                <h1>Document Requests</h1>
                <p>Request and track your documents</p>
              </div>
            </div>
            <button
              className="doc-request-btn"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon /> Request Document
            </button>
          </div>

          {/* Active Requests */}
          <section className="doc-section">
            <div className="doc-section-header">
              <h2>
                <AlertCircleIcon /> Active Requests{" "}
                <span className="doc-badge">{activeDocuments.length}</span>
              </h2>
            </div>

            {docsLoading ? (
              <div className="doc-empty-state">
                <FileTextIcon />
                <h3>Loading documents...</h3>
              </div>
            ) : activeDocuments.length > 0 ? (
              <div className="doc-cards-grid">
                {activeDocuments.map((doc) => (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-card-header">
                      <div className="doc-card-icon-wrap">
                        <FileTextIcon />
                      </div>
                      <div className="doc-card-title-section">
                        <h3>{doc.type}</h3>
                        <p className="doc-card-college">{doc.college}</p>
                        <p className="doc-card-tracking">
                          Tracking: <span>{doc.trackingNumber}</span>
                        </p>
                      </div>
                      <span
                        className={`doc-badge ${getStatusColor(doc.status)}`}
                      >
                        {getStatusIcon(doc.status)}
                        {doc.status}
                      </span>
                    </div>

                    <div className="doc-card-grid">
                      <div className="doc-card-field">
                        <label>Request Date</label>
                        <p className="doc-card-date-value">
                          {new Date(doc.requestDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      {doc.estimatedCompletion && (
                        <div className="doc-card-field">
                          <label>Est. Completion</label>
                          <p className="doc-card-date-value">
                            {new Date(
                              doc.estimatedCompletion,
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                      <div className="doc-card-field-full">
                        <label>Purpose</label>
                        <p>{doc.purpose}</p>
                      </div>
                    </div>

                    {doc.notes && (
                      <div className="doc-card-update">
                        <p className="doc-update-title">Update</p>
                        <p className="doc-update-text">{doc.notes}</p>
                      </div>
                    )}

                    {doc.status === "ready" && (
                      <button className="doc-card-claim-btn">
                        <DownloadIcon /> Claim Document
                      </button>
                    )}

                    {(doc.status === "pending" ||
                      doc.status === "processing") && (
                      <button
                        className="doc-cancel-request-btn"
                        onClick={() => setCancelTarget(doc)}
                      >
                        <XCircleIcon /> Cancel Request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="doc-empty-state">
                <FileTextIcon />
                <h3>No active requests</h3>
                <p>Start by requesting a document</p>
              </div>
            )}
          </section>

          {/* Completed Requests */}
          {completedDocuments.length > 0 && (
            <section className="doc-section">
              <div className="doc-section-header">
                <h2>
                  <CheckCircleIcon /> Completed Requests{" "}
                  <span className="doc-badge doc-badge-completed-count">
                    {completedDocuments.length}
                  </span>
                </h2>
              </div>
              <div className="doc-cards-grid">
                {completedDocuments.map((doc) => (
                  <div key={doc.id} className="doc-card doc-card-completed">
                    <div className="doc-card-header">
                      <div className="doc-card-icon-wrap">
                        <FileTextIcon />
                      </div>
                      <div className="doc-card-title-section">
                        <h3>{doc.type}</h3>
                        <p className="doc-card-college">{doc.college}</p>
                        <p className="doc-card-tracking">
                          {new Date(doc.requestDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}{" "}
                          • {doc.trackingNumber}
                        </p>
                      </div>
                      <span
                        className={`doc-badge ${getStatusColor(doc.status)}`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Processing Times */}
          <section className="doc-processing-section">
            <div className="doc-processing-header">
              <h2>
                <AlertCircleIcon /> Processing Times
              </h2>
              <p>Estimated completion times for documents</p>
            </div>
            <div className="doc-processing-grid">
              <div className="doc-processing-box">
                <p className="doc-processing-title">Regular Processing</p>
                <ul className="doc-processing-list">
                  <li>• Certificates: 3-5 business days</li>
                  <li>• Transcript of Records: 5-7 business days</li>
                  <li>• Diploma: 7-10 business days</li>
                </ul>
              </div>
              <div className="doc-processing-box">
                <p className="doc-processing-title">Rush Processing</p>
                <ul className="doc-processing-list">
                  <li>• Additional fee applies</li>
                  <li>• 1-2 business days</li>
                  <li>• Subject to availability</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Request Document Dialog */}
      {dialogOpen && (
        <div
          className="doc-dialog-overlay"
          onClick={() => setDialogOpen(false)}
        >
          <div className="doc-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="doc-dialog-header">
              <h2>New Document Request</h2>
              <p>Submit a request for official documents</p>
              <button
                className="doc-dialog-close"
                onClick={() => setDialogOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="doc-dialog-content">
              <div className="doc-form-group">
                <label htmlFor="college">College</label>
                <select
                  id="college"
                  value={formData.college}
                  onChange={(e) =>
                    setFormData({ ...formData, college: e.target.value, type: "" })
                  }
                  className="doc-form-select"
                  disabled={formOptionsLoading}
                >
                  <option value="">
                    {formOptionsLoading ? "Loading colleges…" : "Select college"}
                  </option>
                  {collegesFromDB.map((college) => (
                    <option key={college.id} value={college.name}>
                      {college.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-group">
                <label htmlFor="type">Document Type</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="doc-form-select"
                  disabled={formOptionsLoading || !formData.college}
                >
                  <option value="">
                    {!formData.college
                      ? "Select a college first"
                      : "Select document type"}
                  </option>
                  {(servicesByDepartmentId[
                    collegesFromDB.find((c) => c.name === formData.college)?.id ?? -1
                  ] ?? []).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-group">
                <label htmlFor="copies">Number of Copies</label>
                <input
                  id="copies"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.copies}
                  onChange={(e) =>
                    setFormData({ ...formData, copies: e.target.value })
                  }
                  className="doc-form-input"
                />
              </div>

              <div className="doc-form-group">
                <label htmlFor="purpose">Purpose</label>
                <textarea
                  id="purpose"
                  placeholder="Specify the purpose of your request"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  className="doc-form-textarea"
                  rows={3}
                />
              </div>

              <button
                onClick={handleSubmitRequest}
                className="doc-form-submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Dialog */}
      <ActionConfirmModal
        show={cancelTarget !== null}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => handleCancelRequest(cancelTarget.id)}
        title="Cancel Request?"
        message={
          <>
            You are about to cancel your request for{" "}
            <strong>{cancelTarget?.type}</strong>. This will permanently remove
            your request — you will need to resubmit if you change your mind.
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
        confirmText={cancellingId === cancelTarget?.id ? "Cancelling…" : "Cancel Request"}
        confirmDisabled={!!cancellingId}
      />

      {/* AI Chatbot Widget */}
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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
