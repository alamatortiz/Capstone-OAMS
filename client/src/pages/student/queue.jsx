import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ===== Chat Widget Icons =====
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CloseIconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

import { Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Loader2, ChevronDown, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { useQueue } from '../../contexts/QueueContext';
import { getCollegeLogo } from '../../data/collegeLogo';
import api from '../../utils/api';

import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './queue.css';

// ===== SIDEBAR ICONS =====
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

// ─── Procedure Map ────────────────────────────────────────────────────────────
const PROCEDURE_MAP = {
  'enrollment assistance': [
    'Get your advising form signed by your program adviser.',
    'Settle any outstanding balances at the cashier.',
    'Present your documents at the enrollment counter.',
    'Wait for validation and processing.',
    'Receive your Certificate of Registration.',
  ],
  'grade inquiry': [
    'Submit a Grade Inquiry request via the portal or join the queue.',
    'Present your student ID and COR at the window.',
    'State your concern to the faculty or registrar staff.',
    'Wait for verification and official response.',
    'Receive the result or endorsement slip.',
  ],
  'good moral certificate': [
    'Secure clearance from the Student Affairs Office.',
    'Fill out the Good Moral Certificate request form.',
    'Pay the required processing fee at the cashier.',
    'Submit all requirements to the department office.',
    'Claim your certificate after 2–3 business days with valid ID.',
  ],
  'transcript of records': [
    'Fill out the Transcript of Records request form.',
    'Pay the required fee at the cashier.',
    'Submit the form and official receipt to the registrar.',
    'Wait for processing (5–7 business days).',
    'Claim your TOR with a valid ID.',
  ],
  'certificate of enrollment': [
    'Fill out the Certificate of Enrollment request form.',
    'Pay the processing fee.',
    'Submit to the registrar office.',
    'Wait 1–2 business days for processing.',
    'Claim with your valid student ID.',
  ],
  'clearance processing': [
    'Obtain the clearance form from your department.',
    'Visit all offices listed on the form.',
    'Settle any outstanding obligations.',
    'Collect signatures from all required offices.',
    'Submit the completed clearance form to the registrar.',
  ],
};

const GENERIC_PROCEDURE = [
  'Present your valid Student ID at the service counter.',
  'State your concern or request to the assigned staff.',
  'Submit any required documents or forms.',
  'Wait for processing (timeframe depends on service type).',
  'Claim your output or receive confirmation when ready.',
];

function getProcedure(serviceName = '') {
  const key = serviceName.toLowerCase().trim();
  return PROCEDURE_MAP[key] ?? GENERIC_PROCEDURE;
}

export default function QueuePage() {
  const { user: authUser, logout } = useAuth();
  const {
    queues,
    availableSlots,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    isAlreadyInQueue,
  } = useQueue();

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // Track which slot/queue buttons are in-flight to prevent double-clicks
  const [joiningSlotId, setJoiningSlotId] = useState(null);
  const [leavingQueueId, setLeavingQueueId] = useState(null);

  // Detail view state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [servicesData, setServicesData] = useState([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your queue today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? 'N/A College',
        departmentAbbrev: authUser.departmentAbbrev ?? 'N/A',
      }
    : { name: 'Student', role: 'student', college: '', departmentAbbrev: '' };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedService, setSelectedService] = useState('all');

  // Derive unique college names from all departments in the database
  const collegeOptions = useMemo(() => {
    return servicesData
      .map((dept) => ({ name: dept.departmentName, abbrev: dept.departmentAbbrev }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [servicesData]);

  // Derive service names scoped to the selected college (or all if none selected)
  const serviceOptions = useMemo(() => {
    const departments =
      selectedCollege === 'all'
        ? servicesData
        : servicesData.filter((dept) => dept.departmentName === selectedCollege);
    const names = [
      ...new Set(
        departments.flatMap((dept) => dept.services?.map((s) => s.serviceName) ?? [])
      ),
    ].sort();
    return names;
  }, [servicesData, selectedCollege]);

  // Reset service filter when college changes
  useEffect(() => {
    setSelectedService('all');
  }, [selectedCollege]);

  // Filter available slots client-side
  const filteredSlots = useMemo(
    () =>
      availableSlots.filter((slot) => {
        const collegeMatch =
          selectedCollege === 'all' ||
          slot.departmentName === selectedCollege;
        const serviceMatch =
          selectedService === 'all' || slot.serviceName === selectedService;
        const notAlreadyJoined = !isAlreadyInQueue(slot.slotId);
        return collegeMatch && serviceMatch && notAlreadyJoined;
      }),
    [availableSlots, selectedCollege, selectedService, isAlreadyInQueue],
  );

  // ── Chat ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch services data for requirements lookup ───────────────────────────
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/student/services/by-department');
        setServicesData(data.departments ?? []);
      } catch {
        // silent — requirements fall back to generic defaults
      }
    };
    fetchServices();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleJoinQueue = useCallback(
    async (slotId) => {
      if (joiningSlotId) return;
      setJoiningSlotId(slotId);
      try {
        await joinQueue(slotId);
        toast.success('Successfully joined the queue!');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setJoiningSlotId(null);
      }
    },
    [joinQueue, joiningSlotId],
  );

  const handleLeaveQueue = useCallback(
    async (queueId) => {
      if (leavingQueueId) return;
      setLeavingQueueId(queueId);
      try {
        await leaveQueue(queueId);
        toast.info('You have left the queue');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLeavingQueueId(null);
      }
    },
    [leaveQueue, leavingQueueId],
  );

  // ── Service detail helpers ────────────────────────────────────────────────
  const getServiceRequirements = (serviceName) => {
    for (const dept of servicesData) {
      const svc = dept.services?.find(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      );
      if (svc?.requirements?.length) return svc.requirements;
    }
    return [];
  };

  const handleJoinFromDetail = async () => {
    if (!selectedSlot || joiningSlotId) return;
    setJoiningSlotId(selectedSlot.slotId);
    try {
      await joinQueue(selectedSlot.slotId);
      toast.success(`Successfully joined the queue for ${selectedSlot.serviceName}!`);
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err.message ?? 'Failed to join the queue. Please try again.');
    } finally {
      setJoiningSlotId(null);
    }
  };

  const detailJoinBtnLabel = () => {
    if (!selectedSlot) return 'Join Queue';
    if (isAlreadyInQueue(selectedSlot.slotId)) return 'Already in Queue';
    if (!selectedSlot.hasCapacity) return 'Queue Full';
    if (joiningSlotId === selectedSlot.slotId) return 'Joining…';
    return 'Join Queue';
  };

  const detailJoinBtnDisabled = () => {
    if (!selectedSlot) return true;
    if (isAlreadyInQueue(selectedSlot.slotId)) return true;
    if (!selectedSlot.hasCapacity) return true;
    if (joiningSlotId === selectedSlot.slotId) return true;
    return false;
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate('/login'); };

  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

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
    const lower = userInput.toLowerCase();
    if (lower.includes('queue') || lower.includes('position')) {
      return queues.length > 0
        ? `You have ${queues.length} active queue${queues.length > 1 ? 's' : ''}. Your first queue position is ${queues[0].position}. Est. wait: ${queues[0].estimatedWait}`
        : "You don't have any active queues. Would you like to join one?";
    }
    if (lower.includes('wait') || lower.includes('time')) {
      return queues.length > 0
        ? `Your estimated wait time is ${queues[0].estimatedWait}. Currently ${queues[0].totalWaiting} people are waiting.`
        : 'Join a queue to see your estimated wait time!';
    }
    if (lower.includes('service') || lower.includes('available')) {
      return `There are ${availableSlots.length} open queue${availableSlots.length !== 1 ? 's' : ''} available today. Use the filters to find what you need.`;
    }
    return "I can help you with queue information, wait times, and available services. What would you like to know?";
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/student/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/student/transactions' },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
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
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="queue-page">

          {/* Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              {selectedSlot ? (
                <button className="breadcrumb-link" onClick={() => setSelectedSlot(null)}>
                  <ChevronLeft className="breadcrumb-icon" />
                  Available Queues
                </button>
              ) : (
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Dashboard
                </Link>
              )}
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <Users className="icon" />
              </div>
              <div>
                <h1 className="queue-title">
                  {selectedSlot ? 'Service Details' : 'Queue Management'}
                </h1>
                <p className="queue-subtitle">
                  {selectedSlot
                    ? `${selectedSlot.serviceName} — ${selectedSlot.departmentName}`
                    : 'Join queues and track your position in real-time'}
                </p>
              </div>
            </div>
          </div>

          {/* ── DETAIL VIEW ── */}
          {selectedSlot && (
            <div className="avail-services-details-section">
              {/* Hero */}
              <div className="avail-services-service-hero">
                <h2>{selectedSlot.serviceName}</h2>
                <p style={{ marginBottom: 0 }}>{selectedSlot.departmentName}</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <div className="avail-services-service-hero-meta">
                    <Clock className="avail-services-service-hero-icon" />
                    <span>Avg. Wait: {selectedSlot.avgWaitTime}</span>
                  </div>
                  <div className="avail-services-service-hero-meta">
                    <Users className="avail-services-service-hero-icon" />
                    <span>{selectedSlot.waitingCount} currently waiting</span>
                  </div>
                  <div className="avail-services-service-hero-meta">
                    <CheckCircle2 className="avail-services-service-hero-icon" />
                    <span>Now Serving: {selectedSlot.currentlyServing}</span>
                  </div>
                </div>
              </div>

              {/* Requirements + Procedure */}
              <div className="avail-services-details-grid">
                {/* Requirements */}
                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <CheckCircle2 className="avail-services-details-card-icon" /> Requirements
                    </h3>
                    <p className="avail-services-details-card-description">
                      Documents and items you need to bring
                    </p>
                  </div>
                  <div className="avail-services-details-card-content">
                    {(() => {
                      const reqs = getServiceRequirements(selectedSlot.serviceName);
                      return reqs.length > 0 ? (
                        <ul className="avail-services-requirements-list">
                          {reqs.map((req) => (
                            <li key={req.id} className="avail-services-requirement-item">
                              <CheckCircle2 className="avail-services-requirement-icon" />
                              <div>
                                <span>{req.name}</span>
                                {req.description && (
                                  <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>
                                    {req.description}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="avail-services-requirements-list">
                          <li className="avail-services-requirement-item">
                            <CheckCircle2 className="avail-services-requirement-icon" />
                            <span>Valid Student ID</span>
                          </li>
                          <li className="avail-services-requirement-item">
                            <CheckCircle2 className="avail-services-requirement-icon" />
                            <span>Any relevant supporting documents</span>
                          </li>
                        </ul>
                      );
                    })()}
                  </div>
                </div>

                {/* Procedure */}
                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <HelpCircle className="avail-services-details-card-icon" /> Procedure
                    </h3>
                    <p className="avail-services-details-card-description">
                      Step-by-step process
                    </p>
                  </div>
                  <div className="avail-services-details-card-content">
                    <ol className="avail-services-procedure-list">
                      {getProcedure(selectedSlot.serviceName).map((step, index) => (
                        <li key={index} className="avail-services-procedure-item">
                          <span className="avail-services-procedure-number">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="avail-services-cta-card">
                <div className="avail-services-cta-content">
                  <h3>Ready to join this queue?</h3>
                  <p>Make sure you have all the requirements before joining the queue</p>
                </div>
                <button
                  className="avail-services-queue-btn"
                  onClick={handleJoinFromDetail}
                  disabled={detailJoinBtnDisabled()}
                >
                  {joiningSlotId === selectedSlot.slotId ? (
                    <Loader2
                      className="avail-services-queue-btn-icon"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  ) : (
                    <Clock className="avail-services-queue-btn-icon" />
                  )}
                  {detailJoinBtnLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {!selectedSlot && (
            <>
              {/* Global loading / error states */}
              {isLoading && (
                <div className="no-queues-card">
                  <Loader2 className="no-queues-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  <p className="no-queues-description">Loading queues…</p>
                </div>
              )}

              {!isLoading && error && (
                <div className="no-queues-card">
                  <AlertCircle className="no-queues-icon" />
                  <h3 className="no-queues-title">Something went wrong</h3>
                  <p className="no-queues-description">{error}</p>
                </div>
              )}

              {/* My Active Queues */}
              {!isLoading && queues.length > 0 && (
                <section className="my-queues-section">
                  <div className="section-title-wrapper">
                    <Clock className="section-icon" />
                    <h2 className="section-title">My Active Queues</h2>
                    <span className="queue-badge">{queues.length}</span>
                  </div>
                  <div className="queues-list">
                    {queues.map((queue) => (
                      <div
                        key={queue.queueId}
                        className="queue-card active-queue-card"
                        onClick={() => navigate('/student/queue-status', { state: { queueId: queue.queueId } })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="queue-card-content">
                          <div className="queue-left">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                              className="queue-college-logo"
                            />
                            <div className="queue-info">
                              <div className="queue-header-row">
                                <div>
                                  <h3 className="queue-service-name">{queue.serviceName}</h3>
                                  <p className="queue-college-name">{queue.departmentName}</p>
                                </div>
                                <span className="queue-number-badge">{queue.queueNumberBadge}</span>
                              </div>
                              <div className="queue-stats-grid">
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Your Position</p>
                                  <p className="queue-stat-value">{queue.position}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Total Waiting</p>
                                  <p className="queue-stat-value">{queue.totalWaiting}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Est. Wait Time</p>
                                  <p className="queue-stat-value-sm">{queue.estimatedWait}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Joined At</p>
                                  <p className="queue-stat-value-sm">{queue.joinedAt}</p>
                                </div>
                              </div>
                              <div className="qs-progress-card">
                                <div className="queue-progress-group">
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">People in Queue</p>
                                      <p className="qs-progress-value">
                                        {queue.totalInQueue ?? 0}/{queue.maxCapacity ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.queueOccupancyPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill"
                                        style={{ width: `${queue.queueOccupancyPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">Serviced</p>
                                      <p className="qs-progress-value">
                                        {queue.servicedCount ?? 0}/{queue.totalInQueue ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.servicedPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill qs-progress-fill-serviced"
                                        style={{ width: `${queue.servicedPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                className="queue-leave-btn"
                                onClick={(e) => { e.stopPropagation(); handleLeaveQueue(queue.queueId); }}
                                disabled={leavingQueueId === queue.queueId}
                                title="Leave this queue"
                                type="button"
                                aria-label={`Leave queue for ${queue.serviceName}`}
                              >
                                {leavingQueueId === queue.queueId ? (
                                  <Loader2 className="icon" style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <XCircle className="icon" />
                                )}
                                <span className="leave-text">
                                  {leavingQueueId === queue.queueId ? 'Leaving…' : 'Leave Queue'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Filters + Available Queues */}
              {!isLoading && (
                <>
                  <div className="filters-card">
                    <div className="filters-header">
                      <h3 className="filters-title">Available Queues</h3>
                      <p className="filters-description">
                        Select a queue to view service details and join
                      </p>
                    </div>
                    <div className="filters-grid">
                      <div className="filter-group">
                        <label className="filter-label" htmlFor="college-select">
                          College
                        </label>
                        <div className="filter-select-wrapper">
                          <select
                            id="college-select"
                            className="filter-select"
                            value={selectedCollege}
                            onChange={(e) => setSelectedCollege(e.target.value)}
                            aria-label="Filter by college"
                          >
                            <option value="all">All Colleges</option>
                            {collegeOptions.map((college) => (
                              <option key={college.name} value={college.name}>
                                {college.abbrev} — {college.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="filter-chevron" />
                        </div>
                      </div>
                      <div className="filter-group">
                        <label className="filter-label" htmlFor="service-select">
                          Service
                        </label>
                        <div className="filter-select-wrapper">
                          <select
                            id="service-select"
                            className="filter-select"
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            aria-label="Filter by service"
                            disabled={selectedCollege === 'all'}
                          >
                            <option value="all">All Services</option>
                            {serviceOptions.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="filter-chevron" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredSlots.length > 0 ? (
                    <div className="available-queues-list">
                      {filteredSlots.map((slot) => {
                        const isJoining = joiningSlotId === slot.slotId;
                        const atCapacity = !slot.hasCapacity;

                        return (
                          <div
                            key={slot.slotId}
                            className="queue-card available-queue-card"
                            onClick={() => setSelectedSlot(slot)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="queue-card-content">
                              <div className="queue-left">
                                <div className="queue-logo-wrapper">
                                  <img
                                    src={getCollegeLogo(slot.departmentName)}
                                    alt={slot.departmentName}
                                    className="queue-college-logo-sm"
                                  />
                                </div>
                                <div className="queue-info">
                                  <div className="queue-header-row">
                                    <div>
                                      <h3 className="queue-service-name">{slot.serviceName}</h3>
                                      <p className="queue-college-name">{slot.departmentName}</p>
                                    </div>
                                    <span className="queue-status-badge">
                                      {atCapacity ? 'Full' : 'Open'}
                                    </span>
                                  </div>
                                  <div className="queue-details-grid">
                                    <div className="queue-detail-item">
                                      <div className="detail-icon waiting">
                                        <Users className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Waiting</p>
                                        <p className="detail-value">{slot.waitingCount}</p>
                                      </div>
                                    </div>
                                    <div className="queue-detail-item">
                                      <div className="detail-icon time">
                                        <Clock className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Avg Wait</p>
                                        <p className="detail-value">{slot.avgWaitTime}</p>
                                      </div>
                                    </div>
                                    <div className="queue-detail-item">
                                      <div className="detail-icon serving">
                                        <CheckCircle2 className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Now Serving</p>
                                        <p className="detail-value">{slot.currentlyServing}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                className={`queue-join-btn ${(isJoining || atCapacity) ? 'disabled' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleJoinQueue(slot.slotId); }}
                                disabled={isJoining || atCapacity}
                                type="button"
                                aria-label={
                                  atCapacity
                                    ? `Queue for ${slot.serviceName} is full`
                                    : `Join queue for ${slot.serviceName}`
                                }
                              >
                                {isJoining ? (
                                  <>
                                    <Loader2
                                      style={{
                                        width: '1rem',
                                        height: '1rem',
                                        marginRight: '0.375rem',
                                        animation: 'spin 1s linear infinite',
                                        display: 'inline',
                                      }}
                                    />
                                    Joining…
                                  </>
                                ) : atCapacity ? (
                                  'Queue Full'
                                ) : (
                                  'Join Queue'
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-queues-card">
                      <AlertCircle className="no-queues-icon" />
                      <h3 className="no-queues-title">No queues found</h3>
                      <p className="no-queues-description">
                        {availableSlots.length === 0
                          ? 'No queues are open today. Check back later.'
                          : 'Try adjusting your filters.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIconChat />
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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
