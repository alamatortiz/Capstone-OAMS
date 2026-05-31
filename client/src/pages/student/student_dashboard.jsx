import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useQueue } from '../../contexts/QueueContext';

import { Link, useNavigate } from 'react-router-dom';
import { getCollegeLogo } from '../../data/collegeLogo';

import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import ccsLogo from '../../assets/CCS.png';
import './student_dashboard.css';


// Sidebar Icons
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

// Dashboard Content Icons
const ClockIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const FileTextIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const BellIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const ListIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const ActivityIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const GraduationCapIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.21 15.89A10 10 0 1 1 8.11 2.05"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const TimerIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="8"></circle>
    <path d="M12 9v4l3 2"></path>
    <path d="M7 2h10"></path>
  </svg>
);

const MegaphoneIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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

export default function StudentDashboard() {
  // Demo fallback data (for UI testing without depending on Auth backend values)
  const { user: authUser, logout } = useAuth();
  const user = authUser ?? {
    name: 'John Doe',
    role: 'student',
    college: 'College of Computing Studies (CCS)',
    studentId: '2300000',
  };
  const { getActiveQueues } = useQueue();

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! 👋 I\'m your OAMS Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const activeQueues = getActiveQueues();
  const mostRecentQueue = activeQueues[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep DOM and localStorage in sync with `isDark` without setting state inside effect
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    setMessages([...messages, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        text: generateBotResponse(inputValue),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('queue') || lowerInput.includes('position')) {
      return mostRecentQueue 
        ? `You're currently at position ${mostRecentQueue.position} in the ${mostRecentQueue.service} queue. Estimated wait time is ${mostRecentQueue.estimatedWaitTime}.`
        : 'You don\'t have any active queues. Would you like to join one?';
    } else if (lowerInput.includes('appointment')) {
      return 'You have 2 upcoming appointments this week. Visit the Appointments section to view or schedule more.';
    } else if (lowerInput.includes('document')) {
      return 'You have 5 documents on file, with 2 pending approval. Check your Documents section for details.';
    } else if (lowerInput.includes('service') || lowerInput.includes('help')) {
      return 'I can help you with queue information, appointments, documents, announcements, and more. What would you like to know?';
    } else {
      return 'That\'s a great question! For more detailed assistance, please visit the respective section in the dashboard or contact your college office.';
    }
  };

  const toggleDarkMode = () => {
    setIsDark(prev => !prev);
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/student/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/student/transactions' },
  ];

  const stats = [
    { 
      title: 'Queue Position', 
      value: mostRecentQueue ? String(mostRecentQueue.position) : '0',
      description: activeQueues.length > 0 ? `Waiting in ${activeQueues.length} queue${activeQueues.length > 1 ? 's' : ''}` : 'No active queues',
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      link: '/student/queue-status' 
    },
    { 
      title: 'Appointments',
      value: '2',
      description: 'Upcoming this week',
      icon: CalendarIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      link: '/student/appointments' 
    },
    { 
      title: 'Documents',
      value: '5',
      description: '2 pending approval',
      icon: FileTextIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      link: '/student/documents' 
    },
    { 
      title: 'Completed',
      value: '12',
      description: 'Total transactions',
      icon: CheckCircleIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      link: '/student/transactions' 
    },
  ];

  const quickActions = [
    {
      title: 'Avail Service',
      description: 'Browse available office services and join a queue instantly.',
      icon: ListIcon,
      link: '/student/avail-service',
      gradient: 'from-emerald-500 to-green-600',
      badge: '6 Services',
    },
    {
      title: 'Queue Tracking',
      description: 'View detailed analytics and history of all your queue activities.',
      icon: ActivityIcon,
      link: '/student/queue-tracking',
      gradient: 'from-cyan-500 to-blue-600',
      badge: 'Analytics',
    },
    {
      title: 'Appointment Booking',
      description: 'Schedule appointments with professors and view available slots.',
      icon: CalendarIcon,
      link: '/student/appointment-booking',
      gradient: 'from-indigo-500 to-purple-600',
      badge: 'New Slots',
    },
    {
      title: 'Announcements',
      description: 'Stay updated with the latest notices from all colleges.',
      icon: MegaphoneIcon,
      link: '/student/announcements',
      gradient: 'from-violet-500 to-purple-600',
      badge: '2 Pinned',
    },
    {
      title: 'Professor Schedules',
      description: 'Check faculty consultation hours and room availability.',
      icon: GraduationCapIcon,
      link: '/student/professor-schedules',
      gradient: 'from-sky-500 to-blue-600',
      badge: '13 Faculty',
    },
    {
      title: 'View Queue Status',
      description: 'Track your real-time position across all active queues.',
      icon: TimerIcon,
      link: '/student/queue-status',
      gradient: 'from-rose-500 to-pink-600',
      badge: `${activeQueues.length} Active`,
    },
  ];

  const pinnedAnnouncements = [
    { id: '1', title: 'Enrollment Period for Second Semester', college: 'College of Computing Studies (CCS)', date: '2026-03-25' },
    { id: '2', title: 'System Maintenance Notice', college: 'All Departments', date: '2026-03-26' },
  ];

  const recentActivity = [
    { id: 1, type: 'queue', title: 'Joined Queue at Registrar', time: '10 minutes ago', status: 'active', college: 'College of Computing Studies' },
    { id: 2, type: 'appointment', title: 'Appointment with Prof. Santos', time: 'Tomorrow, 2:00 PM', status: 'confirmed', college: 'College of Computing Studies' },
    { id: 3, type: 'document', title: 'Good Moral Certificate', time: '2 days ago', status: 'processing', college: 'College of Computing Studies' },
  ];

  const queueProgress = mostRecentQueue ? ((mostRecentQueue.totalInQueue - mostRecentQueue.position) / mostRecentQueue.totalInQueue) * 100 : 0;

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* User Info - New Layout */}
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
              <p className="user-college-text">{user?.college ?? 'College of Computing Studies'}</p>
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
            <button 
              className="logout-btn"
              onClick={handleLogout}
            >
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
        <div className="student-dashboard">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <p className="banner-greeting">Good day! 👋</p>
              <div className="banner-title-row">
                <img src={ccsLogo} alt="CCS Logo" className="banner-ccs-logo" />
                <h1 className="banner-title">{user?.name ?? 'John Doe'}</h1>
              </div>

              <div className="banner-badges">
                <span className="badge">Student Portal</span>
                <span className="badge">AY 2025–2026</span>
                <span className="badge">{user?.studentId}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <Link key={stat.title} to={stat.link} className="stat-card-link">
                <div className="stat-card">
                  <div className="stat-header">
                    <div className={`stat-icon ${stat.bgColor}`}>
                      <stat.icon />
                    </div>
                    <ChevronRightIcon />
                  </div>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-title">{stat.title}</p>
                  <p className="stat-description">{stat.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="section-header">
              <h2>Quick Actions</h2>
              <span className="section-count">{quickActions.length} features available</span>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <Link key={action.title} to={action.link} className="quick-action-link">
                  <div className="quick-action-card">
                    <div className="action-header">
                      <div className={`action-icon action-gradient-${index + 1}`}>
                        <action.icon />
                      </div>
                      <span className="action-badge">{action.badge}</span>
                    </div>
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                    <div className="action-cta">
                      <span>Open</span>
                      <ChevronRightIcon />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Live Preview Row */}
          <div className="preview-grid">
            {/* Active Queue Preview */}
            {mostRecentQueue ? (
              <div className="queue-preview-card">
                <div className="card-header">
                  <h3 className="card-title">
                    <TimerIcon />
                    Active Queue
                  </h3>
                  <Link to="/student/queue-status" className="view-all-btn">
                    View All <ChevronRightIcon />
                  </Link>
                </div>
                <div className="card-content">
                  <div className="queue-service-info">
                    <img src={getCollegeLogo(mostRecentQueue.college)} alt={mostRecentQueue.college} className="college-logo" />
                    <div className="queue-service-details">
                      <div className="service-row">
                        <p className="service-name">{mostRecentQueue.service}</p>
                        <span className="queue-number">{mostRecentQueue.queueNumber}</span>
                      </div>
                      <p className="college-name">{mostRecentQueue.college}</p>
                    </div>
                  </div>
                  <div className="queue-stats">
                    <div className="queue-stat">
                      <p className="stat-num">{mostRecentQueue.position}</p>
                      <p className="stat-label">Position</p>
                    </div>
                    <div className="queue-stat">
                      <p className="stat-num">{mostRecentQueue.totalInQueue}</p>
                      <p className="stat-label">Waiting</p>
                    </div>
                    <div className="queue-stat">
                      <p className="stat-num-sm">{mostRecentQueue.estimatedWaitTime}</p>
                      <p className="stat-label">Est. Wait</p>
                    </div>
                  </div>
                  <div className="queue-progress">
                    <div className="progress-label">
                      <span>Progress</span>
                      <span>{Math.round(queueProgress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${queueProgress}%` }}></div>
                    </div>
                  </div>
                  <Link to="/student/queue-status" className="primary-btn">
                    View Full Queue Status
                  </Link>
                </div>
              </div>
            ) : (
              <div className="queue-preview-card empty">
                <div className="card-header">
                  <h3 className="card-title">
                    <TimerIcon />
                    Active Queue
                  </h3>
                </div>
                <div className="card-content empty-content">
                  <p>No active queues</p>
                  <Link to="/student/avail-service" className="primary-btn">
                    Join a Queue
                  </Link>
                </div>
              </div>
            )}

            {/* Pinned Announcements */}
            <div className="announcements-card">
              <div className="card-header">
                <h3 className="card-title">
                  <MegaphoneIcon />
                  Pinned Announcements
                </h3>
                <Link to="/student/announcements" className="view-all-btn">
                  View All <ChevronRightIcon />
                </Link>
              </div>
              <div className="card-content announcements-content">
                {pinnedAnnouncements.map((ann) => (
                  <Link key={ann.id} to="/student/announcements" className="announcement-item">
                    <div className="announcement-icon">
                      <AlertCircleIcon />
                    </div>
                    <div className="announcement-details">
                      <p className="announcement-title">{ann.title}</p>
                      <p className="announcement-college">{ann.college}</p>
                      <p className="announcement-date">
                        {new Date(ann.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="announcement-badge">Important</span>
                  </Link>
                ))}
                <Link to="/student/announcements" className="secondary-btn">
                  <BellIcon />
                  View All Announcements
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <section className="recent-activity-section">
            <div className="section-header">
              <h2>Recent Activity</h2>
              <Link to="/student/transactions" className="view-all-link">
                See All <ChevronRightIcon />
              </Link>
            </div>
            <div className="activity-card">
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className={`activity-icon activity-${activity.type}`}>
                      {activity.type === 'queue' && <ClockIcon />}
                      {activity.type === 'appointment' && <CalendarIcon />}
                      {activity.type === 'document' && <FileTextIcon />}
                    </div>
                    <div className="activity-details">
                      <p className="activity-title">{activity.title}</p>
                      <p className="activity-college">{activity.college}</p>
                      <p className="activity-time">{activity.time}</p>
                    </div>
                    <span className={`activity-badge activity-status-${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Service Hours */}
          <div className="service-hours-card">
            <div className="hours-header">
              <h3 className="hours-title">
                <AlertCircleIcon />
                Service Hours
              </h3>
              <p className="hours-subtitle">Office operating hours for all colleges</p>
            </div>
            <div className="hours-grid">
              <div>
                <p className="hours-label">Weekdays</p>
                <p className="hours-time">Monday – Friday: 8:00 AM – 5:00 PM</p>
              </div>
              <div>
                <p className="hours-label">Weekends</p>
                <p className="hours-time">Saturday: 8:00 AM – 12:00 PM<br />Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
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
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message message-${message.type}`}>
                  <div className="message-content">
                    {message.text}
                  </div>
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

