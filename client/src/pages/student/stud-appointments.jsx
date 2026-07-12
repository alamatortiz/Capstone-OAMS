import React, { useState, useEffect, useMemo } from "react";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import StudentPageShell from "../../components/StudentPageShell";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import { Link } from "react-router-dom";
import "./stud-appointments.css";
import api from "../../utils/api";
import { formatManilaDate, getManilaDateString } from "../../utils/dateTime";
import { toast } from "sonner";
import CalendarGrid from "../../components/CalendarGrid";
import { useAuth } from "../../context/AuthContext";
import { COLLEGES } from "../../data/colleges";
import { formatCollegeLabel } from "../../utils/formatCollege";
import { ChevronDown, ChevronLeft, CalendarDays, ClipboardList, Calendar, Clock, MapPin, Users, XCircle, GraduationCap as LucideGraduationCap } from "lucide-react";

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

const CheckCircleIcon = () => (
  <svg className="appointment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:   { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", color: "#f59e0b" },
  approved:  { bg: "rgba(59, 130, 246, 0.15)",  border: "rgba(59, 130, 246, 0.4)",  color: "#3b82f6" },
  completed: { bg: "rgba(34, 197, 94, 0.15)",   border: "rgba(34, 197, 94, 0.4)",   color: "#22c55e" },
  rejected:  { bg: "rgba(239, 68, 68, 0.15)",   border: "rgba(239, 68, 68, 0.4)",   color: "#ef4444" },
  cancelled: { bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.4)", color: "#94a3b8" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {status}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { user } = useAuth();
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

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCollege, setSelectedCollege] = useState(() => user?.departmentAbbrev || "");
  const [selectedProfessorId, setSelectedProfessorId] = useState("");
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [activeTab, setActiveTab] = useState("slots");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = getManilaDateString().split("-").map(Number);
    return { year, month };
  });

  const fetchSlots = async () => {
    setSlotsLoading(true); setSlotsError(null);
    try {
      const { data } = await api.get("/student/appointments/available-slots");
      setSlots(data.slots ?? []);
    } catch (err) {
      setSlotsError("Could not load available slots. Please try again.");
    } finally { setSlotsLoading(false); }
  };

  const fetchMyBookings = async () => {
    setBookingsLoading(true); setBookingsError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setMyBookings(data.appointments ?? []);
    } catch (err) {
      setBookingsError("Could not load your bookings. Please try again.");
    } finally { setBookingsLoading(false); }
  };

  useEffect(() => { fetchSlots(); fetchMyBookings(); }, []);

  const availableSlots = useMemo(() => slots.filter((slot) => {
    const matchesDate = !selectedDate || slot.date === selectedDate;
    const matchesCollege = !selectedCollege || slot.college === selectedCollege;
    const matchesProfessor = !selectedProfessorId || String(slot.professorId) === selectedProfessorId;
    return matchesDate && matchesCollege && matchesProfessor;
  }), [slots, selectedDate, selectedCollege, selectedProfessorId]);

  // The Available Slots tab only ever shows this week and next week (Monday–Saturday,
  // matching the days a faculty_availability row can recur on), computed once per mount.
  const twoWeekDates = useMemo(() => {
    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const [y, m, d] = getManilaDateString().split("-").map(Number);
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
  }, []);

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

  // Mirrors the server-side dup guard in POST /appointments/book-slot, which
  // blocks rebooking the same (availabilityId, date) pair unless the prior
  // booking was cancelled or rejected.
  const bookedSlotKeys = useMemo(() => new Set(
    myBookings
      .filter((b) => b.status !== "cancelled" && b.status !== "rejected")
      .map((b) => `${b.availabilityId}_${b.date}`)
  ), [myBookings]);

  const STATUS_ORDER = ["pending", "approved", "completed", "rejected", "cancelled"];
  const STATUS_LABELS = { pending: "Pending Approval", approved: "Approved", completed: "Completed", rejected: "Rejected", cancelled: "Cancelled" };

  const bookingsByStatus = useMemo(() => {
    const grouped = activeBookings.reduce((acc, b) => { (acc[b.status] ||= []).push(b); return acc; }, {});
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
    return STATUS_ORDER.filter((s) => grouped[s]?.length).map((s) => [s, grouped[s]]);
  }, [activeBookings]);

  const availableProfessors = useMemo(() => {
    if (!selectedCollege) return [];
    const seen = new Set();
    return slots.filter((s) => s.college === selectedCollege).filter((s) => { const id = String(s.professorId); if (seen.has(id)) return false; seen.add(id); return true; })
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

  const colleges = COLLEGES.map((c) => ({
    value: c.abbreviation,
    label: formatCollegeLabel(c.abbreviation, c.name),
  }));

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes("slot") || lowerInput.includes("available")) return `We have ${visibleSlots.length} available slots this week and next week. Filter by professor, college, or date to find the perfect time!`;
    if (lowerInput.includes("book") || lowerInput.includes("appointment")) return "Select a slot from the available slots section and provide your consultation purpose.";
    if (lowerInput.includes("professor")) return `There are ${new Set(visibleSlots.map((s) => s.professorId)).size} professors with available consultation slots.`;
    if (lowerInput.includes("cancel")) return "Go to your bookings and click the cancel button on the appointment you want to remove.";
    return "I can help you with booking appointments, finding slots, or managing your consultations. What would you like to know?";
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;
    if (selectedSlot.appointmentTypes?.length > 0 && !selectedApptType) {
      toast.error("Please select an appointment type"); return;
    }
    if (!purpose.trim()) { toast.error("Please provide a purpose for consultation"); return; }
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
    setCancelConfirmId(null);
    if (!appointmentId || cancellingId) return;
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
        <p className="date-count">{daySlots.length} slots available</p>
        <div className="slots-grid">
          {daySlots.map((slot) => {
            const isUnavailable = slot.professorAvailabilityStatus === "unavailable";
            const isAlreadyBooked = bookedSlotKeys.has(`${slot.availabilityId}_${slot.date}`);
            return (
              <div key={slot.availabilityId} className={`slot-card${isUnavailable ? " slot-card--unavailable" : ""}`}>
                <div className="slot-header">
                  <h4>{slot.professorName}</h4>
                  <span className="college-badge">{slot.college}</span>
                </div>
                <div className="slot-details">
                  <div className="slot-detail"><Clock style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{formatTime(slot.windowStart)} – {formatTime(slot.windowEnd)}</span></div>
                  <div className="slot-detail"><MapPin style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{slot.location}</span></div>
                  <div className="slot-detail"><Users style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{slot.spotsLeft != null ? `${slot.spotsLeft} ${slot.spotsLeft === 1 ? "spot" : "spots"} left` : "Unlimited"} {slot.maxStudents != null ? `(max ${slot.maxStudents})` : ""}</span></div>
                </div>
                {isUnavailable ? (
                  <button className="book-btn book-btn--disabled" disabled>Currently Unavailable</button>
                ) : isAlreadyBooked ? (
                  <button className="book-btn book-btn--disabled" disabled>Already Booked</button>
                ) : (
                  <button className="book-btn" onClick={() => { setSelectedSlot(slot); setSelectedApptType(""); setShowBookDialog(true); }}>Book this Slot</button>
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
            <div className="dialog-overlay">
              <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                  <h3>Confirm Appointment</h3>
                  <button className="dialog-close" onClick={() => setShowBookDialog(false)} disabled={submitting}><CloseIcon /></button>
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
                    <label htmlFor="purpose">Purpose of Consultation *</label>
                    <textarea id="purpose" placeholder="e.g., Thesis consultation, Grade inquiry, Academic advising..." value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="textarea"></textarea>
                  </div>
                  <div className="dialog-actions">
                    <button className="btn-secondary" onClick={() => { setShowBookDialog(false); setSelectedApptType(""); }} disabled={submitting}>Cancel</button>
                    <button className="btn-primary" onClick={handleBookSlot} disabled={submitting}>{submitting ? "Booking…" : "Confirm Booking"}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <ChatWidget initialGreeting="Hello! I can help you find and book appointments. Just ask!" getBotResponse={generateBotResponse} />

          <ActionConfirmModal
            show={cancelConfirmId !== null}
            onCancel={() => setCancelConfirmId(null)}
            onConfirm={doCancel}
            title="Cancel Appointment?"
            message="Are you sure you want to cancel this appointment? This action cannot be undone."
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="10" y1="14" x2="14" y2="18"></line><line x1="14" y1="14" x2="10" y2="18"></line></svg>}
            cancelText="Keep Appointment"
            confirmText="Cancel Appointment"
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
            subtitle="Schedule consultations with professors"
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
              <span className="ab-prof-sched-card-subtitle">Browse when your professors are available before booking</span>
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
                onChange={(e) => { setSelectedCollege(e.target.value); setSelectedProfessorId(""); setSelectedDate(""); }}
                options={colleges.map((c) => ({ value: c.value, label: c.label }))}
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
                <ClipboardList className="ab-tab-icon" /> My Bookings
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
                <div className="appt-empty-state"><CalendarIcon /><h3>No Available Slots</h3><p>{selectedDate || selectedProfessorId ? "Try adjusting your filters to see more results" : "No professors have published consultation hours yet"}</p></div>
              ) : selectedDate ? (
                <div className="slots-list">
                  <div className="week-section">
                    <div className="week-section-header">
                      <span className={`appointment-booking-badge ${weekInfo(selectedDate).key}`}>{weekInfo(selectedDate).label}</span>
                    </div>
                    {renderDateGroup(selectedDate)}
                  </div>
                </div>
              ) : (
                <div className="slots-list">
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
                </div>
              )}
            </div>
          )}

          {/* My Bookings */}
          {activeTab === "bookings" && (
            <div className="bookings-container">
              <div className="bookings-header">
                <div><h2>My Appointments</h2><p>Your scheduled consultations</p></div>
                <Link to="/student/appointment-status" className="ab-status-link">View All Status →</Link>
              </div>
              {bookingsLoading ? (
                <div className="appt-empty-state"><Loader2Icon style={{ animation: "spin 1s linear infinite" }} /><h3>Loading your appointments…</h3></div>
              ) : bookingsError ? (
                <div className="appt-empty-state"><CheckCircleIcon /><h3>Could not load your appointments</h3><p>{bookingsError}</p><button className="book-btn" style={{ marginTop: "0.5rem" }} onClick={fetchMyBookings}>Retry</button></div>
              ) : activeBookings.length === 0 ? (
                <div className="appt-empty-state"><CheckCircleIcon /><h3>No Appointments Booked</h3><p>Browse available slots to schedule your first consultation</p></div>
              ) : (
                <div className="bookings-list">
                  {bookingsByStatus.map(([status, bookings]) => (
                    <div key={status} className="slots-date-group">
                      <div className="date-header" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <StatusBadge status={status} />
                        <h3 style={{ margin: 0 }}>{STATUS_LABELS[status]}</h3>
                      </div>
                      <p className="date-count">{bookings.length} {bookings.length === 1 ? "appointment" : "appointments"}</p>
                      {bookings.map((booking) => (
                        <div key={booking.id} className="booking-card" style={{ marginBottom: "0.75rem" }}>
                          <div className="booking-header">
                            <h4>{booking.person}</h4>
                            <span className="college-badge">{booking.college}</span>
                          </div>
                          {booking.appointmentType && (
                            <div className="booking-appt-type">
                              <span className="booking-appt-type-label">Type:</span>
                              <span className="booking-appt-type-value">{booking.appointmentType}</span>
                            </div>
                          )}
                          <div className="booking-details">
                            <div className="booking-detail"><Calendar style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{formatDate(booking.date)}</span></div>
                            <div className="booking-detail"><Clock style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{booking.windowStart && booking.windowEnd ? `${booking.windowStart} – ${booking.windowEnd}` : "—"}</span></div>
                            <div className="booking-detail"><MapPin style={{ width: "1rem", height: "1rem", color: "#a855f7", flexShrink: 0 }} /><span>{booking.location}</span></div>
                          </div>
                          {booking.purpose && (
                            <div className="purpose-box">
                              <span className="purpose-label">Purpose:</span>
                              <span className="purpose-text">{booking.purpose}</span>
                            </div>
                          )}
                          {(status === "pending" || status === "approved") && (
                            <button className="cancel-btn" onClick={() => setCancelConfirmId(booking.id)} disabled={cancellingId === booking.id}>
                              <XCircle style={{ width: "1.3rem", height: "1.3rem", color: "#ef4444", flexShrink: 0 }} />{cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
    </StudentPageShell>
  );
}
