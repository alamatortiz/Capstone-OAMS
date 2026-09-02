import { useState, useEffect, useCallback, useRef } from "react";
import StudentPageShell from "../../components/StudentPageShell";
import {
  QueueIconNav,
  CalendarIconNav,
} from "../../components/StudentSidebar";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import ExportMenu from "../../components/ExportMenu";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import "./stud-transactions.css";
import api from "../../utils/api";
import { formatManilaDate, getManilaDateString } from "../../utils/dateTime";
import { exportTransactionsPdf } from "../../utils/exportPdf";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [txStats, setTxStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    thisMonth: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Debounce the search box so every keystroke doesn't trigger a refetch.
  // setPage(1) is batched together with setDebouncedSearch here (React 19
  // batches state updates from timeouts, not just event handlers) so a
  // filter change never fetches an out-of-range page from a prior search.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
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

  // Guards against out-of-order responses: e.g. clicking page 2 then page 3
  // quickly would otherwise let page 2's slower response land after page
  // 3's and overwrite it. Each call captures the current token; a response
  // is only applied if its token is still the latest by the time it resolves.
  const requestIdRef = useRef(0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // Search/type/status filtering happens server-side (so it considers the
  // student's whole history, not just whatever page is currently loaded).
  // `page` is part of this callback's identity, so both a filter change and
  // a Pagination click go through the same effect below; filter changes
  // reset `page` back to 1 at their call site (see the FilterSelect
  // onChange handlers and the search-debounce effect above).
  const fetchTransactions = useCallback(
    async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await api.get("/student/transactions", {
          params: {
            search: debouncedSearch || undefined,
            type: filterType !== "all" ? filterType : undefined,
            status: filterStatus !== "all" ? filterStatus : undefined,
            limit: PAGE_SIZE,
            page,
          },
        });
        if (requestId !== requestIdRef.current) return;
        setTransactions(res.data.transactions ?? []);
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
        if (requestId === requestIdRef.current) setTxLoading(false);
      }
    },
    [debouncedSearch, filterType, filterStatus, page],
  );

  // ── Export (CSV/PDF of everything matching the current filters, not just
  // the current page -- mirrors prof/admin's export, adapted for this page's
  // server-side pagination by issuing its own request at the server's max
  // page size instead of reading the paginated `transactions` state). Note:
  // `limit: 100` is this endpoint's own hard cap (see studentRoutes.js), so
  // a student with more than 100 transactions matching the active filter
  // would still only get the first 100 -- accepted as a rare edge case
  // rather than plumbing a raise-the-cap/paginated-export path for it. Both
  // formats share this one fetch so a future column change only has to be
  // made once. ──────────────────────────────────────────────────────────
  const header = ["Type", "Title", "Details", "Status", "College", "Date", "Time"];
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const fetchExportRows = async () => {
    const res = await api.get("/student/transactions", {
      params: {
        search: debouncedSearch || undefined,
        type: filterType !== "all" ? filterType : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        limit: 100,
        page: 1,
      },
    });
    return (res.data.transactions ?? []).map((t) => [
      t.type, t.title, t.details, t.status, t.college, t.date, t.time,
    ]);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const rows = await fetchExportRows();
      const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${getManilaDateString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
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
      const rows = await fetchExportRows();
      exportTransactionsPdf({
        title: "Transaction History",
        subtitle: `${user?.name ?? "Student"} — Generated ${getManilaDateString()}`,
        columns: header,
        rows,
        filename: `transactions-${getManilaDateString()}.pdf`,
      });
    } catch (err) {
      console.error("Failed to export transactions:", err);
      toast.error("Could not export your transaction history.");
    } finally {
      setIsExporting(false);
    }
  };

  // Fresh load whenever the page mounts, the search/type/status filters
  // change, or the user navigates to a different page (fetchTransactions'
  // identity changes with all of them).
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Queue events (and document:cancelled) are broadcast department-wide, not
  // just to the affected student, so they're checked against this student's
  // own ID before refetching — otherwise this page would refetch every time
  // ANY student in the department got called/served/etc.
  const handleOwnQueueEvent = useCallback(
    (payload) => {
      if (Number(payload?.studentId) === Number(user?.userId)) {
        fetchTransactions();
      }
    },
    [fetchTransactions, user?.userId],
  );

  // ── Live updates: refetch when a document/appointment status changes, or
  // one of this student's own queue events fires. Refetches whatever page
  // is currently being viewed, rather than forcing the user back to page 1. ─
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refetchCurrentPage = () => fetchTransactions();
    const ownEvents = ["document:status-updated", "appointment:status-updated"];
    const deptWideEvents = [
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:student-joined",
      "queue:student-left",
      "document:cancelled",
    ];

    ownEvents.forEach((event) => socket.on(event, refetchCurrentPage));
    deptWideEvents.forEach((event) => socket.on(event, handleOwnQueueEvent));

    return () => {
      ownEvents.forEach((event) => socket.off(event, refetchCurrentPage));
      deptWideEvents.forEach((event) => socket.off(event, handleOwnQueueEvent));
    };
  }, [fetchTransactions, handleOwnQueueEvent, token]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchTransactions();
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
      case "submission":
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
      case "submission":
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
            iconClassName="tx-title-icon"
            title="Transaction History"
            subtitle="View all your activities and transactions."
            headerClassName="tx-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="tx-title-section"
            titleClassName="tx-title"
            subtitleClassName="tx-subtitle"
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
              <div className="filters-header-text">
                <h3 className="filters-title">Transaction Filter</h3>
                <p className="filters-description">
                  Search and filter your transactions.
                </p>
              </div>
              <ExportMenu
                triggerClassName="tx-export-btn"
                label={isExporting ? "Exporting…" : "Export"}
                disabled={isExporting || transactions.length === 0}
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
              />
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
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "queue", label: "Queue" },
                  { value: "appointment", label: "Appointment" },
                  { value: "document", label: "Document" },
                  { value: "submission", label: "Sent Document" },
                ]}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />

              <FilterSelect
                id="tx-status-select"
                label="Status"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
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

          {!txLoading && !txError && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
    </StudentPageShell>
  );
}
