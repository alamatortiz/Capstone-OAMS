import { useState, useEffect, useCallback } from "react";
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
import { getManilaDateString } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import Pagination from "../../components/Pagination";

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
const ClipboardListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
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
const CollegeLogoIcon = ({ collegeShortName }) => {
  const logoSrcMap = {
    CCS: collegeCCSLogo,
    CBAA: collegeCBAALogo,
    COE: collegeCOElogo,
    COED: collegeCOEDlogo,
    CAS: collegeCASlogo,
    CHAS: collegeCHASlogo,
  };

  const src = logoSrcMap[collegeShortName] ?? collegeCASlogo;

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

const DownloadIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
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

// Transactions now come live from GET /api/admin/transactions, scoped
// server-side to the logged-in admin's own department. No static data.

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "queue", label: "Queue" },
  { value: "appointment", label: "Appointment" },
  { value: "document", label: "Document" },
  { value: "submission", label: "Sent Document" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "generated", label: "Ready" },
  { value: "released", label: "Released" },
  { value: "claimed", label: "Claimed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];
const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export default function AdminTransaction() {
  const { user: authUser, token } = useAuth();

  // ── Transaction Page State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Live transaction data (scoped server-side to admin's department) ─────
  const [transactions, setTransactions] = useState([]);
  const [txnStats, setTxnStats] = useState({
    total: 0,
    queue: 0,
    appointments: 0,
    documents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/admin/transactions", {
        params: {
          type: filterType,
          status: filterStatus,
          range: dateRange,
        },
      });
      setTransactions(res.data.transactions ?? []);
      setTxnStats(
        res.data.stats ?? { total: 0, queue: 0, appointments: 0, documents: 0 },
      );
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Could not load transaction data.");
      toast.error("Could not load transaction data");
    }
  }, [filterType, filterStatus, dateRange]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchTransactions();
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchTransactions]);

  // ── Live updates: this log previously only refreshed on filter change or
  // manual reload, unlike the rest of the socket-driven queue feature area —
  // a queue/appointment/document event elsewhere wouldn't show up here until
  // the admin changed a filter. A lightweight refetch-on-event is enough
  // (this view doesn't need per-second freshness, just eventual consistency).
  useEffect(() => {
    if (!authUser || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const events = [
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:student-joined",
      "queue:student-left",
      "appointment:status-updated",
      "document:status-updated",
      "document:cancelled",
    ];
    events.forEach((event) => socket.on(event, fetchTransactions));
    return () => {
      events.forEach((event) => socket.off(event, fetchTransactions));
    };
  }, [authUser, token, fetchTransactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // ── Statistics (computed server-side over the admin's full department) ───
  const stats = txnStats;

  // ── Filter Transactions ───────────────────────────────────────────────────
  // type/status filters are applied server-side (re-fetched via fetchTransactions
  // whenever they change); search is applied client-side over the current page.
  const filteredTransactions = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      t.studentName?.toLowerCase().includes(q) ||
      t.studentId?.toLowerCase().includes(q) ||
      t.processor?.toLowerCase().includes(q) ||
      t.details?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTransactions = filteredTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Badge Helpers ─────────────────────────────────────────────────────────
  const getTypeBadge = (type) => {
    const typeConfig = {
      queue: { color: "admin-transaction-badge-queue", label: "Queue" },
      appointment: {
        color: "admin-transaction-badge-appointment",
        label: "Appointment",
      },
      document: {
        color: "admin-transaction-badge-document",
        label: "Document",
      },
      submission: {
        color: "admin-transaction-badge-document",
        label: "Sent Document",
      },
    };
    const config = typeConfig[type] || {
      color: "admin-transaction-badge-document",
      label: type ? type.charAt(0).toUpperCase() + type.slice(1) : "Unknown",
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
      generated: { color: "admin-transaction-badge-generated", label: "Ready" },
      released: { color: "admin-transaction-badge-released", label: "Released" },
      claimed: { color: "admin-transaction-badge-claimed", label: "Claimed" },
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

  // ── Export (client-side CSV of whatever currently matches the active
  // filters, mirroring the professor transactions page's export) ───────────
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const handleExport = () => {
    const header = ["Type", "Action", "Details", "Status", "College", "Student Name", "Student ID", "Processor", "Timestamp"];
    const rows = filteredTransactions.map((t) => [
      t.type, t.action, t.details, t.status, t.collegeAbbrev, t.studentName, t.studentId, t.processor, t.timestamp,
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
            subtitle="View all recent transactions within the office"
            headerClassName="admin-transaction-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="admin-transaction-title-section"
            titleClassName="admin-transaction-title"
            subtitleClassName="admin-transaction-subtitle"
          />

          {error && (
            <div className="dash-error-banner" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

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
              <div className="admin-transaction-stat-icon-box admin-transaction-icon-box-purple">
                <CalendarIcon />
              </div>
              <p className="admin-transaction-stat-label">Appointments</p>
              <p className="admin-transaction-stat-value admin-transaction-val-purple">
                {loading ? "—" : stats.appointments}
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
              <button
                className="admin-transaction-export-btn"
                onClick={handleExport}
                disabled={filteredTransactions.length === 0}
              >
                <DownloadIcon />
                Export Report
              </button>
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
                    className="filter-search-input"
                    placeholder="Search by student, processor, or details..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              <FilterSelect
                id="tx-filter-type"
                label="Type"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                options={TYPE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="tx-filter-status"
                label="Status"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                options={STATUS_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="tx-filter-date-range"
                label="Date Range"
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                options={DATE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
          </div>

          {/* Transactions List */}
          <div className="admin-transaction-list">
              {loading ? (
                <div className="admin-transaction-empty-state">
                  <ActivityIcon />
                  <p>Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="admin-transaction-empty-state">
                  <ActivityIcon />
                  <p>No transactions found</p>
                </div>
              ) : (
                pagedTransactions.map((transaction) => {
                  return (
                    <div
                      key={transaction.id}
                      className="admin-transaction-item"
                    >
                      <div className="admin-transaction-item-content">
                        <div className="admin-transaction-item-badges">
                          {getTypeBadge(transaction.type)}
                          {getStatusBadge(transaction.status, transaction.type)}
                          <span className="admin-transaction-item-action">
                            {transaction.action}
                          </span>
                        </div>

                        <div className="admin-transaction-item-grid">
                          <div className="admin-transaction-item-college">
                            <CollegeLogoIcon
                              collegeShortName={transaction.collegeAbbrev}
                            />
                            <span className="admin-transaction-item-college-name">
                              {transaction.collegeAbbrev}
                            </span>
                          </div>
                          <div className="admin-transaction-item-student">
                            <UserGroupIcon />
                            <span className="admin-transaction-item-student-name">
                              {transaction.studentName}
                            </span>
                            <span className="admin-transaction-item-student-id">
                              ({transaction.studentId})
                            </span>
                            {transaction.requesterType === "faculty" && (
                              <span className="admin-transaction-badge-faculty">
                                Faculty
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="admin-transaction-item-details">
                          {transaction.details}
                        </p>
                        <p className="admin-transaction-item-processor">
                          Processed by: {transaction.processor}
                        </p>
                      </div>

                      <div className="admin-transaction-item-timestamp">
                        <CalendarIcon />
                        <span>{transaction.timestamp}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
    </AdminPageShell>
  );
}
