import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_document_request.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";

// ── Icons ─────────────────────────────────────────────────────────────────────
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
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="7" x2="12" y2="13"></line>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1"></circle>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.5rem", height: "1.5rem" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

// ── Document Types Data ───────────────────────────────────────────────────────
const documentTypes = [
  {
    name: "Certificate of Employment",
    description: "Official certification of employment status",
    processingTime: "3-5 business days",
    availability: "Available",
    availabilityType: "available",
    requirements: ["Valid ID", "Request form"],
  },
  {
    name: "Service Record",
    description: "Complete record of service history",
    processingTime: "5-7 business days",
    availability: "Available",
    availabilityType: "available",
    requirements: ["Valid ID", "Request form", "Clearance"],
  },
  {
    name: "Certificate of No Pending Case",
    description: "Certification of no administrative cases",
    processingTime: "3-5 business days",
    availability: "Available",
    availabilityType: "available",
    requirements: ["Valid ID", "Request form"],
  },
  {
    name: "Teaching Load Certificate",
    description: "Official certification of teaching assignments",
    processingTime: "2-3 business days",
    availability: "Available",
    availabilityType: "available",
    requirements: ["Valid ID", "Request form"],
  },
  {
    name: "Income Tax Form (BIR 2316)",
    description: "Annual income tax certificate",
    processingTime: "7-10 business days",
    availability: "Available (January-April only)",
    availabilityType: "limited",
    requirements: ["Valid ID", "Request form"],
  },
];

