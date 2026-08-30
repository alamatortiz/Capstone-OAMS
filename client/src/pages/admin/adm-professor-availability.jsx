import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-professor-availability.css";
import api from "../../utils/api";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import { useLiveRefetch } from "../../hooks/useLiveRefetch";
import { getManilaDateString, formatManilaDate } from "../../utils/dateTime";

// ── Icons ──────────────────────────────────────────────────────────────────
const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
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
const AlertCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
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
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const STATUS_TABS = ["all", "available", "busy", "unavailable"];

// A professor's row here changes on a status toggle / login / logout
// (faculty:availability-status-changed) or a weekly consultation-slot edit
// (appointment:slot-updated / -removed).
const FACULTY_LIVE_EVENTS = [
  "faculty:availability-status-changed",
  "appointment:slot-updated",
  "appointment:slot-removed",
];

// The next upcoming calendar date for a weekday name, anchored to Manila
// "today" -- never a date already passed. Copied from stud-professor-schedules
// so the two screens label consultation days identically.
const DAY_ORDER_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const nextOccurrenceDateStr = (dayName, anchorStr) => {
  const [y, m, d] = anchorStr.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  const diff = (DAY_ORDER_FULL.indexOf(dayName) - anchor.getDay() + 7) % 7;
  anchor.setDate(anchor.getDate() + diff);
  return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`;
};

// Groups a faculty member's flat weeklyAvailability[] into day-ordered buckets.
const getDaySchedules = (faculty) => {
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const groupedByDay = {};
  (faculty.weeklyAvailability ?? []).forEach((slot) => {
    if (!groupedByDay[slot.day]) groupedByDay[slot.day] = [];
    groupedByDay[slot.day].push(slot);
  });
  return dayOrder
    .filter((day) => groupedByDay[day])
    .map((day) => ({ day, schedules: groupedByDay[day] }));
};

export default function AdminProfessorAvailability() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  // Tracks the Manila calendar date so the next-occurrence day math recomputes
  // if the tab is left open across a midnight rollover.
  const [todayAnchor, setTodayAnchor] = useState(() => getManilaDateString());

  // Mirrors `faculty` for the catch block below, without making fetchFaculty
  // depend on (and change identity with) the state itself.
  const facultyRef = useRef(faculty);
  useEffect(() => { facultyRef.current = faculty; }, [faculty]);

  const fetchFaculty = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/admin/faculty-availability");
      setFaculty(res.data.faculty || []);
    } catch (err) {
      console.error("Failed to fetch faculty availability:", err);
      if (facultyRef.current.length === 0) {
        setError("Failed to load faculty data. Please try again.");
      } else {
        toast.error("Could not refresh faculty availability.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // ── Live updates (also reconciles on socket reconnect). ──
  useLiveRefetch(FACULTY_LIVE_EVENTS, fetchFaculty);

  // ── Fallback poll: the "Busy" state is time-based (an appointment window
  // opening/closing fires no socket event), and a student/admin on another
  // college's page isn't in this professor's socket room. Same 45s pattern as
  // stud-professor-schedules.jsx; also advances todayAnchor across midnight.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchFaculty();
      const nowStr = getManilaDateString();
      setTodayAnchor((prev) => (prev === nowStr ? prev : nowStr));
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchFaculty]);

  const filteredFaculty = faculty.filter((f) =>
    statusFilter === "all" || f.status === statusFilter
  );

  const getStatusBadgeClass = (status) => `apa-status-badge apa-status-${status}`;

  return (
    <AdminPageShell
      outerClassName="apa-dashboard-with-sidebar"
      mainClassName="apa-dashboard-main"
    >
        <div className="apa-page-container">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<UsersIcon className="apa-icon-lg" />}
            iconClassName="apa-title-icon"
            title="Faculty Availability"
            subtitle="Monitor faculty consultation schedules and availability for your department."
            headerClassName="apa-page-header"
            breadcrumbClassName="page-breadcrumb"
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

            {!loading && !error && filteredFaculty.map((f) => {
              const isUnavailable = f.status === "unavailable";
              const daySchedules = getDaySchedules(f);
              return (
                <div
                  key={f.id}
                  className={`apa-faculty-card${isUnavailable ? " apa-faculty-card-unavailable" : ""}`}
                >
                  <div className="apa-faculty-header">
                    <div className="apa-faculty-avatar">
                      <UserIcon className="apa-avatar-icon" />
                    </div>
                    <div className="apa-faculty-identity-text">
                      <div className="apa-faculty-name-row">
                        <h3 className="apa-faculty-name">{f.name}</h3>
                        <span className={getStatusBadgeClass(f.status)}>
                          <span className="apa-status-dot"></span>
                          {f.status}
                        </span>
                      </div>
                      <p className="apa-faculty-position">{f.position}</p>
                      {f.specialization && (
                        <p className="apa-faculty-spec">{f.specialization}</p>
                      )}
                      <p className="apa-faculty-email">{f.email}</p>
                    </div>
                  </div>

                  <div className="apa-consult-section">
                    <h4 className="apa-consult-title">Consultation Hours</h4>
                    {isUnavailable ? (
                      <div className="apa-consult-unavailable">
                        <AlertCircleIcon className="apa-consult-unavailable-icon" />
                        <p>
                          This professor is currently unavailable and is not
                          accepting consultations right now.
                        </p>
                      </div>
                    ) : daySchedules.length === 0 ? (
                      <p className="apa-consult-empty">
                        No consultation hours have been set yet.
                      </p>
                    ) : (
                      <div className="apa-schedule-list">
                        {daySchedules.map(({ day, schedules }) => (
                          <div key={day} className="apa-day-schedule">
                            <div className="apa-day-header">
                              <CalendarSmallIcon className="apa-day-icon" />
                              <span className="apa-day-name">{day}</span>
                              <span className="apa-day-date">
                                {formatManilaDate(
                                  nextOccurrenceDateStr(day, todayAnchor),
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                            </div>
                            <div className="apa-day-slots">
                              {schedules.map((slot, idx) => (
                                <div key={idx} className="apa-sched-slot">
                                  <div className="apa-slot-time-block">
                                    <ClockIcon className="apa-slot-icon" />
                                    <span className="apa-slot-time-range">
                                      {slot.timeStart} – {slot.timeEnd}
                                    </span>
                                  </div>
                                  <div className="apa-slot-loc-block">
                                    <MapPinIcon className="apa-slot-icon" />
                                    <span className="apa-slot-loc">
                                      {slot.location}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

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
