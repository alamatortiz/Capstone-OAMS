import { useState } from "react";
import { Link } from "react-router-dom";
import "./admin-user-management.css";
import { toast } from "sonner";
import AdminSidebar from "../../components/AdminSidebar";
import ChatWidget from "../../components/ChatWidget";
import { formatManilaDate, formatManilaDateTime } from "../../utils/dateTime";

// ─── Shared Layout Icons ──────────────────────────────────────────────────────
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Page-specific Icons ──────────────────────────────────────────────────────
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
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const EditIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const KeyIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const TrashIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

// ─── Constants ────────────────────────────────────────────────────────────────
const COLLEGES = [
  { value: "CCS",  label: "College of Computing Studies (CCS)" },
  { value: "CBAA", label: "College of Business, Accountancy and Administration (CBAA)" },
  { value: "COED", label: "College of Education (COED)" },
  { value: "COE",  label: "College of Engineering (COE)" },
  { value: "CAS",  label: "College of Arts and Sciences (CAS)" },
  { value: "CHAS", label: "College of Health and Allied Sciences (CHAS)" },
];

const INITIAL_USERS = [
  { id: "1", name: "Juan Dela Cruz",    email: "juan.delacruz@pnc.edu.ph",  role: "student",   college: "CCS",  studentId: "2100123",       status: "active",    lastLogin: "2026-05-20T08:30:00", createdDate: "2021-08-15" },
  { id: "2", name: "Maria Santos",      email: "maria.santos@pnc.edu.ph",   role: "student",   college: "CBAA", studentId: "2100456",       status: "active",    lastLogin: "2026-05-19T14:20:00", createdDate: "2021-08-15" },
  { id: "3", name: "Dr. Roberto Cruz",  email: "roberto.cruz@pnc.edu.ph",   role: "professor", college: "CCS",  employeeId: "EMP-2020-045", status: "active",    lastLogin: "2026-05-20T09:15:00", createdDate: "2020-06-01" },
  { id: "4", name: "Prof. Carmen Ramos",email: "carmen.ramos@pnc.edu.ph",   role: "professor", college: "CBAA", employeeId: "EMP-2019-023", status: "active",    lastLogin: "2026-05-20T07:45:00", createdDate: "2019-08-20" },
  { id: "5", name: "Admin Office CCS",  email: "admin.ccs@pnc.edu.ph",      role: "admin",     college: "CCS",  employeeId: "ADM-2021-001", status: "active",    lastLogin: "2026-05-20T10:00:00", createdDate: "2021-01-10" },
  { id: "6", name: "Pedro Garcia",      email: "pedro.garcia@pnc.edu.ph",   role: "student",   college: "COE",  studentId: "2200789",       status: "suspended", lastLogin: "2026-05-10T16:30:00", createdDate: "2022-08-20" },
];

