import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, FileText } from "lucide-react";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import FilterDateRange from "../../components/FilterDateRange";
import ExportMenu from "../../components/ExportMenu";
import "./prof-dashboard.css";
import "./prof-transactions.css";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaDateString } from "../../utils/dateTime";
import { exportTransactionsPdf } from "../../utils/exportPdf";
import { useAuth } from "../../context/AuthContext";
import { connectSocket } from "../../utils/socket";
import { PROFESSOR_STATUSES_BY_TYPE, getStatusOptionsForType } from "../../data/transactionStatusOptions";

// ── Icons ────────────────────────────────────────────────────────────────────
const CalendarSmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
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

// ── Transactions data ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "appointment", label: "Appointment" },
  { value: "document", label: "Document" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready for Pickup" },
  { value: "claimed", label: "Claimed" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ProfessorTransactionsPage() {
  const { user: authUser, token } = useAuth();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txError, setTxError] = useState(null);

  // Mirrors `transactions` for the catch block below, without making
  // fetchTransactions depend on (and change identity with) the state itself.
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const typeBadgeClass = (type) =>
    ({
      appointment: "txn-badge txn-badge-appointment",
      document: "txn-badge txn-badge-document",
      submission: "txn-badge txn-badge-document",
    }[type] ?? "txn-badge");

  const typeLabel = (type) =>
    ({ appointment: "Appointment", document: "Document Request", submission: "Document Submission" }[type] ?? type);

  const statusBadgeClass = (status) =>
    ({
      completed: "txn-badge txn-badge-completed",
      approved: "txn-badge txn-badge-approved",
      rejected: "txn-badge txn-badge-rejected",
      cancelled: "txn-badge txn-badge-cancelled",
      no_show: "txn-badge txn-badge-noshow",
      pending: "txn-badge txn-badge-pending",
      processing: "txn-badge txn-badge-processing",
      ready: "txn-badge txn-badge-ready",
      // Aliases so legacy status values still map to the "ready" badge.
      generated: "txn-badge txn-badge-ready",
      released: "txn-badge txn-badge-ready",
      claimed: "txn-badge txn-badge-claimed",
    }[status] ?? "txn-badge");

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const statusLabel = (status) => {
    if (status === "ready" || status === "generated" || status === "released")
      return "Ready for Pickup";
    if (status === "no_show") return "No Show";
    return capitalize(status);
  };

  const fetchTransactions = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterType !== "all") params.filterType = filterType;
      if (filterStatus !== "all") params.filterStatus = filterStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/professor/transactions", { params });
      setTransactions(res.data.map((t) => ({
        ...t,
        dateLabel: t.date ? formatManilaDate(t.date, { month: "short", day: "numeric", year: "numeric" }) : "",
        timeLabel: t.date ? formatManilaTime(t.date) : "",
      })));
      setTxError(null);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      if (transactionsRef.current.length === 0) {
        setTxError("Could not load your transaction history.");
      } else {
        toast.error("Could not refresh your transaction history.");
      }
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

  useEffect(() => { fetchTransactions(); }, [debouncedSearch, filterType, filterStatus, startDate, endDate]);

  // ── Live updates: refetches on socket events so activity elsewhere
  // (e.g. a document status change) shows up without the professor
  // needing to tweak a filter or reload.
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
    events.forEach((event) => socket.on(event, fetchTransactions));
    return () => {
      events.forEach((event) => socket.off(event, fetchTransactions));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, token]);

  // Server already handles filtering (including search); just use
  // transactions directly.
  const filtered = transactions;

  // ── Statistics ─────────────────────────────────────────────────────────────
  // Computed client-side from `filtered` -- the exact, already-filtered set
  // on screen -- instead of a separate always-unfiltered stats endpoint.
  // That older approach meant the cards (and the exported summary, which
  // reads this same `txStats`) never moved when a search/type/status/date
  // filter narrowed the list, which read as broken. Bucket/month semantics
  // match GET /professor/transactions/stats exactly (still used by
  // client-mobile, untouched) -- completed = completed/claimed, ongoing =
  // ready/pending/approved/processing/generated/released, this-month is
  // Manila-calendar-anchored.
  const txStats = useMemo(() => {
    const COMPLETED = new Set(["completed", "claimed"]);
    const ONGOING = new Set(["ready", "pending", "approved", "processing", "generated", "released"]);
    const thisManilaMonth = getManilaDateString().slice(0, 7);
    let completed = 0;
    let ongoing = 0;
    let thisMonth = 0;
    for (const t of filtered) {
      if (COMPLETED.has(t.status)) completed++;
      else if (ONGOING.has(t.status)) ongoing++;
      if (t.date && getManilaDateString(new Date(t.date)).slice(0, 7) === thisManilaMonth) thisMonth++;
    }
    return { total: filtered.length, completed, ongoing, thisMonth };
  }, [filtered]);

  // Exports exactly what's currently on screen (the server-filtered list
  // already held in state) — no new backend endpoint needed.
  // "Tracking #" is meaningless on an appointment-only export (appointments
  // never have one, so the column would just be blank down the whole
  // sheet) -- swap it for the shared comment instead, since that's the
  // thing actually worth recalling for an appointment.
  const isAppointmentOnly = filterType === "appointment";
  const exportHeader = [
    "Type", "Title", "Details", "Status", "Student Name", "Student ID",
    isAppointmentOnly ? "Comment" : "Tracking #",
    "Date", "Time",
  ];
  const exportRows = filtered.map((t) => [
    typeLabel(t.type),
    t.title,
    t.details,
    statusLabel(t.status),
    t.studentName ?? "",
    t.studentId ?? "",
    isAppointmentOnly
      ? (t.sharedComment ?? "")
      : (t.type === "document" || t.type === "submission") ? (t.trackingNumber ?? "") : "",
    t.dateLabel,
    t.timeLabel,
  ]);
  // Prefixes a leading =/+/-/@ so a cell can't execute as a formula when the
  // CSV is opened in Excel/Sheets (matches the guard in adm-transactions.jsx).
  const csvEscape = (value) => {
    const str = String(value ?? "");
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const dateRangeLabel =
    startDate || endDate
      ? `${startDate || "…"} to ${endDate || "…"}`
      : "All Time";

  const summaryRows = [
    ["Date Range", dateRangeLabel],
    ["Total", txStats.total],
    ["Completed", txStats.completed],
    ["Ongoing", txStats.ongoing],
    ["This Month", txStats.thisMonth],
  ];

  const handleExportCsv = () => {
    const csv = [...summaryRows, [], exportHeader, ...exportRows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${getManilaDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    exportTransactionsPdf({
      title: "Transaction History",
      subtitle: `${authUser?.name ?? "Professor"} — ${dateRangeLabel} — Generated ${getManilaDateString()}`,
      columns: exportHeader,
      rows: exportRows,
      filename: `transactions-${getManilaDateString()}.pdf`,
      summary: summaryRows.map(([label, value]) => ({ label, value })),
    });
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
            headerClassName="txn-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="txn-title-section"
            titleClassName="txn-title"
            subtitleClassName="txn-subtitle"
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
              <ExportMenu
                triggerClassName="txn-export-btn"
                label="Export"
                disabled={filtered.length === 0}
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
              />
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
                onChange={(e) => {
                  const nextType = e.target.value;
                  setFilterType(nextType);
                  const allowedStatuses = PROFESSOR_STATUSES_BY_TYPE[nextType];
                  if (allowedStatuses && filterStatus !== "all" && !allowedStatuses.includes(filterStatus)) {
                    setFilterStatus("all");
                  }
                }}
                options={TYPE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="txn-status-select"
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={getStatusOptionsForType(STATUS_OPTIONS, PROFESSOR_STATUSES_BY_TYPE, filterType)}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
            <div className="filters-date-section">
              <FilterDateRange
                id="txn-filter-date-range"
                label="Date Range"
                startValue={startDate}
                endValue={endDate}
                onStartChange={(e) => setStartDate(e.target.value)}
                onEndChange={(e) => setEndDate(e.target.value)}
                onClear={() => { setStartDate(""); setEndDate(""); }}
              />
            </div>
          </div>

          {/* Transaction list */}
          <div className="txn-list">
            {loading ? (
              <div className="txn-empty">
                <SearchIcon />
                <h3>Loading transactions…</h3>
              </div>
            ) : txError ? (
              <div className="txn-empty">
                <AlertCircleIcon />
                <h3>Could not load transactions</h3>
                <p>{txError}</p>
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
                        {txn.trackingNumber && (
                          <span className="txn-tracking-pill">{txn.trackingNumber}</span>
                        )}
                        <span className={statusBadgeClass(txn.status)}>{statusLabel(txn.status)}</span>
                      </div>
                    </div>
                    {txn.studentName && (
                      <div className="txn-item-student">
                        <span className="txn-item-student-name">{txn.studentName}</span>
                        {txn.studentId && (
                          <span className="txn-student-id-badge">{txn.studentId}</span>
                        )}
                      </div>
                    )}
                    {txn.type === "appointment" && txn.cancelledBy === "student_no_show" && (
                      <p className="txn-item-comment-text">
                        Student reported not served{txn.cancelReason ? `: ${txn.cancelReason}` : ""}
                      </p>
                    )}
                    {txn.type === "appointment" && txn.cancelledBy === "system_not_entertained" && (
                      <p className="txn-item-comment-text">
                        Automatically cancelled — no actions taken recorded{txn.cancelReason ? `: ${txn.cancelReason}` : ""}
                      </p>
                    )}
                    {txn.type === "appointment" && txn.sharedComment && (
                      <div className="txn-item-comment">
                        <p className="txn-item-comment-text">{txn.sharedComment}</p>
                        {txn.commentUpdatedAt && (
                          <span className="txn-item-comment-meta">
                            — last updated by {txn.commentUpdatedBy === "faculty" ? "you" : "student"} on{" "}
                            {formatManilaDate(txn.commentUpdatedAt)}
                          </span>
                        )}
                      </div>
                    )}
                    {txn.type === "appointment" && (txn.approvedAtRaw || txn.completedAtRaw) && (
                      <div className="txn-item-timeline">
                        {txn.approvedAtRaw && (
                          <p className="txn-item-timeline-row">
                            <span className="txn-item-timeline-label">Approved:</span>{" "}
                            {formatManilaDate(txn.approvedAtRaw, { month: "short", day: "numeric", year: "numeric" })} at {formatManilaTime(txn.approvedAtRaw)}
                          </p>
                        )}
                        {txn.completedAtRaw && (
                          <p className="txn-item-timeline-row">
                            <span className="txn-item-timeline-label">Completed:</span>{" "}
                            {formatManilaDate(txn.completedAtRaw, { month: "short", day: "numeric", year: "numeric" })} at {formatManilaTime(txn.completedAtRaw)}
                          </p>
                        )}
                      </div>
                    )}
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
