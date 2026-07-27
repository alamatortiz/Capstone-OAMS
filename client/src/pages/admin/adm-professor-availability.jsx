import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-professor-availability.css";
import api from "../../utils/api";
import AdminPageShell from "../../components/AdminPageShell";
import ChatWidget from "../../components/ChatWidget";
import PageHeader from "../../components/PageHeader";
import { connectSocket } from "../../utils/socket";

// ── Icons ──────────────────────────────────────────────────────────────────
const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const CalendarSmallIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16v16H4z" opacity="0"></path>
    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
    <polyline points="22 6 12 13 2 6"></polyline>
  </svg>
);
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const STATUS_TABS = ["all", "available", "busy", "unavailable"];

export default function AdminProfessorAvailability() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchFaculty = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/faculty-availability");
      setFaculty(res.data.faculty || []);
    } catch (err) {
      console.error("Failed to fetch faculty availability:", err);
      setError("Failed to load faculty data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // ── Live updates: refetch when a faculty member's schedule changes ────────
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["appointment:slot-updated", "appointment:slot-removed"];
    events.forEach((event) => socket.on(event, fetchFaculty));

    return () => {
      events.forEach((event) => socket.off(event, fetchFaculty));
    };
  }, [fetchFaculty]);

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("available"))
      return `There are currently ${faculty.filter((f) => f.status === "available").length} faculty members available.`;
    if (i.includes("busy"))
      return `${faculty.filter((f) => f.status === "busy").length} faculty members are busy right now.`;
    if (i.includes("leave") || i.includes("unavailable"))
      return `${faculty.filter((f) => f.status === "unavailable").length} faculty members are unavailable today.`;
    if (i.includes("total"))
      return `There are ${faculty.length} faculty members in your department.`;
    return "I can help you check who's available, busy, or on leave. What do you need?";
  };

  const filteredFaculty = faculty.filter((f) =>
    statusFilter === "all" || f.status === statusFilter
  );

  const getStatusBadgeClass = (status) => `apa-status-badge apa-status-${status}`;
  const getSlotClass = (status) => `apa-slot apa-slot-${status}`;

  const getInitials = (name) =>
    name
      .split(" ")
      .filter((n) => /^[A-Za-z]/.test(n))
      .map((n) => n[0])
      .join("")
      .slice(0, 3);

  return (
    <AdminPageShell
      outerClassName="apa-dashboard-with-sidebar"
      mainClassName="apa-dashboard-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! I'm your OAMS Assistant. How can I help you check faculty availability today?"
          getBotResponse={generateBotResponse}
        />
      }
    >
        <div className="apa-page-container">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<UsersIcon className="apa-icon-lg" />}
            iconClassName="apa-title-icon"
            title="Faculty Availability"
            subtitle="Monitor faculty consultation schedules and availability for your department"
            headerClassName="apa-page-header"
            breadcrumbClassName="prof-breadcrumb"
            titleSectionClassName="apa-title-section"
            titleClassName="apa-page-title"
            subtitleClassName="apa-page-subtitle"
          />

          {/* Status Tabs */}
          <div className="apa-tabs">
            {STATUS_TABS.map((tab) => {
              const count = tab === "all" ? faculty.length : faculty.filter((f) => f.status === tab).length;
              return (
                <button
                  key={tab}
                  className={`apa-tab ${statusFilter === tab ? "apa-tab-active" : ""}`}
                  onClick={() => setStatusFilter(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="apa-tab-count">{loading ? "—" : count}</span>
                </button>
              );
            })}
          </div>

          {/* Faculty List */}
          <div className="apa-faculty-list">
            {loading && (
              <div className="apa-empty-state">
                <p className="apa-empty-text">Loading faculty data...</p>
              </div>
            )}

            {!loading && error && (
              <div className="apa-empty-state">
                <XCircleIcon className="apa-empty-icon" />
                <h3 className="apa-empty-title">Error loading faculty</h3>
                <p className="apa-empty-text">{error}</p>
              </div>
            )}

            {!loading && !error && filteredFaculty.map((f) => (
              <div key={f.id} className="apa-faculty-card">
                <div className="apa-faculty-top">
                  <div className="apa-faculty-identity">
                    <div className="apa-faculty-avatar">{getInitials(f.name)}</div>
                    <div className="apa-faculty-identity-text">
                      <h3 className="apa-faculty-name">{f.name}</h3>
                      <p className="apa-faculty-position">{f.position}</p>
                      <p className="apa-faculty-college">{f.college}</p>
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(f.status)}>
                    <span className="apa-status-dot"></span>
                    {f.status}
                  </span>
                </div>

                {f.currentActivity && (
                  <div className="apa-current-activity">
                    <strong>Current:</strong>&nbsp;{f.currentActivity}
                  </div>
                )}

                <div className="apa-faculty-meta">
                  <div className="apa-meta-row">
                    <CalendarSmallIcon className="apa-meta-icon" />
                    <span className="apa-meta-label">Next Available:</span>
                    <span className="apa-meta-value">{f.nextAvailableSlot}</span>
                  </div>
                  <div className="apa-meta-row apa-meta-row-contact">
                    <span className="apa-meta-contact">
                      <MailIcon className="apa-meta-icon" />
                      {f.email}
                    </span>
                  </div>
                </div>

                {f.todaySchedule.length > 0 && (
                  <div className="apa-schedule-section">
                    <p className="apa-schedule-label">Today's Schedule</p>
                    <div className="apa-schedule-grid">
                      {f.todaySchedule.map((slot, idx) => (
                        <div key={`${slot.time}-${slot.activity}`} className={getSlotClass(slot.status)}>
                          <div className="apa-slot-time-row">
                            <ClockIcon className="apa-slot-icon" />
                            <span className="apa-slot-time">{slot.time}</span>
                          </div>
                          <p className="apa-slot-activity">{slot.activity}</p>
                          {slot.location && slot.location !== "N/A" && (
                            <div className="apa-slot-location-row">
                              <MapPinIcon className="apa-slot-icon" />
                              <span className="apa-slot-location">{slot.location}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading && !error && filteredFaculty.length === 0 && (
              <div className="apa-empty-state">
                <UsersIcon className="apa-empty-icon" />
                <h3 className="apa-empty-title">No faculty found</h3>
                <p className="apa-empty-text">
                  {faculty.length === 0
                    ? "No faculty members are assigned to your department."
                    : "Try adjusting your filters."}
                </p>
              </div>
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}
