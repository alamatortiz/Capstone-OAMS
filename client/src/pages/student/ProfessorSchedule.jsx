import { useState, useRef, useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { getCollegeLogo } from "../../data/collegeLogo";

import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";

import "./professor_schedule.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

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

// ─── Content Icons ────────────────────────────────────────────────────────────
const GraduationCapIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21.21 15.89A10 10 0 1 1 8.11 2.05"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
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

const ChevronLeftIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const BuildingIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="2" width="18" height="20" rx="2" ry="2"></rect>
    <line x1="9" y1="2" x2="9" y2="22"></line>
    <line x1="15" y1="2" x2="15" y2="22"></line>
    <line x1="3" y1="7" x2="21" y2="7"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
  </svg>
);

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

const MapPinIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
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

// ─── Professor Data ───────────────────────────────────────────────────────────
const PROFESSOR_SCHEDULES = {
  "College of Computing Studies (CCS)": [
    {
      id: "1",
      name: "Prof. Maria Santos",
      position: "Department Chair",
      college: "College of Computing Studies (CCS)",
      specialization: "Software Engineering",
      email: "maria.santos@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Faculty Room 201",
        },
        {
          day: "Monday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "CCS Faculty Room 201",
        },
        {
          day: "Wednesday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Faculty Room 201",
        },
        {
          day: "Friday",
          timeStart: "1:00 PM",
          timeEnd: "4:00 PM",
          location: "CCS Faculty Room 201",
        },
      ],
    },
    {
      id: "2",
      name: "Prof. Juan Reyes",
      position: "Faculty Member",
      college: "College of Computing Studies (CCS)",
      specialization: "Data Science & AI",
      email: "juan.reyes@pnc.edu.ph",
      availability: [
        {
          day: "Tuesday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Faculty Room 203",
        },
        {
          day: "Tuesday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "CCS Faculty Room 203",
        },
        {
          day: "Thursday",
          timeStart: "9:00 AM",
          timeEnd: "11:00 AM",
          location: "CCS Faculty Room 203",
        },
        {
          day: "Thursday",
          timeStart: "1:00 PM",
          timeEnd: "4:00 PM",
          location: "CCS Faculty Room 203",
        },
      ],
    },
    {
      id: "3",
      name: "Dr. Anna Lim",
      position: "Program Coordinator",
      college: "College of Computing Studies (CCS)",
      specialization: "Computer Networks",
      email: "anna.lim@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Dean's Office",
        },
        {
          day: "Wednesday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Dean's Office",
        },
        {
          day: "Wednesday",
          timeStart: "2:00 PM",
          timeEnd: "4:00 PM",
          location: "CCS Dean's Office",
        },
        {
          day: "Friday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CCS Dean's Office",
        },
      ],
    },
  ],
  "College of Business Accountancy and Administration (CBAA)": [
    {
      id: "4",
      name: "Dr. Roberto Cruz",
      position: "Dean",
      college: "College of Business Accountancy and Administration (CBAA)",
      specialization: "Business Management",
      email: "roberto.cruz@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "9:00 AM",
          timeEnd: "11:00 AM",
          location: "CBAA Dean's Office",
        },
        {
          day: "Tuesday",
          timeStart: "2:00 PM",
          timeEnd: "4:00 PM",
          location: "CBAA Dean's Office",
        },
        {
          day: "Thursday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CBAA Dean's Office",
        },
      ],
    },
    {
      id: "5",
      name: "Prof. Linda Gomez",
      position: "Faculty Member",
      college: "College of Business Accountancy and Administration (CBAA)",
      specialization: "Accounting",
      email: "linda.gomez@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "1:00 PM",
          timeEnd: "5:00 PM",
          location: "CBAA Faculty Room 105",
        },
        {
          day: "Wednesday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "CBAA Faculty Room 105",
        },
        {
          day: "Friday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "CBAA Faculty Room 105",
        },
      ],
    },
  ],
  "College of Education (COED)": [
    {
      id: "6",
      name: "Dr. Carmen Ramos",
      position: "Department Chair",
      college: "College of Education (COED)",
      specialization: "Educational Psychology",
      email: "carmen.ramos@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "8:00 AM",
          timeEnd: "12:00 PM",
          location: "COED Faculty Room 301",
        },
        {
          day: "Wednesday",
          timeStart: "8:00 AM",
          timeEnd: "12:00 PM",
          location: "COED Faculty Room 301",
        },
        {
          day: "Friday",
          timeStart: "1:00 PM",
          timeEnd: "5:00 PM",
          location: "COED Faculty Room 301",
        },
      ],
    },
    {
      id: "7",
      name: "Prof. Miguel Torres",
      position: "Faculty Member",
      college: "College of Education (COED)",
      specialization: "Mathematics Education",
      email: "miguel.torres@pnc.edu.ph",
      availability: [
        {
          day: "Tuesday",
          timeStart: "9:00 AM",
          timeEnd: "11:00 AM",
          location: "COED Faculty Room 303",
        },
        {
          day: "Tuesday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "COED Faculty Room 303",
        },
        {
          day: "Thursday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "COED Faculty Room 303",
        },
      ],
    },
  ],
  "College of Engineering (COE)": [
    {
      id: "8",
      name: "Engr. Pedro Villanueva",
      position: "Dean",
      college: "College of Engineering (COE)",
      specialization: "Civil Engineering",
      email: "pedro.villanueva@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "COE Dean's Office",
        },
        {
          day: "Wednesday",
          timeStart: "9:00 AM",
          timeEnd: "11:00 AM",
          location: "COE Dean's Office",
        },
        {
          day: "Friday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "COE Dean's Office",
        },
      ],
    },
    {
      id: "9",
      name: "Engr. Sofia Castillo",
      position: "Faculty Member",
      college: "College of Engineering (COE)",
      specialization: "Electrical Engineering",
      email: "sofia.castillo@pnc.edu.ph",
      availability: [
        {
          day: "Tuesday",
          timeStart: "8:00 AM",
          timeEnd: "12:00 PM",
          location: "COE Faculty Room 401",
        },
        {
          day: "Thursday",
          timeStart: "1:00 PM",
          timeEnd: "5:00 PM",
          location: "COE Faculty Room 401",
        },
      ],
    },
  ],
  "College of Arts and Sciences (CAS)": [
    {
      id: "10",
      name: "Dr. Elena Mendoza",
      position: "Department Chair",
      college: "College of Arts and Sciences (CAS)",
      specialization: "Psychology",
      email: "elena.mendoza@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CAS Faculty Room 501",
        },
        {
          day: "Wednesday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "CAS Faculty Room 501",
        },
        {
          day: "Friday",
          timeStart: "9:00 AM",
          timeEnd: "11:00 AM",
          location: "CAS Faculty Room 501",
        },
      ],
    },
    {
      id: "11",
      name: "Prof. Rafael Diaz",
      position: "Faculty Member",
      college: "College of Arts and Sciences (CAS)",
      specialization: "Communication Arts",
      email: "rafael.diaz@pnc.edu.ph",
      availability: [
        {
          day: "Tuesday",
          timeStart: "10:00 AM",
          timeEnd: "12:00 PM",
          location: "CAS Faculty Room 503",
        },
        {
          day: "Thursday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CAS Faculty Room 503",
        },
        {
          day: "Thursday",
          timeStart: "1:00 PM",
          timeEnd: "4:00 PM",
          location: "CAS Faculty Room 503",
        },
      ],
    },
  ],
  "College of Health and Allied Sciences (CHAS)": [
    {
      id: "12",
      name: "Dr. Grace Santos",
      position: "Dean",
      college: "College of Health and Allied Sciences (CHAS)",
      specialization: "Nursing",
      email: "grace.santos@pnc.edu.ph",
      availability: [
        {
          day: "Monday",
          timeStart: "8:00 AM",
          timeEnd: "12:00 PM",
          location: "CHAS Dean's Office",
        },
        {
          day: "Wednesday",
          timeStart: "8:00 AM",
          timeEnd: "11:00 AM",
          location: "CHAS Dean's Office",
        },
        {
          day: "Friday",
          timeStart: "1:00 PM",
          timeEnd: "4:00 PM",
          location: "CHAS Dean's Office",
        },
      ],
    },
    {
      id: "13",
      name: "Prof. Antonio Morales",
      position: "Faculty Member",
      college: "College of Health and Allied Sciences (CHAS)",
      specialization: "Medical Technology",
      email: "antonio.morales@pnc.edu.ph",
      availability: [
        {
          day: "Tuesday",
          timeStart: "9:00 AM",
          timeEnd: "12:00 PM",
          location: "CHAS Faculty Room 601",
        },
        {
          day: "Tuesday",
          timeStart: "2:00 PM",
          timeEnd: "5:00 PM",
          location: "CHAS Faculty Room 601",
        },
        {
          day: "Thursday",
          timeStart: "10:00 AM",
          timeEnd: "1:00 PM",
          location: "CHAS Faculty Room 601",
        },
      ],
    },
  ],
};

