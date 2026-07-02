import { useState, useRef, useEffect } from "react";
import StudentSidebar from "../../components/StudentSidebar";
import { Link } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

import "./stud-transactions.css";
import api from "../../utils/api";
import { ChevronLeft } from "lucide-react";

// ─── Icons ────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ClipboardListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const ChevronDownIcon = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
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

const AlertCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
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

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your transactions?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Transaction data state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesStatus =
      filterStatus === "all" || transaction.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });
  const now = new Date();

  const stats = [
    {
      label: "Total",
      value: transactions.length,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: "list",
    },
    {
      label: "Completed",
      value: transactions.filter((t) => t.status === "completed").length,
      color: "text-green-600",
      bgColor: "bg-green-50",
      icon: "check",
    },
    {
      label: "Ongoing",
      value: transactions.filter((t) => t.status === "ongoing").length,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      icon: "clock",
    },
    {
      label: "This Month",
      value: transactions.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }).length,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      icon: "calendar",
    },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTxLoading(true);
        const res = await api.get("/student/transactions");
        setTransactions(res.data.transactions ?? []);
        setTxError(null);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setTxError("Could not load your transaction history.");
      } finally {
        setTxLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes("completed") || lowerInput.includes("status")) {
      const completedCount = transactions.filter(
        (t) => t.status === "completed",
      ).length;
      return `You have ${completedCount} completed transactions. Would you like to see more details?`;
    } else if (lowerInput.includes("ongoing")) {
      const ongoingCount = transactions.filter(
        (t) => t.status === "ongoing",
      ).length;
      return `You currently have ${ongoingCount} ongoing transactions. Check back soon for updates!`;
    } else if (lowerInput.includes("queue")) {
      const queueCount = transactions.filter((t) => t.type === "queue").length;
      return `You have ${queueCount} queue-related transactions in your history.`;
    } else if (
      lowerInput.includes("appointment") ||
      lowerInput.includes("meeting")
    ) {
      const appointmentCount = transactions.filter(
        (t) => t.type === "appointment",
      ).length;
      return `You have ${appointmentCount} appointment transactions recorded.`;
    } else if (
      lowerInput.includes("document") ||
      lowerInput.includes("certificate")
    ) {
      const documentCount = transactions.filter(
        (t) => t.type === "document",
      ).length;
      return `You have ${documentCount} document-related transactions.`;
    } else {
      return "I can help you search through your transactions. Try asking about specific types like queues, appointments, or documents!";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "queue":
        return <ClockIcon />;
      case "appointment":
        return <CalendarIcon />;
      case "document":
        return <FileTextIcon />;
      default:
        return <AlertCircleIcon />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "queue":
        return "badge-queue";
      case "appointment":
        return "badge-appointment";
      case "document":
        return "badge-document";
      default:
        return "badge-default";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "badge-completed";
      case "ongoing":
        return "badge-ongoing";
      case "cancelled":
        return "badge-cancelled";
      default:
        return "badge-default";
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="transactions-with-sidebar">
      <StudentSidebar />

      {/* Main Content */}
      <main className="transactions-main">
        <div className="transactions-container">
          {/* Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <ClipboardListIcon />
              </div>
              <div>
                <h1 className="queue-title">Transaction History</h1>
                <p className="queue-subtitle">
                  View all your activities and transactions
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className={`stat-icon-box ${stat.bgColor}`}>
                  {stat.icon === "list" && <ClipboardListIcon />}
                  {stat.icon === "check" && <CheckCircleIcon />}
                  {stat.icon === "clock" && <ClockIcon />}
                  {stat.icon === "calendar" && <CalendarIcon />}
                </div>
                <p className="stat-label">{stat.label}</p>
                <p className={`stat-value ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <h3 className="filters-title">Transaction Filter</h3>
              <p className="filters-description">
                Search and filter your transactions
              </p>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label" htmlFor="tx-search">
                  Search
                </label>
                <div className="filter-search-wrapper">
                  <SearchIcon />
                  <input
                    id="tx-search"
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="filter-search-input"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="tx-type-select">
                  Type
                </label>
                <div className="filter-select-wrapper">
                  <select
                    id="tx-type-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="queue">Queue</option>
                    <option value="appointment">Appointment</option>
                    <option value="document">Document</option>
                  </select>
                  <ChevronDownIcon className="filter-chevron" />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="tx-status-select">
                  Status
                </label>
                <div className="filter-select-wrapper">
                  <select
                    id="tx-status-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDownIcon className="filter-chevron" />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="transactions-list">
            {txLoading ? (
              <div className="empty-state">
                <SearchIcon />
                <h3>Loading transactions…</h3>
              </div>
            ) : txError ? (
              <div className="empty-state">
                <AlertCircleIcon />
                <h3>Could not load transactions</h3>
                <p>{txError}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <SearchIcon />
                <h3>No transactions found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div key={transaction.id} className={`transaction-item transaction-type-${transaction.type}`}>
                  <div className="transaction-icon">
                    <span
                      className={`icon-wrapper ${getTypeColor(transaction.type)}`}
                    >
                      {getTypeIcon(transaction.type)}
                    </span>
                  </div>

                  <div className="transaction-content">
                    <div className="transaction-header">
                      <h3 className="transaction-title">{transaction.title}</h3>
                      <div className="transaction-badges">
                        <span
                          className={`badge ${getTypeColor(transaction.type)}`}
                        >
                          {transaction.type}
                        </span>
                        <span
                          className={`badge ${getStatusColor(
                            transaction.status,
                          )}`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                    <p className="transaction-college">{transaction.college}</p>
                    <p className="transaction-details">{transaction.details}</p>
                  </div>

                  <div className="transaction-meta">
                    <div className="transaction-date">
                      <CalendarIcon />
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "Asia/Manila",
                      })}
                    </div>
                    <div className="transaction-time">
                      <ClockIcon />
                      {transaction.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

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
    </div>
  );
}
