import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './appointment-booking.css';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import api from '../../utils/api';
import { toast } from 'sonner';

// Sample initial slots data
const INITIAL_SLOTS = [
  {
    id: 'slot-1',
    professorId: 'prof-1',
    professorName: 'Dr. Maria Santos',
    college: 'CCS',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: 'Room 101, CCS Building',
    maxSlots: 3,
    currentBookings: 1,
  },
  {
    id: 'slot-2',
    professorId: 'prof-2',
    professorName: 'Dr. Juan Dela Cruz',
    college: 'CBAA',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '10:30',
    endTime: '11:30',
    location: 'Room 205, CBAA Building',
    maxSlots: 4,
    currentBookings: 2,
  },
  {
    id: 'slot-3',
    professorId: 'prof-3',
    professorName: 'Dr. Anna Garcia',
    college: 'COED',
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:00',
    location: 'Room 301, COED Building',
    maxSlots: 3,
    currentBookings: 0,
  },
];

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
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

// ─── Content Icons ────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const MapPinIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const UsersIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const SearchIcon = ({ className = '' }) => (
  <svg
    className={`icon ${className}`.trim()}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
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

const ChevronRightIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AppointmentBookingPage() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? 'N/A College',
        studentNumber: authUser.studentNumber ?? 'N/A Student Number',
        departmentAbbrev: authUser.departmentAbbrev ?? 'N/A Abbreviation',
      }
    : {
        name: 'Student',
        role: 'student',
        college: '',
        studentId: '',
        studentNumber: 'N/A Student Number',
        departmentAbbrev: '',
      };

  const navigate = useNavigate();

  // ── Local State Management ─────────────────────────────────────────────────
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [bookings, setBookings] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! 👋 I can help you find and book appointments. Just ask!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // ── Appointment State ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState('');

  const studentId = user?.studentId || 'student-001';

  // ── Slot Management Functions ──────────────────────────────────────────────
  const getAvailableSlots = () => {
    return slots.filter(slot => slot.currentBookings < slot.maxSlots);
  };

  const getBookedSlots = (id) => {
    return bookings
      .filter(booking => booking.studentId === id)
      .map(booking => {
        const slot = slots.find(s => s.id === booking.slotId);
        return slot ? { ...slot, ...booking, id: booking.slotId } : null;
      })
      .filter(Boolean);
  };

  const bookSlot = (slotId, stId, studentName, bookingPurpose) => {
    const slot = slots.find(s => s.id === slotId);

    if (!slot || slot.currentBookings >= slot.maxSlots) {
      return false;
    }

    const alreadyBooked = bookings.some(
      b => b.slotId === slotId && b.studentId === stId
    );
    if (alreadyBooked) return false;

    const newBooking = {
      id: `booking-${Date.now()}`,
      slotId,
      studentId: stId,
      studentName,
      purpose: bookingPurpose,
      bookedAt: new Date().toISOString(),
    };

    setBookings([...bookings, newBooking]);
    setSlots(prevSlots =>
      prevSlots.map(s =>
        s.id === slotId ? { ...s, currentBookings: s.currentBookings + 1 } : s
      )
    );

    return true;
  };

  const cancelBooking = (slotId) => {
    const booking = bookings.find(b => b.slotId === slotId);
    if (!booking) return false;

    setBookings(prevBookings => prevBookings.filter(b => b.slotId !== slotId));
    setSlots(prevSlots =>
      prevSlots.map(s =>
        s.id === slotId && s.currentBookings > 0
          ? { ...s, currentBookings: s.currentBookings - 1 }
          : s
      )
    );

    return true;
  };

  const myBookings = getBookedSlots(studentId);
  const availableSlots = getAvailableSlots().filter(slot => {
    const matchesDate = !selectedDate || slot.date === selectedDate;
    const matchesCollege = selectedCollege === 'all' || slot.college === selectedCollege;
    const matchesSearch = !searchQuery ||
      slot.professorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.location.toLowerCase().includes(searchQuery.toLowerCase());

    const slotDate = new Date(slot.date + 'T' + slot.startTime);
    const now = new Date();
    const isFuture = slotDate > now;

    return matchesDate && matchesCollege && matchesSearch && isFuture;
  });

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    (acc[slot.date] ||= []).push(slot);
    return acc;
  }, {});

  const colleges = [
    { value: 'all', label: 'All Colleges' },
    { value: 'CCS', label: 'CCS' },
    { value: 'CBAA', label: 'CBAA' },
    { value: 'COED', label: 'COED' },
    { value: 'COE', label: 'COE' },
    { value: 'CAS', label: 'CAS' },
    { value: 'CHAS', label: 'CHAS' }
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? 'dark' : 'light');
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('slot') || lowerInput.includes('available')) {
      return `We have ${availableSlots.length} available slots. You can filter by professor, college, or date to find the perfect time!`;
    } else if (lowerInput.includes('book') || lowerInput.includes('appointment')) {
      return `I can help you book an appointment! Select a slot from the available slots section and provide your consultation purpose.`;
    } else if (lowerInput.includes('professor')) {
      const professorCount = new Set(availableSlots.map(s => s.professorId)).size;
      return `There are ${professorCount} professors with available consultation slots.`;
    } else if (lowerInput.includes('cancel')) {
      return `To cancel an appointment, go to your bookings and click the cancel button on the appointment you want to remove.`;
    } else {
      return 'I can help you with booking appointments, finding slots, or managing your consultations. What would you like to know?';
    }
  };

  const handleBookSlot = () => {
    if (!selectedSlot || !purpose.trim()) {
      toast.error('Please provide a purpose for consultation');
      return;
    }

    const success = bookSlot(
      selectedSlot.id,
      studentId,
      user?.name || 'Student',
      purpose
    );

    if (success) {
      toast.success('Appointment booked successfully!');
      setPurpose('');
      setSelectedSlot(null);
      setShowBookDialog(false);
    } else {
      toast.error('Failed to book appointment. Slot may no longer be available.');
    }
  };

  const handleCancelBooking = (slotId) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      cancelBooking(slotId);
      toast.success('Appointment cancelled successfully');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isToday = (dateString) => {
    const today = new Date();
    const slotDate = new Date(dateString);
    return today.toDateString() === slotDate.toDateString();
  };

  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slotDate = new Date(dateString);
    return tomorrow.toDateString() === slotDate.toDateString();
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/student/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/student/transactions' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="appointment-with-sidebar">
      {/* Sidebar */}
      <aside className={`appointment-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? 'Student'}</p>
                <span className="user-role-badge">Student</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="nav-item"
                  title={item.label}
                >
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="appointment-mobile-header">
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
      <main className="appointment-main">
        <div className="appointment-content">
          {/* Header */}
          <div className="appointment-header">
            <div className="header-backdrop header-backdrop-1"></div>
            <div className="header-backdrop header-backdrop-2"></div>
            <div className="header-content">
              <h1 className="header-title">
                <CalendarIcon />
                Book Appointment
              </h1>
              <p className="header-subtitle">
                Schedule consultations with professors
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="appointment-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <ChevronRightIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">Available Slots</p>
                <p className="stat-value">{availableSlots.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircleIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">My Bookings</p>
                <p className="stat-value">{myBookings.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <UsersIcon />
              </div>
              <div className="stat-body">
                <p className="stat-label">Professors</p>
                <p className="stat-value">
                  {new Set(availableSlots.map(s => s.professorId)).size}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <h2>Filter & Search</h2>
              <p>Find the perfect time slot</p>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="searchQuery">Search Professor or Location</label>
                <div className="search-input-wrapper">
                  <SearchIcon />

                  <input
                    id="searchQuery"
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              <div className="filter-group">
                <label htmlFor="selectedCollege">College</label>
                <select
                  id="selectedCollege"
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="filter-select"
                >
                  {colleges.map((college) => (
                    <option key={college.value} value={college.value}>
                      {college.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="selectedDate">Date</label>
                <input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="filter-input"
                />
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tabs-navigation">
            <div className="tabs-header">
              <div className="tab-button active">
                <ChevronRightIcon />
                Available Slots ({availableSlots.length})
              </div>
              <div className="tab-button">
                <CheckCircleIcon />
                My Bookings ({myBookings.length})
              </div>
            </div>
          </div>

          {/* Available Slots */}
          <div className="slots-container">
            {Object.keys(slotsByDate).length === 0 ? (
              <div className="empty-state">
                <CalendarIcon />
                <h3>No Available Slots</h3>
                <p>
                  {selectedDate || selectedCollege !== 'all' || searchQuery
                    ? 'Try adjusting your filters to see more results'
                    : 'No professors have created time slots yet'}
                </p>
              </div>
            ) : (
              <div className="slots-list">
                {Object.keys(slotsByDate)
                  .sort()
                  .map((date) => (
                    <div key={date} className="slots-date-group">
                      <div className="date-header">
                        <CalendarIcon />
                        <h3>{formatDate(date)}</h3>
                        {isToday(date) && <span className="badge today">Today</span>}
                        {isTomorrow(date) && <span className="badge tomorrow">Tomorrow</span>}
                      </div>
                      <p className="date-count">{slotsByDate[date].length} slots available</p>
                      <div className="slots-grid">
                        {slotsByDate[date].map((slot) => (
                          <div key={slot.id} className="slot-card">
                            <div className="slot-header">
                              <h4>{slot.professorName}</h4>
                              <span className="college-badge">{slot.college}</span>
                            </div>
                            <div className="slot-details">
                              <div className="slot-detail">
                                <ClockIcon />
                                <span>
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </span>
                              </div>
                              <div className="slot-detail">
                                <MapPinIcon />
                                <span>{slot.location}</span>
                              </div>
                              <div className="slot-detail">
                                <UsersIcon />
                                <span>
                                  {slot.maxSlots - slot.currentBookings} of {slot.maxSlots} available
                                </span>
                              </div>
                            </div>
                            <button
                              className="book-btn"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setShowBookDialog(true);
                              }}
                            >
                              Book This Slot
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* My Bookings */}
          <div className="bookings-container">
            <div className="bookings-header">
              <h2>My Appointments</h2>
              <p>Your scheduled consultations</p>
            </div>
            {myBookings.length === 0 ? (
              <div className="empty-state">
                <CheckCircleIcon />
                <h3>No Appointments Booked</h3>
                <p>Browse available slots to schedule your first consultation</p>
              </div>
            ) : (
              <div className="bookings-list">
                {myBookings
                  .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <h4>{booking.professorName}</h4>
                        <span className="college-badge">{booking.college}</span>
                      </div>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <CalendarIcon />
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="booking-detail">
                          <ClockIcon />
                          <span>
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </span>
                        </div>
                        <div className="booking-detail">
                          <MapPinIcon />
                          <span>{booking.location}</span>
                        </div>
                      </div>
                      {booking.purpose && (
                        <div className="purpose-box">
                          <span className="purpose-label">Purpose:</span>
                          <span className="purpose-text">{booking.purpose}</span>
                        </div>
                      )}
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        <XCircleIcon />
                        Cancel
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Book Appointment Dialog */}
      {showBookDialog && selectedSlot && (
        <div className="dialog-overlay" onClick={() => setShowBookDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Confirm Appointment</h3>
              <button className="dialog-close" onClick={() => setShowBookDialog(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="dialog-body">
              <div className="slot-summary">
                <h4>{selectedSlot.professorName}</h4>
                <div className="summary-details">
                  <div className="summary-item">
                    <CalendarIcon />
                    <span>{formatDate(selectedSlot.date)}</span>
                  </div>
                  <div className="summary-item">
                    <ClockIcon />
                    <span>
                      {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <MapPinIcon />
                    <span>{selectedSlot.location}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="purpose">Purpose of Consultation *</label>
                <textarea
                  id="purpose"
                  placeholder="e.g., Thesis consultation, Grade inquiry, Academic advising..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={4}
                  className="textarea"
                ></textarea>
              </div>
              <div className="dialog-actions">
                <button className="btn-secondary" onClick={() => setShowBookDialog(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleBookSlot}>
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat">
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message message-${message.type}`}>
                  <div className="message-content">{message.text}</div>
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
        <button
          className={`chat-fab ${chatOpen ? 'hidden' : ''}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>
    </div>
  );
}