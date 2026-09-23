import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, FileText } from "lucide-react";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import FilterDateRange from "../../components/FilterDateRange";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import "./prof-dashboard.css";
import "./prof-transactions.css";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaDateString } from "../../utils/dateTime";
import { exportTransactionsPdf } from "../../utils/exportPdf";
import { useAuth } from "../../context/AuthContext";
import { downloadCsv } from "../../utils/csv";
import { transactionStatusLabel, transactionTypeLabel } from "../../utils/transactionLabels";
import { ClipboardListIcon, AlertCircleIcon, ChevronDownIcon } from "../../components/TransactionIcons";
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
  const { user: authUser } = useAuth();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [txStats, setTxStats] = useState({ total: 0, completed: 0, ongoing: 0, thisMonth: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txError, setTxError] = useState(null);
  const PAGE_SIZE = 20;

  // Mirrors `transactions` for the catch block below, without making
  // fetchTransactions depend on (and change identity with) the state itself.
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  // Drops out-of-order responses (fast page/filter changes).
  const requestIdRef = useRef(0);

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const typeBadgeClass = (type) =>
    ({
      appointment: "txn-badge txn-badge-appointment",
      document: "txn-badge txn-badge-document",
      submission: "txn-badge txn-badge-document",
    }[type] ?? "txn-badge");

  const typeLabel = transactionTypeLabel;

  const statusBadgeClass = (status) =>
    ({
      completed: "txn-badge txn-badge-completed",
      approved: "txn-badge txn-badge-approved",
      rejected: "txn-badge txn-badge-rejected",
      cancelled: "txn-badge txn-badge-cancelled",
      pending: "txn-badge txn-badge-pending",
      processing: "txn-badge txn-badge-processing",
      ready: "txn-badge txn-badge-ready",
      // Aliases so legacy status values still map to the "ready" badge.
      generated: "txn-badge txn-badge-ready",
      released: "txn-badge txn-badge-ready",
      claimed: "txn-badge txn-badge-claimed",
    }[status] ?? "txn-badge");

  const statusLabel = transactionStatusLabel;

  const buildParams = () => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterType !== "all") params.filterType = filterType;
    if (filterStatus !== "all") params.filterStatus = filterStatus;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  };

  const withLabels = (t) => ({
    ...t,
    dateLabel: t.date ? formatManilaDate(t.date, { month: "short", day: "numeric", year: "numeric" }) : "",
    timeLabel: t.date ? formatManilaTime(t.date) : "",
  });

  // No live/socket refresh on purpose -- a history log; refetches on mount
  // and whenever a filter/search/page changes.
  const fetchTransactions = async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await api.get("/professor/transactions", {
        params: { ...buildParams(), page, limit: PAGE_SIZE },
      });
      if (requestId !== requestIdRef.current) return;
      setTransactions((res.data.transactions ?? []).map(withLabels));
      setTotalPages(res.data.totalPages ?? 1);
      if (res.data.stats) setTxStats(res.data.stats);
      setTxError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch transactions:", err);
      if (transactionsRef.current.length === 0) {
        setTxError("Could not load your transaction history.");
      } else {
        toast.error("Could not refresh your transaction history.");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // Debounced 400ms so typing doesn't fire a request on every keystroke;
  // resets to page 1 together with the new term.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { fetchTransactions(); }, [debouncedSearch, filterType, filterStatus, startDate, endDate, page]);

  const hasActiveFilters =
    !!debouncedSearch || filterType !== "all" || filterStatus !== "all" || !!startDate || !!endDate;
  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Exports EVERYTHING matching the current filters/search (pages through the
  // endpoint at its 100/page max), not just the page on screen.
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
  const buildExportRow = (t) => [
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
  ];

  const fetchAllForExport = async () => {
    let all = [];
    let exportStats = txStats;
    let fetchPage = 1;
    let pages;
    do {
      const res = await api.get("/professor/transactions", {
        params: { ...buildParams(), page: fetchPage, limit: 100 },
      });
      all = all.concat((res.data.transactions ?? []).map(withLabels));
      if (res.data.stats) exportStats = res.data.stats;
      pages = res.data.totalPages ?? 1;
      fetchPage += 1;
    } while (fetchPage <= pages);
    return { rows: all.map(buildExportRow), exportStats };
  };

  const dateRangeLabel =
    startDate || endDate
      ? `${startDate || "…"} to ${endDate || "…"}`
      : "All Time";

  const buildSummaryRows = (st) => [
    ["Date Range", dateRangeLabel],
    ["Total", st.total],
    ["Completed", st.completed],
    ["Ongoing", st.ongoing],
    ["This Month", st.thisMonth],
  ];

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const { rows, exportStats } = await fetchAllForExport();
      downloadCsv(
        [...buildSummaryRows(exportStats), [], exportHeader, ...rows],
        `transactions-${getManilaDateString()}.csv`,
      );
    } catch (err) {
      console.error("Failed to export transactions:", err);
      toast.error("Could not export your transaction history.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { rows, exportStats } = await fetchAllForExport();
      exportTransactionsPdf({
        title: "Transaction History",
        subtitle: `${authUser?.name ?? "Professor"} — ${dateRangeLabel} — Generated ${getManilaDateString()}`,
        columns: exportHeader,
        rows,
        filename: `transactions-${getManilaDateString()}.pdf`,
        summary: buildSummaryRows(exportStats).map(([label, value]) => ({ label, value })),
      });
    } catch (err) {
      console.error("Failed to export transactions:", err);
      toast.error("Could not export your transaction history.");
    } finally {
      setIsExporting(false);
    }
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
                label={isExporting ? "Exporting…" : "Export"}
                disabled={isExporting || transactions.length === 0}
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
                    placeholder="Search by student name, ID, service, purpose, or tracking #..."
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
                  setPage(1);
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
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
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
                onStartChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                onEndChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                onClear={() => { setStartDate(""); setEndDate(""); setPage(1); }}
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
            ) : transactions.length === 0 ? (
              <div className="txn-empty">
                <ClipboardListIcon />
                {hasActiveFilters ? (
                  <>
                    <h3>No transactions match your filters</h3>
                    <button type="button" className="txn-clear-btn" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3>No Transactions Found</h3>
                    <p>You have no transaction records yet.</p>
                  </>
                )}
              </div>
            ) : (
              transactions.map((txn) => (
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
                    {txn.details && !(txn.title ?? "").includes(txn.details) && (
                      <p className="txn-item-details">
                        {txn.details}
                        {txn.type === "document" && txn.copies > 1 ? ` · ${txn.copies} copies` : ""}
                      </p>
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
          {!loading && !txError && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
    </ProfessorPageShell>
  );
}
