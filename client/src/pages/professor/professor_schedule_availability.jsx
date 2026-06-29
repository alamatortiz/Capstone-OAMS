import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import CalendarGrid from "../../components/CalendarGrid";
import "./professor_dashboard.css";
import "./professor_schedule_availability.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import { toast } from "sonner";

// ── Icons ──────────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="13" x2="12" y2="17" /><line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.25rem", height: "1.25rem" }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const PlusIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const ClockIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function toDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val).split("T")[0];
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProfessorScheduleAvailability() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", employeeId: authUser.employeeId ?? "", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Faculty", role: "faculty", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, type: "bot", text: "Hello! I'm your OAMS Assistant. How can I help with your schedule?", timestamp: new Date() }]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  // All slots indexed by "YYYY-MM-DD" for fast lookup
  const [slotsByDate, setSlotsByDate] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Calendar state ──────────────────────────────────────────────────────────
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState([]);

  // ── Selected date / Add slot form ───────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addMaxStudents, setAddMaxStudents] = useState("");
  const [addApptTypes, setAddApptTypes] = useState([]);   // string[]
  const [addApptInput, setAddApptInput] = useState("");   // current tag input value
  const [addSaving, setAddSaving] = useState(false);

  const todayStr = now.toISOString().split("T")[0];

  // ── Fetch date-specific availability ────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/faculty/date-availability");
      const map = {};
      res.data.forEach((slot) => {
        const d = toDateStr(slot.available_date);
        if (!map[d]) map[d] = [];
        map[d].push(slot);
      });
      setSlotsByDate(map);
    } catch {
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Rebuild calendar days whenever data or displayed month changes
  useEffect(() => {
    if (loading) return;
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth - 1, d);
      const dateStr = date.toISOString().split("T")[0];
      const hasSlots = !!(slotsByDate[dateStr]?.length);
      days.push({ date: dateStr, status: hasSlots ? "available" : "unavailable" });
    }
    setCalDays(days);
  }, [slotsByDate, calYear, calMonth, loading]);

  // ── Calendar nav ────────────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    setSelectedDate(null);
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    setSelectedDate(null);
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date === selectedDate ? null : date);
  };

  // ── Open "Add Slot" modal ───────────────────────────────────────────────────
  const openAddSlot = (date) => {
    setAddDate(date ?? todayStr);
    setAddStart("");
    setAddEnd("");
    setAddLocation("");
    setAddMaxStudents("");
    setAddApptTypes([]);
    setAddApptInput("");
    setShowAddSlot(true);
  };

  const commitApptTag = () => {
    const val = addApptInput.trim();
    if (!val || addApptTypes.includes(val) || addApptTypes.length >= 10) return;
    setAddApptTypes((prev) => [...prev, val]);
    setAddApptInput("");
  };

  const removeApptTag = (tag) => setAddApptTypes((prev) => prev.filter((t) => t !== tag));

  // ── Save new slot ───────────────────────────────────────────────────────────
  const handleAddSlot = async () => {
    if (!addDate || !addStart || !addEnd || !addLocation.trim()) {
      toast.error("Please fill in date, times, and location");
      return;
    }
    if (addEnd <= addStart) { toast.error("End time must be after start time"); return; }
    if (addDate < todayStr) { toast.error("Cannot add availability in the past"); return; }

    if (!addMaxStudents.trim()) {
      toast.error("Max students is required");
      return;
    }
    const maxStu = parseInt(addMaxStudents, 10);
    if (isNaN(maxStu) || maxStu < 1) {
      toast.error("Max students must be a positive number");
      return;
    }

    const existingForDate = slotsByDate[addDate] ?? [];
    const duplicate = existingForDate.some(
      (s) => s.start_time.substring(0, 5) === addStart && s.end_time.substring(0, 5) === addEnd
    );
    if (duplicate) { toast.error("A slot with the same date and time already exists"); return; }

    setAddSaving(true);
    try {
      await api.post("/faculty/date-availability", {
        available_date: addDate,
        start_time: addStart,
        end_time: addEnd,
        location: addLocation.trim(),
        max_students: maxStu,
        appointmentTypes: addApptTypes,
      });
      toast.success("Time slot added");
      setShowAddSlot(false);
      if (!selectedDate) setSelectedDate(addDate);
      await fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to add time slot";
      toast.error(msg);
    } finally { setAddSaving(false); }
  };

  // ── Delete slot ─────────────────────────────────────────────────────────────
  const handleDeleteSlot = async (id, date) => {
    if (!confirm("Remove this time slot?")) return;
    try {
      await api.delete(`/faculty/date-availability/${id}`);
      toast.success("Time slot removed");
      await fetchAll();
      // If this was the last slot for the selected date, deselect it
      const remaining = (slotsByDate[date] ?? []).filter((s) => s.id !== id);
      if (remaining.length === 0 && selectedDate === date) setSelectedDate(null);
    } catch { toast.error("Failed to remove time slot"); }
  };

  // ── Upcoming availability list (today + future, sorted) ─────────────────────
  const upcomingDates = Object.keys(slotsByDate)
    .filter((d) => d >= todayStr)
    .sort();

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => { setIsDark((p) => { const n = !p; applyTheme(n ? "dark" : "light"); return n; }); };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: "Click any date in the calendar to add time slots for that specific date. Green dates already have availability set.", timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/document-request" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`nav-item${location.pathname === item.path ? " active" : ""}`} title={item.label}>
                  <item.icon /><span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}><LogOutIcon /><span>Logout</span></button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="sa-page">

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="sa-page-header">
            <div className="sa-title-section">
              <div className="sa-title-icon">
                <CalendarIconNav />
              </div>
              <div>
                <h1 className="sa-page-title">Schedule Availability</h1>
                <p className="sa-page-desc">Set your available dates and time slots for student appointments.</p>
              </div>
            </div>
            <button className="sa-action-btn sa-action-btn--primary" onClick={() => openAddSlot(selectedDate ?? todayStr)}>
              <PlusIcon /> Add Time Slot
            </button>
          </div>

          {/* Two-column layout: Calendar + Detail panel */}
          <div className="sa-main-layout">
            {/* Left: Calendar */}
            <div className="sa-calendar-card">
              <h2 className="sa-section-heading">Monthly Overview</h2>
              <p className="sa-section-desc">Green dates have availability set. Click any date to manage its slots.</p>
              <CalendarGrid
                year={calYear}
                month={calMonth}
                days={calDays}
                selectedDate={selectedDate ?? ""}
                onDateClick={(date) => handleDateClick(date)}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                disablePast={false}
                loading={loading}
              />
            </div>

            {/* Right: Detail panel */}
            <div className="sa-detail-panel">
              {selectedDate ? (
                <>
                  <div className="sa-detail-header-row">
                    <h2 className="sa-section-heading">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </h2>
                    <button
                      className="sa-action-btn sa-action-btn--primary sa-btn-sm"
                      onClick={() => openAddSlot(selectedDate)}
                      disabled={selectedDate < todayStr}
                      title={selectedDate < todayStr ? "Cannot add slots to past dates" : "Add a time slot for this date"}
                    >
                      <PlusIcon /> Add Slot
                    </button>
                  </div>

                  {selectedSlots.length === 0 ? (
                    <div className="sa-detail-empty">
                      <p>No time slots set for this date.</p>
                      {selectedDate >= todayStr && (
                        <button className="sa-action-btn sa-action-btn--primary" onClick={() => openAddSlot(selectedDate)}>
                          <PlusIcon /> Add your first slot
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="sa-slot-list">
                      {selectedSlots.map((s) => (
                        <div key={s.id} className="sa-slot-card">
                          <div className="sa-slot-row">
                            <ClockIcon />
                            <span className="sa-slot-time">{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                            {s.location && <span className="sa-slot-location">· {s.location}</span>}
                            <span className="sa-slot-location">· {s.max_students != null ? `Max ${s.max_students} students` : "Indefinite"}</span>
                            {s.status === "closed" && <span className="sa-slot-location" style={{ color: "#ef4444" }}>· Closed</span>}
                            {selectedDate >= todayStr && (
                              <button className="sa-delete-btn" onClick={() => handleDeleteSlot(s.id, selectedDate)} title="Remove slot">
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                          {s.appointmentTypes?.length > 0 && (
                            <div className="sa-slot-types">
                              {s.appointmentTypes.map((t) => (
                                <span key={t.id} className="sa-preview-chip">{t.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="sa-detail-placeholder">
                  <CalendarIconNav />
                  <p>Click any date in the calendar to view or add time slots for that specific date.</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Availability List */}
          <div className="sa-weekly-section">
            <div className="sa-section-header-row">
              <div>
                <h2 className="sa-section-heading">Upcoming Availability</h2>
                <p className="sa-section-desc">Dates you have set as available from today onward</p>
              </div>
              <button className="sa-action-btn sa-action-btn--primary" onClick={() => openAddSlot(todayStr)}>
                <PlusIcon /> Add Slot
              </button>
            </div>

            {upcomingDates.length === 0 ? (
              <div className="sa-empty-upcoming">
                <p>No upcoming availability set. Click a date on the calendar or use "Add Time Slot" to get started.</p>
              </div>
            ) : (
              <div className="sa-upcoming-list">
                {upcomingDates.map((date) => {
                  const slots = slotsByDate[date] ?? [];
                  const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                  return (
                    <div
                      key={date}
                      className={`sa-upcoming-item ${selectedDate === date ? "sa-upcoming-item--selected" : ""}`}
                      onClick={() => { setSelectedDate(date); setCalYear(Number(date.slice(0, 4))); setCalMonth(Number(date.slice(5, 7))); }}
                    >
                      <div className="sa-upcoming-date-col">
                        <span className="sa-upcoming-date-label">{label}</span>
                        <span className="sa-upcoming-count">{slots.length} slot{slots.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="sa-upcoming-slots-col">
                        {slots.map((s) => (
                          <div key={s.id} className="sa-upcoming-slot-chip">
                            <ClockIcon />
                            <span>{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                            {s.location && <span className="sa-chip-location">· {s.location}</span>}
                            {s.max_students != null && <span className="sa-chip-location">· Max {s.max_students}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Add Time Slot Modal ── */}
      {showAddSlot && (
        <div className="sa-modal-overlay">
          <div className="sa-modal">
            <div className="sa-modal-header">
              <h3>Add Time Slot</h3>
              <p>Set your availability for a specific date and time</p>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-group">
                <label>Date *</label>
                <input
                  className="sa-input"
                  type="date"
                  value={addDate}
                  min={todayStr}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </div>
              <div className="sa-form-row">
                <div className="sa-form-group">
                  <label>Start Time *</label>
                  <input className="sa-input" type="time" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
                </div>
                <div className="sa-form-group">
                  <label>End Time *</label>
                  <input className="sa-input" type="time" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                </div>
              </div>
              <div className="sa-form-group">
                <label>Location *</label>
                <input
                  className="sa-input"
                  type="text"
                  placeholder="e.g. Room 301, Faculty Office"
                  value={addLocation}
                  onChange={(e) => setAddLocation(e.target.value)}
                />
              </div>
              <div className="sa-form-group">
                <label>Max Students *</label>
                <input
                  className="sa-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={addMaxStudents}
                  onChange={(e) => setAddMaxStudents(e.target.value)}
                />
                <p className="sa-field-hint">Students are assigned slots in order of booking (first come, first served).</p>
              </div>
              <div className="sa-form-group">
                <label>Appointment Types <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: "0.78rem" }}>(optional · press Enter to add)</span></label>
                <div className={`sa-tag-input-box${addApptTypes.length > 0 ? " has-tags" : ""}`}>
                  {addApptTypes.map((tag) => (
                    <span key={tag} className="sa-tag-chip">
                      {tag}
                      <button type="button" className="sa-tag-remove" onClick={() => removeApptTag(tag)} aria-label={`Remove ${tag}`}>×</button>
                    </span>
                  ))}
                  <input
                    className="sa-tag-input"
                    type="text"
                    placeholder={addApptTypes.length === 0 ? "e.g. Thesis Consultation, Grade Inquiry…" : "Add another…"}
                    value={addApptInput}
                    onChange={(e) => setAddApptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitApptTag(); }
                      if (e.key === "Backspace" && !addApptInput && addApptTypes.length > 0) {
                        setAddApptTypes((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={commitApptTag}
                  />
                </div>
                <p className="sa-field-hint">Students will choose from these types when booking. Leave empty for no restriction.</p>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn sa-btn--outline" onClick={() => setShowAddSlot(false)}>Cancel</button>
              <button className="sa-btn sa-btn--primary" onClick={handleAddSlot} disabled={addSaving}>
                {addSaving ? "Saving…" : "Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat"><CloseIcon /></button>
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}><div className="message-content">{m.text}</div></div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input type="text" className="chat-input" placeholder="Ask me anything…" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              <button type="submit" className="chat-send-btn" aria-label="Send message"><SendIcon /></button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat"><ChatIcon /></button>
      </div>

      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
