import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import "./prof-dashboard.css";
import "./prof-transactions.css";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaDateString } from "../../utils/dateTime";
import { useAuth } from "../../context/AuthContext";
import { connectSocket } from "../../utils/socket";

// ── Icons ────────────────────────────────────────────────────────────────────
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
const ClipboardListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// ── Transactions data ─────────────────────────────────────────────────────────

export default function ProfessorTransactionsPage() {
  const { user: authUser, token } = useAuth();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txStats, setTxStats] = useState({ total: 0, completed: 0, ongoing: 0, thisMonth: 0 });

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const typeBadgeClass = (type) =>
    ({
      appointment: "txn-badge txn-badge-appointment",
      document: "txn-badge txn-badge-document",
    }[type] ?? "txn-badge");

  const typeLabel = (type) =>
    ({ appointment: "Appointment", document: "Document" }[type] ?? type);

  const statusBadgeClass = (status) =>
    ({
      completed: "txn-badge txn-badge-completed",
      approved: "txn-badge txn-badge-approved",
      rejected: "txn-badge txn-badge-rejected",
      cancelled: "txn-badge txn-badge-cancelled",
      no_show: "txn-badge txn-badge-noshow",
      pending: "txn-badge txn-badge-pending",
      processing: "txn-badge txn-badge-processing",
      generated: "txn-badge txn-badge-generated",
      released: "txn-badge txn-badge-released",
      claimed: "txn-badge txn-badge-claimed",
    }[status] ?? "txn-badge");

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const statusLabel = (status) => {
    if (status === "generated") return "Ready for Pickup";
    if (status === "no_show") return "No Show";
    return capitalize(status);
  };

  const fetchTransactions = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterType !== "all") params.filterType = filterType;
      if (filterStatus !== "all") params.filterStatus = filterStatus;
      const res = await api.get("/professor/transactions", { params });
      setTransactions(res.data.map((t) => ({
        ...t,
        dateLabel: t.date ? formatManilaDate(t.date, { month: "short", day: "numeric", year: "numeric" }) : "",
        timeLabel: t.date ? formatManilaTime(t.date) : "",
      })));
    } catch {
      // silently fail — table might be empty
    } finally {
      setLoading(false);
    }
  };

  // Debounced 400ms, mirroring stud-transactions.jsx's own search debounce,
  // so typing doesn't fire a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { fetchTransactions(); }, [debouncedSearch, filterType, filterStatus]);

  // Stats are fetched separately, over the faculty member's FULL unfiltered
  // history server-side -- so the stat cards never reflect whatever
  // search/type/status filter happens to be active (mirrors student's own
  // stat-card behavior). Refetched on the same live-update events as the
  // transaction list below.
  const fetchStats = async () => {
    try {
      const res = await api.get("/professor/transactions/stats");
      setTxStats(res.data);
    } catch {
      // silently fail — cards just keep their last known values
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // ── Live updates: previously fetch-once-per-filter-change only, so
  // activity elsewhere (e.g. a document status change) wouldn't show up
  // here until the professor tweaked a filter or reloaded.
  useEffect(() => {
    if (!authUser || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const events = [
      "appointment:status-updated",
      "document:status-updated",
      "document:cancelled",
      "queue:called",
      "queue:served",
      "queue:no-show",
    ];
    const refetchAll = () => { fetchTransactions(); fetchStats(); };
    events.forEach((event) => socket.on(event, refetchAll));
    return () => {
      events.forEach((event) => socket.off(event, refetchAll));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, token]);

  // Server already handles filtering; just use transactions directly
  const filtered = transactions;

  // Exports exactly what's currently on screen (the server-filtered list
  // already held in state) — no new backend endpoint needed.
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const handleExport = () => {
    const header = ["Type", "Title", "Details", "Status", "Student/Tracking", "Date", "Time"];
    const rows = filtered.map((t) => [
      typeLabel(t.type),
      t.title,
      t.details,
      statusLabel(t.status),
      t.type === "document" ? t.trackingNumber : `${t.studentName ?? ""} (${t.studentId ?? ""})`,
      t.dateLabel,
      t.timeLabel,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${getManilaDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
    >
        <div className="transactions-page">

          {/* Page header */}
          <PageHeader
            breadcrumb={
              <Link to="/professor/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<ClipboardListIcon />}
            iconClassName="txn-title-icon"
            title="Transaction History"
            subtitle="View all your activities and transactions."
          />

          {/* Stats */}
          <div className="transactions-stats-grid">
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-blue"><ClipboardListIcon /></div>
              <p className="txn-stat-label">Total</p>
              <p className="txn-stat-value txn-val-blue">{txStats.total}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-green"><CheckCircleIcon /></div>
              <p className="txn-stat-label">Completed</p>
              <p className="txn-stat-value txn-val-green">{txStats.completed}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-orange"><ClockIcon /></div>
              <p className="txn-stat-label">Ongoing</p>
              <p className="txn-stat-value txn-val-orange">{txStats.ongoing}</p>
            </div>
            <div className="txn-stat-card">
              <div className="txn-stat-icon-box txn-icon-box-primary"><CalendarSmIcon /></div>
              <p className="txn-stat-label">This Month</p>
              <p className="txn-stat-value txn-val-primary">{txStats.thisMonth}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <div className="filters-header-text">
                <h3 className="filters-title">Transaction Filter</h3>
                <p className="filters-description">Search and filter your transactions.</p>
              </div>
              <button className="txn-export-btn" onClick={handleExport} disabled={filtered.length === 0}>
                <DownloadIcon />
                Export
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label" htmlFor="txn-search">Search</label>
                <div className="filter-search-wrapper">
                  <SearchIcon />
                  <input
                    id="txn-search"
                    type="text"
                    placeholder="Search by student name, ID, or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="filter-search-input"
                  />
                </div>
              </div>

              <FilterSelect
                id="txn-type-select"
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "appointment", label: "Appointment" },
                  { value: "document", label: "Document" },
                ]}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="txn-status-select"
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "processing", label: "Processing" },
                  { value: "generated", label: "Ready for Pickup" },
                  { value: "released", label: "Released" },
                  { value: "claimed", label: "Claimed" },
                  { value: "completed", label: "Completed" },
                  { value: "rejected", label: "Rejected" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
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
                <ClipboardListIcon />
                <h3>No Transactions Found</h3>
                <p>You have no transaction records yet.</p>
              </div>
            ) : (
              filtered.map((txn) => (
                <div key={`${txn.type}-${txn.id}`} className={`txn-item txn-type-${txn.type}`}>
                  <div className="txn-item-icon">
                    <span className={`txn-icon-wrap txn-icon-${txn.type}`}>
                      {txn.type === "appointment" ? <CalendarSmIcon /> : <FileText />}
                    </span>
                  </div>
                  <div className="txn-item-content">
                    <div className="txn-item-header">
                      <span className="txn-item-title">{txn.title}</span>
                      <div className="txn-item-badges">
                        <span className={typeBadgeClass(txn.type)}>{typeLabel(txn.type)}</span>
                        <span className={statusBadgeClass(txn.status)}>{statusLabel(txn.status)}</span>
                      </div>
                    </div>
                    {txn.type === "document" ? (
                      txn.trackingNumber && (
                        <div className="txn-item-student">
                          <span className="txn-tracking-pill">{txn.trackingNumber}</span>
                        </div>
                      )
                    ) : (
                      txn.studentName && (
                        <div className="txn-item-student">
                          <span className="txn-item-student-name">{txn.studentName}</span>
                          {txn.studentId && (
                            <span className="txn-student-id-badge">{txn.studentId}</span>
                          )}
                        </div>
                      )
                    )}
                    {txn.details && <p className="txn-item-details">{txn.details}</p>}
                  </div>
                  <div className="txn-item-meta">
                    <div className="txn-item-date">
                      <CalendarSmIcon />
                      {txn.dateLabel}
                    </div>
                    <div className="txn-item-time">
                      <ClockIcon />
                      {txn.timeLabel}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </ProfessorPageShell>
  );
}
