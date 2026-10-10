import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BarChart3, RefreshCw, Star, Clock, Calendar, FileText, UserCog } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SuperadminPageShell from "./SuperadminPageShell";
import api from "../../utils/api";
import { getManilaDateString } from "../../utils/dateTime";
// Reuses the admin dashboard's stylesheet (welcome-banner / stat-card /
// quick-action classes scoped under .admin-dashboard); sa-dashboard.css only
// holds the few additions this page needs.
import "../../pages/admin/adm-dashboard.css";
import "./sa-dashboard.css";

const quickActions = [
  {
    icon: UserCog,
    iconColor: "bg-green-500",
    title: "User Management",
    description: "Search and suspend accounts",
    path: "/system/users",
  },
  {
    icon: BarChart3,
    iconColor: "bg-blue-500",
    title: "Analytics",
    description: "University-wide queue, appointment and document activity",
    path: "/system/analytics",
  },
  {
    icon: RefreshCw,
    iconColor: "bg-orange-500",
    title: "Manual Sync",
    description: "Synchronize accounts with the university system",
    path: "/system/sync",
  },
  {
    icon: Star,
    iconColor: "bg-purple-500",
    title: "Satisfaction Survey",
    description: "Link students to an external satisfaction survey",
    path: "/system/survey",
  },
];

export default function SystemDashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const name = authUser?.name || "System Administrator";

  const [userStats, setUserStats] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  const fetchStats = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    const today = getManilaDateString();
    const [usersRes, todayRes] = await Promise.allSettled([
      api.get("/admin/pinnacle-sync/stats"),
      api.get("/admin/system-analytics", { params: { startDate: today, endDate: today } }),
    ]);
    if (reqId !== reqIdRef.current) return;
    if (usersRes.status === "fulfilled") setUserStats(usersRes.value.data);
    if (todayRes.status === "fulfilled") setTodayStats(todayRes.value.data);
    const failed = usersRes.status === "rejected" || todayRes.status === "rejected";
    if (failed) console.error("System dashboard stats failed:", usersRes.reason || todayRes.reason);
    setError(failed ? "Some dashboard data could not be loaded." : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const q = todayStats?.queues;
  const a = todayStats?.appointments;
  const d = todayStats?.documents;
  const dash = (ready, v) => (loading || !ready ? "—" : String(v ?? 0));

  const stats = [
    {
      title: "Total Users",
      value: dash(userStats, userStats?.total),
      description: userStats
        ? `${userStats.students ?? 0} students, ${userStats.professors ?? 0} faculty, ${userStats.admins ?? 0} staff`
        : "",
      icon: Users,
      bgColor: "bg-emerald-50",
      path: "/system/users",
    },
    {
      title: "Queues Today",
      value: dash(q, q?.joined),
      description: q ? `${q.completed ?? 0} completed` : "",
      icon: Clock,
      bgColor: "bg-blue-50",
      path: "/system/analytics",
    },
    {
      title: "Pending Appointments",
      value: dash(a, a?.byStatus?.pending),
      description: a ? "Requested today" : "",
      icon: Calendar,
      bgColor: "bg-purple-50",
      path: "/system/analytics",
    },
    {
      title: "Pending Documents",
      value: dash(d, (d?.byStatus?.pending ?? 0) + (d?.byStatus?.processing ?? 0)),
      description: d ? `${d.byStatus?.processing ?? 0} processing` : "",
      icon: FileText,
      bgColor: "bg-orange-50",
      path: "/system/analytics",
    },
  ];

  const onKey = (path) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <SuperadminPageShell outerClassName="admin-dashboard-with-sidebar" mainClassName="admin-dashboard-main">
      <div className="admin-dashboard sad-dashboard">
        {error && (
          <div className="dash-error-banner">
            {error}{" "}
            <button type="button" className="sad-retry-btn" onClick={fetchStats}>
              Retry
            </button>
          </div>
        )}

        <div className="welcome-banner admin-banner">
          <div className="banner-backdrop banner-backdrop-1"></div>
          <div className="banner-backdrop banner-backdrop-2"></div>
          <div className="banner-content">
            <p className="banner-greeting">Good day!</p>
            <div className="banner-title-row">
              <h1 className="banner-title">{name}</h1>
            </div>
            <p className="sad-banner-subtitle">University-wide overview</p>
            <div className="banner-badges">
              <span className="badge">System Administrator</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="stat-card sad-stat-clickable"
              onClick={() => navigate(stat.path)}
              role="button"
              tabIndex={0}
              aria-label={`${stat.title}: open details`}
              onKeyDown={onKey(stat.path)}
            >
              <div className="stat-header">
                <div className={`stat-icon ${stat.bgColor}`}>
                  <stat.icon className="icon" />
                </div>
              </div>
              <p className="stat-title">{stat.title}</p>
              <p className={`stat-value ${loading ? "stat-loading" : ""}`}>{stat.value}</p>
              <p className="stat-description">{stat.description}</p>
            </div>
          ))}
        </div>

        <section className="quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="quick-action-card"
                onClick={() => navigate(action.path)}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onKeyDown={onKey(action.path)}
              >
                <div className={`action-icon ${action.iconColor}`}>
                  <action.icon />
                </div>
                <div className="quick-action-text">
                  <h3 className="action-title">{action.title}</h3>
                  <p className="action-description">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SuperadminPageShell>
  );
}
