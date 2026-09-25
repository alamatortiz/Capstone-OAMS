import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import collegeCCSLogo from "../../assets/CCS.png";
import collegeCBAALogo from "../../assets/CBAA.png";
import collegeCOElogo from "../../assets/COE.png";
import collegeCOEDlogo from "../../assets/COED.png";
import collegeCASlogo from "../../assets/CAS.png";
import collegeCHASlogo from "../../assets/CHAS.png";
import "./adm-transactions.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { getManilaDateString, formatManilaDate, formatManilaTime } from "../../utils/dateTime";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import FilterDateRange from "../../components/FilterDateRange";
import Pagination from "../../components/Pagination";
import ExportMenu from "../../components/ExportMenu";
import { exportTransactionsPdf } from "../../utils/exportPdf";
import { downloadCsv } from "../../utils/csv";
import { transactionStatusLabel, transactionTypeLabel } from "../../utils/transactionLabels";
import { ClipboardListIcon, AlertCircleIcon, ChevronDownIcon } from "../../components/TransactionIcons";
import { ADMIN_STATUSES_BY_TYPE, getStatusOptionsForType } from "../../data/transactionStatusOptions";

// ── Icons (all unchanged from admin_dashboard) ──────────────────────────────
const SearchIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);
const ActivityIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 12h-4l-3 9L9 3l-5 9H0"></path>
  </svg>
);
const UserGroupIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const CalendarIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const SettingsIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);
const CollegeLogoIcon = ({ collegeShortName }) => {
  const logoSrcMap = {
    CCS: collegeCCSLogo,
    CBAA: collegeCBAALogo,
    COE: collegeCOElogo,
    COED: collegeCOEDlogo,
    CAS: collegeCASlogo,
    CHAS: collegeCHASlogo,
  };

  const src = logoSrcMap[collegeShortName];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={collegeShortName}
      className="admin-transaction-college-logo"
      loading="lazy"
      style={{ width: "2rem", height: "2rem", objectFit: "contain" }}
    />
  );
};

