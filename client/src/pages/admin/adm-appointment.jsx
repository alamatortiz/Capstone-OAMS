import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-appointment.css";
import api from "../../utils/api";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import { COLLEGES } from "../../data/colleges";
import { formatManilaDate } from "../../utils/dateTime";
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
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const PersonIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function AdminAppointment() {
  const { user: authUser } = useAuth();

  const [selectedCollege, setSelectedCollege] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  useLockBodyScroll(Boolean(selectedAppointment));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const handleViewDetails = (appointment) =>
    setSelectedAppointment(appointment);
  const handleCloseDetails = () => setSelectedAppointment(null);
  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
  };

  // Mirrors `appointments` for the catch block below, without making
  // fetchAppointments depend on (and change identity with) the state itself.
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const fetchAppointments = useCallback(async () => {
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

  const tabCounts = {
    all: searchFiltered.length,
    pending: searchFiltered.filter((a) => a.status === "pending").length,
    approved: searchFiltered.filter((a) => a.status === "approved").length,
    completed: searchFiltered.filter((a) => a.status === "completed").length,
    rejected: searchFiltered.filter((a) => a.status === "rejected").length,
  };

  const filterAppointments = (status) =>
    status === "all"
      ? searchFiltered
      : searchFiltered.filter((a) => a.status === status);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "admin-appointment-badge-pending",
        icon: AlertCircleIcon,
      },
      approved: {
        color: "admin-appointment-badge-approved",
        icon: CheckCircleIcon,
      },
      rejected: {
        color: "admin-appointment-badge-rejected",
        icon: AlertCircleIcon,
      },
      completed: {
        color: "admin-appointment-badge-completed",
        icon: CheckCircleIcon,
      },
      cancelled: {
        color: "admin-appointment-badge-cancelled",
        icon: AlertCircleIcon,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`admin-appointment-status-badge ${config.color}`}>
        <Icon />
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };

  const AppointmentCard = ({ appointment, onViewDetails }) => {
    const collegeData = COLLEGES.find((c) => c.name === appointment.college);
    const handleViewDetails = (appointment) => {
      console.log("Viewing details for:", appointment);
    };
    return (
      <div key={appointment.id} className="admin-appointment-card">
        <div className="admin-appointment-card-content">
          <div className="admin-appointment-card-header">
            <div className="admin-appointment-card-left">
              <div className="admin-appointment-college-badge">
                <BuildingIcon />
              </div>
              <div className="admin-appointment-student-info">
                <PersonIcon className="admin-appointment-student-person-icon" />
                <h4 className="admin-appointment-student-name">
                  {appointment.studentName}
                </h4>
                <span className="admin-appointment-student-id">
                  ({appointment.studentId})
                </span>
              </div>

              <p className="admin-appointment-purpose">{appointment.purpose}</p>
            </div>
            <div className="admin-appointment-card-right">
              {getStatusBadge(appointment.status)}
            </div>
          </div>

          <div className="admin-appointment-card-details">
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Professor</span>
              <span className="admin-appointment-detail-value">
                {appointment.professor}
              </span>
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
            <span className="admin-appointment-requested-text">
              Requested: {appointment.requestedAt}
            </span>
            <button
              className="admin-appointment-view-details-btn"
              onClick={() => onViewDetails(appointment)}
            >
              View Details
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
            <div className="admin-appointment-modal-overlay">
              <div
                className="admin-appointment-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-appointment-modal-header">
                  <div>
                    <h2 className="admin-appointment-modal-title">
                      Appointment Details
                    </h2>
                    <p className="admin-appointment-modal-subtitle">
                      Read-only — monitoring view
                    </p>
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
                  <div className="admin-appointment-modal-status-row">
                    {getStatusBadge(selectedAppointment.status)}
                    <span className="admin-appointment-modal-tracking">
                      #{selectedAppointment.id}
                    </span>
                  </div>

                  <div className="admin-appointment-modal-grid">
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Student</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.studentName} (
                        {selectedAppointment.studentId})
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Course</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.studentCourse ?? "—"}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field">
                      <span className="admin-appointment-modal-label">Faculty</span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.professor}
                      </span>
                    </div>
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
                        Purpose / Notes
                      </span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.purpose}
                      </span>
                    </div>
                    <div className="admin-appointment-modal-field admin-appointment-modal-field--full">
                      <span className="admin-appointment-modal-label">
                        Requested At
                      </span>
                      <span className="admin-appointment-modal-value">
                        {selectedAppointment.requestedAt}
                      </span>
                    </div>
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
            breadcrumb={<Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<CalendarIconNav />}
            iconClassName="admin-appointment-title-icon"
            title="Centralized Appointment Management"
            subtitle="Oversee appointment system across all colleges"
            headerClassName="admin-appointment-page-header"
            breadcrumbClassName="prof-breadcrumb"
            titleSectionClassName="admin-appointment-title-section"
            titleClassName="admin-appointment-page-title"
            subtitleClassName="admin-appointment-page-subtitle"
          />

          {/* Filters */}
          <div className="admin-appointment-filters-card">
            <div className="admin-appointment-filters-content">
              <div className="admin-appointment-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by student name, ID, or professor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-appointment-search-input"
                />
              </div>
            </div>
          </div>

          {/* Appointments List with Tabs */}
          <div className="admin-appointment-overview-card">
            <div className="admin-appointment-overview-header">
              <h2 className="admin-appointment-overview-title">
                Appointment Overview
              </h2>
              <p className="admin-appointment-overview-subtitle">
                System-wide appointment tracking and management
              </p>
            </div>
            <div className="admin-appointment-tabs-container">
              <div className="admin-appointment-tabs-list">
                {["all", "pending", "approved", "completed", "rejected"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`admin-appointment-tab-trigger ${
                        activeTab === tab ? "active" : ""
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      <span className="admin-appointment-tab-count">
                        {loading ? "—" : tabCounts[tab]}
                      </span>
                    </button>
                  ),
                )}
              </div>

              <div className="admin-appointment-tabs-content">
                {filterAppointments(activeTab).length === 0 ? (
                  <div className="admin-appointment-empty-state">
                    <CalendarIconNav />
                    <p className="admin-appointment-empty-text">
                      No appointments found
                    </p>
                  </div>
                ) : (
                  <div className="admin-appointment-cards-list">
                    {filterAppointments(activeTab).map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </AdminPageShell>
  );
}
