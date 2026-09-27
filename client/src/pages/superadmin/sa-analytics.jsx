import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronDown, BarChart3, Users, Calendar, FileText } from "lucide-react";
// Supplies the .admin-dashboard-with-sidebar / .admin-dashboard-main shell
// classes. Lazy-loaded route, so it needs its own import.
import "../admin/adm-dashboard.css";
import "./sa-analytics.css";
import SuperadminPageShell from "../../components/SuperadminPageShell";
import PageHeader from "../../components/PageHeader";
import FilterDateRange from "../../components/FilterDateRange";
import FilterSelect from "../../components/FilterSelect";
import ExportMenu from "../../components/ExportMenu";
import { downloadCsv } from "../../utils/csv";
import { exportTransactionsPdf } from "../../utils/exportPdf";
import { getManilaDateString, formatManilaDate } from "../../utils/dateTime";
import api from "../../utils/api";

const DAY_MS = 24 * 60 * 60 * 1000;

function defaultRange() {
  const end = getManilaDateString();
  const start = getManilaDateString(new Date(new Date(`${end}T00:00:00+08:00`).getTime() - 29 * DAY_MS));
  return { start, end };
}

const fmtHour = (h) => (h == null ? "—" : `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`);
const fmtNum = (v, suffix = "") => (v == null ? "—" : `${v}${suffix}`);
const fmtDay = (d) => formatManilaDate(`${d}T00:00:00+08:00`, { year: undefined });

const TABS = [
  { key: "queues", label: "Queues", icon: Users },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "documents", label: "Documents", icon: FileText },
];

