import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './admin-queue-management.css';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import { getCollegeLogo } from '../../data/collegeLogo';
import api from '../../utils/api';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';


// ─── Icons (all from admin dashboard) ───────────────────────────────────────
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
const UserIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
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
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
const Clock = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const Users = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const TrendingUp = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);
const MapPin = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);


const Calendar = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const AlertCircle = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <circle cx="12" cy="16" r="0.5" fill="currentColor"></circle>
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const PlayIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>
);
const ServedIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

function mapQueueFromApi(q) {
  return {
    id: q.id,
    queueType: q.queueType,
    department: q.department,
    maxCapacity: q.maxCapacity,
    currentCount: q.currentCount,
    servedCount: q.servedCount,
    status: q.status === 'open' ? 'active' : q.status,
    createdAt: q.createdAt
      ? new Date(q.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })
      : '—',
    serviceHours: q.serviceHours,
    location: q.location || 'N/A',
    currentlyServing: q.currentlyServingStudentNumber || '—',
    averageServiceTime: q.avgServiceMinutes != null ? `~${q.avgServiceMinutes} min` : 'N/A',
  };
}

export default function AdminQueueManagement() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? 'N/A College',
        employeeId: authUser.employeeId ?? '',
        departmentAbbrev: authUser.departmentAbbrev ?? 'CCS',
      }
    : {
        name: 'Admin',
        role: 'admin',
        college: '',
        employeeId: '',
        departmentAbbrev: 'CCS',
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you manage queues?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const selectedQueue = queues.find(q => q.id === selectedQueueId) || null;

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get('/admin/queue-hosting');
      setQueues((res.data.queues || []).map(mapQueueFromApi));
    } catch {
      setError('Failed to load queues. Please try again.');
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!selectedQueueId) {
      setQueueEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const res = await api.get(`/admin/queue-hosting/${selectedQueueId}/entries`);
      setQueueEntries(res.data.entries || []);
    } catch {
      setQueueEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedQueueId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchQueues();
      setLoading(false);
    };
    init();
  }, [fetchQueues]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate('/login'); };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setTimeout(() => {
      const botResponse = generateQueueBotResponse(inputValue);
      const bot = {
        id: messages.length + 2,
        type: 'bot',
        text: botResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateQueueBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes('pause') || i.includes('stop'))
      return 'You can pause/resume queues from the queue details view. Click on a queue to manage its status.';
    if (i.includes('waiting') || i.includes('student'))
      return `There are currently ${queues.reduce((acc, q) => acc + q.currentCount, 0)} students waiting across all queues.`;
    if (i.includes('served') || i.includes('complete'))
      return `Today, ${queues.reduce((acc, q) => acc + q.servedCount, 0)} students have been served.`;
    if (i.includes('capacity'))
      return 'Monitor capacity using the progress bars in the queue details. Pause when reaching max capacity.';
    return 'I can help you manage queues, track students, and monitor queue status. What do you need?';
  };

  const handleViewDetails = (queue) => {
    setSelectedQueueId(queue.id);
  };

  const handleBack = () => {
    setSelectedQueueId(null);
  };

  // ─── Queue Action Handlers ─────────────────────────────────────────────────
  const handleCallNext = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/call-next`);
      toast.success('Next student called');
      await Promise.all([fetchQueues(), fetchEntries()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to call next student');
    }
  };

  const handleMarkServed = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/serve`);
      toast.success('Student marked as served');
      await Promise.all([fetchQueues(), fetchEntries()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to mark as served');
    }
  };

  const handlePause = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/pause`);
      toast.message('Queue paused');
      await fetchQueues();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to pause queue');
    }
  };

  const handleResume = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/resume`);
      toast.success('Queue resumed');
      await fetchQueues();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to resume queue');
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Are you sure you want to stop this queue? This cannot be undone.')) return;
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/close`);
      toast.success('Queue stopped');
      setSelectedQueueId(null);
      await fetchQueues();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to stop queue');
    }
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/admin/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/admin/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/admin/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/admin/transactions' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'aqm-status-badge-active';
      case 'paused':
        return 'aqm-status-badge-paused';
      case 'closed':
        return 'aqm-status-badge-closed';
      default:
        return 'aqm-status-badge-closed';
    }
  };

  const getEntryStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'aqm-entry-status-waiting';
      case 'serving':
        return 'aqm-entry-status-serving';
      case 'completed':
        return 'aqm-entry-status-completed';
      case 'cancelled':
        return 'aqm-entry-status-cancelled';
      default:
        return 'aqm-entry-status-completed';
    }
  };

  // ─── Details View ──────────────────────────────────────────────────────────
  if (selectedQueue) {
    const queueProgress = (selectedQueue.servedCount / (selectedQueue.servedCount + selectedQueue.currentCount)) * 100;
    const capacityUsed = (selectedQueue.currentCount / selectedQueue.maxCapacity) * 100;

    return (
      <div className="aqm-dashboard-with-sidebar">
        <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
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

        {/* Sidebar */}
        <aside className={`aqm-dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="aqm-sidebar-inner">
            <div className="aqm-sidebar-logo">
              <div className="aqm-logo-container">
                <img src={ucLogo} alt="UC Logo" className="aqm-logo-img" />
                <img src={oamsLogo} alt="OAMS Logo" className="aqm-logo-img aqm-oams-logo-img" />
              </div>
              <button
                className="aqm-theme-toggle-btn"
                onClick={toggleDarkMode}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
            <div className="aqm-sidebar-user-section">
              <div className="aqm-user-top-row">
                <div className="aqm-user-avatar-large">
                  <UserIcon />
                </div>
                <div className="aqm-user-info-content">
                  <p className="aqm-user-name-large">{user?.name}</p>
                  <span className="aqm-user-role-badge">Administrator</span>
                </div>
              </div>
              <div className="aqm-user-college-wrapper">
                <p className="aqm-user-college-text">
                  {user?.college} ({user?.departmentAbbrev})
                </p>
              </div>
            </div>
            <nav className="aqm-sidebar-nav">
              <div className="aqm-nav-items">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className="aqm-nav-item"
                  >
                    <item.icon className="aqm-nav-icon-medium" />
                    <span className="aqm-nav-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
            <div className="aqm-sidebar-logout">
              <button className="aqm-logout-btn" onClick={handleLogout}>
                <LogOutIcon />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="aqm-mobile-header">
          <div className="aqm-mobile-header-content">
            <div className="aqm-mobile-logo">
              <img src={ucLogo} alt="UC Logo" className="aqm-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="aqm-logo-img aqm-oams-logo-img" />
            </div>
            <div className="aqm-mobile-header-actions">
              <button
                className="aqm-theme-toggle-btn"
                onClick={toggleDarkMode}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                className="aqm-sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Details View */}
        <main className="aqm-dashboard-main">
          <div className="aqm-details-container">
            {/* Back Button */}
            <div className="aqm-details-header">
              <button className="aqm-back-btn" onClick={handleBack}>
                <ArrowLeftIcon />
                Back to Queue List
              </button>
            </div>

            {/* Queue Header Card */}
            <div className={`aqm-queue-header-card ${getStatusColor(selectedQueue.status)}`}>
              <div className="aqm-queue-header-content">
                <div>
                  <h1 className="aqm-queue-title">{selectedQueue.queueType}</h1>
                  <p className="aqm-queue-department">{selectedQueue.department}</p>
                  <p className="aqm-queue-location">Location: {selectedQueue.location}</p>
                </div>
                <div className={`aqm-status-badge ${getStatusColor(selectedQueue.status)}`}>
                  {selectedQueue.status}
                </div>
              </div>
            </div>

            <div className="aqm-details-grid">
              {/* Main Content */}
              <div className="aqm-details-main">
                {/* Stats Grid */}
                <div className="aqm-stats-grid">
                  <div className="aqm-stat-card aqm-stat-waiting">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-queue">
                      <PlayIcon className="aqm-stat-icon" />
                    </div>
                    <p className="aqm-stat-label">Active queues</p>
                    <p className="aqm-stat-value">{queues.filter((q) => q.status === 'active').length}</p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-total">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-waiting">
                      <Users className="aqm-icon-header" />
                    </div>
                    <p className="aqm-stat-label">Total waiting</p>
                    <p className="aqm-stat-value">
                      {queues.reduce((acc, q) => acc + q.currentCount, 0)}
                    </p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-served">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-served">
                      <ServedIcon className="aqm-stat-icon" />
                    </div>
                    <p className="aqm-stat-label">Served today</p>
                    <p className="aqm-stat-value">
                      {queues.reduce((acc, q) => acc + q.servedCount, 0)}
                    </p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-capacity">
                    <p className="aqm-stat-label">Capacity</p>
                    <p className="aqm-stat-value">{Math.round(capacityUsed)}%</p>
                  </div>
                </div>


                {/* Queue Actions */}
                <div className="aqm-progress-card aqm-actions-card">
                  <div className="aqm-progress-header">
                    <h3>Queue Actions</h3>
                  </div>
                  <div className="aqm-actions-grid">
                    <button
                      className="aqm-action-btn"
                      onClick={handleCallNext}
                      disabled={
                        !!queueEntries.find(e => e.status === 'serving') ||
                        selectedQueue.currentCount === 0 ||
                        selectedQueue.status !== 'active'
                      }
                    >
                      Call Next
                    </button>
                    <button
                      className="aqm-action-btn"
                      onClick={handleMarkServed}
                      disabled={!queueEntries.find(e => e.status === 'serving')}
                    >
                      Mark as Served
                    </button>
                    {selectedQueue.status === 'paused' ? (
                      <button className="aqm-action-btn" onClick={handleResume}>
                        Resume Queue
                      </button>
                    ) : (
                      <button
                        className="aqm-action-btn"
                        onClick={handlePause}
                        disabled={selectedQueue.status !== 'active'}
                      >
                        Pause Queue
                      </button>
                    )}
                    <button
                      className="aqm-action-btn aqm-action-btn-danger"
                      onClick={handleStop}
                      disabled={selectedQueue.status === 'closed' || selectedQueue.status === 'cancelled'}
                    >
                      Stop Queue
                    </button>
                  </div>
                </div>

                {/* Progress Metrics */}
                <div className="aqm-progress-card">
                  <div className="aqm-progress-header">
                    <TrendingUp className="aqm-icon-header" />
                    <h3>Queue Progress</h3>
                  </div>
                  <div className="aqm-progress-body">
                    <div className="aqm-progress-item">
                      <div className="aqm-progress-label">
                        <span>Completion Rate</span>
                        <span className="aqm-progress-value">{Math.round(queueProgress)}%</span>
                      </div>
                      <div className="aqm-progress-bar">
                        <div className="aqm-progress-fill" style={{ width: `${queueProgress}%` }}></div>
                      </div>
                    </div>
                    <div className="aqm-progress-item">
                      <div className="aqm-progress-label">
                        <span>Capacity Used</span>
                        <span className="aqm-progress-value">
                          {selectedQueue.currentCount} / {selectedQueue.maxCapacity}
                        </span>
                      </div>
                      <div className="aqm-progress-bar">
                        <div className="aqm-progress-fill" style={{ width: `${capacityUsed}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queue Entries */}
                <div className="aqm-entries-card">
                  <div className="aqm-entries-header">
                    <Users className="aqm-icon-header" />
                    <h3>Queue Entries ({queueEntries.length})</h3>
                  </div>
                  <p className="aqm-entries-subtitle">Students currently in queue</p>
                  <div className="aqm-entries-list">
                    {loadingEntries ? (
                      <p style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>Loading entries...</p>
                    ) : queueEntries.length === 0 ? (
                      <p style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>No students in queue.</p>
                    ) : (
                      queueEntries.map((entry, index) => (
                        <div
                          key={entry.queueNumber}
                          className={`aqm-entry-item ${entry.status === 'serving' ? 'aqm-entry-serving' : ''}`}
                        >
                          <div className="aqm-entry-top">
                            <div className="aqm-entry-number">{index + 1}</div>
                            <div className="aqm-entry-info">
                              <h4 className="aqm-entry-name">{entry.studentName}</h4>
                              <p className="aqm-entry-id">ID: {entry.studentId}</p>
                            </div>
                            <div className="aqm-entry-badges">
                              <span className={`aqm-entry-status ${getEntryStatusColor(entry.status)}`}>
                                {entry.status}
                              </span>
                              <span className="aqm-entry-queue-number">{entry.queueNumber}</span>
                            </div>
                          </div>
                          <div className="aqm-entry-details">
                            <p className="aqm-entry-concern">
                              <strong>Concern:</strong> {entry.concern}
                            </p>
                            <p className="aqm-entry-time">
                              <Clock className="aqm-icon-small" />
                              Joined at {entry.joinedAt}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <aside className="aqm-details-sidebar">
                {/* Service Hours */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-header">
                    <Calendar className="aqm-icon-header" />
                    <h4>Service Hours</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Opens</span>
                      <span className="aqm-item-value">{selectedQueue.serviceHours.start}</span>
                    </div>
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Closes</span>
                      <span className="aqm-item-value">{selectedQueue.serviceHours.end}</span>
                    </div>
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Avg. Time</span>
                      <span className="aqm-item-value">{selectedQueue.averageServiceTime}</span>
                    </div>
                  </div>
                </div>

                {/* Currently Serving */}
                <div className="aqm-sidebar-card aqm-sidebar-card-highlight">
                  <div className="aqm-sidebar-card-header">
                    <AlertCircle className="aqm-icon-header" />
                    <h4>Now Serving</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-now-serving-number">
                      {queueEntries.find((e) => e.status === 'serving')?.queueNumber || selectedQueue.currentlyServing}
                    </p>
                    <p className="aqm-now-serving-name">
                      {queueEntries.find((e) => e.status === 'serving')?.studentName || 'None'}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-header">
                    <MapPin className="aqm-icon-header" />
                    <h4>Location</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-location-text">{selectedQueue.location}</p>
                  </div>
                </div>

                {/* Queue Created */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-created-label">Queue Created</p>
                    <p className="aqm-created-date">{selectedQueue.createdAt}</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>

        {sidebarOpen && <div className="aqm-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="aqm-dashboard-with-sidebar">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
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

      {/* Sidebar */}
      <aside className={`aqm-dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="aqm-sidebar-inner">
          <div className="aqm-sidebar-logo">
            <div className="aqm-logo-container">
              <img src={ucLogo} alt="UC Logo" className="aqm-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="aqm-logo-img aqm-oams-logo-img" />
            </div>
            <button
              className="aqm-theme-toggle-btn"
              onClick={toggleDarkMode}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="aqm-sidebar-user-section">
            <div className="aqm-user-top-row">
              <div className="aqm-user-avatar-large">
                <UserIcon />
              </div>
              <div className="aqm-user-info-content">
                <p className="aqm-user-name-large">{user?.name}</p>
                <span className="aqm-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="aqm-user-college-wrapper">
              <p className="aqm-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="aqm-sidebar-nav">
            <div className="aqm-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="aqm-nav-item"
                >
                  <item.icon className="aqm-nav-icon-medium" />
                  <span className="aqm-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="aqm-sidebar-logout">
            <button className="aqm-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="aqm-mobile-header">
        <div className="aqm-mobile-header-content">
          <div className="aqm-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="aqm-logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="aqm-logo-img aqm-oams-logo-img" />
          </div>
          <div className="aqm-mobile-header-actions">
            <button
              className="aqm-theme-toggle-btn"
              onClick={toggleDarkMode}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="aqm-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - List View */}
      <main className="aqm-dashboard-main">
        <div className="aqm-list-container">
          <button onClick={() => navigate("/admin/dashboard")} style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.45rem 0.9rem",borderRadius:"8px",border:"1px solid var(--border,#e5e7eb)",background:"transparent",color:"var(--text-secondary,#6b7280)",fontSize:"0.82rem",fontWeight:500,cursor:"pointer",marginBottom:"1rem"}}>← Back to Dashboard</button>
          <div className="aqm-page-header">
            <h1 className="aqm-page-title">Queue Management</h1>
            <p className="aqm-page-subtitle">Monitor and manage all active queues</p>
          </div>

          {/* Summary Cards */}
          <div className="aqm-summary-grid">
            <div className="aqm-summary-card aqm-summary-active">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Active Queues</p>
                <p className="aqm-summary-value">
                  {queues.filter((q) => q.status === 'active').length}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-active" aria-hidden="true">
                <PlayIcon className="aqm-summary-icon-svg-small" />
              </div>
            </div>

            <div className="aqm-summary-card aqm-summary-waiting">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Total Waiting</p>
                <p className="aqm-summary-value">
                  {queues.reduce((acc, q) => acc + q.currentCount, 0)}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-waiting" aria-hidden="true">
                <UserIcon className="aqm-summary-icon-svg-large" />
              </div>
            </div>

            <div className="aqm-summary-card aqm-summary-served">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Served Today</p>
                <p className="aqm-summary-value">
                  {queues.reduce((acc, q) => acc + q.servedCount, 0)}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-served" aria-hidden="true">
                <TrendingUp className="aqm-summary-icon-svg-small" />
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="aqm-queue-list">
            {loading ? (
              <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading queues...</p>
            ) : error ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error, #e53e3e)' }}>{error}</p>
            ) : queues.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No queues opened today for your department.</p>
            ) : (
              queues.map((queue) => (
                <div
                  key={queue.id}
                  className="aqm-queue-card"
                  onClick={() => handleViewDetails(queue)}
                >
                  <div className="aqm-queue-card-content">
                    <div className="aqm-queue-card-main">
                      <div className="aqm-queue-card-header">
                        <div className="aqm-queue-card-left">
                          <img
                            className="aqm-queue-college-logo"
                            src={getCollegeLogo(queue.department)}
                            alt={`${queue.department} logo`}
                          />
                          <div className="aqm-queue-card-left-text">
                            <h3 className="aqm-queue-card-title">{queue.queueType}</h3>
                            <p className="aqm-queue-card-department">{queue.department}</p>
                          </div>
                        </div>

                        <span className={`aqm-queue-status-badge ${getStatusColor(queue.status)}`}>
                          {queue.status}
                        </span>
                      </div>

                      <div className="aqm-queue-card-stats">
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Waiting</p>
                          <p className="aqm-queue-stat-value">{queue.currentCount}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Served</p>
                          <p className="aqm-queue-stat-value">{queue.servedCount}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Now Serving</p>
                          <p className="aqm-queue-stat-value-small">{queue.currentlyServing}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Avg. Time</p>
                          <p className="aqm-queue-stat-value-small">{queue.averageServiceTime}</p>
                        </div>
                      </div>

                      <div className="aqm-queue-card-footer">
                        <Clock className="aqm-icon-small" />
                        <span>{queue.serviceHours.start} - {queue.serviceHours.end}</span>
                        <span>•</span>
                        <MapPin className="aqm-icon-small" />
                        <span>{queue.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {sidebarOpen && <div className="aqm-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}