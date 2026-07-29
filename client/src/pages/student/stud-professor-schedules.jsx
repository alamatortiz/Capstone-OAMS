import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChevronLeft, GraduationCap as LucideGraduationCap, AlertCircle } from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getCollegeLogo } from "../../data/collegeLogo";
import api from "../../utils/api";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import { connectSocket } from "../../utils/socket";
import { getManilaDateString, formatManilaDate } from "../../utils/dateTime";

import "./stud-professor-schedules.css";

// ─── Content Icons ─────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const GraduationCapIcon = () => <LucideGraduationCap />;
const ChevronRightIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const BuildingIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="2" width="18" height="20" rx="2" ry="2"></rect>
    <line x1="9" y1="2" x2="9" y2="22"></line>
    <line x1="15" y1="2" x2="15" y2="22"></line>
    <line x1="3" y1="7" x2="21" y2="7"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
  </svg>
);
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const MapPinIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
const CalendarIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const Loader2Icon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);
// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfessorSchedule() {
  const location = useLocation();
  const cameFrom = location.state?.from ?? "/student/dashboard";
  const cameFromLabel = location.state?.fromLabel ?? "Home";

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("departments");
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  // ── Live data state ───────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Tracks the Manila calendar date so the next-occurrence day math below
  // recomputes if a student leaves this tab open across a midnight rollover.
  const [todayAnchor, setTodayAnchor] = useState(() => getManilaDateString());

  // Mirrors `departments` for the catch block below, without making
  // fetchSchedules depend on (and change identity with) the state itself.
  const departmentsRef = useRef(departments);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);

  const fetchSchedules = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get("/student/professor-schedules");
      setDepartments(data.departments ?? []);
    } catch (err) {
      console.error("Fetch professor schedules error:", err);
      if (departmentsRef.current.length === 0) {
        setLoadError("Could not load professor schedules. Please try again.");
      } else {
        toast.error("Could not refresh professor schedules.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ── Live updates: refetch when a professor toggles Available/Unavailable ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    socket.on("faculty:availability-status-changed", fetchSchedules);

    return () => {
      socket.off("faculty:availability-status-changed", fetchSchedules);
    };
  }, [fetchSchedules]);

  // Fallback poll: a student browsing a professor from another college is in
  // their own department's socket room, not the professor's, so
  // faculty:availability-status-changed events for that professor never
  // reach them -- this keeps availability status from drifting stale.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchSchedules();
      const nowStr = getManilaDateString();
      setTodayAnchor((prev) => (prev === nowStr ? prev : nowStr));
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  // The department currently selected, derived from live data
  const selectedDepartment = useMemo(
    () => departments.find((d) => d.departmentId === selectedDeptId) ?? null,
    [departments, selectedDeptId],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDepartmentSelect = (deptId) => {
    setSelectedDeptId(deptId);
    setViewMode("schedules");
  };

  const handleBack = () => {
    setViewMode("departments");
    setSelectedDeptId(null);
  };

  // Groups a faculty member's flat availability[] into day-ordered buckets
  const getDaySchedules = (professor) => {
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const groupedByDay = {};

    (professor.availability ?? []).forEach((schedule) => {
      if (!groupedByDay[schedule.day]) groupedByDay[schedule.day] = [];
      groupedByDay[schedule.day].push(schedule);
    });

    return dayOrder
      .filter((day) => groupedByDay[day])
      .map((day) => ({ day, schedules: groupedByDay[day] }));
  };

  // The next upcoming calendar date for a given weekday name, anchored to
  // Manila "today" -- never a date that's already passed (if today IS that
  // weekday, returns today's date).
  const DAY_ORDER_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nextOccurrenceDateStr = (dayName, anchorStr) => {
    const [y, m, d] = anchorStr.split("-").map(Number);
    const anchor = new Date(y, m - 1, d);
    const diff = (DAY_ORDER_FULL.indexOf(dayName) - anchor.getDay() + 7) % 7;
    anchor.setDate(anchor.getDate() + diff);
    return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`;
  };

  return (
    <StudentPageShell
      outerClassName="psched-with-sidebar"
      mainClassName="psched-main"
    >
        <div className="professor-schedule-page">
          {/* Header */}
          <PageHeader
            breadcrumb={
              viewMode === "schedules" ? (
                <button className="breadcrumb-link" onClick={handleBack}>
                  <ChevronLeft className="breadcrumb-icon" />
                  Back to Departments
                </button>
              ) : (
                <Link to={cameFrom} className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  {cameFromLabel}
                </Link>
              )
            }
            icon={<GraduationCapIcon />}
            title="Professor Schedules"
            subtitle="View faculty consultation hours and availability"
          />

          {/* Loading state */}
          {loading && (
            <div className="empty-state">
              <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading professor schedules…</p>
            </div>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="empty-state">
              <AlertCircle />
              <p>{loadError}</p>
              <button
                className="breadcrumb-link"
                style={{ marginTop: "0.5rem" }}
                onClick={fetchSchedules}
              >
                Retry
              </button>
            </div>
          )}

          {/* Departments View */}
          {!loading && !loadError && viewMode === "departments" && (
            <div className="departments-grid">
              {departments.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle />
                  <p>No faculty schedules are available yet.</p>
                </div>
              ) : (
                departments.map((dept) => {
                  const logoSrc = getCollegeLogo(dept.departmentName);
                  const professorCount = dept.faculty?.length ?? 0;

                  return (
                    <div
                      key={dept.departmentId}
                      className="department-card"
                      onClick={() => handleDepartmentSelect(dept.departmentId)}
                    >
                      <div className="card-logo-wrap">
                        <img
                          src={logoSrc}
                          alt={`${dept.departmentName} logo`}
                          className="college-logo-img"
                        />
                      </div>
                      <div className="card-info">
                        <h3 className="psched-card-title">{dept.departmentName}</h3>
                        <span className="card-abbrev">{dept.departmentAbbrev}</span>
                      </div>
                      <div className="card-meta">
                        <div className="card-badge">
                          {professorCount}{" "}
                          {professorCount === 1 ? "Faculty" : "Faculty Members"}
                        </div>
                        <ChevronRightIcon />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Schedules View */}
          {!loading &&
            !loadError &&
            viewMode === "schedules" &&
            selectedDepartment && (
              <div className="schedules-view">
                {/* Department Header */}
                <div className="department-header-card">
                  <div className="department-header-content">
                    <div className="department-logo-wrapper">
                      <img
                        src={getCollegeLogo(selectedDepartment.departmentName)}
                        alt={selectedDepartment.departmentName}
                        className="department-logo"
                      />
                    </div>
                    <div>
                      <h2>{selectedDepartment.departmentName}</h2>
                    </div>
                  </div>
                </div>

                {/* Professors List */}
                <div className="professors-list">
                  {selectedDepartment.faculty.length === 0 ? (
                    <div className="empty-state">
                      <AlertCircle />
                      <p>No faculty members found for this department.</p>
                    </div>
                  ) : (
                    selectedDepartment.faculty.map((professor) => {
                      const isUnavailable =
                        professor.availabilityStatus === "unavailable";
                      return (
                      <div
                        key={professor.facultyId}
                        className={`professor-card${isUnavailable ? " professor-card-unavailable" : ""}`}
                      >
                        <div className="professor-header">
                          <div className="professor-avatar">
                            <UserIcon />
                          </div>
                          <div className="professor-info">
                            <div className="professor-name-row">
                              <h3 className="professor-name">{professor.name}</h3>
                              {isUnavailable ? (
                                <span className="professor-unavailable-badge">
                                  Unavailable
                                </span>
                              ) : (
                                <span className="professor-available-badge">
                                  Available
                                </span>
                              )}
                            </div>
                            <p className="professor-position">
                              {professor.position}
                            </p>
                            <p className="professor-specialization">
                              {professor.specialization}
                            </p>
                            <p className="professor-email">{professor.email}</p>
                          </div>
                        </div>

                        {/* Consultation Hours */}
                        <div className="consultation-section">
                          <h4 className="consultation-title">
                            Consultation Hours
                          </h4>
                          {isUnavailable ? (
                            <div className="consultation-unavailable-notice">
                              <AlertCircle />
                              <p>
                                This professor is currently unavailable and is
                                not accepting consultations right now.
                              </p>
                            </div>
                          ) : getDaySchedules(professor).length === 0 ? (
                            <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
                              No consultation hours have been set yet.
                            </p>
                          ) : (
                            <div className="schedule-list">
                              {getDaySchedules(professor).map(
                                ({ day, schedules }) => (
                                  <div key={day} className="day-schedule">
                                    <div className="day-header">
                                      <CalendarIcon />
                                      <span className="day-name">{day}</span>
                                      <span className="day-date">
                                        {formatManilaDate(nextOccurrenceDateStr(day, todayAnchor), { month: "short", day: "numeric" })}
                                      </span>
                                    </div>
                                    <div className="day-slots">
                                      {schedules.map((schedule, idx) => (
                                        <div
                                          key={idx}
                                          className="schedule-slot"
                                        >
                                          <div className="time-block">
                                            <ClockIcon />
                                            <span className="time-range">
                                              {schedule.timeStart} –{" "}
                                              {schedule.timeEnd}
                                            </span>
                                          </div>
                                          <div className="location-block">
                                            <MapPinIcon />
                                            <span className="location">
                                              {schedule.location}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
        </div>
    </StudentPageShell>
  );
}
