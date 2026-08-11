import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import StudentPageShell from "../../components/StudentPageShell";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/PageHeader";
import AppointmentListItem from "../../components/AppointmentListItem";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./stud-appointments.css";
import api from "../../utils/api";
import { formatManilaDate, getManilaDateString } from "../../utils/dateTime";
import { toast } from "sonner";
import CalendarGrid from "../../components/CalendarGrid";
import { useAuth } from "../../context/AuthContext";
import { formatCollegeLabel } from "../../utils/formatCollege";
import { connectSocket } from "../../utils/socket";
import { ChevronDown, ChevronLeft, CalendarDays, ClipboardList, Calendar, Clock, MapPin, Users, XCircle, CheckCircle2, GraduationCap as LucideGraduationCap } from "lucide-react";

// ─── Content Icons ────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const CalendarIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const MapPinIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const UsersIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const Loader2Icon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
export default function AppointmentsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [selectedApptType, setSelectedApptType] = useState("");
  const [collegeOptions, setCollegeOptions] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [hasUserSetCollege, setHasUserSetCollege] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState("");
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState("");
  useLockBodyScroll(showBookDialog && !!selectedSlot);
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab === "bookings" ? "bookings" : "slots",
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = getManilaDateString().split("-").map(Number);
    return { year, month };
  });
  // Tracks the Manila calendar date so twoWeekDates below can recompute if a
  // student leaves this tab open across a midnight/week rollover -- the 15s
  // poll refreshes slot data but wouldn't otherwise catch a stale date window.
  const [todayAnchor, setTodayAnchor] = useState(() => getManilaDateString());

  // Default the college filter to the student's own college once auth
  // finishes loading -- a useState initializer would race ahead of user
  // being available and get stuck on "All Colleges" forever. Only applies
  // until the student picks a filter themselves.
  useEffect(() => {
    if (!hasUserSetCollege && user?.departmentAbbrev) {
      setSelectedCollege(user.departmentAbbrev);
    }
  }, [user?.departmentAbbrev, hasUserSetCollege]);

  // Mirror the latest data for the catch blocks below, without making the
  // fetch callbacks depend on (and change identity with) the state itself --
  // that would reset the 15s poll effect's interval on every successful tick.
  const slotsRef = useRef(slots);
  useEffect(() => { slotsRef.current = slots; }, [slots]);
  const myBookingsRef = useRef(myBookings);
  useEffect(() => { myBookingsRef.current = myBookings; }, [myBookings]);

  const fetchSlots = useCallback(async () => {
    setSlotsError(null);
    try {
      const { data } = await api.get("/student/appointments/available-slots");
      setSlots(data.slots ?? []);
    } catch (err) {
      // Only take over the whole tab with a blocking error on the true first
      // load -- a background poll/socket refresh failing shouldn't wipe out
      // an already-good, visible list.
      if (slotsRef.current.length === 0) {
        setSlotsError("Could not load available slots. Please try again.");
      } else {
        toast.error("Could not refresh available slots.");
      }
    } finally { setSlotsLoading(false); }
  }, []);

  const fetchMyBookings = useCallback(async () => {
    setBookingsError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setMyBookings(data.appointments ?? []);
    } catch (err) {
      if (myBookingsRef.current.length === 0) {
        setBookingsError("Could not load your bookings. Please try again.");
      } else {
        toast.error("Could not refresh your bookings.");
      }
    } finally { setBookingsLoading(false); }
  }, []);

  useEffect(() => { fetchSlots(); fetchMyBookings(); }, [fetchSlots, fetchMyBookings]);

  // College filter options are sourced live from the departments that
  // actually have faculty (same endpoint stud-professor-schedules.jsx uses),
  // instead of a static list, so a newly added college shows up here too.
  useEffect(() => {
    const fetchCollegeOptions = async () => {
      try {
        const { data } = await api.get("/student/professor-schedules");
        setCollegeOptions(data.departments ?? []);
      } catch (err) {
        console.error("Failed to fetch college options:", err);
      }
    };
    fetchCollegeOptions();
  }, []);

  // ── Live updates: refetch slots when capacity changes elsewhere ───────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["appointment:slot-updated", "appointment:slot-removed"];
    events.forEach((event) => socket.on(event, fetchSlots));

    return () => {
      events.forEach((event) => socket.off(event, fetchSlots));
    };
  }, [fetchSlots, token]);

  // ── Live updates: refetch "My Bookings" when one of this student's own
  // appointments changes status (approval, rejection, or an auto-cancel from
  // the professor editing/removing their schedule) ──────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const handleStatusUpdate = (payload) => {
      if (payload?.reason === "schedule_removed" || payload?.reason === "schedule_changed") {
        toast.error("An appointment was cancelled because the professor changed their schedule. Please book a new time.");
      }
      fetchMyBookings();
    };

    socket.on("appointment:status-updated", handleStatusUpdate);

    return () => {
      socket.off("appointment:status-updated", handleStatusUpdate);
    };
  }, [fetchMyBookings, token]);

  // Fallback poll: a student browsing a professor from another college is
  // in their own department's socket room, not the professor's, so
  // appointment:slot-updated/removed events for that professor never reach
  // them -- this keeps spotsLeft/removed slots from drifting stale.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchSlots();
      const nowStr = getManilaDateString();
      setTodayAnchor((prev) => (prev === nowStr ? prev : nowStr));
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  const availableSlots = useMemo(() => slots.filter((slot) => {
    const matchesDate = !selectedDate || slot.date === selectedDate;
    const matchesCollege = !selectedCollege || slot.college === selectedCollege;
    const matchesProfessor = !selectedProfessorId || String(slot.professorId) === selectedProfessorId;
    return matchesDate && matchesCollege && matchesProfessor;
  }), [slots, selectedDate, selectedCollege, selectedProfessorId]);

  // The Available Slots tab only ever shows this week and next week (Monday–Saturday,
  // matching the days a faculty_availability row can recur on). Recomputes
  // when todayAnchor changes (see the poll above), so a tab left open across
  // a midnight/week rollover doesn't keep showing a stale window.
  const twoWeekDates = useMemo(() => {
    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const [y, m, d] = todayAnchor.split("-").map(Number);
    const today = new Date(y, m - 1, d);
    const dow = today.getDay(); // 0=Sun..6=Sat
    const monday = new Date(today);
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const buildWeek = (weekOffset) => Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(dt.getDate() + weekOffset * 7 + i);
      return toDateStr(dt);
    });
    return { thisWeek: buildWeek(0), nextWeek: buildWeek(1) };
  }, [todayAnchor]);

  const twoWeekDateSet = useMemo(
    () => new Set([...twoWeekDates.thisWeek, ...twoWeekDates.nextWeek]),
    [twoWeekDates],
  );

  const isPastDate = (dateString) => dateString < getManilaDateString();

  const weekInfo = (dateString) => (twoWeekDates.thisWeek.includes(dateString)
    ? { key: "this-week", label: "This Week" }
    : { key: "next-week", label: "Next Week" });

  // When a specific date is picked via the calendar filter, show only that date;
  // otherwise cap the listing to the this-week/next-week window.
  const visibleSlots = useMemo(
    () => (selectedDate ? availableSlots : availableSlots.filter((s) => twoWeekDateSet.has(s.date))),
    [availableSlots, selectedDate, twoWeekDateSet],
  );

  const slotsByDate = useMemo(() => visibleSlots.reduce((acc, slot) => {
    (acc[slot.date] ||= []).push(slot); return acc;
  }, {}), [visibleSlots]);

  const activeBookings = myBookings.filter((b) => b.status === "pending" || b.status === "approved");

  const sortedActiveBookings = useMemo(
    () => [...activeBookings].sort((a, b) => a.date.localeCompare(b.date)),
    [activeBookings],
  );

  const cancelTarget = myBookings.find((b) => b.id === cancelConfirmId) ?? null;

  // Mirrors the server-side dup guard in POST /appointments/book-slot, which
  // blocks rebooking the same (availabilityId, date) pair unless the prior
  // booking was cancelled or rejected.
  const bookedSlotKeys = useMemo(() => new Set(
    myBookings
      .filter((b) => b.status !== "cancelled" && b.status !== "rejected")
      .map((b) => `${b.availabilityId}_${b.date}`)
  ), [myBookings]);

  const availableProfessors = useMemo(() => {
    const seen = new Set();
    return slots.filter((s) => !selectedCollege || s.college === selectedCollege).filter((s) => { const id = String(s.professorId); if (seen.has(id)) return false; seen.add(id); return true; })
      .map((s) => ({ id: String(s.professorId), name: s.professorName })).sort((a, b) => a.name.localeCompare(b.name));
  }, [slots, selectedCollege]);

  const calendarDays = useMemo(() => {
    if (!selectedProfessorId) return [];
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const profSlots = slots.filter((s) => String(s.professorId) === selectedProfessorId && twoWeekDateSet.has(s.date));
    const slotDates = new Set(profSlots.map((s) => s.date));
    const today = getManilaDateString();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: dateStr, status: dateStr >= today && slotDates.has(dateStr) ? "available" : "unavailable" });
    }
    return result;
  }, [slots, selectedProfessorId, calendarMonth, twoWeekDateSet]);

  const colleges = collegeOptions.map((d) => ({
    value: d.departmentAbbrev,
    label: formatCollegeLabel(d.departmentAbbrev, d.departmentName),
  }));

  const closeBookDialog = () => {
    setShowBookDialog(false);
    setSelectedApptType("");
    setPurpose("");
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || submitting) return;
    if (selectedSlot.appointmentTypes?.length > 0 && !selectedApptType) {
      toast.error("Please select an appointment type"); return;
    }
    setSubmitting(true);
    try {
      await api.post("/student/appointments/book-slot", {
        availabilityId: selectedSlot.availabilityId,
        appointmentDate: selectedSlot.date,
        appointmentType: selectedApptType || null,
        purpose: purpose.trim(),
      });
      toast.success("Appointment booked successfully!");
      setPurpose(""); setSelectedApptType(""); setSelectedSlot(null); setShowBookDialog(false);
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to book appointment. The slot may no longer be available.");
    } finally { setSubmitting(false); }
  };

  const doCancel = async () => {
    const appointmentId = cancelConfirmId;
    if (!appointmentId) return;
    if (cancellingId) {
      toast.info("Please wait for the current cancellation to finish.");
      return;
    }
    setCancelConfirmId(null);
    setCancellingId(appointmentId);
    try {
      await api.delete(`/student/appointments/${appointmentId}`);
      toast.success("Appointment cancelled successfully");
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to cancel the appointment.");
    } finally { setCancellingId(null); }
  };

  const formatDate = (dateString) => formatManilaDate(`${dateString}T00:00:00+08:00`, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formatTime = (time) => { const [hours, minutes] = time.split(":"); const hour = parseInt(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`; };

  const renderDateGroup = (date) => {
    const daySlots = slotsByDate[date] ?? [];
    if (daySlots.length === 0) {
      return (
        <div key={date} className="slots-date-group slots-date-group--disabled">
          <div className="date-header">
            <Calendar style={{ width: "1.5rem", height: "1.5rem", color: "var(--text-tertiary)" }} />
            <h3>{formatDate(date)}</h3>
          </div>
          <p className="date-count date-count--disabled">{isPastDate(date) ? "This day has already passed" : "No slots available"}</p>
        </div>
      );
    }
    return (
      <div key={date} className="slots-date-group">
        <div className="date-header">
          <Calendar style={{ width: "1.5rem", height: "1.5rem", color: "#a855f7" }} />
          <h3>{formatDate(date)}</h3>
        </div>
        <span className="slot-count-badge">
          <CalendarDays style={{ width: "0.85rem", height: "0.85rem" }} />
          {daySlots.length} Slots
        </span>
        <div className="slots-grid">
          {daySlots.map((slot) => {
            const isUnavailable = slot.professorAvailabilityStatus === "unavailable";
            const isAlreadyBooked = bookedSlotKeys.has(`${slot.availabilityId}_${slot.date}`);
            const isPast = !!slot.isPast;
            const isFull = !!slot.isFull;
            return (
              <div key={slot.availabilityId} className={`slot-card${(isUnavailable || isPast || isFull) ? " slot-card--unavailable" : ""}`}>
                <div className="slot-header">
                  <h4>{slot.professorName}</h4>
                  <span className="college-badge">{slot.college}</span>
                </div>
                <div className="slot-details">
                  <div className="slot-detail"><Clock style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{formatTime(slot.windowStart)} – {formatTime(slot.windowEnd)}</span></div>
                  <div className="slot-detail"><MapPin style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{slot.location}</span></div>
                  <div className="slot-detail"><Users style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{slot.spotsLeft != null ? `${slot.spotsLeft} ${slot.spotsLeft === 1 ? "spot" : "spots"} left` : "Unlimited"} {slot.maxStudents != null ? `(max ${slot.maxStudents})` : ""}</span></div>
                </div>
                {isPast ? (
                  <button className="book-btn book-btn--disabled" disabled>No Longer Available</button>
                ) : isFull ? (
                  <button className="book-btn book-btn--disabled" disabled>Fully Booked</button>
                ) : isUnavailable ? (
                  <button className="book-btn book-btn--disabled" disabled>Currently Unavailable</button>
                ) : isAlreadyBooked ? (
                  <button className="book-btn book-btn--disabled" disabled>Already Booked</button>
                ) : (
                  <button className="book-btn" onClick={() => { setSelectedSlot(slot); setSelectedApptType(""); setPurpose(""); setShowBookDialog(true); }}>Book this Slot</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <StudentPageShell
      outerClassName="appointment-with-sidebar"
      mainClassName="appointment-main"
      overlay={
        <>
          {/* Book Appointment Dialog */}
          {showBookDialog && selectedSlot && (
            <div className="dialog-overlay" onClick={closeBookDialog}>
              <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                  <h3>Confirm Appointment</h3>
                  <button className="dialog-close" onClick={closeBookDialog} disabled={submitting}><CloseIcon /></button>
                </div>
                <div className="dialog-body">
                  <div className="slot-summary">
                    <h4>{selectedSlot.professorName}</h4>
                    <div className="summary-details">
                      <div className="summary-item"><CalendarIcon /><span>{formatDate(selectedSlot.date)}</span></div>
                      <div className="summary-item"><ClockIcon /><span>{formatTime(selectedSlot.windowStart)} – {formatTime(selectedSlot.windowEnd)}</span></div>
                      <div className="summary-item"><MapPinIcon /><span>{selectedSlot.location}</span></div>
                    </div>
                  </div>
                  {selectedSlot.appointmentTypes?.length > 0 && (
                    <div className="form-group">
                      <label>Appointment Type *</label>
                      <div style={{ position: "relative" }}>
                        <select
                          className="appt-type-select"
                          value={selectedApptType}
                          onChange={(e) => setSelectedApptType(e.target.value)}
                        >
                          <option value="">Select appointment type…</option>
                          {selectedSlot.appointmentTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "1rem", height: "1rem", color: "#a855f7", pointerEvents: "none" }} />
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="purpose">Purpose of Consultation (optional)</label>
                    <textarea id="purpose" placeholder="e.g., Thesis consultation, Grade inquiry, Academic advising..." value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="textarea"></textarea>
                  </div>
                  <div className="dialog-actions">
                    <button className="btn-secondary" onClick={closeBookDialog} disabled={submitting}>Cancel</button>
                    <button className="btn-primary" onClick={handleBookSlot} disabled={submitting}>{submitting ? "Booking…" : "Confirm Booking"}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <ActionConfirmModal
            show={cancelConfirmId !== null}
            onCancel={() => setCancelConfirmId(null)}
            onConfirm={doCancel}
            title="Cancel Appointment?"
            message={
              <>
                You are about to cancel your appointment with <strong>{cancelTarget?.person}</strong> on{" "}
                <strong>{cancelTarget ? formatDate(cancelTarget.date) : ""}</strong>. This will permanently remove it — you'll need to book a new one if you change your mind.
              </>
            }
            icon={<XCircle width={22} height={22} />}
            cancelText="Keep Appointment"
            confirmText={cancellingId !== null ? "Cancelling…" : "Cancel Appointment"}
            confirmDisabled={cancellingId !== null}
          />
        </>
      }
    >
        <div className="appointment-content">
          {/* Header */}
          <PageHeader
            breadcrumb={
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<Calendar style={{ width: "1.75rem", height: "1.75rem" }} />}
            iconClassName="ab-title-icon"
            title="Appointments"
            subtitle="Schedule appointments with professors and view available slots"
          />

          {/* Professor Schedules card */}
          <Link
            to="/student/professor-schedules"
            state={{ from: "/student/appointments", fromLabel: "Appointments" }}
            className="ab-prof-sched-card"
          >
            <div className="ab-prof-sched-card-icon">
              <LucideGraduationCap />
            </div>
            <div className="ab-prof-sched-card-text">
              <span className="ab-prof-sched-card-title">Professor Schedules</span>
              <span className="ab-prof-sched-card-subtitle">Check professor consultation hours and availability across all departments</span>
            </div>
            <ChevronRightIcon />
          </Link>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <h2>Filter & Search</h2>
              <p>Optionally filter by college, professor, or date</p>
            </div>
            <div className="filters-top-row">
              <FilterSelect
                id="selectedCollege"
                label="College"
                labelClassName={undefined}
                value={selectedCollege}
                onChange={(e) => {
                  setSelectedCollege(e.target.value);
                  setHasUserSetCollege(true);
                  setSelectedProfessorId("");
                  setSelectedDate("");
                }}
                options={[
                  { value: "", label: "All Colleges" },
                  ...colleges.map((c) => ({ value: c.value, label: c.label })),
                ]}
                chevronIcon={<ChevronDown className="filter-chevron" />}
              />
              <FilterSelect
                id="selectedProfessor"
                label="Professor"
                labelClassName={undefined}
                value={selectedProfessorId}
                onChange={(e) => { setSelectedProfessorId(e.target.value); setSelectedDate(""); }}
                disabled={slotsLoading || availableProfessors.length === 0}
                options={[
                  { value: "", label: slotsLoading ? "Loading…" : availableProfessors.length === 0 ? "No professors available" : "All Professors" },
                  ...availableProfessors.map((p) => ({ value: p.id, label: p.name })),
                ]}
                chevronIcon={<ChevronDown className="filter-chevron" />}
              />
            </div>
            {selectedProfessorId && (
              <div className="filter-group filter-group--calendar">
                <label>Date</label>
                <CalendarGrid
                  year={calendarMonth.year} month={calendarMonth.month} days={calendarDays} selectedDate={selectedDate}
                  onDateClick={(date, status) => { if (status === "available") setSelectedDate(date === selectedDate ? "" : date); }}
                  onPrevMonth={() => setCalendarMonth(({ year, month }) => { const d = new Date(year, month - 2, 1); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })}
                  onNextMonth={() => setCalendarMonth(({ year, month }) => { const d = new Date(year, month, 1); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })}
                  disablePast={true} loading={slotsLoading}
                />
                {selectedDate && <button className="clear-date-btn" onClick={() => setSelectedDate("")}>Clear date filter</button>}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs-navigation">
            <div className="ab-tabs-list">
              <button type="button" className={`ab-tab ${activeTab === "slots" ? "active" : ""}`} onClick={() => setActiveTab("slots")}>
                <CalendarDays className="ab-tab-icon" /> Available Slots
                <span className="ab-tab-count">{slotsLoading ? "—" : visibleSlots.length}</span>
              </button>
              <button type="button" className={`ab-tab ${activeTab === "bookings" ? "active" : ""}`} onClick={() => setActiveTab("bookings")}>
                <ClipboardList className="ab-tab-icon" /> Active Bookings
                <span className="ab-tab-count">{bookingsLoading ? "—" : activeBookings.length}</span>
              </button>
            </div>
          </div>

          {/* Available Slots */}
          {activeTab === "slots" && (
            <div className="slots-container">
              {slotsLoading ? (
                <div className="appt-empty-state"><Loader2Icon style={{ animation: "spin 1s linear infinite" }} /><h3>Loading available slots…</h3></div>
              ) : slotsError ? (
                <div className="appt-empty-state"><CalendarIcon /><h3>Could not load slots</h3><p>{slotsError}</p><button className="book-btn" style={{ marginTop: "0.5rem" }} onClick={fetchSlots}>Retry</button></div>
              ) : availableSlots.length === 0 ? (
                <div className="appt-empty-state"><CalendarIcon /><h3>No Available Slots</h3><p>{selectedDate || selectedProfessorId ? "Try adjusting your filters to see more results" : "No professors have published their consultation hours yet"}</p></div>
              ) : selectedDate ? (
                <div className="week-section">
                  <div className="week-section-header">
                    <span className={`appointment-booking-badge ${weekInfo(selectedDate).key}`}>{weekInfo(selectedDate).label}</span>
                  </div>
                  {renderDateGroup(selectedDate)}
                </div>
              ) : (
                <>
                  <div className="week-section">
                    <div className="week-section-header">
                      <span className="appointment-booking-badge this-week">This Week</span>
                    </div>
                    {twoWeekDates.thisWeek.map(renderDateGroup)}
                  </div>
                  <div className="week-section">
                    <div className="week-section-header">
                      <span className="appointment-booking-badge next-week">Next Week</span>
                    </div>
                    {twoWeekDates.nextWeek.map(renderDateGroup)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active Bookings */}
          {activeTab === "bookings" && (
            <>
              {bookingsLoading ? (
                <div className="appt-empty-state appt-empty-state--card"><Loader2Icon style={{ animation: "spin 1s linear infinite" }} /><h3>Loading your appointments…</h3></div>
              ) : bookingsError ? (
                <div className="appt-empty-state appt-empty-state--card"><CheckCircle2 className="appointment-icon" /><h3>Could not load your appointments</h3><p>{bookingsError}</p><button className="book-btn" style={{ marginTop: "0.5rem" }} onClick={fetchMyBookings}>Retry</button></div>
              ) : activeBookings.length === 0 ? (
                <div className="appt-empty-state appt-empty-state--card"><CheckCircle2 className="appointment-icon" /><h3>No Appointments Booked</h3><p>You have no active appointments yet</p></div>
              ) : (
                <div className="bookings-list">
                  {sortedActiveBookings.map((booking) => (
                    <AppointmentListItem
                      key={booking.id}
                      appointment={booking}
                      formatDate={formatDate}
                      onClick={() => navigate("/student/appointment-status", { state: { appointmentId: booking.id, fromBookings: true } })}
                      showCancelButton
                      onCancel={(id) => setCancelConfirmId(id)}
                      isCancelling={cancellingId === booking.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
    </StudentPageShell>
  );
}
