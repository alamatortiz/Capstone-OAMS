import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ===== Chat Widget Icons (copied pattern from StudentDashboard) =====
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

import { Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { COLLEGES } from '../../data/colleges';
import { getCollegeLogo } from '../../data/collegeLogo';

import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './queue.css';

// ===== SIDEBAR ICONS (same as StudentDashboard) =====
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
  <svg
    className="sun-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
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
  <svg
    className="moon-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

// Helper function to generate random queue data
const generateQueueData = (college, service) => {
  const collegeCode = college.match(/\(([A-Z]+)\)/)?.[1] || 'XXX';
  const serviceCode = service.split(' ')[0].substring(0, 3).toUpperCase();
  
  return {
    position: Math.floor(Math.random() * 10) + 1,
    totalWaiting: Math.floor(Math.random() * 20) + 5,
    estimatedWait: `${Math.floor(Math.random() * 20) + 10}-${Math.floor(Math.random() * 10) + 20} mins`,
    queueNumber: `${collegeCode}-${serviceCode}-${Math.floor(Math.random() * 900) + 100}`,
    joinedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
};



export default function QueuePage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
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
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        departmentAbbrev: "",
      };

  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [myQueues, setMyQueues] = useState([
    {
      id: '1',
      college: 'College of Computing Studies (CCS)',
      service: 'Registrar - Document Request',
      position: 3,
      totalWaiting: 12,
      estimatedWait: '15-20 mins',
      status: 'waiting',
      queueNumber: 'CCS-REG-047',
      joinedAt: '10:30 AM',
    },
  ]);

  const services = useMemo(
    () => [
      'Registrar - Document Request',
      'Registrar - Enrollment Concerns',
      'Cashier - Payment',
      'Student Affairs - Clearance',
      'Guidance Office - Consultation',
      'Library - Book Concerns',
    ],
    []
  );

  const availableQueues = useMemo(
    () => [
      {
        college: 'College of Computing Studies (CCS)',
        service: 'Registrar - Document Request',
        currentServing: 'CCS-REG-044',
        totalWaiting: 12,
        avgWaitTime: '5-7 mins per person',
        status: 'open',
      },
      {
        college: 'College of Business, Accountancy and Administration (CBAA)',
        service: 'Cashier - Payment',
        currentServing: 'CBAA-CSH-028',
        totalWaiting: 8,
        avgWaitTime: '3-5 mins per person',
        status: 'open',
      },
      {
        college: 'College of Engineering (COE)',
        service: 'Student Affairs - Clearance',
        currentServing: 'COE-SAF-015',
        totalWaiting: 5,
        avgWaitTime: '8-10 mins per person',
        status: 'open',
      },
      {
        college: 'College of Education (COED)',
        service: 'Document Processing',
        currentServing: 'COED-DOC-032',
        totalWaiting: 7,
        avgWaitTime: '6-8 mins per person',
        status: 'open',
      },
      {
        college: 'College of Arts and Sciences (CAS)',
        service: 'Registration',
        currentServing: 'CAS-REG-019',
        totalWaiting: 4,
        avgWaitTime: '4-6 mins per person',
        status: 'open',
      },
      {
        college: 'College of Health and Allied Sciences (CHAS)',
        service: 'Certification',
        currentServing: 'CHAS-CERT-011',
        totalWaiting: 6,
        avgWaitTime: '7-9 mins per person',
        status: 'open',
      },
    ],
    []
  );

  const filteredQueues = useMemo(
    () =>
      availableQueues.filter(
        (q) =>
          (selectedCollege === 'all' || q.college === selectedCollege) &&
          (selectedService === 'all' || q.service === selectedService)
      ),
    [availableQueues, selectedCollege, selectedService]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleJoinQueue = useCallback((college, service) => {
    const queueData = generateQueueData(college, service);
    const newQueue = {
      id: Date.now().toString(),
      college,
      service,
      status: 'waiting',
      ...queueData,
    };
    setMyQueues((prevQueues) => [...prevQueues, newQueue]);
    toast.success('Successfully joined the queue!');
  }, []);

  const handleLeaveQueue = useCallback((id) => {
    setMyQueues((prevQueues) => prevQueues.filter((q) => q.id !== id));
    toast.info('You have left the queue');
  }, []);

  const isAlreadyInQueue = useCallback(
    (college, service) =>
      myQueues.some((q) => q.college === college && q.service === service),
    [myQueues]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('queue') || lowerInput.includes('position')) {
      return myQueues.length > 0
        ? `You have ${myQueues.length} active queue${myQueues.length > 1 ? 's' : ''}. Your first queue position is ${myQueues[0].position}. Est. wait time: ${myQueues[0].estimatedWait}`
        : "You don't have any active queues. Would you like to join one?";
    } else if (lowerInput.includes('service') || lowerInput.includes('available')) {
      return "We have 6 services available including Registrar, Cashier, Student Affairs, Guidance Office, and Library services. Would you like to browse them?";
    } else if (lowerInput.includes('wait') || lowerInput.includes('time')) {
      return myQueues.length > 0
        ? `Your estimated wait time is ${myQueues[0].estimatedWait}. Currently ${myQueues[0].totalWaiting} people are waiting in this queue.`
        : "Join a queue to see your estimated wait time!";
    } else if (lowerInput.includes('join') || lowerInput.includes('queue')) {
      return "Browse the available queues below and click 'Join Queue' to get started. You can filter by college and service type.";
    } else {
      return "I can help you with queue information, wait times, and more. What would you like to know?";
    }
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/student/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/student/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/student/transactions" },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          {/* Logo Section */}
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* User Info */}
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? "Student"}</p>
                <span className="user-role-badge">Student</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          {/* Navigation */}
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

          {/* Logout Button */}
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
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
          {/* Queue Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Dashboard
              </Link>
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <Users className="icon" />
              </div>
              <div>
                <h1 className="queue-title">Queue Management</h1>
                <p className="queue-subtitle">Join queues and track your position in real-time</p>
              </div>
            </div>
          </div>

          {/* My Active Queues */}
          {myQueues.length > 0 && (
            <section className="my-queues-section">
              <div className="section-title-wrapper">
                <Clock className="section-icon" />
                <h2 className="section-title">My Active Queues</h2>
                <span className="queue-badge">{myQueues.length}</span>
              </div>
              <div className="queues-list">
                {myQueues.map((queue) => (
                  <div key={queue.id} className="queue-card active-queue-card">
                    <div className="queue-card-content">
                      <div className="queue-left">
                        <img
                          src={getCollegeLogo(queue.college)}
                          alt={queue.college}
                          className="queue-college-logo"
                        />
                        <div className="queue-info">
                          <div className="queue-header-row">
                            <div>
                              <h3 className="queue-service-name">{queue.service}</h3>
                              <p className="queue-college-name">{queue.college}</p>
                            </div>
                            <span className="queue-number-badge">{queue.queueNumber}</span>
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
                          <div className="queue-progress-wrapper">
                            <div className="progress-label-row">
                              <span className="progress-label-text">Queue Progress</span>
                              <span className="progress-percentage">
                                {Math.round(((queue.totalWaiting - queue.position) / queue.totalWaiting) * 100)}%
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${((queue.totalWaiting - queue.position) / queue.totalWaiting) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        className="queue-leave-btn"
                        onClick={() => handleLeaveQueue(queue.id)}
                        title="Leave this queue"
                        type="button"
                        aria-label={`Leave queue for ${queue.service}`}
                      >
                        <XCircle className="icon" />
                        <span className="leave-text">Leave Queue</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <h3 className="filters-title">Available Queues</h3>
              <p className="filters-description">Select a college and service to join a queue</p>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label" htmlFor="college-select">
                  College
                </label>
                <select
                  id="college-select"
                  className="filter-select"
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  aria-label="Filter by college"
                >
                  <option value="all">All Colleges</option>
                  {COLLEGES.map((college) => (
                    <option key={college.name} value={college.name}>
                      {college.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label" htmlFor="service-select">
                  Service
                </label>
                <select
                  id="service-select"
                  className="filter-select"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  aria-label="Filter by service"
                >
                  <option value="all">All Services</option>
                  {services.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Available Queues List */}
          {filteredQueues.length > 0 ? (
            <div className="available-queues-list">
              {filteredQueues.map((queue) => {
                const alreadyInQueue = isAlreadyInQueue(queue.college, queue.service);
                return (
                  <div
                    key={`${queue.college}-${queue.service}`}
                    className="queue-card available-queue-card"
                  >
                    <div className="queue-card-content">
                      <div className="queue-left">
                        <div className="queue-logo-wrapper">
                          <img
                            src={getCollegeLogo(queue.college)}
                            alt={queue.college}
                            className="queue-college-logo-sm"
                          />
                        </div>
                        <div className="queue-info">
                          <div className="queue-header-row">
                            <div>
                              <h3 className="queue-service-name">{queue.service}</h3>
                              <p className="queue-college-name">{queue.college}</p>
                            </div>
                            <span className="queue-status-badge">Open</span>
                          </div>
                          <div className="queue-details-grid">
                            <div className="queue-detail-item">
                              <div className="detail-icon waiting">
                                <Users className="icon" />
                              </div>
                              <div>
                                <p className="detail-label">Waiting</p>
                                <p className="detail-value">{queue.totalWaiting}</p>
                              </div>
                            </div>
                            <div className="queue-detail-item">
                              <div className="detail-icon time">
                                <Clock className="icon" />
                              </div>
                              <div>
                                <p className="detail-label">Avg Wait</p>
                                <p className="detail-value">{queue.avgWaitTime}</p>
                              </div>
                            </div>
                            <div className="queue-detail-item">
                              <div className="detail-icon serving">
                                <CheckCircle2 className="icon" />
                              </div>
                              <div>
                                <p className="detail-label">Now Serving</p>
                                <p className="detail-value">{queue.currentServing}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`queue-join-btn ${alreadyInQueue ? 'disabled' : ''}`}
                        onClick={() => handleJoinQueue(queue.college, queue.service)}
                        disabled={alreadyInQueue}
                        type="button"
                        aria-label={
                          alreadyInQueue
                            ? `Already in queue for ${queue.service}`
                            : `Join queue for ${queue.service}`
                        }
                      >
                        {alreadyInQueue ? 'Already in Queue' : 'Join Queue'}
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
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
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
                <div
                  key={message.id}
                  className={`message message-${message.type}`}
                >
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
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`chat-fab ${chatOpen ? "hidden" : ""}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>
    </div>
  );
}