const COLLEGES = [
  { name: "College of Computing Studies (CCS)", shortName: "CCS" },
  {
    name: "College of Business Accountancy and Administration (CBAA)",
    shortName: "CBAA",
  },
  { name: "College of Education (COED)", shortName: "COED" },
  { name: "College of Engineering (COE)", shortName: "COE" },
  { name: "College of Arts and Sciences (CAS)", shortName: "CAS" },
  { name: "College of Health and Allied Sciences (CHAS)", shortName: "CHAS" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfessorSchedule() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        studentNumber: authUser.studentNumber ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
        course: authUser.course ?? "N/A Course",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        studentId: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
        course: "",
      };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [viewMode, setViewMode] = useState("departments");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleDepartmentSelect = (deptName) => {
    setSelectedDepartment(deptName);
    setViewMode("schedules");
  };

  const handleBack = () => {
    setViewMode("departments");
    setSelectedDepartment(null);
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
    setMessages([...messages, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (
      lowerInput.includes("schedule") ||
      lowerInput.includes("professor") ||
      lowerInput.includes("faculty")
    ) {
      return "You're currently viewing faculty consultation schedules. Each professor has multiple consultation hours throughout the week. Click on any department to see available professors and their availability.";
    } else if (lowerInput.includes("appointment")) {
      return "To book an appointment with a professor, check their consultation hours and visit the Appointment Booking section. You can schedule a meeting during their available times.";
    } else if (lowerInput.includes("help") || lowerInput.includes("service")) {
      return "I can help you with professor schedules, faculty information, consultation hours, and appointment booking. What would you like to know?";
    } else {
      return "That's a great question! For more detailed assistance, please visit the respective section or contact your college office.";
    }
  };

  const getDaySchedules = (professor) => {
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const groupedByDay = {};

    professor.availability.forEach((schedule) => {
      if (!groupedByDay[schedule.day]) groupedByDay[schedule.day] = [];
      groupedByDay[schedule.day].push(schedule);
    });

    return dayOrder
      .filter((day) => groupedByDay[day])
      .map((day) => ({ day, schedules: groupedByDay[day] }));
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/student/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/student/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/student/transactions",
    },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
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
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
      <main className="dashboard-main">
        <div className="professor-schedule-page">
          {/* Header */}
          <div className="page-header">
            <div className="header-nav">
              {viewMode === "schedules" && (
                <button
                  className="back-btn"
                  onClick={handleBack}
                  title="Back to Departments"
                >
                  <ChevronLeftIcon />
                  <span>Back to Departments</span>
                </button>
              )}
              {viewMode === "departments" && (
                <Link to="/student/dashboard" className="back-btn">
                  <ChevronLeftIcon />
                  <span>Dashboard</span>
                </Link>
              )}
            </div>
            <div className="header-title">
              <div className="header-icon-wrapper">
                <GraduationCapIcon />
              </div>
              <div>
                <h1>Professor Schedules</h1>
                <p>View faculty consultation hours and availability</p>
              </div>
            </div>
          </div>

          {/* Departments View */}
          {viewMode === "departments" && (
            <div className="departments-grid">
              {COLLEGES.map((college) => {
                const logoSrc = getCollegeLogo(college.name);
                const professorCount =
                  PROFESSOR_SCHEDULES[college.name]?.length || 0;

                return (
                  <div
                    key={college.name}
                    className="department-card"
                    onClick={() => handleDepartmentSelect(college.name)}
                  >
                    <div className="card-image-wrapper">
                      <img
                        src={logoSrc}
                        alt={`${college.name} logo`}
                        className="college-logo-img"
                      />
                    </div>
                    <div className="card-content">
                      <div className="card-right">
                        <div className="card-right-text">
                          <h3 className="card-title">{college.name}</h3>
                          <p className="card-abbrev">{college.shortName}</p>
                          <div className="card-badge">
                            {professorCount}{" "}
                            {professorCount === 1 ? "Faculty" : "Faculty Members"}
                          </div>
                        </div>
                        <ChevronRightIcon />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Schedules View */}
          {viewMode === "schedules" && selectedDepartment && (
            <div className="schedules-view">
              {/* Department Header */}
              <div className="department-header-card">
                <div className="department-header-content">
                  <div className="department-logo-wrapper">
                    <img
                      src={getCollegeLogo(selectedDepartment)}
                      alt={selectedDepartment}
                      className="department-logo"
                    />
                  </div>
                  <div>
                    <div className="department-header-top">
                      <BuildingIcon />
                      <h2>{selectedDepartment}</h2>
                    </div>
                    <p>Faculty consultation schedules and availability</p>
                  </div>
                </div>
              </div>

              {/* Professors List */}
              <div className="professors-list">
                {PROFESSOR_SCHEDULES[selectedDepartment]?.map((professor) => (
                  <div key={professor.id} className="professor-card">
                    <div className="professor-header">
                      <div className="professor-avatar">
                        <UserIcon />
                      </div>
                      <div className="professor-info">
                        <h3 className="professor-name">{professor.name}</h3>
                        <p className="professor-position">
                          {professor.position}
                        </p>
                        <p className="professor-specialization">
                          {professor.specialization}
                        </p>
                        <p className="professor-email">{professor.email}</p>
                      </div>
                    </div>

                    {/* Consultation Hours */}
                    <div className="consultation-section">
                      <h4 className="consultation-title">Consultation Hours</h4>
                      <div className="schedule-list">
                        {getDaySchedules(professor).map(({ day, schedules }) => (
                          <div key={day} className="day-schedule">
                            <div className="day-header">
                              <CalendarIcon />
                              <span className="day-name">{day}</span>
                            </div>
                            <div className="day-slots">
                              {schedules.map((schedule, idx) => (
                                <div key={idx} className="schedule-slot">
                                  <div className="time-block">
                                    <ClockIcon />
                                    <span className="time-range">
                                      {schedule.timeStart} – {schedule.timeEnd}
                                    </span>
                                  </div>
                                  <div className="location-block">
                                    <MapPinIcon />
                                    <span className="location">
                                      {schedule.location}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
    </div>
  );
}