// ── Presentational pieces ────────────────────────────────────────────────────
function StatTile({ label, value, loading, text }) {
  return (
    <div className="saa-stat-card">
      <span className="saa-stat-label">{label}</span>
      <p className={`saa-stat-value ${text ? "saa-stat-value-text" : ""}`}>{loading ? "—" : value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="saa-chart-card">
      <h3 className="saa-chart-title">{title}</h3>
      {children}
    </section>
  );
}

function BarList({ items, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  const shown = items.filter((i) => i.count > 0);
  if (shown.length === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  const max = Math.max(...shown.map((i) => i.count));
  return (
    <ul className="saa-bar-list">
      {shown.map((i) => (
        <li key={i.label} className="saa-bar-row">
          <div className="saa-bar-meta">
            <span className="saa-bar-label" title={i.label}>{i.label}</span>
            <span className="saa-bar-count">{i.count}</span>
          </div>
          <div className="saa-bar-track">
            <div className="saa-bar-fill" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ daily, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  if (!daily || daily.length === 0) {
    return <p className="saa-chart-empty">Daily breakdown is available for ranges of 92 days or less.</p>;
  }
  const max = Math.max(...daily.map((d) => d.count));
  if (max === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  return (
    <div className="saa-daily">
      <div className="saa-daily-bars">
        {daily.map((d) => (
          <div key={d.date} className="saa-daily-col" title={`${fmtDay(d.date)}: ${d.count}`}>
            <div
              className="saa-daily-bar"
              style={{ height: `${d.count > 0 ? Math.max((d.count / max) * 100, 4) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="saa-daily-axis">
        <span>{fmtDay(daily[0].date)}</span>
        {daily.length > 1 && <span>{fmtDay(daily[daily.length - 1].date)}</span>}
      </div>
    </div>
  );
}

// ── Per-tab view model: tiles, charts, export rows ───────────────────────────
function buildTab(tab, d) {
  const toBars = (arr, key = "name") => (arr || []).map((r) => ({ label: r[key], count: r.count }));
  if (tab === "queues") {
    const q = d?.queues || {};
    const statusBars = [
      { label: "Completed", count: q.completed || 0 },
      { label: "Cancelled", count: q.cancelled || 0 },
      { label: "No-Show", count: q.noShows || 0 },
      { label: "Waiting", count: q.waiting || 0 },
    ];
    return {
      title: "Queue Activity",
      empty: "No queue activity in this range",
      tiles: [
        { label: "Joined", value: q.joined ?? 0 },
        { label: "Completed", value: q.completed ?? 0 },
        { label: "No-Shows", value: q.noShows ?? 0 },
        { label: "Avg Wait (min)", value: fmtNum(q.avgWaitMin) },
        { label: "Avg Service (min)", value: fmtNum(q.avgServiceMin) },
        { label: "Peak Hour", value: fmtHour(q.peakHour), text: true },
      ],
      byCollege: toBars(q.byCollege, "abbrev"),
      byStatus: statusBars,
      top: toBars(q.topServices),
      topTitle: "Top Services",
      daily: q.daily,
    };
  }
  if (tab === "appointments") {
    const a = d?.appointments || {};
    const s = a.byStatus || {};
    return {
      title: "Appointment Activity",
      empty: "No appointment activity in this range",
      tiles: [
        { label: "Total", value: a.total ?? 0 },
        { label: "Completed", value: s.completed ?? 0 },
        { label: "Pending", value: s.pending ?? 0 },
        { label: "Completion Rate", value: fmtNum(a.completionRate, "%") },
        { label: "No-Show Reports", value: a.noShowReports ?? 0 },
      ],
      byCollege: toBars(a.byCollege, "abbrev"),
      byStatus: [
        { label: "Pending", count: s.pending || 0 },
        { label: "Approved", count: s.approved || 0 },
        { label: "Completed", count: s.completed || 0 },
        { label: "Rejected", count: s.rejected || 0 },
        { label: "Cancelled", count: s.cancelled || 0 },
      ],
      top: toBars(a.topTypes),
      topTitle: "Top Appointment Types",
      daily: a.daily,
    };
  }
  const doc = d?.documents || {};
  const s = doc.byStatus || {};
  return {
    title: "Document Activity",
    empty: "No document activity in this range",
    tiles: [
      { label: "Total", value: doc.total ?? 0 },
      { label: "Claimed", value: s.claimed ?? 0 },
      { label: "Ready for Pickup", value: s.ready ?? 0 },
      { label: "Overdue", value: doc.overdue ?? 0 },
      { label: "Avg Days to Claim", value: fmtNum(doc.avgDaysToClaim) },
    ],
    byCollege: toBars(doc.byCollege, "abbrev"),
    byStatus: [
      { label: "Pending", count: s.pending || 0 },
      { label: "Processing", count: s.processing || 0 },
      { label: "Ready", count: s.ready || 0 },
      { label: "Claimed", count: s.claimed || 0 },
      { label: "Rejected", count: s.rejected || 0 },
      { label: "Cancelled", count: s.cancelled || 0 },
    ],
    top: toBars(doc.topTypes),
    topTitle: "Top Document Types",
    daily: doc.daily,
  };
}

export default function SystemAnalytics() {
  const initial = useMemo(defaultRange, []);
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [deptId, setDeptId] = useState("");
  const [tab, setTab] = useState("queues");
  const [data, setData] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  const rangeInvalid = !startDate || !endDate || startDate > endDate;

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/system-analytics", {
        params: { startDate, endDate, departmentId: deptId || undefined },
      });
      if (reqId !== reqIdRef.current) return;
      setData(res.data);
      if (Array.isArray(res.data?.colleges)) setColleges(res.data.colleges);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      console.error("Failed to load system analytics:", err);
      setError(err.response?.data?.error || "Could not load analytics.");
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [startDate, endDate, deptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearRange = () => {
    const r = defaultRange();
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const view = buildTab(tab, data);
  const busy = loading || !data;
  const collegeLabel = deptId
    ? colleges.find((c) => String(c.id) === String(deptId))?.abbrev || "Selected College"
    : "All Colleges";
  const rangeLabel = data ? `${data.startDate} to ${data.endDate}` : `${startDate} to ${endDate}`;

  const exportRows = () => {
    const rows = view.tiles.map((t) => ["Summary", t.label, String(t.value)]);
    view.byCollege.forEach((b) => rows.push(["By College", b.label, String(b.count)]));
    view.byStatus.forEach((b) => rows.push(["By Status", b.label, String(b.count)]));
    view.top.forEach((b) => rows.push([view.topTitle, b.label, String(b.count)]));
    return rows;
  };
  const fileBase = `oams-${tab}-analytics-${startDate}_to_${endDate}`;
  const handleExportCsv = () => {
    downloadCsv([["Section", "Metric", "Value"], ...exportRows()], `${fileBase}.csv`);
  };
  const handleExportPdf = () => {
    exportTransactionsPdf({
      title: `${view.title} Report`,
      subtitle: `${collegeLabel} · ${rangeLabel}`,
      columns: ["Section", "Metric", "Value"],
      rows: exportRows(),
      filename: `${fileBase}.pdf`,
      summary: view.tiles.map((t) => ({ label: t.label, value: String(t.value) })),
    });
  };

  const collegeOptions = [
    { value: "", label: "All Colleges" },
    ...colleges.map((c) => ({ value: String(c.id), label: `${c.abbrev} — ${c.name}` })),
  ];

  return (
    <SuperadminPageShell outerClassName="admin-dashboard-with-sidebar" mainClassName="admin-dashboard-main">
      <div className={`saa-content saa-accent-${tab}`}>
        <PageHeader
          breadcrumb={
            <Link to="/system/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />Home
            </Link>
          }
          icon={<BarChart3 />}
          iconClassName="saa-title-icon"
          title="Analytics"
          subtitle="University-wide queue, appointment and document activity."
          headerClassName="saa-page-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="saa-title-section"
          titleClassName="saa-page-title"
          subtitleClassName="saa-page-subtitle"
        />

        <section className="saa-filters-card">
          <div className="saa-filters-header">
            <div>
              <h2 className="saa-filters-title">Filters</h2>
              <p className="saa-filters-description">Narrow the report by date range and college.</p>
            </div>
            <ExportMenu
              triggerClassName="saa-export-btn"
              disabled={busy || !!error}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
            />
          </div>
          <div className="saa-filters-grid">
            <FilterDateRange
              id="saa-range"
              startValue={startDate}
              endValue={endDate}
              onStartChange={(e) => setStartDate(e.target.value)}
              onEndChange={(e) => setEndDate(e.target.value)}
              onClear={handleClearRange}
            />
            <FilterSelect
              id="saa-college"
              label="College"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              options={collegeOptions}
              ariaLabel="Filter by college"
              chevronIcon={<ChevronDown className="filter-chevron" />}
            />
          </div>
          {rangeInvalid ? (
            <p className="saa-range-label saa-range-invalid">Pick a valid start and end date.</p>
          ) : (
            <p className="saa-range-label">
              Showing {collegeLabel} · {rangeLabel}
            </p>
          )}
        </section>

        <div className="saa-tabs" role="tablist" aria-label="Analytics category">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`saa-tab saa-tab-${t.key} ${tab === t.key ? "saa-tab-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon />
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="saa-error">
            <p>{error}</p>
            <button type="button" className="saa-retry-btn" onClick={fetchData}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="saa-stats-grid">
              {view.tiles.map((t) => (
                <StatTile key={t.label} label={t.label} value={t.value} loading={busy} text={t.text} />
              ))}
            </div>

            <div className="saa-charts-grid">
              <ChartCard title="By College">
                <BarList items={view.byCollege} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title="By Status">
                <BarList items={view.byStatus} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title={view.topTitle}>
                <BarList items={view.top} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title="Daily Activity">
                <DailyChart daily={view.daily} loading={busy} emptyText={view.empty} />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </SuperadminPageShell>
  );
}
