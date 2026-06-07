import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import ccsLogo from '../../assets/CCS.png';
import './professor_dashboard.css';
import { applyTheme, getSavedTheme } from '../../utils/theme';


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
const CalendarIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
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

const ClockIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);



const ActivityIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
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

export default function ProfessorDashboard() {
  const { user: authUser, logout } = useAuth();
  const user = authUser ?? {
    name: 'John Doe II',
    role: 'professor',
    college: 'College of Computing Studies (CCS)',
    employeeId: 'EMP-2020-0000',
  };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
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
    
    if (lowerInput.includes('appointment')) {
      return 'You have 8 pending appointments, with 3 scheduled for today. Visit the Appointments section to manage them.';
    } else if (lowerInput.includes('student')) {
      return 'You currently have 15 student requests awaiting your response. Check the Appointments section for more details.';
    } else if (lowerInput.includes('document')) {
      return 'You have 6 documents pending review. Visit the Documents section to review and approve them.';
    } else if (lowerInput.includes('schedule') || lowerInput.includes('office hours')) {
      return 'Your office hours are Monday to Friday, 8:00 AM - 5:00 PM, and Saturday 8:00 AM - 12:00 PM. You can view all details in the Dashboard.';
    } else if (lowerInput.includes('help') || lowerInput.includes('support')) {
      return 'I can help you with appointment management, student requests, document reviews, and office hours. What would you like assistance with?';
    } else {
      return 'That\'s a great question! For more detailed assistance, please visit the respective section or contact the OAMS support team.';
    }
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? 'dark' : 'light');
      return next;
    });
  };


  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/professor/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/professor/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/professor/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/professor/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/professor/transactions' },
  ];

  const stats = [
    {
      title: 'Pending Appointments',
      value: '8',
      description: '3 for today',
      icon: CalendarIcon,
      bgColor: 'bg-blue-50',
      link: '/professor/appointments'
    },
    {
      title: 'Student Requests',
      value: '15',
      description: 'Awaiting response',
      icon: UsersIcon,
      bgColor: 'bg-emerald-50',
      link: '/professor/appointments'
    },
    {
      title: 'Documents',
      value: '6',
      description: 'To review',
      icon: FileTextIcon,
      bgColor: 'bg-orange-50',
      link: '/professor/documents'
    },
    {
      title: 'Completed',
      value: '47',
      description: 'This month',
      icon: CheckCircleIcon,
      bgColor: 'bg-purple-50',
      link: '/professor/transactions'
    },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      student: 'Juan Dela Cruz',
      purpose: 'Thesis consultation',
      time: 'Today, 2:00 PM',
      status: 'confirmed'
    },
    {
      id: 2,
      student: 'Maria Santos',
      purpose: 'Grade inquiry',
      time: 'Today, 3:30 PM',
      status: 'confirmed'
    },
    {
      id: 3,
      student: 'Pedro Garcia',
      purpose: 'Academic advising',
      time: 'Tomorrow, 10:00 AM',
      status: 'pending'
    },
  ];

  const recentActivity = [
    {
      id: 1,
      title: 'New appointment request from Maria Santos',
      dot: 'dot-green'
    },
    {
      id: 2,
      title: 'Document submitted for review',
      dot: 'dot-blue'
    },
    {
      id: 3,
      title: 'Appointment completed with Juan Dela Cruz',
      dot: 'dot-purple'
    },
  ];

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

          {/* User Info */}
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>

              <div className="user-info-content">
                <p className="user-name-large">John Doe II</p>
                <span className="user-role-badge">Professor</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college ?? 'College of Computing Studies (CCS)'}</p>
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
        <div className="professor-dashboard">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <p className="banner-greeting">Welcome back, {user?.name?.split(' ')[0]}! 👋</p>
              <div className="banner-title-row">
                <img src={ccsLogo} alt="CCS Logo" className="banner-ccs-logo" />
                <h1 className="banner-title">{user?.college ?? 'John Doe II'}</h1>
              </div>
              <div className="banner-badges">
                <span className="badge">Professor Portal</span>
                <span className="badge">{user?.employeeId ?? 'EMP-2020-000'}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <Link key={stat.title} to={stat.link} className="stat-card-link">
                <div className="stat-card">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                  <div className="stat-header">
                    <ChevronRightIcon />
                  </div>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-title">{stat.title}</p>
                  <p className="stat-description">{stat.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Today's Appointments Section */}
          <section className="todays-appointments-section">
            <div className="section-header">
              <h2>Today's Appointments</h2>
              <Link to="/professor/appointments" className="view-all-link">
                View All <ChevronRightIcon />
              </Link>
            </div>
            <div className="appointments-card">
              <div className="appointments-list">
                {upcomingAppointments.filter(apt => apt.time.includes('Today')).map((apt) => (
                  <div key={apt.id} className="appointment-item">
                    <div className="appointment-icon">
                      <UsersIcon />
                    </div>
                    <div className="appointment-details">
                      <p className="appointment-student" style={{ textAlign: 'justify' }}>{apt.student}</p>
                      <p className="appointment-purpose" style={{ textAlign: 'justify' }}>{apt.purpose}</p>
                    </div>
                    <div className="appointment-time-status">
                      <p className="appointment-time">{apt.time.split(', ')[1]}</p>
                      <span className={`appointment-badge status-${apt.status}`}>{apt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Grid */}
          <div className="preview-grid">
            {/* Recent Activity */}
            <div className="activity-card">
              <div className="card-header">
                <h3 className="card-title">
                  <ActivityIcon />
                  Recent Activity
                </h3>
              </div>
              <div className="card-content">
                <div className="activity-list">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="activity-item-simple">
                      <div className={`activity-dot ${item.dot}`}></div>
                      <p className="activity-text">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="service-hours-card">
              <div className="hours-header">
                <h3 className="hours-title">
                  <ClockIcon />
                  Office Hours
                </h3>
              </div>
              <div className="hours-grid">
                <div>
                  <p className="hours-label">Weekdays</p>
                  <p className="hours-time">Monday – Friday: 8:00 AM – 5:00 PM</p>
                </div>
                <div>
                  <p className="hours-label">Weekend</p>
                  <p className="hours-time">Saturday: 8:00 AM – 12:00 PM<br />Sunday: Closed</p>
                </div>
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