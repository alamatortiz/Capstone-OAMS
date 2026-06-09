import { useState, useEffect, useRef } from "react";

import { useAuth } from "../../context/AuthContext";

import { Link, useNavigate } from "react-router-dom";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import ccsLogo from "../../assets/CCS.png";

import "./admin_dashboard.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";

// AI Chatbot Icons
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

// Dashboard Content Icons
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const FileTextIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const UsersIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const BellIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

// Admin Management Icons
const UserManagementIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* User */}
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>

    {/* Gear */}
    <circle cx="19" cy="6" r="2"></circle>

    {/* Outer ring */}
    <circle
      cx="19"
      cy="6"
      r="2.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    ></circle>

    {/* Gear inner marks */}
    <path d="M19 4l1 1"></path>
    <path d="M20 7l-1-1"></path>
    <path d="M18 7l1-1"></path>
    <path d="M18 5l1 1"></path>
  </svg>
);

const DataManagementIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />

    {/* Curved data lines */}
    <path d="M7 12c1.5-1.1 3.5-1.1 5 0" />
    <path d="M7 15c1.5-1.1 3.5-1.1 5 0" />
    <path d="M7 18c1.5-1.1 3.5-1.1 5 0" />
  </svg>
);

const QueueAnalyticsIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);

const SyncIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);

// Quick Action Icons
const QRCodeIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
  </svg>
);

const HostQueueIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
  </svg>
);

const PlusIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default function AdminDashboard() {
  const [chatOpen, setChatOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();

    if (
      lowerInput.includes("user") ||
      lowerInput.includes("admin") ||
      lowerInput.includes("account")
    ) {
      return "You can manage user accounts from the Admin Management section (User Management). What would you like to do?";
    }
    if (
      lowerInput.includes("document") ||
      lowerInput.includes("certificate") ||
      lowerInput.includes("approval")
    ) {
      return "For document-related concerns, check Pending Requested Documents and use Documents tools from the navigation.";
    }
    if (
      lowerInput.includes("queue") ||
      lowerInput.includes("waiting") ||
      lowerInput.includes("host")
    ) {
      return "You can review and host queues from the dashboard widgets. For queue operations, use the Queue section in the sidebar.";
    }
    if (lowerInput.includes("announcement") || lowerInput.includes("notice")) {
      return "Use Announcement Management to create and manage announcements. Tell me what announcement you want to post.";
    }

    if (lowerInput.includes("help") || lowerInput.includes("support")) {
      return "I can help with user management, document approvals, queue hosting/analytics, and announcement management. What are you working on?";
    }

    return "That’s a great question. Tell me what module you’re trying to use (User Management, Data Management, Queue Analytics, or Announcements).";
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(userMessage.text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- existing code below ---

  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev,
      }
    : {
        name: "Admin",
        role: "admin",
        college: "",
        employeeId: "",
        departmentAbbrev: "",
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/admin/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/admin/transactions",
    },
  ];

  const stats = [
    {
      title: "Active Queues",
      value: "12",
      description: "Across all colleges",
      icon: ClockIcon,
      bgColor: "bg-blue-50",
    },
    {
      title: "Pending Documents",
      value: "28",
      description: "Awaiting processing",
      icon: FileTextIcon,
      bgColor: "bg-orange-50",
    },
    {
      title: "Faculty Available",
      value: "45",
      description: "Today",
      icon: UsersIcon,
      bgColor: "bg-emerald-50",
    },
    {
      title: "Announcements",
      value: "2",
      description: "Published",
      icon: BellIcon,
      bgColor: "bg-purple-50",
    },
  ];

  const adminTools = [
    {
      icon: UserManagementIcon,
      iconColor: "bg-orange-500",
      title: "User Management",
      description: "Manage user accounts",
    },
    {
      icon: DataManagementIcon,
      iconColor: "bg-purple-500",
      title: "Data Management",
      description: "Configure settings",
    },
    {
      icon: QueueAnalyticsIcon,
      iconColor: "bg-blue-600",
      title: "Queue Analytics",
      description: "Performance metrics",
    },
    {
      icon: SyncIcon,
      iconColor: "bg-cyan-500",
      title: "Pinnacle Sync",
      description: "Data synchronization",
    },
  ];

  const quickActions = [
    {
      icon: QRCodeIcon,
      iconColor: "bg-green-500",
      title: "Scan Document",
      description: "Verify QR codes and view document details",
    },
    {
      icon: HostQueueIcon,
      iconColor: "bg-blue-500",
      title: "Host Queue",
      description: "Manage and host student queues",
    },
  ];

  const announcements = [
    {
      title: "System Maintenance Notice",
      description:
        "The OAMS system will undergo scheduled maintenance on March 29, 2026, from 12:00 AM to 6:00 AM.",
      tag: "important",
      date: "3/28/2026",
    },
    {
      title: "Enrollment Period Reminder",
      description:
        "Second Semester enrollment period: April 1-15, 2026. Please prepare all necessary documents.",
      tag: "reminder",
      date: "3/25/2026",
    },
  ];

  const pendingDocuments = [
    {
      name: "Juan Dela Cruz",
      document: "Certificate of Grades",
      college: "CCS",
      date: "3/28/2026",
      status: "pending",
    },
    {
      name: "Maria Santos",
      document: "Good Moral Certificate",
      college: "CBAA",
      date: "3/29/2026",
      status: "processing",
    },
    {
      name: "Pedro Garcia",
      document: "Certificate of Enrollment",
      college: "COE",
      date: "3/30/2026",
      status: "pending",
    },
  ];

  const hostedQueues = [
    {
      name: "Subject Enrollment",
      college: "CCS",
      code: "CCS-REG-044",
      status: "Active",
      count: "5 waiting",
    },
    {
      name: "Payment Processing",
      college: "CBAA",
      code: "CBAA-CSH-025",
      status: "Active",
      count: "8 waiting",
    },
    {
      name: "Document Request",
      college: "COE",
      code: "COE-DOC-017",
      status: "Active",
      count: "3 waiting",
    },
  ];

  const facultyAvailability = [
    {
      name: "Prof. Maria Santos",
      college: "CCS",
      status: "Available",
      time: "Next: 10:00 AM - 11:00 AM",
    },
    {
      name: "Dr. Roberto Cruz",
      college: "CBAA",
      status: "Available",
      time: "Next: 2:00 PM - 3:00 PM",
    },
    {
      name: "Dr. Carmen Ramos",
      college: "COE",
      status: "Busy",
      time: "Next: 3:00 PM - 4:00 PM",
    },
    {
      name: "Engr. Pedro Villanueva",
      college: "COE",
      status: "Available",
      time: "Next: 1:00 PM - 2:00 PM",
    },
  ];

  return (
    <div className="admin-dashboard-with-sidebar">
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
      {/* Sidebar */}
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          {/* Logo Section */}
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
                <p className="user-name-large">{user?.name}</p>
                <span className="user-role-badge">Administrator</span>
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
      <main className="admin-dashboard-main">
        <div className="admin-dashboard">
          {/* Welcome Banner */}
          <div className="welcome-banner admin-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <h1 className="banner-title">Admin Dashboard</h1>
              <p className="banner-subtitle">{user?.college}</p>

              <div className="banner-badges">
                <div className="welcome-admin-badge">
                  <img
                    src={ccsLogo}
                    alt="CCS Logo"
                    className="welcome-admin-logo"
                  />
                  <span className="badge">Administrator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.title} className="stat-card">
                <div className="stat-header">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                </div>
                <p className="stat-title">{stat.title}</p>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-description">{stat.description}</p>
              </div>
            ))}
          </div>

          {/* Admin Management Section */}
          <section className="admin-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <AlertIcon />
                <div className="section-title-admin-text">
                  <h2>Admin Management</h2>
                  <p className="section-subtitle">
                    System administration and configuration tools
                  </p>
                </div>
              </div>
            </div>
            <div className="admin-tools-grid">
              {adminTools.map((tool) => (
                <div key={tool.title} className="admin-tool-card">
                  <div className={`admin-tool-icon ${tool.iconColor}`}>
                    <tool.icon />
                  </div>
                  <div className="admin-tool-text">
                    <h3 className="tool-title">{tool.title}</h3>
                    <p className="tool-description">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="quick-actions-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <CheckIcon />
                <div className="section-title-admin-text">
                  <h2>Quick Actions</h2>
                  <p className="section-subtitle">
                    Access frequently used admin tools
                  </p>
                </div>
              </div>
            </div>

            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <div key={action.title} className="quick-action-card">
                  <div className={`action-icon ${action.iconColor}`}>
                    <action.icon />
                  </div>
                  <div className="quick-action-text">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Announcement Management Section */}
          <section className="announcement-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <BellIcon />
                <h2>Announcement Management</h2>
              </div>
              <button className="btn-new-announcement">
                <PlusIcon />
                New Announcement
              </button>
            </div>
            <div className="announcements-list">
              {announcements.map((announcement, idx) => (
                <div key={idx} className="announcement-item">
                  <div className="announcement-content">
                    <h4 className="announcement-title">{announcement.title}</h4>
                    <p className="announcement-description">
                      {announcement.description}
                    </p>

                    <div className="announcement-important-date">
                      <span
                        className={`announcement-tag tag-${announcement.tag}`}
                      >
                        {announcement.tag}
                      </span>
                      <span className="announcement-date">
                        {announcement.date}
                      </span>
                    </div>
                  </div>

                  <div className="announcement-actions">
                    <button
                      type="button"
                      className="btn-announcement-icon btn-announcement-edit"
                      aria-label={`Edit announcement: ${announcement.title}`}
                      onClick={() =>
                        console.log("edit announcement", announcement)
                      }
                    >
                      <img
                        className="btn-announcement-icon-img"
                        src={editIcon}
                        alt=""
                      />
                    </button>
                    <button
                      type="button"
                      className="btn-announcement-icon btn-announcement-delete"
                      aria-label={`Delete announcement: ${announcement.title}`}
                      onClick={() =>
                        console.log("delete announcement", announcement)
                      }
                    >
                      <img
                        className="btn-announcement-icon-img"
                        src={deleteIcon}
                        alt=""
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Two Column Section */}
          <div className="admin-grid-2col">
            {/* Pending Documents */}
            <section className="pending-documents-section">
              <div className="card-header-admin">
                <h3>Pending Requested Documents</h3>
                <a href="#" className="view-all-link">
                  View All <ChevronRightIcon />
                </a>
              </div>
              <div className="documents-list">
                {pendingDocuments.map((doc, idx) => (
                  <div key={idx} className="document-item">
                    <div className="document-info">
                      <p className="document-name">{doc.name}</p>
                      <p className="document-type">{doc.document}</p>
                      <div className="document-meta-row">
                        <span
                          className={`document-college college-${doc.college}`}
                        >
                          {doc.college}
                        </span>
                        <span className="document-date">{doc.date}</span>
                      </div>
                    </div>
                    <span className={`document-badge badge-${doc.status}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Hosted Queues */}
            <section className="hosted-queues-section">
              <div className="card-header-admin">
                <h3>Current Hosted Queues</h3>
                <a href="#" className="view-all-link">
                  Manage <ChevronRightIcon />
                </a>
              </div>
              <p className="section-desc">
                Active queues across all departments
              </p>
              <div className="queues-list">
                {hostedQueues.map((queue, idx) => (
                  <div key={idx} className="queue-item">
                    <div className="queue-info">
                      <p className="queue-name">{queue.name}</p>
                      <p className="queue-code">
                        {queue.college} • {queue.code}
                      </p>
                    </div>
                    <div className="queue-status-info">
                      <span
                        className={`queue-badge badge-${queue.status.toLowerCase()}`}
                      >
                        {queue.status}
                      </span>
                      <span className="queue-count">{queue.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Faculty Availability */}
          <section className="faculty-availability-section">
            <div className="card-header-admin">
              <h3>Faculty Availability Today</h3>
              <a href="#" className="view-all-link">
                View All Faculty <ChevronRightIcon />
              </a>
            </div>
            <div className="faculty-grid">
              {facultyAvailability.map((faculty, idx) => (
                <div key={idx} className="faculty-card">
                  <div
                    className={`faculty-indicator ${faculty.status.toLowerCase()}`}
                  ></div>
                  <p className="faculty-name">{faculty.name}</p>
                  <p className="faculty-college">{faculty.college}</p>
                  <p className="faculty-time">{faculty.time}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
