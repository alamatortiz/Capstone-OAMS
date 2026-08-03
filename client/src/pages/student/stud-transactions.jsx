import { useState, useEffect, useCallback, useRef } from "react";
import StudentPageShell from "../../components/StudentPageShell";
import {
  QueueIconNav,
  CalendarIconNav,
} from "../../components/StudentSidebar";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/PageHeader";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import "./stud-transactions.css";
import api from "../../utils/api";
import { formatManilaDate } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
import { ChevronLeft, FileText } from "lucide-react";

// ─── Icons ────────────────────────────────────────────────────────────────
const ClipboardListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
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

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const PAGE_SIZE = 20;

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { user, token } = useAuth();

  // ── Transaction data state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [txStats, setTxStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    thisMonth: 0,
  });

  // Debounce the search box so every keystroke doesn't trigger a refetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Derived values ────────────────────────────────────────────────────────
  const stats = [
    {
      label: "Total",
      value: txStats.total,
      color: "text-blue-600",
      bgColor: "tx-bg-blue-50",
      icon: "list",
    },
    {
      label: "Completed",
      value: txStats.completed,
      color: "text-green-600",
      bgColor: "tx-bg-green-50",
      icon: "check",
    },
    {
      label: "Ongoing",
      value: txStats.ongoing,
      color: "text-orange-600",
      bgColor: "tx-bg-orange-50",
      icon: "clock",
    },
    {
      label: "This Month",
      value: txStats.thisMonth,
      color: "text-purple-600",
      bgColor: "tx-bg-purple-50",
      icon: "calendar",
    },
  ];

  // Mirrors `transactions` for the catch block below, without making
  // fetchTransactions depend on (and change identity with) the state itself.
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // Search/type/status filtering happens server-side (so it considers the
  // student's whole history, not just whatever page is currently loaded).
  // Any change to those filters — including the ones baked into this
  // callback's identity below — resets back to the first page; only
  // "Load More" advances the offset.
  const fetchTransactions = useCallback(
    async (offset = 0) => {
      try {
        if (offset > 0) setLoadingMore(true);
        const res = await api.get("/student/transactions", {
          params: {
            search: debouncedSearch || undefined,
            type: filterType !== "all" ? filterType : undefined,
            status: filterStatus !== "all" ? filterStatus : undefined,
            limit: PAGE_SIZE,
            offset,
          },
        });
        const newTransactions = res.data.transactions ?? [];
        setTransactions((prev) =>
          offset > 0 ? [...prev, ...newTransactions] : newTransactions,
        );
        setHasMore(!!res.data.hasMore);
        if (res.data.stats) setTxStats(res.data.stats);
        setTxError(null);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        if (transactionsRef.current.length === 0) {
          setTxError("Could not load your transaction history.");
        } else {
          toast.error("Could not refresh your transaction history.");
        }
      } finally {
        setTxLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filterType, filterStatus],
  );

  // Fresh load whenever the page mounts or the search/type/status filters
  // change (fetchTransactions' identity changes with them).
  useEffect(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchTransactions(transactions.length);
  };

  // Queue events (and document:cancelled) are broadcast department-wide, not
  // just to the affected student, so they're checked against this student's
  // own ID before refetching — otherwise this page would refetch every time
  // ANY student in the department got called/served/etc.
  const handleOwnQueueEvent = useCallback(
    (payload) => {
      if (Number(payload?.studentId) === Number(user?.userId)) {
        fetchTransactions(0);
      }
    },
    [fetchTransactions, user?.userId],
  );

  // ── Live updates: refetch when a document/appointment status changes, or
  // one of this student's own queue events fires ─────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refetchFirstPage = () => fetchTransactions(0);
    const ownEvents = ["document:status-updated", "appointment:status-updated"];
    const deptWideEvents = [
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:student-joined",
      "queue:student-left",
      "document:cancelled",
    ];

    ownEvents.forEach((event) => socket.on(event, refetchFirstPage));
    deptWideEvents.forEach((event) => socket.on(event, handleOwnQueueEvent));

    return () => {
      ownEvents.forEach((event) => socket.off(event, refetchFirstPage));
      deptWideEvents.forEach((event) => socket.off(event, handleOwnQueueEvent));
    };
  }, [fetchTransactions, handleOwnQueueEvent, token]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchTransactions(0);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const getTypeIcon = (type) => {
    switch (type) {
      case "queue":
        return <QueueIconNav />;
      case "appointment":
        return <CalendarIconNav />;
      case "document":
        return <FileText />;
      default:
        return <AlertCircleIcon />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "queue":
        return "tx-badge-queue";
      case "appointment":
        return "tx-badge-appointment";
      case "document":
        return "tx-badge-document";
      default:
        return "tx-badge-default";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "tx-badge-completed";
      case "ongoing":
        return "tx-badge-ongoing";
      case "cancelled":
        return "tx-badge-cancelled";
      default:
        return "tx-badge-default";
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="transactions-with-sidebar"
      mainClassName="transactions-main"
    >
        <div className="transactions-container">
          {/* Header */}
          <PageHeader
            breadcrumb={
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<ClipboardListIcon />}
            title="Transaction History"
            subtitle="View all your activities and transactions"
          />

          {/* Stats Grid */}
          <div className="tx-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="tx-stat-card">
                <div className={`stat-icon-box ${stat.bgColor}`}>
                  {stat.icon === "list" && <ClipboardListIcon />}
                  {stat.icon === "check" && <CheckCircleIcon />}
                  {stat.icon === "clock" && <ClockIcon />}
                  {stat.icon === "calendar" && <CalendarIcon />}
                </div>
                <p className="tx-stat-label">{stat.label}</p>
                <p className={`tx-stat-value ${stat.color}`}>{stat.value}</p>
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

              <FilterSelect
                id="tx-type-select"
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "queue", label: "Queue" },
                  { value: "appointment", label: "Appointment" },
                  { value: "document", label: "Document" },
                ]}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="tx-status-select"
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "completed", label: "Completed" },
                  { value: "ongoing", label: "Ongoing" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
          </div>

          {/* Transaction List */}
          <div className="transactions-list">
            {txLoading ? (
              <div className="tx-empty-state">
                <SearchIcon />
                <h3>Loading transactions…</h3>
              </div>
            ) : txError ? (
              <div className="tx-empty-state">
                <AlertCircleIcon />
                <h3>Could not load transactions</h3>
                <p>{txError}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="tx-empty-state">
                <ClipboardListIcon />
                <h3>No Transactions Found</h3>
                <p>You have no transaction records yet.</p>
              </div>
            ) : (
              transactions.map((transaction) => (
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
                          className={`tx-badge ${getTypeColor(transaction.type)}`}
                        >
                          {transaction.type}
                        </span>
                        <span
                          className={`tx-badge ${getStatusColor(
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
                      {formatManilaDate(transaction.date, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
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

          {!txLoading && !txError && hasMore && (
            <button
              type="button"
              className="tx-load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          )}
        </div>
    </StudentPageShell>
  );
}
