
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, Clock, FileText, Calendar, Megaphone } from "lucide-react";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import Pagination from "../../components/Pagination";
import { useNotificationsPage } from "../../hooks/useNotificationsPage";
import { formatManilaDateTime } from "../../utils/dateTime";

import "./prof-notifications.css";

const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const TYPE_META = {
  queue: { label: "Queue", updateLabel: "Queue Update", icon: Clock, badgeClass: "notif-badge-queue", iconClass: "notif-icon-queue" },
  document: { label: "Document", updateLabel: "Document Update", icon: FileText, badgeClass: "notif-badge-document", iconClass: "notif-icon-document" },
  appointment: { label: "Appointment", updateLabel: "Appointment Update", icon: Calendar, badgeClass: "notif-badge-appointment", iconClass: "notif-icon-appointment" },
  announcement: { label: "Announcement", updateLabel: "Announcement Update", icon: Megaphone, badgeClass: "notif-badge-announcement", iconClass: "notif-icon-announcement" },
};

// Queue is deliberately excluded from the filter: this system never creates
// queue-type notifications for faculty. Announcement notifications are real
// (adminRoutes.js's POST /admin/announcements inserts one per targeted
// faculty member) and now route to a real screen (prof-announcements.jsx),
// so they get a filter option like every other real type.
const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "document", label: "Document" },
  { value: "appointment", label: "Appointment" },
  { value: "announcement", label: "Announcement" },
];

// Mirrors ProfessorSidebar.jsx's NOTIFICATION_TYPE_PATHS. Professor has no
// dedicated queue screen, so that one falls back to the dashboard.
const TYPE_PATHS = {
  queue: "/professor/dashboard",
  document: "/professor/document-status",
  appointment: "/professor/appointments",
  announcement: "/professor/announcements",
};

export default function ProfessorNotifications() {
  const {
    filterType, changeFilterType, page, setPage, notifications, totalPages,
    loading, error, unreadCount, markAllRead, goToNotification,
  } = useNotificationsPage({ basePath: "/professor", typePaths: TYPE_PATHS, fallbackPath: "/professor/dashboard" });

  return (
    <ProfessorPageShell outerClassName="prof-notifications-with-sidebar" mainClassName="prof-notifications-main">
      <div className="prof-notifications-container">
        <PageHeader
          breadcrumb={
            <Link to="/professor/dashboard" className="breadcrumb-link">
              <ChevronLeft className="breadcrumb-icon" />
              Home
            </Link>
          }
          icon={<Bell />}
          iconClassName="notif-title-icon"
          title="Notifications"
          subtitle="Stay updated on document and appointment activity."
          headerClassName="notif-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="notif-title-section"
          titleClassName="notif-title"
          subtitleClassName="notif-subtitle"
        />

        <div className="filters-card">
          <div className="filters-header">
            <h3 className="filters-title">Notification Filter</h3>
            <p className="filters-description">Filter your notifications by category.</p>
          </div>
          <div className="filters-row">
            <div className="filters-grid">
              <FilterSelect
                id="notif-type-select"
                label="Type"
                value={filterType}
                onChange={(e) => changeFilterType(e.target.value)}
                options={TYPE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all-btn" onClick={markAllRead}>
                Mark all read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        <div className="notifications-list">
          {loading ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>Loading notifications…</h3>
            </div>
          ) : error ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>Could not load notifications</h3>
              <p>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>No Notifications</h3>
              <p>You're all caught up.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.queue;
              const TypeIcon = meta.icon;
              return (
                <button
                  type="button"
                  key={n.notification_id}
                  className={`notif-item notif-item-${n.type} ${n.is_read ? "" : "notif-item--unread"}`}
                  onClick={() => goToNotification(n)}
                >
                  <span className={`notif-item-icon ${meta.iconClass}`}>
                    <TypeIcon />
                  </span>
                  <span className="notif-item-content">
                    <span className="notif-item-header">
                      <span className="notif-item-title">{meta.updateLabel}</span>
                      <span className="notif-item-badges">
                        <span className={`notif-badge ${meta.badgeClass}`}>{meta.label}</span>
                        {!n.is_read && <span className="notif-badge notif-badge-unread">Unread</span>}
                      </span>
                    </span>
                    <span className="notif-item-message">{n.message}</span>
                  </span>
                  <span className="notif-item-meta">
                    <span className="notif-item-time">
                      <Clock className="notif-item-time-icon" />
                      {formatManilaDateTime(n.created_at)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </ProfessorPageShell>
  );
}
