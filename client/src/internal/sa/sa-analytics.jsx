import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronDown, BarChart3, Users, Calendar, FileText } from "lucide-react";
// Supplies the .admin-dashboard-with-sidebar / .admin-dashboard-main shell
// classes. Lazy-loaded route, so it needs its own import.
import "../../pages/admin/adm-dashboard.css";
import "./sa-analytics.css";
import SuperadminPageShell from "./SuperadminPageShell";
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

// Status colors shared by the donut and the stacked bars, so a status is the
// same color everywhere on the page.
const STATUS_COLORS = {
  completed: "#10b981", claimed: "#10b981",
  approved: "#3b82f6", processing: "#3b82f6", serving: "#3b82f6",
  pending: "#f59e0b", waiting: "#f59e0b",
  ready: "#8b5cf6",
  rejected: "#ef4444", no_show: "#ef4444",
  cancelled: "#94a3b8",
};
const STATUS_LABELS = {
  completed: "Completed", claimed: "Claimed", approved: "Approved", processing: "Processing",
  serving: "Serving", pending: "Pending", waiting: "Waiting", ready: "Ready for Pickup",
  rejected: "Rejected", no_show: "No-Show", cancelled: "Cancelled",
};

// Hours → a readable duration ("35 min", "5.2 hrs", "3.1 days").
function fmtDuration(hours) {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} hrs`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

// Pie/donut drawn with a CSS conic-gradient -- no chart library.
function DonutChart({ segments, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  const shown = segments.filter((s) => s.count > 0);
  const total = shown.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  let acc = 0;
  const stops = shown.map((s) => {
    const from = (acc / total) * 360;
    acc += s.count;
    return `${s.color} ${from}deg ${(acc / total) * 360}deg`;
  });
  return (
    <div className="saa-donut-wrap">
      <div className="saa-donut" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <div className="saa-donut-hole">
          <span className="saa-donut-total">{total}</span>
          <span className="saa-donut-caption">Total</span>
        </div>
      </div>
      <ul className="saa-legend">
        {shown.map((s) => (
          <li key={s.label}>
            <span className="saa-legend-dot" style={{ background: s.color }} />
            <span className="saa-legend-label">{s.label}</span>
            <span className="saa-legend-value">
              {s.count} <em>({Math.round((s.count / total) * 100)}%)</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Line + area trend drawn as inline SVG.
function LineChart({ daily, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  if (!daily || daily.length === 0) {
    return <p className="saa-chart-empty">Daily breakdown is available for ranges of 92 days or less.</p>;
  }
  const max = Math.max(...daily.map((d) => d.count));
  if (max === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  const W = 300, H = 120, PAD = 6;
  const x = (i) => (daily.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (daily.length - 1));
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = daily.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");
  const area = `${x(0)},${H - PAD} ${pts} ${x(daily.length - 1)},${H - PAD}`;
  const peak = daily.reduce((a, b) => (b.count > a.count ? b : a));
  return (
    <div className="saa-line">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="saa-line-svg" role="img"
        aria-label={`Daily activity, peak ${peak.count} on ${fmtDay(peak.date)}`}>
        <polygon points={area} className="saa-line-area" />
        <polyline points={pts} className="saa-line-stroke" />
        {daily.map((d, i) => d.count > 0 && (
          <circle key={d.date} cx={x(i)} cy={y(d.count)} r="2.2" className="saa-line-dot">
            <title>{`${fmtDay(d.date)}: ${d.count}`}</title>
          </circle>
        ))}
      </svg>
      <div className="saa-daily-axis">
        <span>{fmtDay(daily[0].date)}</span>
        <span className="saa-line-peak">Peak: {peak.count} on {fmtDay(peak.date)}</span>
        {daily.length > 1 && <span>{fmtDay(daily[daily.length - 1].date)}</span>}
      </div>
    </div>
  );
}

// 24 columns, one per hour of the day (Manila time).
function HourlyChart({ hourly, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  const max = Math.max(0, ...(hourly || []).map((h) => h.count));
  if (max === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  return (
    <div className="saa-daily">
      <div className="saa-daily-bars">
        {hourly.map((h) => (
          <div key={h.hour} className="saa-daily-col" title={`${fmtHour(h.hour)}: ${h.count}`}>
            <div className="saa-daily-bar" style={{ height: `${h.count > 0 ? Math.max((h.count / max) * 100, 4) : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="saa-daily-axis">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
      </div>
    </div>
  );
}

