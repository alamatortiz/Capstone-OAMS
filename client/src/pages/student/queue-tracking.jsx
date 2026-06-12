import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQueue } from '../../contexts/QueueContext';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './queue-tracking.css';

import {
  MapPin,
  Clock,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  History,
  AlertCircle,
  Timer,
  Target,
} from 'lucide-react';

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

const ChatIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function QueueTrackingPage() {
  const { user: authUser, logout } = useAuth();
  const {
    queues = [],
    queueHistory = [],
    getQueueMetrics = () => ({}),
    completeQueue = () => {},
    cancelQueue = () => {},
  } = useQueue();

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
        studentNumber: 'N/A Student Number',
        departmentAbbrev: '',
      };

  const navigate = useNavigate();
  const location = useLocation();

  // ── State ─────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('active');
  const messagesEndRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Derived Values ────────────────────────────────────────────────────────
  const activeQueues = (Array.isArray(queues) ? queues : []).filter(
    (q) => q?.status === 'waiting' || q?.status === 'active'
  );
  const metrics = getQueueMetrics() || {};

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? 'dark' : 'light');
      return next;
    });
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
      return activeQueues.length > 0
        ? `You have ${activeQueues.length} active queue(s). Check the Active tab for details.`
        : "You don't have any active queues. Would you like to join one?";
    } else if (lowerInput.includes('history')) {
      return `You have ${queueHistory.length} queue history record(s).`;
    } else if (lowerInput.includes('analytics')) {
      return `Your average wait time is ${metrics.averageWaitTime}. Visit the Analytics tab for more details.`;
    } else {
      return 'That is a great question! For more assistance, check the respective tab or contact your college office.';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'waiting':
        return 'status-waiting';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  const getProgressPercentage = (position, total) => {
    return ((total - position) / total) * 100;
  };

  const formatTimeAgo = (joinedAt) => {
    const joined = new Date(`2000-01-01 ${joinedAt}`);
    const now = new Date(
      `2000-01-01 ${currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    );
    const diffMinutes = Math.round((now.getTime() - joined.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    return `${diffMinutes} minutes ago`;
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    {
      icon: CalendarIconNav,
      label: 'Appointments',
      path: '/student/appointments',
    },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    {
      icon: HistoryIconNav,
      label: 'Transactions',
      path: '/student/transactions',
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="logo-img oams-logo-img"
              />
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
                  className={`nav-item ${
                    location.pathname === item.path ? 'active' : ''
                  }`}
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
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="logo-img oams-logo-img"
            />
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
        <div className="queue-tracking-page">
          {/* Header */}
          <div className="qt-header">
            <h1 className="qt-title">
              <Activity className="qt-icon" />
              Queue Tracking System
            </h1>
            <p className="qt-subtitle">
              Real-time queue monitoring, history, and analytics
            </p>
          </div>

          {/* Metrics Overview */}
          <div className="qt-metrics-grid">
            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-joined">
                <Target className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Total Joined</p>
              <p className="qt-metric-value qt-metric-value-joined">
                {metrics.totalQueuesJoined}
              </p>
            </div>

            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-completed">
                <CheckCircle2 className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Completed</p>
              <p className="qt-metric-value qt-metric-value-completed">
                {metrics.totalQueuesCompleted}
              </p>
            </div>

            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-cancelled">
                <XCircle className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Cancelled</p>
              <p className="qt-metric-value qt-metric-value-cancelled">
                {metrics.totalQueuesCancelled}
              </p>
            </div>

            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-wait">
                <Clock className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Avg Wait</p>
              <p className="qt-metric-value qt-metric-value-wait">
                {metrics.averageWaitTime}
              </p>
            </div>

            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-used">
                <TrendingUp className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Most Used</p>
              <p className="qt-metric-value-sm qt-metric-value-used">
                {metrics.mostUsedService}
              </p>
            </div>

            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-time">
                <Timer className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Total Time</p>
              <p className="qt-metric-value-sm qt-metric-value-time">
                {metrics.totalTimeInQueues}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="qt-tabs-container">
            <div className="qt-tabs-list">
              <button
                className={`qt-tab ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                <Activity className="qt-icon-xs" />
                Active ({activeQueues.length})
              </button>
              <button
                className={`qt-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History className="qt-icon-xs" />
                History ({queueHistory.length})
              </button>
              <button
                className={`qt-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 className="qt-icon-xs" />
                Analytics
              </button>
            </div>

            {/* Active Queues Tab */}
            {activeTab === 'active' && (
              <div className="qt-tab-content">
                {activeQueues.length === 0 ? (
                  <div className="qt-empty-state">
                    <AlertCircle className="qt-empty-icon" />
                    <h3 className="qt-empty-title">No Active Queues</h3>
                    <p className="qt-empty-description">
                      You are not currently in any queues. Join a queue to start
                      tracking.
                    </p>
                    <Link to="/student/avail-service" className="qt-primary-btn">
                      Join Queue
                    </Link>
                  </div>
                ) : (
                  <div className="qt-queues-list">
                    {activeQueues.map((queue) => (
                      <div key={queue.id} className="qt-queue-card">
                        <div className="qt-queue-header">
                          <div className="qt-queue-info">
                            <h3 className="qt-queue-service">{queue.service}</h3>
                            <span
                              className={`qt-status-badge ${getStatusColor(
                                queue.status
                              )}`}
                            >
                              {queue.status === 'active'
                                ? 'Your Turn!'
                                : 'Waiting'}
                            </span>
                          </div>
                        </div>

                        <div className="qt-queue-details">
                          <div className="qt-queue-detail-row">
                            <span className="qt-detail-label">
                              <MapPin className="qt-icon-xs" />
                              {queue.location}
                            </span>
                            <span className="qt-queue-number">
                              {queue.queueNumber}
                            </span>
                            <span className="qt-detail-label">
                              <Clock className="qt-icon-xs" />
                              Joined {formatTimeAgo(queue.joinedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="qt-queue-position">
                          <div className="qt-position-header">
                            <div className="qt-position-label">
                              <Users className="qt-icon-xs" />
                              Your Position
                            </div>
                            <div className="qt-position-display">
                              <p className="qt-position-number">
                                {queue.position}
                              </p>
                              <p className="qt-position-total">
                                of {queue.totalInQueue}
                              </p>
                            </div>
                          </div>
                          <div className="qt-progress-bar">
                            <div
                              className="qt-progress-fill"
                              style={{
                                width: `${getProgressPercentage(
                                  queue.position,
                                  queue.totalInQueue
                                )}%`,
                              }}
                            ></div>
                          </div>
                          <p className="qt-progress-text">
                            {Math.round(
                              getProgressPercentage(
                                queue.position,
                                queue.totalInQueue
                              )
                            )}
                            % through queue
                          </p>
                        </div>

                        <div className="qt-queue-stats-grid">
                          <div className="qt-stat-box">
                            <p className="qt-stat-label">Currently Serving</p>
                            <p className="qt-stat-value">
                              {queue.currentlyServing}
                            </p>
                          </div>
                          <div className="qt-stat-box">
                            <p className="qt-stat-label">Estimated Wait</p>
                            <p className="qt-stat-value">
                              {queue.estimatedWaitTime}
                            </p>
                          </div>
                          <div className="qt-stat-box">
                            <p className="qt-stat-label">Avg Service Time</p>
                            <p className="qt-stat-value">
                              {queue.averageServiceTime}
                            </p>
                          </div>
                        </div>

                        <div className="qt-service-hours">
                          <p className="qt-hours-label">Service Hours</p>
                          <p className="qt-hours-time">
                            {queue.serviceHours.start} - {queue.serviceHours.end}
                            {queue.serviceHours.breakTime && (
                              <span className="qt-break-time">
                                (Break: {queue.serviceHours.breakTime})
                              </span>
                            )}
                          </p>
                        </div>

                        {queue.announcementsjson &&
                          queue.announcementsjson.length > 0 && (
                            <div className="qt-announcements">
                              <p className="qt-announcements-title">
                                <AlertCircle className="qt-icon-xs" />
                                Important Announcements
                              </p>
                              <ul className="qt-announcements-list">
                                {queue.announcementsjson.map((ann, i) => (
                                  <li key={i}>• {ann}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        <div className="qt-queue-actions">
                          {queue.status === 'active' && (
                            <button
                              onClick={() =>
                                completeQueue(queue.id, 'Staff Member')
                              }
                              className="qt-btn-complete"
                            >
                              <CheckCircle2 className="qt-icon-xs" />
                              Mark as Completed
                            </button>
                          )}
                          <button
                            onClick={() => cancelQueue(queue.id)}
                            className="qt-btn-cancel"
                          >
                            <XCircle className="qt-icon-xs" />
                            Cancel Queue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="qt-tab-content">
                {queueHistory.length === 0 ? (
                  <div className="qt-empty-state">
                    <History className="qt-empty-icon" />
                    <h3 className="qt-empty-title">No Queue History</h3>
                    <p className="qt-empty-description">
                      Your completed and cancelled queues will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="qt-history-list">
                    {queueHistory.map((history) => (
                      <div key={history.id} className="qt-history-item">
                        <div className="qt-history-content">
                          <div className="qt-history-header">
                            <h4 className="qt-history-service">
                              {history.service}
                            </h4>
                            <span
                              className={`qt-status-badge ${getStatusColor(
                                history.status
                              )}`}
                            >
                              {history.status}
                            </span>
                          </div>
                          <p className="qt-history-college">
                            {history.college} • {history.queueNumber}
                          </p>
                          <div className="qt-history-meta">
                            <span>Joined: {history.joinedAt}</span>
                            <span>•</span>
                            <span>Completed: {history.completedAt}</span>
                            <span>•</span>
                            <span className="qt-wait-time">
                              Wait time: {history.actualWaitTime}
                            </span>
                            {history.servedBy && (
                              <>
                                <span>•</span>
                                <span>Served by: {history.servedBy}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {history.status === 'completed' ? (
                          <CheckCircle2 className="qt-history-icon completed" />
                        ) : (
                          <XCircle className="qt-history-icon cancelled" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="qt-tab-content">
                <div className="qt-analytics-grid">
                  <div className="qt-analytics-card">
                    <h3 className="qt-analytics-title">
                      <BarChart3 className="qt-icon-xs" />
                      Queue Statistics
                    </h3>
                    <p className="qt-analytics-subtitle">
                      Overview of your queue activity
                    </p>

                    <div className="qt-analytics-stat">
                      <div className="qt-stat-header">
                        <span>Success Rate</span>
                        <span className="qt-stat-percentage">
                          {metrics.totalQueuesJoined > 0
                            ? Math.round(
                                (metrics.totalQueuesCompleted /
                                  metrics.totalQueuesJoined) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="qt-progress-bar">
                        <div
                          className="qt-progress-fill"
                          style={{
                            width: `${
                              metrics.totalQueuesJoined > 0
                                ? (metrics.totalQueuesCompleted /
                                    metrics.totalQueuesJoined) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="qt-analytics-grid-2">
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Total Sessions</p>
                        <p className="qt-stat-value">
                          {metrics.totalQueuesJoined}
                        </p>
                      </div>
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Completed</p>
                        <p className="qt-stat-value">
                          {metrics.totalQueuesCompleted}
                        </p>
                      </div>
                    </div>

                    <div className="qt-stat-box">
                      <p className="qt-stat-label">Most Used Service</p>
                      <p className="qt-stat-value-sm">
                        {metrics.mostUsedService}
                      </p>
                    </div>
                  </div>

                  <div className="qt-analytics-card">
                    <h3 className="qt-analytics-title">
                      <Clock className="qt-icon-xs" />
                      Time Analytics
                    </h3>
                    <p className="qt-analytics-subtitle">
                      Wait time and efficiency metrics
                    </p>

                    <div className="qt-stat-box">
                      <p className="qt-stat-label">Average Wait Time</p>
                      <p className="qt-stat-value">
                        {metrics.averageWaitTime}
                      </p>
                    </div>

                    <div className="qt-stat-box">
                      <p className="qt-stat-label">Total Time in Queues</p>
                      <p className="qt-stat-value">
                        {metrics.totalTimeInQueues}
                      </p>
                    </div>

                    <div className="qt-stat-box">
                      <p className="qt-stat-label">Active Queues</p>
                      <p className="qt-stat-value">{activeQueues.length}</p>
                      <p className="qt-stat-subtext">Currently in progress</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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