export default function ProfessorDocumentRequest() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Demo Professor",
        role: "faculty",
        college: "College of Computing Studies",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with document requests today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Modal states ────────────────────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // ── My Requests state ────────────────────────────────────────────────────────
  const [myRequests, setMyRequests] = useState([
    {
      id: "1",
      type: "Certificate of Employment",
      purpose: "Bank loan application",
      requestedDate: "2026-03-25",
      status: "processing",
      trackingNumber: "DOC-2026-0325-001",
      additionalNotes: "Please process urgently for loan submission deadline.",
      estimatedCompletion: "2026-03-28",
      processingNotes:
        "Currently being prepared by HR department. Expected to be ready by tomorrow.",
    },
    {
      id: "2",
      type: "Service Record",
      purpose: "Promotion requirements",
      requestedDate: "2026-03-20",
      status: "ready",
      trackingNumber: "DOC-2026-0320-015",
      additionalNotes: "Need complete service history from date of hiring.",
      estimatedCompletion: "2026-03-27",
      processingNotes:
        "Document is ready for pickup. Please bring valid ID when claiming.",
    },
  ]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
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
    const userMsg = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
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
    if (i.includes("certificate of employment"))
      return "The Certificate of Employment takes 3-5 business days to process. Requirements: Valid ID and Request form.";
    if (i.includes("service record"))
      return "The Service Record takes 5-7 business days. Requirements: Valid ID, Request form, and Clearance.";
    if (i.includes("teaching load"))
      return "The Teaching Load Certificate takes 2-3 business days. Requirements: Valid ID and Request form.";
    if (i.includes("bir") || i.includes("income tax"))
      return "The Income Tax Form (BIR 2316) is available January-April only and takes 7-10 business days.";
    if (i.includes("status") || i.includes("track"))
      return `You have ${myRequests.length} request(s). Check the 'My Requests' section below for status updates.`;
    if (i.includes("how") || i.includes("request"))
      return "To request a document: click 'Request Document', select the type, fill in the purpose, and submit. You'll receive a tracking number.";
    return "I can help with document requests, processing times, and tracking. What do you need?";
  };

  const handleSubmitRequest = () => {
    if (!documentType || !purpose.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    const newRequest = {
      id: Date.now().toString(),
      type: documentType,
      purpose,
      requestedDate: now.toISOString().split("T")[0],
      status: "pending",
      trackingNumber: `DOC-${now.getFullYear()}-${month}${day}-${rand}`,
      additionalNotes,
      estimatedCompletion: null,
      processingNotes: null,
    };
    setMyRequests((prev) => [...prev, newRequest]);
    setShowRequestModal(false);
    setDocumentType("");
    setPurpose("");
    setAdditionalNotes("");
    toast.success("Document request submitted successfully!");
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending": return "pdr-status-badge pdr-status-pending";
      case "processing": return "pdr-status-badge pdr-status-processing";
      case "ready": return "pdr-status-badge pdr-status-ready";
      case "completed": return "pdr-status-badge pdr-status-completed";
      case "rejected": return "pdr-status-badge pdr-status-rejected";
      default: return "pdr-status-badge pdr-status-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "ready":
      case "completed":
        return <CheckCircleIcon />;
      case "rejected":
        return <XCircleIcon />;
      default:
        return <ClockIcon />;
    }
  };

  const getStatusLabel = (status) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  const formatDate = (dateStr, opts) =>
    new Date(dateStr).toLocaleDateString("en-US", opts || { year: "numeric", month: "long", day: "numeric" });

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* ── Sidebar ── */}
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
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
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
                  className="nav-item"
                  title={item.label}
                >
                  <item.icon />
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
      <main className="dashboard-main">
        <div className="pdr-page">

          {/* Page Header */}
          <div className="pdr-page-header">
            <h1 className="pdr-page-title">Document Requests</h1>
            <p className="pdr-page-desc">Request official documents and track your submissions</p>
          </div>

          {/* Instructions */}
          <div className="pdr-info-card">
            <div className="pdr-info-title">
              <InfoIcon />
              <span>Document Request Process</span>
            </div>
            <ol className="pdr-info-list">
              <li>Select the type of document you need from the available options below</li>
              <li>Click the "Request Document" button and fill in the necessary details</li>
              <li>Your request will be processed by the HR/Records office</li>
              <li>Track the status of your request in the "My Requests" section</li>
              <li>Once ready, you will be notified to claim your document</li>
              <li>Bring a valid ID when claiming your document</li>
            </ol>
          </div>

          {/* Available Document Types */}
          <div className="pdr-section">
            <div className="pdr-section-header">
              <h2 className="pdr-section-title">Available Document Types &amp; Status</h2>
              <button className="pdr-request-btn" onClick={() => setShowRequestModal(true)}>
                <PlusIcon />
                Request Document
              </button>
            </div>
            <div className="pdr-doc-types-grid">
              {documentTypes.map((doc) => (
                <div key={doc.name} className="pdr-doc-card">
                  <div className="pdr-doc-card-header">
                    <div>
                      <h3 className="pdr-doc-name">{doc.name}</h3>
                      <p className="pdr-doc-desc">{doc.description}</p>
                    </div>
                    <span className={`pdr-availability-badge pdr-avail-${doc.availabilityType}`}>
                      {doc.availability}
                    </span>
                  </div>
                  <div className="pdr-doc-processing">
                    <ClockIcon />
                    <span className="pdr-processing-label">Processing Time:</span>
                    <span className="pdr-processing-time">{doc.processingTime}</span>
                  </div>
                  <div className="pdr-doc-requirements">
                    <p className="pdr-req-label">Requirements:</p>
                    {doc.requirements.map((req) => (
                      <div key={req} className="pdr-req-item">
                        <CheckCircleIcon />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Requests */}
          <div className="pdr-section">
            <h2 className="pdr-section-title">My Requests</h2>
            <div className="pdr-requests-list">
              {myRequests.length === 0 ? (
                <div className="pdr-empty-state">
                  <p>No document requests yet. Click "Request Document" to get started.</p>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="pdr-request-card">
                    <div className="pdr-request-icon">
                      <FileTextIcon />
                    </div>
                    <div className="pdr-request-body">
                      <div className="pdr-request-top">
                        <div className="pdr-request-info">
                          <h3 className="pdr-request-type">{req.type}</h3>
                          <p className="pdr-request-purpose">Purpose: {req.purpose}</p>
                        </div>
                        <span className="pdr-tracking-badge">{req.trackingNumber}</span>
                      </div>
                      <div className="pdr-request-meta">
                        <span className="pdr-requested-date">
                          Requested: {new Date(req.requestedDate).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                        </span>
                        <span className={getStatusBadgeClass(req.status)}>
                          {getStatusIcon(req.status)}
                          {getStatusLabel(req.status)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="pdr-view-btn"
                      onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); }}
                    >
                      <EyeIcon />
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

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
        <button
          className={`chat-fab ${chatOpen ? "hidden" : ""}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>

      {/* ── Request Document Modal ── */}
      {showRequestModal && (
        <div className="pdr-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="pdr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdr-modal-header">
              <h2 className="pdr-modal-title">Request Document</h2>
              <p className="pdr-modal-desc">Fill in the details for your document request</p>
              <button className="pdr-modal-close" onClick={() => setShowRequestModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="pdr-modal-body">
              <div className="pdr-form-group">
                <label className="pdr-form-label">
                  Document Type <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <select
                  className="pdr-form-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="pdr-form-group">
                <label className="pdr-form-label">
                  Purpose <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  className="pdr-form-input"
                  type="text"
                  placeholder="e.g., Bank loan application, Promotion requirements"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              <div className="pdr-form-group">
                <label className="pdr-form-label">Additional Notes</label>
                <textarea
                  className="pdr-form-textarea"
                  placeholder="Any special instructions or urgency notes..."
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
              {documentType && (
                <div className="pdr-modal-info-box">
                  {(() => {
                    const dt = documentTypes.find((d) => d.name === documentType);
                    return dt ? (
                      <>
                        <p className="pdr-modal-info-label">Processing Time: <strong>{dt.processingTime}</strong></p>
                        <p className="pdr-modal-info-label">Requirements: {dt.requirements.join(", ")}</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="pdr-modal-footer">
              <button className="pdr-btn-cancel" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button className="pdr-btn-submit" onClick={handleSubmitRequest}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {showDetailsModal && selectedRequest && (
        <div className="pdr-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="pdr-modal pdr-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="pdr-modal-header">
              <h2 className="pdr-modal-title">Document Request Details</h2>
              <p className="pdr-modal-desc">Complete information about your document request</p>
              <button className="pdr-modal-close" onClick={() => setShowDetailsModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="pdr-modal-body">
              {/* Status Banner */}
              <div className={`pdr-status-banner pdr-status-banner-${selectedRequest.status}`}>
                <div className={`pdr-status-icon-circle pdr-status-icon-${selectedRequest.status}`}>
                  {getStatusIcon(selectedRequest.status)}
                </div>
                <div>
                  <p className="pdr-status-banner-title">
                    Status: {getStatusLabel(selectedRequest.status)}
                  </p>
                  <p className="pdr-status-banner-sub">
                    {selectedRequest.status === "ready" && "Your document is ready for pickup"}
                    {selectedRequest.status === "processing" && "Your request is currently being processed"}
                    {selectedRequest.status === "pending" && "Your request is waiting to be processed"}
                    {selectedRequest.status === "completed" && "Request completed"}
                    {selectedRequest.status === "rejected" && "Your request has been rejected"}
                  </p>
                </div>
              </div>

              {/* Request Info Grid */}
              <div className="pdr-details-grid">
                <div>
                  <p className="pdr-details-label">Tracking Number</p>
                  <p className="pdr-details-value">{selectedRequest.trackingNumber}</p>
                </div>
                <div>
                  <p className="pdr-details-label">Document Type</p>
                  <p className="pdr-details-value">{selectedRequest.type}</p>
                </div>
                <div className="pdr-details-full">
                  <p className="pdr-details-label">Purpose</p>
                  <p className="pdr-details-value">{selectedRequest.purpose}</p>
                </div>
                <div>
                  <p className="pdr-details-label">Request Date</p>
                  <p className="pdr-details-value">{formatDate(selectedRequest.requestedDate)}</p>
                </div>
                {selectedRequest.estimatedCompletion && (
                  <div>
                    <p className="pdr-details-label">Estimated Completion</p>
                    <p className="pdr-details-value">{formatDate(selectedRequest.estimatedCompletion)}</p>
                  </div>
                )}
              </div>

              {selectedRequest.additionalNotes && (
                <div className="pdr-details-notes">
                  <p className="pdr-details-label">Your Notes</p>
                  <div className="pdr-notes-box">{selectedRequest.additionalNotes}</div>
                </div>
              )}

              {selectedRequest.processingNotes && (
                <div className="pdr-details-notes">
                  <p className="pdr-details-label">Processing Updates</p>
                  <div className="pdr-notes-box pdr-notes-blue">{selectedRequest.processingNotes}</div>
                </div>
              )}

              {/* Reminders */}
              <div className="pdr-reminders-box">
                <h4 className="pdr-reminders-title">Important Reminders</h4>
                <ul className="pdr-reminders-list">
                  <li>Bring a valid government-issued ID when claiming</li>
                  <li>Processing office: HR/Records Office, Ground Floor</li>
                  <li>Office hours: Monday-Friday, 8:00 AM - 5:00 PM</li>
                  <li>Documents not claimed within 30 days will be archived</li>
                </ul>
              </div>
            </div>
            <div className="pdr-modal-footer">
              <button className="pdr-btn-cancel" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}