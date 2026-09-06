import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Megaphone as LucideMegaphone,
  FileText as LucideFileText,
  Lightbulb,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import LogoutConfirmModal from "./LogoutConfirmModal";
import TutorialTour from "./TutorialTour";
import { applyTheme, getSavedTheme } from "../utils/theme";
import useEdgeSwipeOpen from "../hooks/useEdgeSwipeOpen";
import NotificationBell from "./NotificationBell";

import ucLogo from "../assets/Pnc-Logo.png";
import oamsLogo from "../assets/oams_logo.png";

import "./StudentSidebar.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
export const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
export const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
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
const MegaphoneNavIcon = () => <LucideMegaphone />;
const FileTextNavIcon = () => <LucideFileText />;

// Where a clicked notification should land, by its `type` -- the screen
// that actually shows the event the notification was about, not just the
// generic notifications list.
const NOTIFICATION_TYPE_PATHS = {
  queue: "/student/queue-status",
  document: "/student/document-status",
  appointment: "/student/appointment-status",
  announcement: "/student/announcements",
};

const navItems = [
  { icon: HomeIcon, label: "Home", path: "/student/dashboard" },
  {
    icon: MegaphoneNavIcon,
    label: "Announcements",
    path: "/student/announcements",
    tourId: "nav-announcements",
  },
  { icon: QueueIconNav, label: "Queue", path: "/student/queue", tourId: "nav-queue" },
  {
    icon: CalendarIconNav,
    label: "Appointments",
    path: "/student/appointments",
    tourId: "nav-appointments",
  },
  {
    icon: FileTextNavIcon,
    label: "Documents",
    path: "/student/documents",
    tourId: "nav-documents",
  },
  {
    icon: HistoryIconNav,
    label: "Transactions",
    path: "/student/transactions",
    tourId: "nav-transactions",
  },
];

// Sidebar-only walkthrough (per capstone scope: student side first) --
// spotlights each of these four nav links in place rather than actually
// navigating through their real pages, so it works from wherever the
// student happened to click the lightbulb and can't break on page-load
// timing. selector-less steps (just the welcome one here) render as a
// plain centered card with no spotlight -- see TutorialTour.jsx.
const STUDENT_TOUR_STEPS = [
  {
    title: "Welcome to OAMS!",
    description:
      "Let's take a quick look at what you can do here, it'll only take a few seconds.",
  },
  {
    selector: '[data-tour="nav-announcements"]',
    title: "Stay Informed",
    description:
      "Catch announcements from your department, and check the FAQs there for quick answers to common questions.",
  },
  {
    selector: '[data-tour="nav-queue"]',
    title: "Join a Queue",
    description:
      "Line up for a service, like document requests or general inquiries, without waiting in person. Track your position in real-time.",
  },
  {
    selector: '[data-tour="nav-appointments"]',
    title: "Book Appointments",
    description:
      "Schedule a consultation with a professor or staff member at a time that works for you.",
  },
  {
    selector: '[data-tour="nav-documents"]',
    title: "Request Documents",
    description:
      "Request certificates, transcripts, and other official documents right from here.",
  },
  {
    selector: '[data-tour="nav-transactions"]',
    title: "Track Everything",
    description:
      "See the full history and status of every queue, appointment, and document request you've made.",
  },
];

export default function StudentSidebar() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
      }
    : {
        name: "Student",
        college: "",
        departmentAbbrev: "",
      };

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEdgeSwipeOpen(() => setSidebarOpen(true), !sidebarOpen);

  // On mobile the nav items the tour spotlights live in the off-canvas
  // drawer, translated out of view until opened -- starting the tour
  // without this would spotlight elements sitting off-screen. Closing the
  // drawer again on tour-close is a no-op on desktop (the "open" class
  // only has a transform rule under the mobile breakpoint at all).
  const startTour = () => {
    setSidebarOpen(true);
    setTourOpen(true);
  };
  const closeTour = () => {
    setTourOpen(false);
    setSidebarOpen(false);
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
              to="/student/dashboard"
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
              endpointBase="student"
              viewAllPath="/student/notifications"
              typePaths={NOTIFICATION_TYPE_PATHS}
            />
          </div>

          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? "Student"}</p>
                <span className="user-role-badge">Student</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                  title={item.label}
                  {...(item.tourId ? { "data-tour": item.tourId } : {})}
                >
                  <item.icon className="nav-icon-medium" />
                  <span className={`nav-label ${item.smallLabel ? "nav-label-sm" : ""}`}>
                    {item.label}
                  </span>
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
          <Link to="/student/dashboard" className="mobile-logo">
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
            {/* Unlike the desktop trigger, this one lives inline in a row
                that spans the full viewport width, not a narrow ~250px
                sidebar column -- plenty of room, no crowding risk. */}
            <div className="mobile-tutorial-trigger">
              <button
                className="theme-toggle-btn"
                onClick={startTour}
                aria-label="Start a short tutorial"
              >
                <Lightbulb size={18} />
              </button>
              <span className="tutorial-trigger-tooltip">Want a short tutorial?</span>
            </div>
            <NotificationBell
              endpointBase="student"
              viewAllPath="/student/notifications"
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

      {/* Floating, not squeezed into .sidebar-logo alongside the theme
          toggle + notification bell -- that row has no room to spare on
          desktop widths, and a 4th icon there was pushing the bell out of
          the visible row entirely. Hidden below the 1024px breakpoint,
          where the mobile-header copy above takes over instead. */}
      <div className="tutorial-trigger-wrap">
        <button
          className="tutorial-trigger-btn"
          onClick={startTour}
          aria-label="Start a short tutorial"
        >
          <Lightbulb size={18} />
        </button>
        <span className="tutorial-trigger-tooltip">Want a short tutorial?</span>
      </div>

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <TutorialTour steps={STUDENT_TOUR_STEPS} isOpen={tourOpen} onClose={closeTour} />
    </>
  );
}
