import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SuperadminPageShell from "../../components/SuperadminPageShell";
// Reuses the admin dashboard's own stylesheet directly -- same
// welcome-banner / admin-tools-grid classes, just a narrower tool set.
import "../admin/adm-dashboard.css";

const UserManagementIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <circle cx="19" cy="6" r="2"></circle>
    <circle
      cx="19"
      cy="6"
      r="2.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    ></circle>
    <path d="M19 4l1 1"></path>
    <path d="M20 7l-1-1"></path>
    <path d="M18 7l1-1"></path>
    <path d="M18 5l1 1"></path>
  </svg>
);
const SyncIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const superadminTools = [
  {
    icon: UserManagementIcon,
    iconColor: "bg-user-mgmt",
    title: "User Management",
    description: "Manage every account across all departments",
    path: "/superadmin/user-management",
  },
  {
    icon: SyncIcon,
    iconColor: "bg-cyan-500",
    title: "Pinnacle Sync",
    description: "Data synchronization",
    path: "/superadmin/pinnacle-sync",
  },
];

export default function SuperadminDashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const name = authUser?.name ?? "Superadmin";

  return (
    <SuperadminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
    >
      <div className="admin-dashboard">
        <div className="welcome-banner admin-banner">
          <div className="banner-backdrop banner-backdrop-1"></div>
          <div className="banner-backdrop banner-backdrop-2"></div>
          <div className="banner-content">
            <h1 className="banner-title">Superadmin Dashboard</h1>
            <p className="banner-subtitle">Welcome back, {name}</p>
            <div className="banner-badges">
              <div className="welcome-admin-badge">
                <ShieldIcon style={{ width: "1.5rem", height: "1.5rem" }} />
                <span className="badge">Superadmin</span>
              </div>
            </div>
          </div>
        </div>

        <section className="admin-management-section">
          <div className="section-header-admin">
            <div className="section-title-admin">
              <div className="section-title-admin-text">
                <h2>System Administration</h2>
                <p className="section-subtitle">
                  Cross-department tools not managed by department admins
                </p>
              </div>
            </div>
          </div>
          <div className="admin-tools-grid">
            {superadminTools.map((tool) => (
              <div
                key={tool.title}
                className="admin-tool-card"
                onClick={() => navigate(tool.path)}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate(tool.path);
                }}
              >
                <div className={`admin-tool-icon ${tool.iconColor}`}>
                  <tool.icon />
                </div>
                <div className="admin-tool-text">
                  <h3 className="tool-title">{tool.title}</h3>
                  <p className="tool-description">{tool.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SuperadminPageShell>
  );
}
