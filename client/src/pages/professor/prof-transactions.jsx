import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ProfessorSidebar from "../../components/ProfessorSidebar";
import "./prof-dashboard.css";
import "./prof-transactions.css";
import api from "../../utils/api";

// ── Icons ────────────────────────────────────────────────────────────────────
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
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const CalendarSmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FileTextIconSm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// ── Transactions data ─────────────────────────────────────────────────────────

export default function ProfessorTransactionsPage() {
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

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const typeBadgeClass = (type) =>
    ({
      queue: "txn-badge txn-badge-queue",
      appointment: "txn-badge txn-badge-appointment",
      document: "txn-badge txn-badge-document",
    }[type] ?? "txn-badge");

  const typeLabel = (type) =>
    ({ queue: "Queue", appointment: "Appointment", document: "Document" }[type] ?? type);

  const statusBadgeClass = (status) =>
    ({
      completed: "txn-badge txn-badge-completed",
      approved: "txn-badge txn-badge-approved",
      rejected: "txn-badge txn-badge-rejected",
      cancelled: "txn-badge txn-badge-cancelled",
      pending: "txn-badge txn-badge-pending",
      processing: "txn-badge txn-badge-processing",
      generated: "txn-badge txn-badge-generated",
      released: "txn-badge txn-badge-released",
    }[status] ?? "txn-badge");

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const statusLabel = (status) =>
    status === "generated" ? "Ready for Pickup" : capitalize(status);

  const fetchTransactions = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filterType !== "all") params.filterType = filterType;
      if (filterStatus !== "all") params.filterStatus = filterStatus;
      const res = await api.get("/faculty/transactions", { params });
      setTransactions(res.data.map((t) => ({
        ...t,
        action: `${statusLabel(t.status)} ${typeLabel(t.type)}`,
        details: t.description ?? "",
        timestamp: t.date ? new Date(t.date).toLocaleString() : "",
      })));
    } catch {
      // silently fail — table might be empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [searchQuery, filterType, filterStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        text: "I can help you with appointment management, student requests, and document reviews. What do you need?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = {
    total: transactions.length,
    queue: transactions.filter((t) => t.type === "queue").length,
    appointments: transactions.filter((t) => t.type === "appointment").length,
    documents: transactions.filter((t) => t.type === "document").length,
  };

  // Server already handles filtering; just use transactions directly
  const filtered = transactions;

  return (
    <div className="dashboard-with-sidebar">
      <ProfessorSidebar />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        <div className="transactions-page">

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page header */}
          <div className="txn-page-header">
            <div className="txn-title-section">
              <div className="txn-title-icon">
                <ActivityIcon />
              </div>
              <div>
                <h1 className="txn-page-title">Transaction History</h1>
                <p className="txn-page-subtitle">View all your activities and transactions</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="transactions-stats-grid">
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-blue"><ActivityIcon /></div>
              <p className="txn-stat-label">Total Transactions</p>
              <p className="txn-stat-value txn-val-blue">{stats.total}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-cyan"><UserIcon /></div>
              <p className="txn-stat-label">Queue Services</p>
              <p className="txn-stat-value txn-val-cyan">{stats.queue}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-green"><CalendarSmIcon /></div>
              <p className="txn-stat-label">Appointments</p>
              <p className="txn-stat-value txn-val-green">{stats.appointments}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-orange"><FileTextIconSm /></div>
              <p className="txn-stat-label">Documents</p>
              <p className="txn-stat-value txn-val-orange">{stats.documents}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="txn-filter-card">
            <div className="txn-filters-header">
              <div>
                <h3 className="txn-filters-title">Transaction Filter</h3>
                <p className="txn-filters-desc">Search and filter transactions</p>
              </div>
              <button className="txn-export-btn">
                <DownloadIcon />
                Export
              </button>
            </div>
            <div className="txn-filters-grid">
              <div className="txn-filter-group">
                <label className="txn-filter-label">Search</label>
                <div className="txn-search-wrapper">
                  <span className="txn-search-icon"><SearchIcon /></span>
                  <input
                    type="text"
                    className="txn-search-input"
                    placeholder="Search by student name, ID, or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="txn-filter-group">
                <label className="txn-filter-label">Type</label>
                <select
                  className="txn-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="queue">Queue</option>
                  <option value="appointment">Appointment</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div className="txn-filter-group">
                <label className="txn-filter-label">Status</label>
                <select
                  className="txn-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="generated">Ready for Pickup</option>
                  <option value="released">Released</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transaction list */}
          <div className="txn-list">
            {loading ? (
              <div className="txn-empty">
                <ActivityIcon />
                <p>Loading transactions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="txn-empty">
                <ActivityIcon />
                <p>No transactions found</p>
              </div>
            ) : (
              filtered.map((txn) => (
                <div key={`${txn.type}-${txn.id}`} className={`txn-item txn-type-${txn.type}`}>
                  <div className="txn-item-icon">
                    <span className={`txn-icon-wrap txn-icon-${txn.type}`}>
                      {txn.type === "queue" ? <UserIcon /> : txn.type === "appointment" ? <CalendarSmIcon /> : <FileTextIconSm />}
                    </span>
                  </div>
                  <div className="txn-item-content">
                    <div className="txn-item-header">
                      <span className="txn-item-title">{txn.action}</span>
                      <div className="txn-item-badges">
                        <span className={typeBadgeClass(txn.type)}>{typeLabel(txn.type)}</span>
                        <span className={statusBadgeClass(txn.status)}>{statusLabel(txn.status)}</span>
                      </div>
                    </div>
                    {txn.type === "document" ? (
                      txn.trackingNumber && (
                        <div className="txn-item-student">
                          <FileTextIconSm />
                          <span className="txn-item-student-name">{txn.trackingNumber}</span>
                        </div>
                      )
                    ) : (
                      txn.studentName && (
                        <div className="txn-item-student">
                          <UserIcon />
                          <span className="txn-item-student-name">{txn.studentName}</span>
                          <span>({txn.studentId})</span>
                        </div>
                      )
                    )}
                    {txn.details && <p className="txn-item-details">{txn.details}</p>}
                  </div>
                  <div className="txn-item-meta">
                    <div className="txn-item-date">
                      <CalendarSmIcon />
                      {txn.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── AI Chatbot ───────────────────────────────────────────────────── */}
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
    </div>
  );
}
