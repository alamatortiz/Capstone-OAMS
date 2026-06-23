import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_schedule_availability.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ── Shared Icons ──────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36"></path>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

// ── Schedule-specific Icons ───────────────────────────────────────────────────
const InfoIcon = () => (
  <svg className="sa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="12" x2="12" y2="16"></line>
    <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1"></circle>
  </svg>
);
const ClockIcon = () => (
  <svg className="sa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1rem", height: "1rem" }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "0.875rem", height: "0.875rem" }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// ── Appointment Types ─────────────────────────────────────────────────────────
const appointmentTypes = [
  "Consultation",
  "Academic Advising",
  "Thesis Consultation",
  "Grade Inquiry",
  "Any",
];

// ── Calendar Generator ────────────────────────────────────────────────────────
const generateCalendar = () => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = dayName === "Sat" || dayName === "Sun";

    days.push({
      date: date.toISOString().split("T")[0],
      day: dayName,
      isAvailable: !isWeekend && i !== 5,
      slots: !isWeekend
        ? [
            { id: `${i}-1`, time: "9:00 AM - 10:00 AM", appointmentType: "Consultation", isBooked: i === 0 },
            { id: `${i}-2`, time: "10:00 AM - 11:00 AM", appointmentType: "Consultation", isBooked: false },
            { id: `${i}-3`, time: "11:00 AM - 12:00 PM", appointmentType: "Academic Advising", isBooked: false },
            { id: `${i}-4`, time: "2:00 PM - 3:00 PM", appointmentType: "Thesis Consultation", isBooked: i === 0 },
            { id: `${i}-5`, time: "3:00 PM - 4:00 PM", appointmentType: "Consultation", isBooked: false },
            { id: `${i}-6`, time: "4:00 PM - 5:00 PM", appointmentType: "Any", isBooked: false },
          ]
        : [],
      reason: i === 5 ? "Attending university seminar" : undefined,
    });
  }
  return days;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfessorScheduleAvailability() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Faculty", role: "faculty", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Schedule state
  const [calendar, setCalendar] = useState(generateCalendar());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null); // "date-slotId"

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("available") || i.includes("schedule")) return "You can toggle availability by clicking the + or × button on each day card.";
    if (i.includes("slot") || i.includes("appointment")) return "Use the dropdown on each time slot to change its appointment type.";
    if (i.includes("unavailable") || i.includes("reason")) return "When marking a day unavailable, you will be prompted to enter a reason.";
    return "I can help you manage your schedule availability. Click the × on an available day to mark it unavailable, or + to restore it.";
  };

  const toggleDayAvailability = (date) => {
    const day = calendar.find((d) => d.date === date);
    if (day?.isAvailable) {
      setSelectedDate(date);
      setShowUnavailableDialog(true);
    } else {
      setCalendar(calendar.map((d) => d.date === date ? { ...d, isAvailable: true, reason: undefined } : d));
    }
  };

  const handleSetUnavailable = () => {
    if (!selectedDate || !unavailableReason.trim()) return;
    setCalendar(calendar.map((d) =>
      d.date === selectedDate ? { ...d, isAvailable: false, reason: unavailableReason } : d
    ));
    setShowUnavailableDialog(false);
    setUnavailableReason("");
    setSelectedDate(null);
  };

  const updateSlotType = (date, slotId, newType) => {
    setCalendar(calendar.map((d) =>
      d.date === date
        ? { ...d, slots: d.slots.map((s) => s.id === slotId ? { ...s, appointmentType: newType } : s) }
        : d
    ));
    setOpenDropdown(null);
  };

  const toggleDropdown = (e, key) => {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
                  <item.icon />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon /><span>Logout</span>
            </button>
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
            <h1 className="sa-page-title">Schedule Availability</h1>
            <p className="sa-page-desc">Manage your consultation hours and availability</p>
          </div>

          {/* Legend Card */}
          <div className="sa-legend-card">
            <div className="sa-legend-title">
              <InfoIcon />
              <span>Calendar Legend</span>
            </div>
            <div className="sa-legend-items">
              <div className="sa-legend-item">
                <div className="sa-legend-swatch sa-swatch-available"></div>
                <span>Available</span>
              </div>
              <div className="sa-legend-item">
                <div className="sa-legend-swatch sa-swatch-unavailable"></div>
                <span>Unavailable</span>
              </div>
              <div className="sa-legend-item">
                <div className="sa-legend-swatch sa-swatch-weekend"></div>
                <span>Weekend / Holiday</span>
              </div>
              <div className="sa-legend-item">
                <div className="sa-legend-swatch sa-swatch-booked"></div>
                <span>Time Slot (Booked)</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="sa-calendar-section">
            <h2 className="sa-calendar-heading">Next 14 Days</h2>
            <div className="sa-calendar-grid">
              {calendar.map((day) => {
                const dateObj = new Date(day.date);
                const isWeekend = day.day === "Sat" || day.day === "Sun";
                let cardClass = "sa-day-card";
                if (isWeekend) cardClass += " sa-day-weekend";
                else if (day.isAvailable) cardClass += " sa-day-available";
                else cardClass += " sa-day-unavailable";

                return (
                  <div key={day.date} className={cardClass}>
                    {/* Card Header */}
                    <div className="sa-card-header">
                      <div className="sa-card-header-left">
                        <p className="sa-day-name">{day.day}</p>
                        <p className="sa-day-date">
                          {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      {!isWeekend && (
                        <button
                          className={`sa-toggle-btn ${day.isAvailable ? "sa-toggle-close" : "sa-toggle-add"}`}
                          onClick={() => toggleDayAvailability(day.date)}
                          title={day.isAvailable ? "Mark unavailable" : "Mark available"}
                        >
                          {day.isAvailable ? <XIcon /> : <PlusIcon />}
                        </button>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="sa-card-body">
                      {isWeekend ? (
                        <span className="sa-badge sa-badge-weekend">Weekend</span>
                      ) : day.isAvailable ? (
                        <>
                          <p className="sa-slots-count">
                            {day.slots.filter((s) => !s.isBooked).length} available slots
                          </p>
                          <div className="sa-slots-list">
                            {day.slots.map((slot) => {
                              const dropKey = `${day.date}-${slot.id}`;
                              return (
                                <div
                                  key={slot.id}
                                  className={`sa-slot ${slot.isBooked ? "sa-slot-booked" : "sa-slot-free"}`}
                                >
                                  <div className="sa-slot-time">
                                    <ClockIcon />
                                    <span>{slot.time}</span>
                                  </div>
                                  {slot.isBooked ? (
                                    <span className="sa-badge sa-badge-booked">Booked</span>
                                  ) : (
                                    <div className="sa-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="sa-dropdown-trigger"
                                        onClick={(e) => toggleDropdown(e, dropKey)}
                                      >
                                        <span>{slot.appointmentType}</span>
                                        <ChevronDown />
                                      </button>
                                      {openDropdown === dropKey && (
                                        <div className="sa-dropdown-menu">
                                          {appointmentTypes.map((type) => (
                                            <button
                                              key={type}
                                              className={`sa-dropdown-item ${slot.appointmentType === type ? "sa-dropdown-item-active" : ""}`}
                                              onClick={() => updateSlotType(day.date, slot.id, type)}
                                            >
                                              {type}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="sa-unavailable-body">
                          <span className="sa-badge sa-badge-unavailable">Unavailable</span>
                          {day.reason && (
                            <p className="sa-unavailable-reason">Reason: {day.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Unavailable Dialog */}
      {showUnavailableDialog && (
        <div className="sa-dialog-backdrop" onClick={() => { setShowUnavailableDialog(false); setUnavailableReason(""); setSelectedDate(null); }}>
          <div className="sa-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sa-dialog-header">
              <h3 className="sa-dialog-title">Mark as Unavailable</h3>
              <p className="sa-dialog-desc">Please provide a reason for your unavailability on this date.</p>
            </div>
            <div className="sa-dialog-body">
              <label className="sa-dialog-label" htmlFor="sa-reason">
                Reason for Unavailability <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <textarea
                id="sa-reason"
                className="sa-dialog-textarea"
                placeholder="e.g., Attending conference, Medical leave, etc."
                rows={4}
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
              />
            </div>
            <div className="sa-dialog-footer">
              <button
                className="sa-btn sa-btn-outline"
                onClick={() => { setShowUnavailableDialog(false); setUnavailableReason(""); setSelectedDate(null); }}
              >
                Cancel
              </button>
              <button
                className="sa-btn sa-btn-primary"
                onClick={handleSetUnavailable}
                disabled={!unavailableReason.trim()}
              >
                Confirm
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
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat">
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}>
                  <div className="message-content">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="chat-send-btn" aria-label="Send message">
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat">
          <ChatIcon />
        </button>
      </div>
    </div>
  );
}