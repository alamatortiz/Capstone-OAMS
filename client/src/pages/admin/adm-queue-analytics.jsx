import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-queue-analytics.css";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import { toast } from "sonner";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useLiveRefetch } from "../../hooks/useLiveRefetch";
import { getManilaDateString } from "../../utils/dateTime";

// ── Icons ─────────────────────────────────────────────────────────────────────
const BarChartIcon = () => (
  <svg className="aqa-title-svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const AlarmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M5 3 2 6" />
    <path d="m22 6-3-3" />
    <path d="M6.38 18.7 4 21" />
    <path d="M17.64 18.67 20 21" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const UserXIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" y1="8" x2="22" y2="13" />
    <line x1="22" y1="8" x2="17" y2="13" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "all", label: "All Time" },
];

// A queue metric moves whenever a student is called / served / no-showed or a
// slot's lifecycle changes; useLiveRefetch also reconciles on socket reconnect.
const ANALYTICS_LIVE_EVENTS = [
  "queue:called",
  "queue:served",
  "queue:no-show",
  "queue:slot-status",
  "queue:student-joined",
  "queue:student-left",
];

export default function AdminQueueAnalytics() {
  const { user: authUser } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", college: "", departmentAbbrev: "CCS" };

  const [range, setRange] = useState("today");
  const [serviceType, setServiceType] = useState("All Services");
  const [serviceTypes, setServiceTypes] = useState(["All Services"]);
  const [totals, setTotals] = useState({
    accomplishedQueues: 0,
    overtimeQueues: 0,
    studentsServed: 0,
    noShows: 0,
    peakHour: "N/A",
  });
  const [byService, setByService] = useState([]);
  // Starts true so the first load shows a loading state; later refreshes
  // (filter change / socket / reconnect) update silently.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/admin/queue-analytics/summary", {
        params: { range, service: serviceType },
      });
      setTotals(res.data.totals);
      setByService(res.data.byService ?? []);
      if (res.data.serviceTypes) setServiceTypes(res.data.serviceTypes);
    } catch (err) {
      console.error("Queue analytics summary fetch error:", err);
      setError("Could not load queue analytics.");
    } finally {
      setLoading(false);
    }
  }, [range, serviceType]);

  // Initial + filter-driven fetch (fetchSummary changes identity with range /
  // serviceType), plus live socket updates + reconnect reconciliation.
  useEffect(() => {
    if (authUser) fetchSummary();
  }, [authUser, fetchSummary]);
  useLiveRefetch(ANALYTICS_LIVE_EVENTS, fetchSummary);

  const rangeLabel = range === "today" ? "Today" : "All time";

  // Prefixes a leading =/+/-/@ so spreadsheet apps treat the cell as text.
  const csvEscape = (value) => {
    let str = String(value ?? "");
    if (/^[=+\-@]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };
  const handleExport = () => {
    const header = ["Service", "Students Served", "Overtime Queues", "No-Shows", "Avg Wait (min)"];
    const rows = byService.map((r) => [
      r.service,
      r.studentsServed,
      r.overtimeQueues,
      r.noShows,
      r.avgWaitMinutes,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `queue-analytics-${range}-${getManilaDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  const statCards = [
    {
      label: "Accomplished Queues",
      value: totals.accomplishedQueues,
      icon: <CheckCircleIcon />,
      tone: "blue",
    },
    {
      label: "Overtime Queues",
      value: totals.overtimeQueues,
      icon: <AlarmIcon />,
      tone: "amber",
    },
    {
      label: "Students Served",
      value: totals.studentsServed,
      icon: <UsersIcon />,
      tone: "blue",
    },
    {
      label: "No-Shows",
      value: totals.noShows,
      icon: <UserXIcon />,
      tone: "red",
    },
    {
      label: "Peak Hour",
      value: totals.peakHour,
      icon: <ClockIcon />,
      tone: "blue",
      isText: true,
    },
  ];

  return (
    <AdminPageShell outerClassName="aqa-layout" mainClassName="aqa-main">
      <div className="aqa-content">
        <PageHeader
          breadcrumb={
            <Link to="/admin/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />
              Home
            </Link>
          }
          icon={<BarChartIcon />}
          iconClassName="aqa-title-icon"
          title="Queue Analytics"
          subtitle="Queue performance for your department."
          headerClassName="aqa-page-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="aqa-title-section"
          titleClassName="aqa-page-title"
          subtitleClassName="aqa-page-subtitle"
        />

        {/* Stat cards */}
        <div className="aqa-stats-grid">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`aqa-stat-card aqa-stat-${card.tone}`}
            >
              <div className={`aqa-stat-icon-box aqa-icon-box-${card.tone}`}>
                {card.icon}
              </div>
              <p className="aqa-stat-label">{card.label}</p>
              <p
                className={`aqa-stat-value aqa-val-${card.tone} ${card.isText ? "aqa-stat-value-text" : ""}`}
              >
                {loading ? "—" : card.value}
              </p>
              <p className="aqa-stat-sub">{rangeLabel}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="aqa-filters-card">
          <div className="aqa-filters-header">
            <div className="aqa-filters-header-text">
              <h3 className="aqa-filters-title">Analytics Filters</h3>
              <p className="aqa-filters-description">
                {user.college} ({user.departmentAbbrev})
              </p>
            </div>
            <button
              className="aqa-export-btn"
              onClick={handleExport}
              disabled={byService.length === 0}
            >
              <DownloadIcon />
              Export Report
            </button>
          </div>
          <div className="aqa-filters-grid">
            <FilterSelect
              id="aqa-filter-range"
              label="Time Range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={RANGE_OPTIONS}
              chevronIcon={<ChevronDownIcon className="filter-chevron" />}
            />
            <FilterSelect
              id="aqa-filter-service"
              label="Service Type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              options={serviceTypes.map((s) => ({ value: s, label: s }))}
              chevronIcon={<ChevronDownIcon className="filter-chevron" />}
            />
          </div>
        </div>

        {/* Per-service breakdown */}
        <div className="aqa-svc-list">
          <div className="aqa-svc-list-head">
            <h3 className="aqa-svc-list-title">Service Breakdown</h3>
            <p className="aqa-svc-list-sub">
              Per-service queue metrics — {rangeLabel.toLowerCase()}.
            </p>
          </div>

          {loading ? (
            <div className="aqa-empty-state">
              <BarChartIcon />
              <h3>Loading analytics…</h3>
            </div>
          ) : error ? (
            <div className="aqa-empty-state">
              <BarChartIcon />
              <h3>Could not load analytics</h3>
              <p>{error}</p>
            </div>
          ) : byService.length === 0 ? (
            <div className="aqa-empty-state">
              <BarChartIcon />
              <h3>No services yet</h3>
              <p>Your department has no queue services configured.</p>
            </div>
          ) : (
            byService.map((row) => (
              <div key={row.service} className="aqa-svc-card">
                <div className="aqa-svc-card-head">
                  <span className="aqa-svc-name">{row.service}</span>
                </div>
                <div className="aqa-svc-metrics">
                  <div className="aqa-svc-metric">
                    <span className="aqa-svc-metric-label">Students Served</span>
                    <span className="aqa-svc-metric-value aqa-val-blue">
                      {row.studentsServed}
                    </span>
                  </div>
                  <div className="aqa-svc-metric">
                    <span className="aqa-svc-metric-label">Overtime Queues</span>
                    <span className="aqa-svc-metric-value aqa-val-amber">
                      {row.overtimeQueues}
                    </span>
                  </div>
                  <div className="aqa-svc-metric">
                    <span className="aqa-svc-metric-label">No-Shows</span>
                    <span className="aqa-svc-metric-value aqa-val-red">
                      {row.noShows}
                    </span>
                  </div>
                  <div className="aqa-svc-metric">
                    <span className="aqa-svc-metric-label">Avg Wait</span>
                    <span className="aqa-svc-metric-value">
                      {row.avgWaitMinutes > 0 ? `${row.avgWaitMinutes} min` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
