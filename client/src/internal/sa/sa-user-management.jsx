import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
// Supplies the .admin-dashboard-with-sidebar / .admin-dashboard-main shell
// classes and their <=1024px mobile-header offset. Lazy-loaded route, so it
// needs its own import.
import "../../pages/admin/adm-dashboard.css";
import "./sa-user-management.css";
import { toast } from "sonner";
import SuperadminPageShell from "./SuperadminPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import Pagination from "../../components/Pagination";
import { formatManilaDate, formatManilaDateTime, getManilaDateString } from "../../utils/dateTime";
import { downloadCsv } from "../../utils/csv";
import api from "../../utils/api";

// ─── Icons ────────────────────────────────────────────────────────────────────
const UsersHeaderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const BanIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const CheckCircleIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const PAGE_SIZE = 20;
const ROLE_LABELS = { student: "Student", professor: "Faculty", admin: "Admin" };

// Accounts are provisioned from the school's records, so this page only views
// accounts and suspends/reactivates them -- no editing, password resets, or
// deletion from here.
export default function SuperadminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [confirmUser, setConfirmUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const errMsg = (err, fallback) => err?.response?.data?.error || fallback;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.users ?? []);
      return true;
    } catch (err) {
      toast.error(errMsg(err, "Failed to load users"));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    if (await fetchUsers()) toast.success("User list refreshed");
  };

  const handleToggleSuspend = async () => {
    if (!confirmUser) return;
    const suspending = confirmUser.status !== "suspended";
    setSaving(true);
    try {
      await api.patch(`/admin/users/${confirmUser.id}/status`, {
        status: suspending ? "suspended" : "active",
      });
      toast.success(`${confirmUser.name}'s account ${suspending ? "suspended" : "reactivated"}`);
      setConfirmUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update account status"));
    } finally {
      setSaving(false);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.studentId || "").toLowerCase().includes(q) ||
      (u.employeeId || "").toLowerCase().includes(q);
    return (
      matchSearch &&
      (filterRole === "all" || u.role === filterRole) &&
      (filterStatus === "all" || u.status === filterStatus)
    );
  });
  const byTab = {
    all: filtered,
    students: filtered.filter((u) => u.role === "student"),
    professors: filtered.filter((u) => u.role === "professor"),
    admins: filtered.filter((u) => u.role === "admin"),
  };
  const tabMeta = {
    all: { title: "All Users", desc: "Every account across all colleges" },
    students: { title: "Student Accounts", desc: "Student accounts across all colleges" },
    professors: { title: "Faculty Accounts", desc: "Faculty accounts across all colleges" },
    admins: { title: "Admin Accounts", desc: "College office administrator accounts" },
  };

  const listAll = byTab[activeTab];
  const totalPages = Math.max(1, Math.ceil(listAll.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayUsers = listAll.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = [
    { label: "Total Accounts", value: users.length, tone: "primary" },
    { label: "Students", value: users.filter((u) => u.role === "student").length, tone: "blue" },
    { label: "Faculty", value: users.filter((u) => u.role === "professor").length, tone: "purple" },
    { label: "Admins", value: users.filter((u) => u.role === "admin").length, tone: "orange" },
    { label: "Suspended", value: users.filter((u) => u.status === "suspended").length, tone: "danger" },
  ];

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No users match the current filters");
      return;
    }
    const header = ["Name", "Email", "Role", "College", "Student ID", "Employee ID", "Status", "Last Login", "Created Date"];
    const rows = filtered.map((u) => [
      u.name, u.email, ROLE_LABELS[u.role] ?? u.role, u.college, u.studentId || "", u.employeeId || "", u.status,
      u.lastLogin ? formatManilaDateTime(u.lastLogin) : "",
      u.createdDate ? formatManilaDate(u.createdDate) : "",
    ]);
    downloadCsv([header, ...rows], `users-${getManilaDateString()}.csv`);
    toast.success(`Exported ${filtered.length} user${filtered.length === 1 ? "" : "s"}`);
  };

  const confirmSuspending = confirmUser?.status !== "suspended";

  return (
    <SuperadminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
      overlay={
        <ActionConfirmModal
          show={!!confirmUser}
          onCancel={() => !saving && setConfirmUser(null)}
          onConfirm={handleToggleSuspend}
          confirmDisabled={saving}
          title={confirmSuspending ? "Suspend Account?" : "Reactivate Account?"}
          message={
            confirmUser && (
              <>
                {confirmSuspending
                  ? <>Suspend <strong>{confirmUser.name}</strong>'s account? They won't be able to sign in until it's reactivated.</>
                  : <>Reactivate <strong>{confirmUser.name}</strong>'s account? They'll be able to sign in again.</>}
              </>
            )
          }
          icon={confirmSuspending ? <BanIconSvg /> : <CheckCircleIconSvg />}
          confirmText={saving ? "Saving…" : confirmSuspending ? "Suspend" : "Reactivate"}
          variant={confirmSuspending ? "danger" : "success"}
        />
      }
    >
      <div className="aum-content">
        <PageHeader
          breadcrumb={
            <Link to="/system/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />Home
            </Link>
          }
          icon={<UsersHeaderIcon />}
          iconClassName="aum-title-icon"
          title="User Management"
          subtitle="View accounts across all colleges and suspend or reactivate access."
          headerClassName="aum-page-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="aum-title-section"
          titleClassName="aum-page-title"
          subtitleClassName="aum-page-subtitle"
        />

        <div className="aum-stats-grid">
          {stats.map((s) => (
            <div key={s.label} className={`aum-stat-card aum-stat-${s.tone}`}>
              <p className="aum-stat-label">{s.label}</p>
              <p className="aum-stat-value">{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="aum-filter-section">
          <div className="aum-filter-header">
            <div className="aum-filter-title-group">
              <FilterIcon />
              <div>
                <h3 className="aum-filter-title">Filter &amp; Search</h3>
                <p className="aum-filter-subtitle">Accounts are created from the school's records</p>
              </div>
            </div>
            <div className="aum-filter-actions">
              <button className="aum-sm-btn" onClick={handleExport}><DownloadIcon /> Export</button>
              <button className="aum-sm-btn" onClick={handleRefresh}><RefreshIcon /> Refresh</button>
            </div>
          </div>
          <div className="aum-filter-inputs">
            <div className="aum-search-wrapper">
              <SearchIcon />
              <input
                type="text"
                className="aum-search-input"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <select className="aum-select" value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}>
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="professor">Faculty</option>
              <option value="admin">Admins</option>
            </select>
            <select className="aum-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="aum-tabs-wrapper">
          <div className="aum-tab-list">
            {[
              { key: "all", label: "All Users" },
              { key: "students", label: "Students" },
              { key: "professors", label: "Faculty" },
              { key: "admins", label: "Admins" },
            ].map((t) => (
              <button
                key={t.key}
                className={`aum-tab-btn ${activeTab === t.key ? "aum-tab-active" : ""}`}
                onClick={() => { setActiveTab(t.key); setPage(1); }}
              >
                {t.label} <span className="aum-tab-count">{loading ? "—" : byTab[t.key].length}</span>
              </button>
            ))}
          </div>

          <div className="aum-users-section">
            <div className="aum-users-section-header">
              <h3 className="aum-users-title">{tabMeta[activeTab].title}</h3>
              <p className="aum-users-subtitle">{tabMeta[activeTab].desc}</p>
            </div>
            <div className="aum-users-list">
              {loading ? (
                <div className="aum-empty">Loading users…</div>
              ) : displayUsers.length === 0 ? (
                <div className="aum-empty">No users found matching your filters.</div>
              ) : (
                displayUsers.map((u) => {
                  const suspended = u.status === "suspended";
                  return (
                    <div key={u.id} className="aum-user-card">
                      <div className="aum-user-info">
                        <div className="aum-user-name-row">
                          <span className="aum-user-name">{u.name}</span>
                          <span className={`aum-badge aum-badge-role-${u.role}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                          <span className={`aum-badge aum-badge-status-${u.status}`}>{u.status}</span>
                        </div>
                        <p className="aum-user-email">{u.email}</p>
                        <div className="aum-user-meta">
                          <span className="aum-college-badge">{u.college}</span>
                          {u.studentId && <span className="aum-meta-text">ID: {u.studentId}</span>}
                          {u.employeeId && <span className="aum-meta-text">ID: {u.employeeId}</span>}
                          {u.lastLogin && <span className="aum-meta-text">Last login: {formatManilaDateTime(u.lastLogin)}</span>}
                          {u.createdDate && <span className="aum-meta-text">Created: {formatManilaDate(u.createdDate)}</span>}
                        </div>
                      </div>
                      <div className="aum-user-actions">
                        <button
                          className={`aum-status-btn ${suspended ? "aum-status-btn-reactivate" : "aum-status-btn-suspend"}`}
                          onClick={() => setConfirmUser(u)}
                        >
                          {suspended ? <CheckCircleIconSvg /> : <BanIconSvg />}
                          {suspended ? "Reactivate" : "Suspend"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </SuperadminPageShell>
  );
}