// Scoped server-side to the logged-in admin's own department.

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "queue", label: "Queue" },
  { value: "document", label: "Document" },
  { value: "admin_action", label: "Admin Action" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready for Pickup" },
  { value: "claimed", label: "Claimed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "viewed", label: "Viewed (admin action: opened a record)" },
];
// Colleges CollegeLogoIcon actually has artwork for -- used to skip the logo
// (keeping the text label) for any transaction whose collegeAbbrev isn't one
// of these, instead of silently falling back to the CAS logo.
const KNOWN_COLLEGES = ["CCS", "CBAA", "COE", "COED", "CAS", "CHAS"];

export default function AdminTransaction() {
  const { user: authUser } = useAuth();

  // ── Transaction Page State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Transaction data (scoped + searched + paginated server-side) ─────────
  const [transactions, setTransactions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, queue: 0, documents: 0, adminActions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const requestIdRef = useRef(0);

  // Debounce the search box; reset to page 1 together with the new term.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const buildParams = () => ({
    type: filterType,
    status: filterStatus,
    search: debouncedSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // No live/socket refresh here on purpose -- this is a history log; it
  // refetches on mount and whenever a filter/search/page changes.
  const fetchTransactions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setError(null);
      const res = await api.get("/admin/transactions", {
        params: { ...buildParams(), page, limit: PAGE_SIZE },
      });
      if (requestId !== requestIdRef.current) return;
      setTransactions(res.data.transactions ?? []);
      setTotalPages(res.data.totalPages ?? 1);
      if (res.data.stats) setStats(res.data.stats);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch transactions:", err);
      setError("Could not load transaction data.");
      toast.error("Could not load transaction data");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, debouncedSearch, startDate, endDate, page]);

  useEffect(() => {
    if (authUser) fetchTransactions();
  }, [authUser, fetchTransactions]);

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

  // ── Badge Helpers ─────────────────────────────────────────────────────────
  const TYPE_BADGE_CONFIG = {
    queue: { color: "admin-transaction-badge-queue", label: "Queue" },
    document: {
      color: "admin-transaction-badge-document",
      label: "Document Request",
    },
    submission: {
      color: "admin-transaction-badge-document",
      label: "Document Submission",
    },
    admin_action: {
      color: "admin-transaction-badge-admin-action",
      label: "Admin Action",
    },
  };
  const getTypeLabel = transactionTypeLabel;

  const getTypeBadge = (type) => {
    const config = TYPE_BADGE_CONFIG[type] || {
      color: "admin-transaction-badge-document",
      label: getTypeLabel(type),
    };
    return (
      <span className={`admin-transaction-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status, type) => {
    const isDocument = type === "document" || type === "submission";
    const statusConfig = {
      completed: { color: "admin-transaction-badge-completed", label: "Completed" },
      cancelled: { color: "admin-transaction-badge-cancelled", label: "Cancelled" },
      no_show: { color: "admin-transaction-badge-noshow", label: "No Show" },
      approved: { color: "admin-transaction-badge-approved", label: "Approved" },
      rejected: {
        color: isDocument ? "admin-transaction-badge-doc-rejected" : "admin-transaction-badge-rejected",
        label: "Rejected",
      },
      pending: {
        color: isDocument ? "admin-transaction-badge-doc-pending" : "admin-transaction-badge-pending",
        label: "Pending",
      },
      processing: { color: "admin-transaction-badge-processing", label: "Processing" },
      ready: { color: "admin-transaction-badge-ready", label: transactionStatusLabel("ready") },
      // Aliases so legacy status values still map to the "Ready" badge.
      generated: { color: "admin-transaction-badge-ready", label: transactionStatusLabel("ready") },
      released: { color: "admin-transaction-badge-ready", label: transactionStatusLabel("ready") },
      claimed: { color: "admin-transaction-badge-claimed", label: "Claimed" },
      created: { color: "admin-transaction-badge-created", label: "Created" },
      updated: { color: "admin-transaction-badge-updated", label: "Updated" },
      deleted: { color: "admin-transaction-badge-cancelled", label: "Deleted" },
      viewed: { color: "admin-transaction-badge-processing", label: "Viewed" },
    };
    const config = statusConfig[status] || {
      color: "admin-transaction-badge-approved",
      label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    };
    return (
      <span className={`admin-transaction-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Type -> icon shown in the item's leading icon column.
  const getTypeIcon = (type) => {
    switch (type) {
      case "queue":
        return <UserGroupIcon />;
      case "admin_action":
        return <SettingsIcon />;
      case "document":
      case "submission":
      default:
        return <FileText />;
    }
  };

  // Type -> color for the student/professor ID badge and the tracking/queue
  // reference badge (both share the same pill shape and color rules).
  const getIdBadgeClass = (type) => {
    const map = {
      queue: "admin-transaction-id-badge-queue",
      document: "admin-transaction-id-badge-document",
      submission: "admin-transaction-id-badge-document",
    };
    return `admin-transaction-id-badge ${map[type] || "admin-transaction-id-badge-document"}`;
  };

  // ── Export: CSV/PDF of EVERYTHING matching the active filters/search --
  // pages through the same server endpoint (100/page max) rather than
  // exporting only the rows currently on screen. ───────────────────────────
  const exportHeader = [
    "Type", "Action", "Details", "Status", "College", "Student Name", "Student ID", "Processor", "Tracking #",
    "Date", "Time",
  ];
  const buildExportRow = (t) => [
    getTypeLabel(t.type),
    t.action,
    t.details,
    transactionStatusLabel(t.status),
    t.collegeAbbrev,
    t.studentName ?? "",
    t.studentId ?? "",
    t.processor ?? "",
    t.trackingNumber ?? "",
    t.date ? formatManilaDate(t.date, { month: "short", day: "numeric", year: "numeric" }) : "",
    t.date ? formatManilaTime(t.date) : "",
  ];

  const fetchAllForExport = async () => {
    let all = [];
    let exportStats = stats;
    let fetchPage = 1;
    let pages;
    do {
      const res = await api.get("/admin/transactions", {
        params: { ...buildParams(), page: fetchPage, limit: 100 },
      });
      all = all.concat(res.data.transactions ?? []);
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
    ["Total Transactions", st.total],
    ["Queue", st.queue],
    ["Documents", st.documents],
    ["Admin Actions", st.adminActions],
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
      toast.error("Could not export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { rows, exportStats } = await fetchAllForExport();
      exportTransactionsPdf({
        title: "Department Transaction Report",
        subtitle: `${authUser?.departmentName ?? "Department"} — ${dateRangeLabel} — Generated ${getManilaDateString()}`,
        columns: exportHeader,
        rows,
        filename: `transactions-${getManilaDateString()}.pdf`,
        summary: buildSummaryRows(exportStats).map(([label, value]) => ({ label, value })),
      });
    } catch (err) {
      console.error("Failed to export transactions:", err);
      toast.error("Could not export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminPageShell
      outerClassName="admin-transaction-with-sidebar"
      mainClassName="admin-transaction-main"
    >
        <div className="admin-transaction-container">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<ClipboardListIcon />}
            iconClassName="admin-transaction-title-icon"
            title="Transaction History"
            subtitle="View all recent transactions within the office."
            headerClassName="admin-transaction-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="admin-transaction-title-section"
            titleClassName="admin-transaction-title"
            subtitleClassName="admin-transaction-subtitle"
          />

          {/* Department Statistics */}
          <div className="admin-transaction-stats-grid">
            <div className="admin-transaction-stat-card">
              <div className="admin-transaction-stat-icon-box admin-transaction-icon-box-primary">
                <ClipboardListIcon />
              </div>
              <p className="admin-transaction-stat-label">Total Transactions</p>
              <p className="admin-transaction-stat-value admin-transaction-val-primary">
                {loading ? "—" : stats.total}
              </p>
            </div>

            <div className="admin-transaction-stat-card">
              <div className="admin-transaction-stat-icon-box admin-transaction-icon-box-blue">
                <UserGroupIcon />
              </div>
              <p className="admin-transaction-stat-label">Queue Services</p>
              <p className="admin-transaction-stat-value admin-transaction-val-blue">
                {loading ? "—" : stats.queue}
              </p>
            </div>

            <div className="admin-transaction-stat-card">
              <div className="admin-transaction-stat-icon-box admin-transaction-icon-box-orange">
                <FileText />
              </div>
              <p className="admin-transaction-stat-label">Documents</p>
              <p className="admin-transaction-stat-value admin-transaction-val-orange">
                {loading ? "—" : stats.documents}
              </p>
            </div>

            <div className="admin-transaction-stat-card">
              <div className="admin-transaction-stat-icon-box admin-transaction-icon-box-primary">
                <SettingsIcon />
              </div>
              <p className="admin-transaction-stat-label">Admin Actions</p>
              <p className="admin-transaction-stat-value admin-transaction-val-primary">
                {loading ? "—" : stats.adminActions}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <div className="filters-header-text">
                <h3 className="filters-title">Transaction Filter</h3>
                <p className="filters-description">
                  Search and filter department transactions.
                </p>
              </div>
              <ExportMenu
                triggerClassName="admin-transaction-export-btn"
                label={isExporting ? "Exporting…" : "Export Report"}
                disabled={isExporting || transactions.length === 0}
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
              />
            </div>
            <div className="filters-search-row">
              <div className="filter-group">
                <label className="filter-label" htmlFor="tx-search">
                  Search
                </label>
                <div className="filter-search-wrapper">
                  <SearchIcon />
                  <input
                    id="tx-search"
                    type="text"
                    className="filter-search-input"
                    placeholder="Search by student, processor, details, or tracking #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="filters-grid">
              <FilterSelect
                id="tx-filter-type"
                label="Type"
                value={filterType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setFilterType(nextType);
                  const allowedStatuses = ADMIN_STATUSES_BY_TYPE[nextType];
                  if (allowedStatuses && filterStatus !== "all" && !allowedStatuses.includes(filterStatus)) {
                    setFilterStatus("all");
                  }
                  setPage(1);
                }}
                options={TYPE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="tx-filter-status"
                label="Status"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                options={getStatusOptionsForType(STATUS_OPTIONS, ADMIN_STATUSES_BY_TYPE, filterType)}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
            <div className="filters-date-section">
              <FilterDateRange
                id="tx-filter-date-range"
                label="Date Range"
                startValue={startDate}
                endValue={endDate}
                onStartChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                onEndChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                onClear={() => { setStartDate(""); setEndDate(""); setPage(1); }}
              />
            </div>
          </div>

          {/* Transactions List */}
          <div className="admin-transaction-list">
              {loading ? (
                <div className="admin-transaction-empty-state">
                  <ActivityIcon />
                  <h3>Loading transactions…</h3>
                </div>
              ) : error ? (
                <div className="admin-transaction-empty-state">
                  <AlertCircleIcon />
                  <h3>Could not load transactions</h3>
                  <p>{error}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="admin-transaction-empty-state">
                  <ClipboardListIcon />
                  {hasActiveFilters ? (
                    <>
                      <h3>No transactions match your filters</h3>
                      <button type="button" className="admin-transaction-clear-btn" onClick={clearFilters}>
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>No Transactions Found</h3>
                      <p>There are no department transaction records yet.</p>
                    </>
                  )}
                </div>
              ) : (
                transactions.map((transaction) => {
                  const iconType =
                    transaction.type === "submission" ? "document" : transaction.type;
                  const refBadge =
                    transaction.type === "document" || transaction.type === "submission"
                      ? transaction.trackingNumber
                      : transaction.type === "queue"
                        ? transaction.queueNumberBadge
                        : null;
                  return (
                    <div
                      key={transaction.id}
                      className={`admin-transaction-item admin-transaction-item-${iconType}`}
                    >
                      <div className="admin-transaction-item-icon">
                        <span
                          className={`admin-transaction-icon-wrap admin-transaction-icon-${iconType}`}
                        >
                          {getTypeIcon(transaction.type)}
                        </span>
                      </div>

                      <div className="admin-transaction-item-content">
                        <div className="admin-transaction-item-header">
                          <div className="admin-transaction-item-title-group">
                            <h3 className="admin-transaction-item-title">
                              {transaction.action}
                            </h3>
                            {/* Reference/tracking number reads as part of the
                                title line, not a disconnected paragraph
                                further down the card. */}
                            {refBadge && (
                              <span className={getIdBadgeClass(transaction.type)}>
                                {refBadge}
                              </span>
                            )}
                          </div>
                          <div className="admin-transaction-item-badges">
                            {getTypeBadge(transaction.type)}
                            {getStatusBadge(transaction.status, transaction.type)}
                          </div>
                        </div>

                        <p className="admin-transaction-item-processor">
                          {transaction.processorRole === "admin"
                            ? `Processed by: ${/^admin\b/i.test(transaction.processor || "") ? transaction.processor : `Admin ${transaction.processor}`}`
                            : transaction.processorRole === "faculty"
                              ? `Processed by: ${/^faculty\b/i.test(transaction.processor || "") ? transaction.processor : `Faculty ${transaction.processor}`}`
                              : "Processed by: Not yet processed"}
                        </p>

                        <div className="admin-transaction-item-grid">
                          <div className="admin-transaction-item-college">
                            {KNOWN_COLLEGES.includes(transaction.collegeAbbrev) && (
                              <CollegeLogoIcon
                                collegeShortName={transaction.collegeAbbrev}
                              />
                            )}
                            <span className="admin-transaction-item-college-name">
                              {transaction.collegeAbbrev}
                            </span>
                          </div>
                          {transaction.studentName && (
                            <div className="admin-transaction-item-student">
                              <span className="admin-transaction-item-student-name">
                                {transaction.studentName}
                              </span>
                              <span className={getIdBadgeClass(transaction.type)}>
                                {transaction.studentId}
                              </span>
                              {transaction.requesterType === "faculty" && (
                                <span className="admin-transaction-badge-faculty">
                                  Faculty
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {transaction.type === "queue" && (
                          <p className="admin-transaction-item-service-type">
                            Service Type: {transaction.isUniversal
                              ? (transaction.serviceName && transaction.serviceName !== "Universal Service Queue"
                                  ? `Universal Service Queue – ${transaction.serviceName}`
                                  : "Universal Service Queue")
                              : transaction.serviceName}
                          </p>
                        )}
                        {(transaction.type === "document" || transaction.type === "submission") && transaction.requestType && (
                          <p className="admin-transaction-item-service-type">
                            Document Type: {transaction.requestType}
                          </p>
                        )}

                        {transaction.type === "queue" && transaction.adminReason && (
                          <p className="admin-transaction-item-details">
                            Reason: {transaction.adminReason}
                          </p>
                        )}
                        {transaction.type !== "queue" && transaction.details && (
                          <p className="admin-transaction-item-details">
                            {transaction.details}
                          </p>
                        )}
                      </div>

                      <div className="admin-transaction-item-meta">
                        <div className="admin-transaction-item-date">
                          <CalendarIcon />
                          {formatManilaDate(transaction.date, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="admin-transaction-item-time">
                          <ClockIcon />
                          {formatManilaTime(transaction.date)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {!loading && !error && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
        </div>
    </AdminPageShell>
  );
}
