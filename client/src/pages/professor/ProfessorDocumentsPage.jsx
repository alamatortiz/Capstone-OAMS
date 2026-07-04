import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ProfessorSidebar from "../../components/ProfessorSidebar";
import "./professor_dashboard.css";
import "./professor_documents.css";
import api from "../../utils/api";

// ── Nav Icons ─────────────────────────────────────────────────────────────────
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
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── Content Icons ─────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { badgeClass: "docs-badge-pending",    Icon: AlertCircleIcon,  label: "Pending" },
  processing: { badgeClass: "docs-badge-processing", Icon: ClockIcon,        label: "Processing" },
  released:   { badgeClass: "docs-badge-ready",      Icon: CheckCircle2Icon, label: "Released" },
  rejected:   { badgeClass: "docs-badge-rejected",   Icon: XCircleIcon,      label: "Rejected" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`docs-badge ${cfg.badgeClass}`}>
      <cfg.Icon />
      {cfg.label}
    </span>
  );
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ── Request Card ──────────────────────────────────────────────────────────────
function RequestCard({ req, onViewDetails }) {
  return (
    <div className="docs-card">
      <div className="docs-card-header-row">
        <div className="docs-card-icon-wrap">
          <FileTextIcon className="docs-icon-md" />
        </div>
        <div className="docs-card-title-section">
          <h3 className="docs-card-name">{req.service_name}</h3>
          <p className="docs-card-sub">{req.tracking_number}</p>
        </div>
        <div className="docs-card-badges">
          <StatusBadge status={req.status} />
        </div>
      </div>

      <div className="docs-meta-grid">
        <div className="docs-meta-field">
          <label>Purpose</label>
          <p>{req.purpose}</p>
        </div>
        <div className="docs-meta-field">
          <label>Submitted</label>
          <p>{formatDate(req.created_at)}</p>
        </div>
        {req.estimated_completion && (
          <div className="docs-meta-field">
            <label>Est. Completion</label>
            <p>{formatDate(req.estimated_completion)}</p>
          </div>
        )}
        {req.processing_time && (
          <div className="docs-meta-field">
            <label>Processing Time</label>
            <p>{req.processing_time}</p>
          </div>
        )}
      </div>

      {req.notes && (
        <div className="docs-notes-box">
          <p className="docs-meta-label" style={{ marginBottom: "0.25rem" }}>Notes</p>
          <p className="docs-notes-text">{req.notes}</p>
        </div>
      )}

      <div className="docs-footer">
        <button className="docs-btn docs-btn-outline" onClick={() => onViewDetails(req)}>
          View Details
        </button>
      </div>
    </div>
  );
}

// ── Details Dialog ────────────────────────────────────────────────────────────
function DetailsDialog({ req, onClose }) {
  if (!req) return null;
  return (
    <div className="docs-dialog-overlay">
      <div className="docs-dialog-box">
        <button className="docs-dialog-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <p className="docs-dialog-title">Request Details</p>
        <p className="docs-dialog-desc">Full details for your document request.</p>

        <div className="docs-name-row">
          <span className="docs-student-name">{req.service_name}</span>
        </div>
        <p className="docs-doc-type" style={{ margin: "0.25rem 0 0.75rem", opacity: 0.7, fontSize: "0.85rem" }}>
          {req.tracking_number}
        </p>

        <div className="docs-meta-grid">
          <div>
            <p className="docs-meta-label">Purpose</p>
            <p className="docs-meta-value">{req.purpose}</p>
          </div>
          <div>
            <p className="docs-meta-label">Request Type</p>
            <p className="docs-meta-value">{req.request_type || "General"}</p>
          </div>
          <div>
            <p className="docs-meta-label">Status</p>
            <StatusBadge status={req.status} />
          </div>
          <div>
            <p className="docs-meta-label">Submitted</p>
            <p className="docs-meta-value">{formatDate(req.created_at)}</p>
          </div>
          {req.estimated_completion && (
            <div>
              <p className="docs-meta-label">Est. Completion</p>
              <p className="docs-meta-value">{formatDate(req.estimated_completion)}</p>
            </div>
          )}
          {req.released_at && (
            <div>
              <p className="docs-meta-label">Released</p>
              <p className="docs-meta-value">{formatDate(req.released_at)}</p>
            </div>
          )}
        </div>

        {req.notes && (
          <div className="docs-notes-box" style={{ marginTop: "0.5rem" }}>
            <p className="docs-meta-label" style={{ marginBottom: "0.25rem" }}>Notes</p>
            <p className="docs-notes-text">{req.notes}</p>
          </div>
        )}

        <div className="docs-dialog-footer">
          <button className="docs-btn docs-btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ["all", "pending", "processing", "released", "rejected"];

export default function ProfessorDocumentsPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReq, setSelectedReq] = useState(null);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/faculty/my-document-requests");
      setRequests(res.data);
    } catch {
      // silent — empty state handles it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered =
    activeTab === "all" ? requests : requests.filter((r) => r.status === activeTab);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pending = requests.filter((r) => r.status === "pending").length;
    if (i.includes("pending")) return `You have ${pending} pending document request(s).`;
    if (i.includes("document") || i.includes("request")) return `You have ${requests.length} document request(s) in total.`;
    return "I can help you track your document requests. What do you need?";
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

  return (
    <div className="dashboard-with-sidebar">
      <ProfessorSidebar />

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
                <h1 className="docs-page-title">My Document Requests</h1>
                <p className="docs-page-subtitle">Track the status of your submitted document requests</p>
              </div>
            </div>
            <Link to="/professor/document-request" className="docs-btn-request">
              <PlusIcon /> Request Document
            </Link>
          </div>

          {/* Tabs */}
          <div className="docs-tabs-nav">
            <div className="docs-tabs-list">
              {TABS.map((tab) => {
                const count = tab === "all" ? requests.length : requests.filter((r) => r.status === tab).length;
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
              <div className="docs-empty">Loading your document requests...</div>
            ) : filtered.length === 0 ? (
              <div className="docs-empty">
                {activeTab === "all"
                  ? "You have no document requests yet. Click \"Request Document\" to get started."
                  : `No ${activeTab} requests found.`}
              </div>
            ) : (
              filtered.map((req) => (
                <RequestCard
                  key={req.request_id}
                  req={req}
                  onViewDetails={setSelectedReq}
                />
              ))
            )}
          </div>

        </div>
      </main>

      {selectedReq && (
        <DetailsDialog req={selectedReq} onClose={() => setSelectedReq(null)} />
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
    </div>
  );
}