// One bar per college, split into status segments.
function StackedBars({ rows, loading, emptyText }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  if (!rows || rows.length === 0) return <p className="saa-chart-empty">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const used = [...new Set(rows.flatMap((r) => Object.keys(r.segments)))];
  return (
    <div>
      <ul className="saa-bar-list">
        {rows.map((r) => (
          <li key={r.abbrev} className="saa-bar-row">
            <div className="saa-bar-meta">
              <span className="saa-bar-label">{r.abbrev}</span>
              <span className="saa-bar-count">{r.total}</span>
            </div>
            <div className="saa-bar-track">
              <div className="saa-stack" style={{ width: `${(r.total / max) * 100}%` }}>
                {Object.entries(r.segments).map(([st, n]) => (
                  <div key={st} className="saa-stack-seg"
                    style={{ flex: n, background: STATUS_COLORS[st] || "#94a3b8" }}
                    title={`${STATUS_LABELS[st] || st}: ${n}`} />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ul className="saa-legend saa-legend-inline">
        {used.map((st) => (
          <li key={st}>
            <span className="saa-legend-dot" style={{ background: STATUS_COLORS[st] || "#94a3b8" }} />
            <span className="saa-legend-label">{STATUS_LABELS[st] || st}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Circular progress ring for a single percentage.
function ProgressRing({ percent, label, sub, loading }) {
  if (loading) return <p className="saa-chart-empty">Loading…</p>;
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="saa-ring-wrap">
      <svg viewBox="0 0 120 120" className="saa-ring" role="img" aria-label={`${label}: ${p}%`}>
        <circle cx="60" cy="60" r={R} className="saa-ring-track" />
        <circle cx="60" cy="60" r={R} className="saa-ring-fill"
          strokeDasharray={C} strokeDashoffset={C - (p / 100) * C} transform="rotate(-90 60 60)" />
        <text x="60" y="58" textAnchor="middle" className="saa-ring-value">{p}%</text>
        <text x="60" y="76" textAnchor="middle" className="saa-ring-caption">{label}</text>
      </svg>
      {sub && <p className="saa-ring-sub">{sub}</p>}
    </div>
  );
}

function TimeStats({ items, loading }) {
  return (
    <div className="saa-time-grid">
      {items.map((t) => (
        <div key={t.label} className="saa-time-card">
          <span className="saa-time-label">{t.label}</span>
          <span className="saa-time-value">{loading ? "—" : t.value}</span>
          <span className="saa-time-hint">{t.hint}</span>
        </div>
      ))}
    </div>
  );
}

// ── Per-tab view model: tiles, charts, export rows ───────────────────────────
function buildTab(tab, d) {
  const toBars = (arr, key = "name") => (arr || []).map((r) => ({ label: r[key], count: r.count }));
  const seg = (key, count) => ({ label: STATUS_LABELS[key], count: count || 0, color: STATUS_COLORS[key] });
  if (tab === "queues") {
    const q = d?.queues || {};
    const statusBars = [
      seg("completed", q.completed),
      seg("cancelled", q.cancelled),
      seg("no_show", q.noShows),
      seg("waiting", q.waiting),
    ];
    const finished = (q.completed || 0) + (q.noShows || 0);
    return {
      timeStats: [
        { label: "Avg Wait", value: q.avgWaitMin == null ? "—" : `${q.avgWaitMin} min`, hint: "Joined → called" },
        { label: "Avg Service Time", value: q.avgServiceMin == null ? "—" : `${q.avgServiceMin} min`, hint: "Called → done" },
        { label: "Busiest Hour", value: fmtHour(q.peakHour), hint: "Most students joining" },
      ],
      stacked: q.byCollegeStatus,
      hourly: q.hourly,
      ring: {
        percent: finished > 0 ? Math.round(((q.completed || 0) / finished) * 100) : 0,
        label: "Served", title: "Served Rate",
        sub: finished > 0 ? `${q.completed || 0} of ${finished} called students were served` : "No students called yet",
      },
      title: "Queue Activity",
      empty: "No queue activity in this range",
      tiles: [
        { label: "Joined", value: q.joined ?? 0 },
        { label: "Completed", value: q.completed ?? 0 },
        { label: "No-Shows", value: q.noShows ?? 0 },
        { label: "Cancelled", value: q.cancelled ?? 0 },
        { label: "Still Waiting", value: q.waiting ?? 0 },
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
      timeStats: [
        { label: "Avg Response Time", value: fmtDuration(a.avgResponseHours), hint: "Requested → approved" },
        { label: "Avg Time to Complete", value: fmtDuration(a.avgApprovedToCompletedHours), hint: "Approved → completed" },
        { label: "Avg Turnaround", value: fmtDuration(a.avgTurnaroundHours), hint: "Requested → completed" },
      ],
      stacked: a.byCollegeStatus,
      ring: {
        percent: a.completionRate ?? 0,
        label: "Completed", title: "Completion Rate",
        sub: a.total ? `${s.completed || 0} of ${a.total} appointments completed` : "No appointments yet",
      },
      title: "Appointment Activity",
      empty: "No appointment activity in this range",
      tiles: [
        { label: "Total", value: a.total ?? 0 },
        { label: "Completed", value: s.completed ?? 0 },
        { label: "Pending", value: s.pending ?? 0 },
        { label: "Approved", value: s.approved ?? 0 },
        { label: "No-Show Reports", value: a.noShowReports ?? 0 },
      ],
      byCollege: toBars(a.byCollege, "abbrev"),
      byStatus: ["pending", "approved", "completed", "rejected", "cancelled"].map((k) => seg(k, s[k])),
      top: toBars(a.topTypes),
      topTitle: "Top Appointment Types",
      daily: a.daily,
    };
  }
  const doc = d?.documents || {};
  const s = doc.byStatus || {};
  const decided = (s.claimed || 0) + (s.rejected || 0) + (s.cancelled || 0);
  return {
    timeStats: [
      { label: "Avg Processing Time", value: fmtDuration(doc.avgProcessingHours), hint: "Requested → ready for pickup" },
      { label: "Avg Pickup Wait", value: fmtDuration(doc.avgPickupWaitHours), hint: "Ready → claimed" },
      { label: "Avg Total Time", value: doc.avgDaysToClaim == null ? "—" : fmtDuration(doc.avgDaysToClaim * 24), hint: "Requested → claimed" },
    ],
    stacked: doc.byCollegeStatus,
    ring: {
      percent: decided > 0 ? Math.round(((s.claimed || 0) / decided) * 100) : 0,
      label: "Claimed", title: "Claim Rate",
      sub: decided > 0 ? `${s.claimed || 0} of ${decided} finished requests were claimed` : "No finished requests yet",
    },
    title: "Document Activity",
    empty: "No document activity in this range",
    tiles: [
      { label: "Total", value: doc.total ?? 0 },
      { label: "Claimed", value: s.claimed ?? 0 },
      { label: "Ready for Pickup", value: s.ready ?? 0 },
      { label: "Overdue", value: doc.overdue ?? 0 },
      { label: "In Progress", value: (s.pending || 0) + (s.processing || 0) },
    ],
    byCollege: toBars(doc.byCollege, "abbrev"),
    byStatus: ["pending", "processing", "ready", "claimed", "rejected", "cancelled"].map((k) => seg(k, s[k])),
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
    view.timeStats.forEach((t) => rows.push(["Time Statistics", `${t.label} (${t.hint})`, String(t.value)]));
    rows.push(["Rate", view.ring.title, `${view.ring.percent}%`]);
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

            <h3 className="saa-section-title">Time Statistics</h3>
            <TimeStats items={view.timeStats} loading={busy} />

            <div className="saa-charts-grid">
              <ChartCard title="By Status">
                <DonutChart segments={view.byStatus} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title={view.ring.title}>
                <ProgressRing percent={view.ring.percent} label={view.ring.label} sub={view.ring.sub} loading={busy} />
              </ChartCard>
              <ChartCard title="By College (by status)">
                <StackedBars rows={view.stacked} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title={view.topTitle}>
                <BarList items={view.top} loading={busy} emptyText={view.empty} />
              </ChartCard>
              <ChartCard title="Daily Trend">
                <LineChart daily={view.daily} loading={busy} emptyText={view.empty} />
              </ChartCard>
              {tab === "queues" && (
                <ChartCard title="Busiest Hours of the Day">
                  <HourlyChart hourly={view.hourly} loading={busy} emptyText={view.empty} />
                </ChartCard>
              )}
            </div>
          </>
        )}
      </div>
    </SuperadminPageShell>
  );
}
