import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  LayoutList,
  Loader2,
  XCircle,
} from "lucide-react";
import "./adm-appointment.css";
import api from "../../utils/api";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import { formatManilaDate, formatManilaTime } from "../../utils/dateTime";
import { filterByRange } from "../../utils/dateRange";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { connectSocket } from "../../utils/socket";

// ── Icons (All SVG Components) ──────────────────────────────────────────────
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    {/* exclamation mark */}
    <path d="M12 7v6" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const CANCELLED_BY_LABELS = {
  student: "Student",
  faculty: "Faculty",
  system: "System (schedule change)",
};

const TAB_ICON_MAP = {
  all: LayoutList,
  pending: Clock,
  approved: CheckCircle2,
  completed: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
};

const ALL_RANGE_LABELS = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

export default function AdminAppointment() {
  const { user: authUser } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  useLockBodyScroll(Boolean(selectedAppointment));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [allRange, setAllRange] = useState("week");
  const handleViewDetails = (appointment) =>
    setSelectedAppointment(appointment);
  const handleCloseDetails = () => setSelectedAppointment(null);

  // Mirrors `appointments` for the catch block below, without making
  // fetchAppointments depend on (and change identity with) the state itself.
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const fetchAppointments = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/admin/appointments");
      setAppointments(res.data.appointments ?? []);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      if (appointmentsRef.current.length === 0) {
        setError("Could not load appointments.");
      } else {
        toast.error("Could not refresh appointments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchAppointments();
  }, [authUser, fetchAppointments]);

  // ── Live updates: refetch when a booking or status change affects this dept ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!authUser || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["appointment:slot-updated", "appointment:status-updated"];
    events.forEach((event) => socket.on(event, fetchAppointments));

    return () => {
      events.forEach((event) => socket.off(event, fetchAppointments));
    };
  }, [authUser, fetchAppointments]);

  const searchFiltered = searchQuery
    ? appointments.filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.studentName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.professor.toLowerCase().includes(q)
        );
      })
    : appointments;

  // The This Week / This Month / All Time control (on the "All" tab) governs
  // every tab, not just "All" — matching prof-appointments — so a tab's count
  // and its list always come from the same range-filtered array.
  const rangeFiltered = filterByRange(searchFiltered, allRange);

  const tabCounts = {
    all: rangeFiltered.length,
    pending: rangeFiltered.filter((a) => a.status === "pending").length,
    approved: rangeFiltered.filter((a) => a.status === "approved").length,
    completed: rangeFiltered.filter((a) => a.status === "completed").length,
    rejected: rangeFiltered.filter((a) => a.status === "rejected").length,
    cancelled: rangeFiltered.filter((a) => a.status === "cancelled").length,
  };

  const filterAppointments = (status) =>
    status === "all"
      ? rangeFiltered
      : rangeFiltered.filter((a) => a.status === status);

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "admin-appointment-badge-pending",
      approved: "admin-appointment-badge-approved",
      rejected: "admin-appointment-badge-rejected",
      completed: "admin-appointment-badge-completed",
      cancelled: "admin-appointment-badge-cancelled",
    };

    const colorClass = statusColors[status] || statusColors.pending;

    return (
      <div className={`admin-appointment-status-badge ${colorClass}`}>
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };

  const AppointmentCard = ({ appointment, onViewDetails }) => {
    return (
      <div key={appointment.id} className="admin-appointment-card">
        <div className="admin-appointment-card-content">
          <div className="admin-appointment-card-header">
            <div className="admin-appointment-card-left">
              <div className="admin-appointment-student-info">
                <h4 className="admin-appointment-student-name">
                  {appointment.professor}
                </h4>
                {appointment.professorId && (
                  /* purple id pill — reused here to hold the faculty employee_id */
                  <span className="admin-appointment-student-id-badge">
                    {appointment.professorId}
                  </span>
                )}
              </div>

              <div className="admin-appointment-purpose-row">
                <span className="admin-appointment-purpose-label">Purpose</span>
                <p className="admin-appointment-purpose">{appointment.purpose}</p>
              </div>
            </div>
            <div className="admin-appointment-card-right">
              {getStatusBadge(appointment.status)}
            </div>
          </div>

          <div className="admin-appointment-card-details">
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Student</span>
              <span className="admin-appointment-detail-value">
                {appointment.studentName}
              </span>
              {appointment.studentId && (
                <span className="admin-appointment-detail-id-badge">
                  {appointment.studentId}
                </span>
              )}
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Date</span>
              <span className="admin-appointment-detail-value">
                {formatManilaDate(appointment.date)}
              </span>
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Time</span>
              <span className="admin-appointment-detail-value">
                {appointment.time}
              </span>
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Type</span>
              <span className="admin-appointment-detail-value capitalize">
                {appointment.serviceName ?? "General consultation"}
              </span>
            </div>
          </div>

          <div className="admin-appointment-card-footer">
            <div className="admin-appointment-requested-meta">
              <span className="admin-appointment-requested-label">Requested</span>
              {appointment.requestedAtRaw ? (
                <>
                  <span className="admin-appointment-requested-date">
                    <Calendar />
                    {formatManilaDate(appointment.requestedAtRaw, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="admin-appointment-requested-time">
                    <Clock />
                    {formatManilaTime(appointment.requestedAtRaw)}
                  </span>
                </>
              ) : (
                <span className="admin-appointment-requested-date">
                  {appointment.requestedAt}
                </span>
              )}
            </div>
            <button
              className="admin-appointment-view-btn"
              onClick={() => onViewDetails(appointment)}
            >
              <EyeIcon />
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminPageShell
      outerClassName="admin-appointment-with-sidebar"
      mainClassName="admin-appointment-main"
      overlay={
        <>
          {selectedAppointment && (
            <div
              className="admin-appointment-modal-overlay"
              onClick={handleCloseDetails}
            >
              <div
                className="admin-appointment-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-appointment-modal-header">
                  <div>
                    <h2 className="admin-appointment-modal-title">
                      Appointment Details
                    </h2>
                  </div>
                  <button
                    className="admin-appointment-modal-close-btn"
                    onClick={handleCloseDetails}
                    aria-label="Close"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="admin-appointment-modal-body">
                  <div className="admin-appointment-modal-hero">
                    <p className="admin-appointment-modal-hero-label">Purpose</p>
                    <p className="admin-appointment-modal-hero-title">
                      {selectedAppointment.purpose}
                    </p>
                  </div>

                  <div className="admin-appointment-modal-grid">
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Status</span>
                      <div className="admin-appointment-modal-value">
                        {getStatusBadge(selectedAppointment.status)}
                      </div>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Student</span>
                      <div className="admin-appointment-modal-value admin-appointment-modal-student">
                        <span>{selectedAppointment.studentName}</span>
                        {selectedAppointment.studentId && (
                          <span className="admin-appointment-student-id-badge">
                            {selectedAppointment.studentId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Course</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.studentCourse ?? "—"}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Faculty</span>
                      <div className="admin-appointment-modal-value admin-appointment-modal-student">
                        <span>{selectedAppointment.professor}</span>
                        {selectedAppointment.professorId && (
                          <span className="admin-appointment-student-id-badge">
                            {selectedAppointment.professorId}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedAppointment.facultyEmail && (
                      <div className="admin-appointment-modal-field">
                        <span className="admin-appointment-modal-label">
                          Faculty Email
                        </span>
                        <span className="admin-appointment-modal-value">
                          {selectedAppointment.facultyEmail}
                        </span>
                      </div>
                    )}
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">College</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.college}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Date</span>
                      <span className="admin-appointment-modal-value">
                        {formatManilaDate(selectedAppointment.date)}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Time</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.time}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">
                        Location
                      </span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.location}
                      </span>
                    </div>
                    {selectedAppointment.serviceName && (
                      <div className="admin-appointment-modal-field">
                        <span className="admin-appointment-modal-label">
                          Service
                        </span>
                        <span className="admin-appointment-modal-value">
                          {selectedAppointment.serviceName}
                        </span>
                      </div>
                    )}
                    <div className="admin-appointment-modal-field admin-appointment-modal-field--full">
                      <span className="admin-appointment-modal-label">
                        Requested At
                      </span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.requestedAt}
                      </span>
                    </div>
                    {selectedAppointment.status === "cancelled" &&
                      selectedAppointment.cancelledBy && (
                        <div className="admin-appointment-modal-field admin-appointment-modal-field--full">
                          <span className="admin-appointment-modal-label">
                            Cancelled By
                          </span>
                          <span className="admin-appointment-modal-value">
                            {CANCELLED_BY_LABELS[selectedAppointment.cancelledBy] ??
                              selectedAppointment.cancelledBy}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="admin-appointment-modal-footer">
                  <button
                    className="admin-appointment-modal-close-action"
                    onClick={handleCloseDetails}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
        <div className="admin-appointment-container">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<Calendar />}
            iconClassName="admin-appointment-title-icon"
            title="Department Appointments Overview"
            subtitle="Monitor appointments within your department."
            headerClassName="admin-appointment-page-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="admin-appointment-title-section"
            titleClassName="admin-appointment-page-title"
            subtitleClassName="admin-appointment-page-subtitle"
          />

          {/* Filters */}
          <div className="admin-appointment-filters-card">
            <div className="admin-appointment-filters-header">
              <h2>Appointments Filter</h2>
              <p>Search appointments across your department.</p>
            </div>
            <div className="admin-appointment-filter-group">
              <label
                htmlFor="appt-search"
                className="admin-appointment-filter-label"
              >
                Search
              </label>
              <div className="admin-appointment-search-wrapper">
                <SearchIcon />
                <input
                  id="appt-search"
                  type="text"
                  placeholder="Search by student name, ID, or professor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-appointment-search-input"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="admin-appointment-tabs-list">
            {["all", "pending", "approved", "completed", "rejected", "cancelled"].map(
              (tab) => {
                const TabIcon = TAB_ICON_MAP[tab];

                if (tab === "all") {
                  return (
                    <div
                      key={tab}
                      role="button"
                      tabIndex={0}
                      className={`admin-appointment-tab-trigger admin-appointment-tab-trigger--dropdown ${
                        activeTab === tab ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("all")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setActiveTab("all");
                      }}
                    >
                      {TabIcon && <TabIcon className="admin-appointment-tab-icon" />}
                      <select
                        className="admin-appointment-range-select"
                        value={allRange}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setAllRange(e.target.value);
                          setActiveTab("all");
                        }}
                      >
                        {Object.entries(ALL_RANGE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <span className="admin-appointment-tab-count">
                        {loading ? "—" : tabCounts.all}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`admin-appointment-tab-trigger ${
                      activeTab === tab ? "active" : ""
                    }`}
                  >
                    {TabIcon && <TabIcon className="admin-appointment-tab-icon" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="admin-appointment-tab-count">
                      {loading ? "—" : tabCounts[tab]}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* List */}
          <div className="admin-appointment-cards-list">
            {loading ? (
              <div className="admin-appointment-empty-state">
                <Loader2 style={{ animation: "spin 1s linear infinite" }} />
                <p className="admin-appointment-empty-text">
                  Loading appointments…
                </p>
              </div>
            ) : error ? (
              <div className="admin-appointment-empty-state">
                <AlertCircleIcon />
                <p className="admin-appointment-empty-text">{error}</p>
                <button
                  className="admin-appointment-retry-btn"
                  onClick={fetchAppointments}
                >
                  Retry
                </button>
              </div>
            ) : filterAppointments(activeTab).length === 0 ? (
              <div className="admin-appointment-empty-state">
                <CalendarIconNav />
                <h3 className="admin-appointment-empty-title">
                  {activeTab === "all"
                    ? "No Appointments"
                    : `No ${
                        activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                      } Appointments`}
                  {allRange !== "all"
                    ? ` ${ALL_RANGE_LABELS[allRange]}`
                    : activeTab === "all"
                      ? " Yet"
                      : ""}
                </h3>
                <p className="admin-appointment-empty-text">
                  {allRange !== "all"
                    ? `Nothing scheduled in this range. Switch to "All Time" to see every appointment.`
                    : activeTab === "all"
                      ? "Appointment requests in your department will appear here."
                      : `There are no ${activeTab} appointments in your department.`}
                </p>
              </div>
            ) : (
              filterAppointments(activeTab).map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onViewDetails={handleViewDetails}
                />
              ))
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}
