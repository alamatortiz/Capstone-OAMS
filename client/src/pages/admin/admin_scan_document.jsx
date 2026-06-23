import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_scan_document.css";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg
    className="asd-icon"
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
    className="asd-icon"
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
    className="asd-sun-icon"
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
    className="asd-moon-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const QRScanIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: "1.2rem", height: "1.2rem" }}
  >
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
  </svg>
);
const FileEntryIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.2rem", height: "1.2rem" }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const PrintIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);
const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.3rem", height: "1.3rem" }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);


export default function AdminScanDocument() {
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Scanner state
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verifiedDoc, setVerifiedDoc] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanToast, setScanToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentScans, setRecentScans] = useState([]);

  // Load recent scans on mount
  useEffect(() => {
    if (!authUser) return;
    api.get("/admin/scan-document/recent")
      .then((res) => setRecentScans(res.data.scans ?? []))
      .catch((err) => console.error("Recent scans fetch error:", err));
  }, [authUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

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
        text: "I can help with scanning documents and verifying QR codes. Enter a QR code manually below or use the scanner.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const handleStartScanning = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      processCode("REQ-00002-QR");
    }, 2500);
  };

  const processCode = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setErrorMsg("");
    try {
      const res = await api.get(`/admin/scan-document/verify/${encodeURIComponent(trimmed)}`);
      if (!res.data.found) {
        setErrorMsg("No document found for this QR code. Please check and try again.");
        return;
      }
      const doc = res.data.doc;
      setVerifiedDoc(doc);
      setModalOpen(true);
      setScanToast(true);
      setTimeout(() => setScanToast(false), 3000);
      setRecentScans((prev) => [
        {
          name: doc.studentName,
          docType: doc.documentType,
          tracking: doc.trackingNumber,
          time: "Just now",
          status: doc.status.toLowerCase(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      console.error("Scan verify error:", err);
      setErrorMsg("Scan failed. Please try again.");
    }
  };

  const handleVerify = () => {
    if (!manualCode.trim()) return;
    processCode(manualCode);
  };

  const handleQuickCode = (code) => {
    setManualCode(code);
    processCode(code);
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
    <div className="admin-dashboard-with-sidebar">
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
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="logo-img oams-logo-img"
              />
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
                <p className="user-name-large">{user?.name}</p>
                <span className="user-role-badge">Administrator</span>
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
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="logo-img oams-logo-img"
            />
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
      <main className="admin-dashboard-main">
        <div className="asd-page">
          <button className="admin-back-btn" onClick={() => navigate("/admin/dashboard")}><ChevronLeftIcon /><span>Dashboard</span></button>
          {/* Page Title */}
          <div className="asd-page-header">
            <h1 className="asd-page-title">Document Scanner</h1>
            <p className="asd-page-subtitle">
              Scan QR codes to verify and view document details
            </p>
          </div>

          <div className="asd-content-grid">
            {/* Left Column */}
            <div className="asd-left-col">
              {/* QR Code Scanner */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <QRScanIcon />
                  <div>
                    <h2 className="asd-card-title">QR Code Scanner</h2>
                    <p className="asd-card-subtitle">
                      Position the QR code within the scanner area
                    </p>
                  </div>
                </div>
                <div className="asd-scanner-viewport">
                  {scanning ? (
                    <div className="asd-scanner-active">
                      <div className="asd-scanner-frame asd-scanner-frame--scanning">
                        <div className="asd-scanner-line"></div>
                      </div>
                      <p className="asd-scanner-hint">Scanning…</p>
                    </div>
                  ) : (
                    <div className="asd-scanner-idle">
                      <div className="asd-scanner-frame">
                        <svg
                          viewBox="0 0 80 80"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            width: "5rem",
                            height: "5rem",
                            opacity: 0.5,
                          }}
                        >
                          <rect
                            x="5"
                            y="5"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="10"
                            y="10"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="5"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="58"
                            y="10"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="5"
                            y="53"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="10"
                            y="58"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="53"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="65"
                            y="53"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="65"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="65"
                            y="65"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                        </svg>
                      </div>
                      <p className="asd-scanner-hint">
                        Click the button below to start scanning
                      </p>
                      <p className="asd-scanner-hint-small">
                        Or enter the QR code manually
                      </p>
                    </div>
                  )}
                </div>
                <button
                  className="asd-btn-scan"
                  onClick={handleStartScanning}
                  disabled={scanning}
                >
                  {scanning ? "Scanning…" : "Start Scanning"}
                </button>
              </div>

              {/* Manual QR Code Entry */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <FileEntryIcon />
                  <div>
                    <h2 className="asd-card-title">Manual QR Code Entry</h2>
                    <p className="asd-card-subtitle">
                      Enter the QR code manually if scanner is unavailable
                    </p>
                  </div>
                </div>
                <div className="asd-manual-entry">
                  <div className="asd-input-row">
                    <input
                      type="text"
                      className="asd-input"
                      placeholder="Enter QR code (e.g., DOC-2026-0327-001-QR)"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value);
                        setErrorMsg("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    />
                    <button className="asd-btn-verify" onClick={handleVerify}>
                      Verify
                    </button>
                  </div>
                  {errorMsg && <p className="asd-error-msg">{errorMsg}</p>}
                  <p className="asd-quick-label">Quick test codes:</p>
                  <div className="asd-quick-codes">
                    {[
                      "REQ-00002-QR",
                      "REQ-00005-QR",
                    ].map((code) => (
                      <button
                        key={code}
                        className="asd-quick-code-btn"
                        onClick={() => handleQuickCode(code)}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="asd-right-col">
              {/* Recent Scans */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    style={{ width: "1.2rem", height: "1.2rem" }}
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <div>
                    <h2 className="asd-card-title">Recent Scans</h2>
                    <p className="asd-card-subtitle">
                      Recently scanned documents
                    </p>
                  </div>
                </div>
                <div className="asd-recent-list">
                  {recentScans.map((scan, i) => (
                    <div key={i} className="asd-recent-item">
                      <div className="asd-recent-info">
                        <div className="asd-recent-top">
                          <span className="asd-recent-name">{scan.name}</span>
                          <span
                            className={`asd-status-badge asd-status-${scan.status}`}
                          >
                            {scan.status}
                          </span>
                        </div>
                        <p className="asd-recent-doctype">{scan.docType}</p>
                        <div className="asd-recent-bottom">
                          <span className="asd-recent-tracking">
                            {scan.tracking}
                          </span>
                          <span className="asd-recent-time">{scan.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scanning Tips */}
              <div className="asd-card asd-tips-card">
                <h3 className="asd-tips-title">Scanning Tips</h3>
                <ul className="asd-tips-list">
                  <li>Ensure good lighting for optimal scanning</li>
                  <li>Hold the QR code steady within the frame</li>
                  <li>Keep the document flat and unwrinkled</li>
                  <li>Use manual entry if QR code is damaged</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Document Verification Modal */}
      {modalOpen && verifiedDoc && (
        <div className="asd-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="asd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asd-modal-header">
              <div>
                <h2 className="asd-modal-title">Document Verification</h2>
                <p className="asd-modal-subtitle">
                  Scanned document details and softcopy content
                </p>
              </div>
              <button
                className="asd-modal-close"
                onClick={() => setModalOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="asd-modal-body">
              {/* Verified Banner */}
              <div
                className={`asd-verified-banner ${verifiedDoc.status === "VALID" ? "asd-verified-banner--valid" : "asd-verified-banner--expired"}`}
              >
                {verifiedDoc.status === "VALID" ? (
                  <>
                    <CheckCircleIcon />
                    <div>
                      <p className="asd-verified-title">Document Verified ✓</p>
                      <p className="asd-verified-desc">
                        This document has been authenticated against university
                        records
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: "1.3rem", height: "1.3rem" }}
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>
                      <p className="asd-verified-title">Document Expired</p>
                      <p className="asd-verified-desc">
                        This document has passed its validity date
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Doc Meta Grid */}
              <div className="asd-meta-grid">
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Tracking Number</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.trackingNumber}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Document Type</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.documentType}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Student Name</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.studentName}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Student ID</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.studentId}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">College</span>
                  <span className="asd-meta-value">{verifiedDoc.college}</span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Status</span>
                  <span
                    className={`asd-status-badge asd-status-${verifiedDoc.status.toLowerCase()}`}
                  >
                    {verifiedDoc.status}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Issue Date</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.issueDate}
                  </span>
                </div>
                <div className="asd-meta-item">
                  <span className="asd-meta-label">Valid Until</span>
                  <span className="asd-meta-value">
                    {verifiedDoc.validUntil}
                  </span>
                </div>
              </div>

              {/* Document Content */}
              {verifiedDoc.content && (
                <div className="asd-doc-content-section">
                  <h3 className="asd-doc-content-title">Document Content</h3>
                  <pre className="asd-doc-content-pre">{verifiedDoc.content}</pre>
                </div>
              )}

              {/* Footer */}
              <div className="asd-modal-footer-info">
                {verifiedDoc.issuedBy && (
                  <p>
                    <strong>Issued by:</strong> {verifiedDoc.issuedBy}
                  </p>
                )}
                {verifiedDoc.authorizedSignatory && (
                  <p>
                    <strong>Authorized Signatory:</strong>{" "}
                    {verifiedDoc.authorizedSignatory}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="asd-modal-actions">
              <button className="asd-btn-print" onClick={() => window.print()}>
                <PrintIcon /> Print
              </button>
              <button className="asd-btn-download">
                <DownloadIcon /> Download
              </button>
              <button
                className="asd-btn-close-modal"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {scanToast && (
        <div className="asd-toast">
          <CheckCircleIcon />
          <span>QR Code scanned successfully!</span>
        </div>
      )}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