const BLANK_FORM = { name: "", email: "", role: "student", college: "", employeeId: "", studentId: "", status: "active" };

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUserManagement() {
  // ── User-management state ────────────────────────────────────────────────────
  const [users, setUsers]           = useState(INITIAL_USERS);
  const [showModal, setShowModal]   = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm]             = useState(BLANK_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab]   = useState("all");

  // ── Handlers: chat ───────────────────────────────────────────────────────────
  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("student"))   return `There are ${users.filter(u => u.role === "student").length} student accounts in the system.`;
    if (i.includes("professor") || i.includes("faculty")) return `There are ${users.filter(u => u.role === "professor").length} professor accounts.`;
    if (i.includes("suspend"))   return `There are ${users.filter(u => u.status === "suspended").length} suspended accounts. Edit a user to reactivate.`;
    if (i.includes("user") || i.includes("account")) return "Accounts are synced in via Pinnacle Sync. Click the edit icon to modify a user, or the ban icon to suspend an account.";
    return "I can help with user accounts, filtering, and password resets. What do you need?";
  };

  // ── Handlers: CRUD ───────────────────────────────────────────────────────────
  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openEditModal = (u) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, college: u.college, employeeId: u.employeeId || "", studentId: u.studentId || "", status: u.status });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingUser(null); setForm(BLANK_FORM); };

  const handleSave = () => {
    if (!form.name || !form.email || !form.college) return toast.error("Please fill in all required fields");
    if (!form.email.endsWith("@pnc.edu.ph"))        return toast.error("Email must use @pnc.edu.ph domain");
    if (form.role === "student" && !form.studentId)  return toast.error("Student ID is required for students");
    if (form.role !== "student" && !form.employeeId) return toast.error("Employee ID is required for professors and admins");

    setUsers((p) => p.map((u) => u.id === editingUser.id ? { ...u, ...form } : u));
    toast.success("User updated successfully");
    closeModal();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return;
    setUsers((p) => p.filter((u) => u.id !== id));
    toast.success("User deleted successfully");
  };
  const handleResetPassword = (u) => {
    if (!window.confirm(`Reset password for ${u.name}? A temporary password will be sent to ${u.email}`)) return;
    toast.success(`Password reset email sent to ${u.email}`);
  };
  const handleToggleSuspend = (u) => {
    const suspending = u.status !== "suspended";
    if (!window.confirm(`${suspending ? "Suspend" : "Reactivate"} ${u.name}'s account?`)) return;
    setUsers((p) => p.map((x) => x.id === u.id ? { ...x, status: suspending ? "suspended" : "active" } : x));
    toast.success(`Account ${suspending ? "suspended" : "reactivated"}`);
  };

  // ── Filtered / grouped users ─────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.studentId || "").toLowerCase().includes(q) || (u.employeeId || "").toLowerCase().includes(q);
    return matchSearch && (filterRole === "all" || u.role === filterRole) && (filterStatus === "all" || u.status === filterStatus);
  });
  const students   = filtered.filter((u) => u.role === "student");
  const professors = filtered.filter((u) => u.role === "professor");
  const admins     = filtered.filter((u) => u.role === "admin");

  const displayUsers = activeTab === "students" ? students : activeTab === "professors" ? professors : activeTab === "admins" ? admins : filtered;
  const tabMeta = { all: { title: "All Users", desc: "Complete list of all user accounts" }, students: { title: "Student Accounts", desc: "Manage student user accounts" }, professors: { title: "Professor Accounts", desc: "Manage professor/faculty user accounts" }, admins: { title: "Admin Accounts", desc: "Manage administrator user accounts" } };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-with-sidebar">
      <AdminSidebar />

      {/* ── Main Content ───────────────────────────────────────────────────────── */}
      <main className="admin-dashboard-main">
        <div className="aum-content">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>

          {/* Header */}
          <div className="aum-page-header">
            <div className="aum-title-section">
              <div className="aum-title-icon">
                <UsersHeaderIcon />
              </div>
              <div>
                <h1 className="aum-page-title">User Account Management</h1>
                <p className="aum-page-subtitle">Manage all user accounts across the OAMS system</p>
              </div>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="aum-filter-section">
            <div className="aum-filter-header">
              <div className="aum-filter-title-group">
                <FilterIcon />
                <div>
                  <h3 className="aum-filter-title">Filter &amp; Search</h3>
                  <p className="aum-filter-subtitle">Find and filter user accounts</p>
                </div>
              </div>
              <div className="aum-filter-actions">
                <button className="aum-sm-btn" onClick={() => toast.success("Export started")}><DownloadIcon /> Export</button>
                <button className="aum-sm-btn" onClick={() => toast.info("Import feature coming soon")}><UploadIcon /> Import</button>
                <button className="aum-sm-btn" onClick={() => toast.success("Data refreshed")}><RefreshIcon /> Refresh</button>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="aum-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="professor">Professors</option>
                <option value="admin">Admins</option>
              </select>
              <select className="aum-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Tabs + User List */}
          <div className="aum-tabs-wrapper">
            <div className="aum-tab-list">
              {[
                { key: "all",        label: "All Users" },
                { key: "students",   label: "Students" },
                { key: "professors", label: "Professors" },
                { key: "admins",     label: "Admins" },
              ].map((t) => (
                <button key={t.key} className={`aum-tab-btn ${activeTab === t.key ? "aum-tab-active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="aum-users-section">
              <div className="aum-users-section-header">
                <h3 className="aum-users-title">{tabMeta[activeTab].title}</h3>
                <p className="aum-users-subtitle">{tabMeta[activeTab].desc}</p>
              </div>
              <div className="aum-users-list">
                {displayUsers.length === 0 ? (
                  <div className="aum-empty">No users found matching your filters.</div>
                ) : (
                  displayUsers.map((u) => (
                    <div key={u.id} className="aum-user-card">
                      <div className="aum-user-info">
                        <div className="aum-user-name-row">
                          <span className="aum-user-name">{u.name}</span>
                          <span className={`aum-badge aum-badge-role-${u.role}`}>{u.role}</span>
                          <span className={`aum-badge aum-badge-status-${u.status}`}>{u.status}</span>
                        </div>
                        <p className="aum-user-email">{u.email}</p>
                        <div className="aum-user-meta">
                          <span className="aum-college-badge">{u.college}</span>
                          {u.studentId  && <span className="aum-meta-text">ID: {u.studentId}</span>}
                          {u.employeeId && <span className="aum-meta-text">ID: {u.employeeId}</span>}
                          {u.lastLogin  && <span className="aum-meta-text">Last login: {formatManilaDateTime(u.lastLogin)}</span>}
                          <span className="aum-meta-text">Created: {formatManilaDate(u.createdDate)}</span>
                        </div>
                      </div>
                      <div className="aum-user-actions">
                        <button className="aum-icon-btn aum-icon-btn-edit"   onClick={() => openEditModal(u)}      title="Edit user"><EditIconSvg /></button>
                        <button
                          className={`aum-icon-btn ${u.status === "suspended" ? "aum-icon-btn-reactivate" : "aum-icon-btn-suspend"}`}
                          onClick={() => handleToggleSuspend(u)}
                          title={u.status === "suspended" ? "Reactivate account" : "Suspend account"}
                        >
                          {u.status === "suspended" ? <CheckCircleIconSvg /> : <BanIconSvg />}
                        </button>
                        <button className="aum-icon-btn aum-icon-btn-key"    onClick={() => handleResetPassword(u)} title="Reset password"><KeyIconSvg /></button>
                        <button className="aum-icon-btn aum-icon-btn-delete" onClick={() => handleDelete(u.id)}    title="Delete user"><TrashIconSvg /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <div className="aum-modal-overlay">
          <div className="aum-modal">
            <div className="aum-modal-header">
              <div>
                <h2 className="aum-modal-title">Edit User Account</h2>
                <p className="aum-modal-desc">Update user account information</p>
              </div>
              <button className="aum-modal-close" onClick={closeModal} aria-label="Close modal"><CloseIcon /></button>
            </div>
            <div className="aum-modal-body">
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  <label className="aum-form-label">Full Name *</label>
                  <input type="text" className="aum-form-input" placeholder="e.g., Juan Dela Cruz" value={form.name} onChange={setField("name")} />
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">Email Address *</label>
                  <input type="email" className="aum-form-input" placeholder="user@pnc.edu.ph" value={form.email} onChange={setField("email")} />
                </div>
              </div>
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  <label className="aum-form-label">Role *</label>
                  <select className="aum-form-select" value={form.role} onChange={setField("role")}>
                    <option value="student">Student</option>
                    <option value="professor">Professor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">College *</label>
                  <select className="aum-form-select" value={form.college} onChange={setField("college")}>
                    <option value="">Select college</option>
                    {COLLEGES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="aum-form-grid">
                <div className="aum-form-group">
                  {form.role === "student" ? (
                    <>
                      <label className="aum-form-label">Student ID *</label>
                      <input type="text" className="aum-form-input" placeholder="e.g., 2312345" value={form.studentId} onChange={setField("studentId")} />
                    </>
                  ) : (
                    <>
                      <label className="aum-form-label">Employee ID *</label>
                      <input type="text" className="aum-form-input" placeholder="e.g., EMP-2020-045" value={form.employeeId} onChange={setField("employeeId")} />
                    </>
                  )}
                </div>
                <div className="aum-form-group">
                  <label className="aum-form-label">Status *</label>
                  <select className="aum-form-select" value={form.status} onChange={setField("status")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="aum-modal-footer">
              <button className="aum-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="aum-btn-submit" onClick={handleSave}>Update User</button>
            </div>
          </div>
        </div>
      )}

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
        getBotResponse={generateBotResponse}
      />
    </div>
  );
}