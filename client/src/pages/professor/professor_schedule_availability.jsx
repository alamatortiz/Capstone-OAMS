import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate } from "react-router-dom";
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
const BanIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const CheckIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const ORDERED_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProfessorScheduleAvailability() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", employeeId: authUser.employeeId ?? "", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Faculty", role: "faculty", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help with your schedule?", timestamp: new Date() }]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [availRows, setAvailRows] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // ── Calendar state ──────────────────────────────────────────────────────────
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState([]);

  // ── "Add slot" form ─────────────────────────────────────────────────────────
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [addDay, setAddDay] = useState("Monday");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // ── "Block date" dialog ─────────────────────────────────────────────────────
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  // ── "Day detail" panel ──────────────────────────────────────────────────────
  const [detailDate, setDetailDate] = useState(null); // "YYYY-MM-DD"

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setCalendarLoading(true);
    try {
      const [aRes, bRes] = await Promise.all([
        api.get("/faculty/availability"),
        api.get("/faculty/blocked-dates"),
      ]);
      setAvailRows(aRes.data);
      setBlockedDates(bRes.data);
    } catch {
      toast.error("Failed to load schedule data");
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Rebuild calendar days whenever data or displayed month changes
  useEffect(() => {
    if (calendarLoading) return;
    const availDaySet = new Set(availRows.map((r) => r.day_of_week));
    const blockedMap = {};
    blockedDates.forEach((b) => {
      const key = new Date(b.blocked_date).toISOString().split("T")[0];
      blockedMap[key] = b.reason ?? "";
    });

    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth - 1, d);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = DAY_NAMES[date.getDay()];
      let status = "unavailable";
      let reason = undefined;
      if (blockedMap[dateStr] !== undefined) {
        status = "blocked";
        reason = blockedMap[dateStr] || undefined;
      } else if (availDaySet.has(dayName)) {
        status = "available";
      }
      const entry = { date: dateStr, status };
      if (reason) entry.reason = reason;
      days.push(entry);
    }
    setCalDays(days);
  }, [availRows, blockedDates, calYear, calMonth, calendarLoading]);

  // ── Calendar nav ────────────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    setDetailDate(null);
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    setDetailDate(null);
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  const handleDateClick = (date, status) => {
    if (status === "available") setDetailDate(date === detailDate ? null : date);
  };

  // ── Add availability slot ───────────────────────────────────────────────────
  const handleAddSlot = async () => {
    if (!addStart || !addEnd || !addLocation.trim()) { toast.error("Please fill in all fields"); return; }
    if (addEnd <= addStart) { toast.error("End time must be after start time"); return; }
    const duplicate = availRows.some(
      (r) => r.day_of_week === addDay &&
             r.start_time.substring(0, 5) === addStart &&
             r.end_time.substring(0, 5) === addEnd
    );
    if (duplicate) { toast.error("A slot with the same day and time already exists"); return; }
    setAddSaving(true);
    try {
      await api.post("/faculty/availability", { day_of_week: addDay, start_time: addStart, end_time: addEnd, location: addLocation.trim() });
      toast.success("Time slot added");
      setShowAddSlot(false);
      setAddStart(""); setAddEnd(""); setAddLocation("");
      await fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to add time slot";
      toast.error(msg);
    } finally { setAddSaving(false); }
  };

  // ── Delete availability slot ────────────────────────────────────────────────
  const handleDeleteSlot = async (id) => {
    if (!confirm("Remove this time slot? This will affect all future weeks.")) return;
    try {
      await api.delete(`/faculty/availability/${id}`);
      toast.success("Time slot removed");
      await fetchAll();
    } catch { toast.error("Failed to remove time slot"); }
  };

  // ── Block a specific date ───────────────────────────────────────────────────
  const openBlockDialog = (date) => { setBlockDate(date ?? ""); setBlockReason(""); setShowBlockDialog(true); };

  const handleBlockDate = async () => {
    if (!blockDate) { toast.error("Please select a date"); return; }
    setBlockSaving(true);
    try {
      await api.post("/faculty/blocked-dates", { date: blockDate, reason: blockReason.trim() || undefined });
      toast.success("Date blocked");
      setShowBlockDialog(false);
      setDetailDate(null);
      await fetchAll();
    } catch { toast.error("Failed to block date"); }
    finally { setBlockSaving(false); }
  };

  // ── Unblock a date ──────────────────────────────────────────────────────────
  const handleUnblock = async (blockedId, date) => {
    if (!confirm(`Unblock ${date}?`)) return;
    try {
      await api.delete(`/faculty/blocked-dates/${blockedId}`);
      toast.success("Date unblocked");
      if (detailDate === date) setDetailDate(null);
      await fetchAll();
    } catch { toast.error("Failed to unblock date"); }
  };

  // ── Grouped weekly patterns ─────────────────────────────────────────────────
  const slotsByDay = {};
  ORDERED_DAYS.forEach((d) => { slotsByDay[d] = []; });
  availRows.forEach((r) => {
    if (slotsByDay[r.day_of_week]) slotsByDay[r.day_of_week].push(r);
  });

  // ── Detail panel data ───────────────────────────────────────────────────────
  const detailDayName = detailDate ? DAY_NAMES[new Date(detailDate + "T00:00:00").getDay()] : null;
  const detailSlots = detailDate ? (slotsByDay[detailDayName] ?? []) : [];
  const detailBlocked = detailDate ? blockedDates.find((b) => new Date(b.blocked_date).toISOString().split("T")[0] === detailDate) : null;

  // ── Upcoming blocked dates (future only) ───────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingBlocked = blockedDates
    .filter((b) => new Date(b.blocked_date).toISOString().split("T")[0] >= todayStr)
    .sort((a, b) => new Date(a.blocked_date) - new Date(b.blocked_date));

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
      const bot = { id: messages.length + 2, type: "bot", text: "You can add weekly time slots in the panel below, or block specific dates by clicking a green day in the calendar.", timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

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
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="nav-item" title={item.label}>
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

          {/* Page Header */}
          <div className="sa-page-header">
            <div>
              <h1 className="sa-page-title">Schedule Management</h1>
              <p className="sa-page-desc">Set your weekly availability and block specific dates</p>
            </div>
            <div className="sa-header-actions">
              <button className="sa-action-btn sa-action-btn--primary" onClick={() => setShowAddSlot(true)}>
                <PlusIcon /> Add Time Slot
              </button>
              <button className="sa-action-btn sa-action-btn--danger" onClick={() => openBlockDialog("")}>
                <BanIcon /> Block a Date
              </button>
            </div>
          </div>

          {/* Two-column layout: Calendar + Detail panel */}
          <div className="sa-main-layout">
            {/* Left: Calendar */}
            <div className="sa-calendar-card">
              <h2 className="sa-section-heading">Monthly Overview</h2>
              <p className="sa-section-desc">Click a green date to view or block it</p>
              <CalendarGrid
                year={calYear}
                month={calMonth}
                days={calDays}
                selectedDate={detailDate ?? ""}
                onDateClick={handleDateClick}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                disablePast={false}
                loading={calendarLoading}
              />
            </div>

            {/* Right: Detail panel */}
            <div className="sa-detail-panel">
              {detailDate ? (
                <>
                  <h2 className="sa-section-heading">
                    {new Date(detailDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </h2>
                  {detailBlocked ? (
                    <div className="sa-blocked-notice">
                      <BanIcon />
                      <div>
                        <p className="sa-blocked-label">This date is blocked</p>
                        {detailBlocked.reason && <p className="sa-blocked-reason">Reason: {detailBlocked.reason}</p>}
                      </div>
                      <button className="sa-unblock-btn" onClick={() => handleUnblock(detailBlocked.blocked_id, detailDate)}>
                        <CheckIcon /> Unblock
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="sa-section-desc">Recurring slots for every <strong>{detailDayName}</strong>:</p>
                      {detailSlots.length === 0 ? (
                        <p className="sa-empty-text">No time slots set for {detailDayName}s.</p>
                      ) : (
                        <div className="sa-slot-list">
                          {detailSlots.map((s) => (
                            <div key={s.availability_id} className="sa-slot-row">
                              <ClockIcon />
                              <span>{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                              {s.location && <span className="sa-slot-location">· {s.location}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="sa-action-btn sa-action-btn--danger sa-block-date-btn" onClick={() => openBlockDialog(detailDate)}>
                        <BanIcon /> Block this date
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="sa-detail-placeholder">
                  <CalendarIconNav />
                  <p>Click a green date in the calendar to view its slots or block it for a specific day.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Patterns Section */}
          <div className="sa-weekly-section">
            <div className="sa-section-header-row">
              <div>
                <h2 className="sa-section-heading">Weekly Availability</h2>
                <p className="sa-section-desc">Recurring time slots that repeat every week</p>
              </div>
              <button className="sa-action-btn sa-action-btn--primary" onClick={() => setShowAddSlot(true)}>
                <PlusIcon /> Add Slot
              </button>
            </div>

            <div className="sa-weekly-grid">
              {ORDERED_DAYS.map((day) => {
                const slots = slotsByDay[day];
                return (
                  <div key={day} className={`sa-day-col ${slots.length > 0 ? "sa-day-col--active" : ""}`}>
                    <p className="sa-day-col-name">{day}</p>
                    {slots.length === 0 ? (
                      <p className="sa-day-col-empty">No slots</p>
                    ) : (
                      slots.map((s) => (
                        <div key={s.availability_id} className="sa-weekly-slot">
                          <div className="sa-weekly-slot-info">
                            <span className="sa-weekly-time">{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                            {s.location && <span className="sa-weekly-loc">{s.location}</span>}
                          </div>
                          <button className="sa-delete-btn" onClick={() => handleDeleteSlot(s.availability_id)} title="Remove slot">
                            <TrashIcon />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Blocked Dates */}
          {upcomingBlocked.length > 0 && (
            <div className="sa-blocked-section">
              <h2 className="sa-section-heading">Upcoming Blocked Dates</h2>
              <p className="sa-section-desc">Specific dates you have marked unavailable</p>
              <div className="sa-blocked-list">
                {upcomingBlocked.map((b) => {
                  const dateStr = new Date(b.blocked_date).toISOString().split("T")[0];
                  return (
                    <div key={b.blocked_id} className="sa-blocked-item">
                      <div className="sa-blocked-item-info">
                        <span className="sa-blocked-item-date">
                          {new Date(b.blocked_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {b.reason && <span className="sa-blocked-item-reason">{b.reason}</span>}
                      </div>
                      <button className="sa-unblock-btn" onClick={() => handleUnblock(b.blocked_id, dateStr)}>
                        <CheckIcon /> Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Add Time Slot Modal ── */}
      {showAddSlot && (
        <div className="sa-modal-overlay" onClick={() => setShowAddSlot(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Add Weekly Time Slot</h3>
              <p>This slot will repeat every week on the selected day</p>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-group">
                <label>Day of Week *</label>
                <select className="sa-select" value={addDay} onChange={(e) => setAddDay(e.target.value)}>
                  {ORDERED_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
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
                <input className="sa-input" type="text" placeholder="e.g. Room 301, Faculty Office" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} />
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

      {/* ── Block Date Modal ── */}
      {showBlockDialog && (
        <div className="sa-modal-overlay" onClick={() => setShowBlockDialog(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Block a Specific Date</h3>
              <p>Students won't be able to book on this date</p>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-group">
                <label>Date *</label>
                <input className="sa-input" type="date" value={blockDate} min={todayStr} onChange={(e) => setBlockDate(e.target.value)} />
              </div>
              <div className="sa-form-group">
                <label>Reason (optional)</label>
                <textarea className="sa-textarea" rows={3} placeholder="e.g. Attending conference, Medical leave…" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn sa-btn--outline" onClick={() => setShowBlockDialog(false)}>Cancel</button>
              <button className="sa-btn sa-btn--danger" onClick={handleBlockDate} disabled={blockSaving || !blockDate}>
                {blockSaving ? "Blocking…" : "Block Date"}
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
