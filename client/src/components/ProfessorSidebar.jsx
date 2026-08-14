import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { FileText as LucideFileText, Megaphone as LucideMegaphone } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import LogoutConfirmModal from "./LogoutConfirmModal";
import { applyTheme, getSavedTheme } from "../utils/theme";
import api from "../utils/api";
import useEdgeSwipeOpen from "../hooks/useEdgeSwipeOpen";
import NotificationBell from "./NotificationBell";

import ucLogo from "../assets/Pnc-Logo.png";
import oamsLogo from "../assets/oams_logo.png";

import "./ProfessorSidebar.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const FileTextNavIcon = () => <LucideFileText />;
const MegaphoneNavIcon = () => <LucideMegaphone />;
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

// Where a clicked notification should land, by its `type`. Professor has no
// dedicated queue screen, so that one falls back to the dashboard;
// announcements now route to their own screen.
const NOTIFICATION_TYPE_PATHS = {
  queue: "/professor/dashboard",
  document: "/professor/document-status",
  appointment: "/professor/appointments",
  announcement: "/professor/announcements",
};

const navItems = [
  { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
  { icon: MegaphoneNavIcon, label: "Announcements", path: "/professor/announcements" },
  { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
  { icon: FileTextNavIcon, label: "Documents", path: "/professor/document-request" },
  { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
];

export default function ProfessorSidebar() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Faculty",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEdgeSwipeOpen(() => setSidebarOpen(true), !sidebarOpen);

  // ── Availability status (quick Available/Unavailable toggle) ──────────────
  const [profStatus, setProfStatus] = useState("available");
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/professor/availability-status");
        setProfStatus(res.data?.availabilityStatus ?? "available");
      } catch (err) {
        console.error("Failed to fetch faculty availability status:", err);
      }
    };
    if (authUser) fetchStatus();
  }, [authUser]);

  const handleToggleStatus = async () => {
    const next = profStatus === "available" ? "unavailable" : "available";
    const previous = profStatus;
    setProfStatus(next); // optimistic
    setStatusSaving(true);
    try {
      await api.patch("/professor/availability-status", { status: next });
      toast.success(
        next === "available"
          ? "You're marked Available to students"
          : "You're marked Unavailable — your slots are hidden from students",
      );
    } catch {
      setProfStatus(previous); // revert
      toast.error("Failed to update availability status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  return (
    <>
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <Link
              to="/professor/dashboard"
              className="logo-container"
              onClick={() => setSidebarOpen(false)}
            >
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="logo-img coams-logo-img"
              />
            </Link>
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <NotificationBell
              endpointBase="professor"
              viewAllPath="/professor/notifications"
              typePaths={NOTIFICATION_TYPE_PATHS}
            />
          </div>

          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <div className="sidebar-availability">
            <span className="sidebar-availability-label">
              {profStatus === "available" ? "Available" : "Unavailable"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={profStatus === "available"}
              className={`sidebar-availability-switch ${profStatus === "available" ? "is-available" : "is-unavailable"}`}
              onClick={handleToggleStatus}
              disabled={statusSaving}
              title="Toggle your availability status"
            >
              <span className="sidebar-availability-knob" />
            </button>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item${location.pathname === item.path ? " active" : ""}`}
                  title={item.label}
                >
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <Link to="/professor/dashboard" className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="logo-img coams-logo-img"
            />
          </Link>
          <div className="mobile-header-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <NotificationBell
              endpointBase="professor"
              viewAllPath="/professor/notifications"
              onOpen={() => setSidebarOpen(false)}
              typePaths={NOTIFICATION_TYPE_PATHS}
            />
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
