import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  HelpCircle,
  CheckCircle2,
  List,
  Loader2,
  AlertCircle,
  Users,
  RefreshCw,
} from "lucide-react";
import { getCollegeLogo } from "../../data/collegeLogo";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { useQueue } from "../../contexts/QueueContext";
import { useAuth } from "../../context/AuthContext";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./avail-services.css";

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

// ─── Category Mapping ─────────────────────────────────────────────────────────
// Maps keywords in a service name → display category.
// Order matters: first match wins. Falls back to 'Others'.
const CATEGORY_RULES = [
  {
    category: "Enrollment",
    keywords: [
      "enrollment",
      "enroll",
      "registration",
      "adding",
      "dropping",
      "load",
    ],
  },
  {
    category: "Consultation",
    keywords: ["consultation", "advising", "thesis", "capstone", "academic"],
  },
  {
    category: "Document Request",
    keywords: [
      "certificate",
      "transcript",
      "records",
      "diploma",
      "clearance",
      "good moral",
      "honorable",
      "completion",
    ],
  },
  {
    category: "Scholarship",
    keywords: ["scholarship", "grant", "financial aid"],
  },
  { category: "Grade", keywords: ["grade", "grades", "inquiry", "correction"] },
];

const ALL_CATEGORIES = [
  "Enrollment",
  "Consultation",
  "Document Request",
  "Scholarship",
  "Grade",
  "Others",
];

/**
 * Derives a UI category string from a service name + optional description.
 */
function deriveCategory(serviceName = "", description = "") {
  const haystack = `${serviceName} ${description}`.toLowerCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((kw) => haystack.includes(kw))) return category;
  }
  return "Others";
}

// ─── Procedure Map ────────────────────────────────────────────────────────────
// Static step-by-step procedures keyed by service name (case-insensitive match).
// This supplements database data for the detail view. New services get a
// sensible generic procedure automatically.
const PROCEDURE_MAP = {
  "enrollment assistance": [
    "Get your advising form signed by your program adviser.",
    "Settle any outstanding balances at the cashier.",
    "Present your documents at the enrollment counter.",
    "Wait for validation and processing.",
    "Receive your Certificate of Registration.",
  ],
  "grade inquiry": [
    "Submit a Grade Inquiry request via the portal or join the queue.",
    "Present your student ID and COR at the window.",
    "State your concern to the faculty or registrar staff.",
    "Wait for verification and official response.",
    "Receive the result or endorsement slip.",
  ],
  "good moral certificate": [
    "Secure clearance from the Student Affairs Office.",
    "Fill out the Good Moral Certificate request form.",
    "Pay the required processing fee at the cashier.",
    "Submit all requirements to the department office.",
    "Claim your certificate after 2–3 business days with valid ID.",
  ],
  "transcript of records": [
    "Fill out the Transcript of Records request form.",
    "Pay the required fee at the cashier.",
    "Submit the form and official receipt to the registrar.",
    "Wait for processing (5–7 business days).",
    "Claim your TOR with a valid ID.",
  ],
  "certificate of enrollment": [
    "Fill out the Certificate of Enrollment request form.",
    "Pay the processing fee.",
    "Submit to the registrar office.",
    "Wait 1–2 business days for processing.",
    "Claim with your valid student ID.",
  ],
  "clearance processing": [
    "Obtain the clearance form from your department.",
    "Visit all offices listed on the form.",
    "Settle any outstanding obligations.",
    "Collect signatures from all required offices.",
    "Submit the completed clearance form to the registrar.",
  ],
};

const GENERIC_PROCEDURE = [
  "Present your valid Student ID at the service counter.",
  "State your concern or request to the assigned staff.",
  "Submit any required documents or forms.",
  "Wait for processing (timeframe depends on service type).",
  "Claim your output or receive confirmation when ready.",
];

function getProcedure(serviceName = "") {
  const key = serviceName.toLowerCase().trim();
  return PROCEDURE_MAP[key] ?? GENERIC_PROCEDURE;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AvailServicesPage() {
  const navigate = useNavigate();
  const { joinQueue, isAlreadyInQueue } = useQueue();
  const { user: authUser, logout } = useAuth();

  // ── User data ────────────────────────────────────────────────────────────
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
        studentNumber: "N/A",
        departmentAbbrev: "",
        course: "",
      };

  // ── API data state ────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]); // raw from API
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // ── View / filter state ───────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("departments");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [joiningId, setJoiningId] = useState(null); // slotId being joined
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you avail a service today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Fetch departments + services from API ─────────────────────────────────
  const fetchServices = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const { data } = await api.get("/student/services/by-department");
      // Enrich each service with derived category and procedure
      const enriched = (data.departments ?? []).map((dept) => ({
        ...dept,
        services: (dept.services ?? []).map((svc) => ({
          ...svc,
          category: deriveCategory(svc.serviceName, svc.description),
          procedure: getProcedure(svc.serviceName),
          // requirements come from the API as [{ id, name, description, isMandatory }]
          // we keep them as-is and render .name in the UI
        })),
      }));
      setDepartments(enriched);
    } catch (err) {
      console.error("fetchServices error:", err);
      setApiError("Could not load services. Please try again.");
    } finally {
      setApiLoading(false);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Derived data ──────────────────────────────────────────────────────────
  // The department object currently selected
  const selectedDept = useMemo(
    () => departments.find((d) => d.departmentId === selectedDeptId) ?? null,
    [departments, selectedDeptId],
  );

  // Categories that actually have services in the selected department
  const availableCategories = useMemo(() => {
    if (!selectedDept) return [];
    const cats = new Set(selectedDept.services.map((s) => s.category));
    return ALL_CATEGORIES.filter((c) => cats.has(c));
  }, [selectedDept]);

  // Services visible under the active category filter
  const filteredServices = useMemo(() => {
    if (!selectedDept || !selectedCategory) return [];
    return selectedDept.services.filter((s) => s.category === selectedCategory);
  }, [selectedDept, selectedCategory]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  const handleDepartmentSelect = (deptId) => {
    setSelectedDeptId(deptId);
    setSelectedCategory(null);
    setSelectedService(null);
    setViewMode("services");
  };

  const handleCategorySelect = (cat) => setSelectedCategory(cat);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setViewMode("faq");
  };

  const handleBack = () => {
    if (viewMode === "faq") {
      setViewMode("services");
      setSelectedService(null);
    } else if (viewMode === "services") {
      setViewMode("departments");
      setSelectedDeptId(null);
      setSelectedCategory(null);
    }
  };

  /**
   * Joins the live queue slot attached to the selected service.
   * Falls back to a toast error if no open slot exists today.
   */
  const handleQueueUp = async () => {
    if (!selectedService) return;

    const slot = selectedService.todaySlot;

    if (!slot) {
      toast.error(
        "No open queue slot found for this service today. Please try again later.",
      );
      return;
    }
    if (!slot.hasCapacity) {
      toast.error(
        "This queue is currently at full capacity. Please try again later.",
      );
      return;
    }
    if (isAlreadyInQueue(slot.slotId)) {
      toast.info("You are already in this queue.");
      setTimeout(() => navigate("/student/queue-status"), 800);
      return;
    }

    setJoiningId(slot.slotId);
    try {
      await joinQueue(slot.slotId);
      toast.success(
        `Successfully joined the queue for ${selectedService.serviceName}!`,
      );
      setTimeout(() => navigate("/student/queue-status"), 1000);
    } catch (err) {
      toast.error(err.message ?? "Failed to join the queue. Please try again.");
    } finally {
      setJoiningId(null);
    }
  };

  // ── Chat bot ──────────────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
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
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const i = userInput.toLowerCase();
    if (i.includes("service") || i.includes("avail"))
      return "I can help you browse available services, understand requirements, and join queues. Which service are you interested in?";
    if (i.includes("requirement") || i.includes("document"))
      return "Each service has specific requirements listed on the service details page. Make sure to prepare all required documents before joining the queue.";
    if (i.includes("time") || i.includes("wait"))
      return "Queue wait times are shown live on each service card based on the current number of people waiting.";
    if (i.includes("queue"))
      return 'Once you select a service and tap "Queue Up Now", you will be added to the live queue and can track your position in real-time.';
    return "That's a great question! For more detailed assistance, please check the service details or contact your college office.";
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

  // ─── Queue button label helper ────────────────────────────────────────────
  const queueBtnLabel = () => {
    if (!selectedService) return "Queue Up Now";
    const slot = selectedService.todaySlot;
    if (!slot) return "No Queue Today";
    if (!slot.hasCapacity) return "Queue Full";
    if (isAlreadyInQueue(slot.slotId)) return "Already Queued";
    if (joiningId === slot.slotId) return "Joining…";
    return "Queue Up Now";
  };

  const queueBtnDisabled = () => {
    if (!selectedService) return true;
    const slot = selectedService.todaySlot;
    if (!slot || !slot.hasCapacity) return true;
    if (joiningId !== null) return true;
    return false;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-with-sidebar">
      {/* ── Sidebar ── */}
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

      {/* ── Mobile Header ── */}
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

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        <div className="avail-services-page">
          {/* Page Header */}
          <div className="avail-services-header">
            <div className="avail-services-breadcrumb">
              {viewMode === "departments" ? (
                <Link
                  to="/student/dashboard"
                  className="avail-services-breadcrumb-link"
                >
                  <ChevronLeft className="avail-services-breadcrumb-icon" />{" "}
                  Dashboard
                </Link>
              ) : (
                <button
                  className="avail-services-breadcrumb-link"
                  onClick={handleBack}
                >
                  <ChevronLeft className="avail-services-breadcrumb-icon" />{" "}
                  Back
                </button>
              )}
            </div>
            <div className="avail-services-title-section">
              <div className="avail-services-title-icon">
                <List className="avail-services-icon" />
              </div>
              <div className="avail-services-title-content">
                <h1>Avail Service</h1>
                <p>Browse and avail office services</p>
              </div>
            </div>
          </div>

          {/* Breadcrumb Nav */}
          <div className="avail-services-breadcrumb-nav">
            <span
              className={
                viewMode === "departments"
                  ? "avail-services-breadcrumb-active"
                  : "avail-services-breadcrumb-inactive"
              }
              onClick={() =>
                viewMode !== "departments" &&
                (setViewMode("departments"),
                setSelectedDeptId(null),
                setSelectedCategory(null),
                setSelectedService(null))
              }
            >
              Select Department
            </span>
            {selectedDept && (
              <>
                <ChevronRight className="avail-services-breadcrumb-separator" />
                <span
                  className={
                    viewMode === "services"
                      ? "avail-services-breadcrumb-active"
                      : "avail-services-breadcrumb-inactive"
                  }
                  onClick={() =>
                    viewMode === "faq" &&
                    (setViewMode("services"), setSelectedService(null))
                  }
                >
                  Select Service
                </span>
              </>
            )}
            {selectedService && (
              <>
                <ChevronRight className="avail-services-breadcrumb-separator" />
                <span className="avail-services-breadcrumb-active">
                  Service Details
                </span>
              </>
            )}
          </div>

          {/* ── Global Loading State ── */}
          {apiLoading && (
            <div className="avail-services-loading">
              <Loader2
                className="avail-services-loading-icon"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <p>Loading available services…</p>
            </div>
          )}

          {/* ── Global Error State ── */}
          {!apiLoading && apiError && (
            <div className="avail-services-error">
              <AlertCircle className="avail-services-error-icon" />
              <p>{apiError}</p>
              <button
                className="avail-services-retry-btn"
                onClick={fetchServices}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* ══ DEPARTMENTS VIEW ══════════════════════════════════════════════ */}
          {!apiLoading && !apiError && viewMode === "departments" && (
            <div className="avail-services-departments-grid">
              {departments.length === 0 ? (
                <div className="avail-services-error">
                  <AlertCircle className="avail-services-error-icon" />
                  <p>No departments found.</p>
                </div>
              ) : (
                departments.map((dept) => {
                  const logoSrc = getCollegeLogo(dept.departmentName);
                  return (
                    <div
                      key={dept.departmentId}
                      className="avail-services-college-card"
                      onClick={() => handleDepartmentSelect(dept.departmentId)}
                    >
                      <div className="avail-services-college-content">
                        <div className="avail-services-college-logo">
                          <img
                            src={logoSrc}
                            alt={`${dept.departmentName} logo`}
                          />
                        </div>
                        <div className="avail-services-college-info">
                          <h3 className="avail-services-college-name">
                            {dept.departmentName}
                          </h3>
                          <p className="avail-services-college-short">
                            {dept.departmentAbbrev}
                          </p>
                          <span className="avail-services-college-badge">
                            {dept.services.length} Service
                            {dept.services.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <ChevronRight className="avail-services-college-chevron" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══ SERVICES VIEW ════════════════════════════════════════════════ */}
          {!apiLoading &&
            !apiError &&
            viewMode === "services" &&
            selectedDept && (
              <div className="avail-services-services-section">
                {/* Department header */}
                <div className="avail-services-department-header">
                  <div className="avail-services-department-header-content">
                    <Building2 className="avail-services-department-icon" />
                    <h2>{selectedDept.departmentName}</h2>
                  </div>
                  <p>Select a service category and specific service</p>
                </div>

                {/* ── Category Filter Buttons ── */}
                {availableCategories.length > 0 ? (
                  <div className="avail-services-categories-grid">
                    {availableCategories.map((category) => (
                      <button
                        key={category}
                        className={`avail-services-category-btn ${selectedCategory === category ? "active" : ""}`}
                        onClick={() => handleCategorySelect(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      opacity: 0.6,
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    No services available in this department.
                  </p>
                )}

                {/* ── Service Cards (filtered) ── */}
                {selectedCategory && (
                  <div className="avail-services-services-list">
                    <h3 className="avail-services-category-title">
                      {selectedCategory} Services
                    </h3>

                    {filteredServices.length === 0 ? (
                      <p style={{ opacity: 0.6, fontSize: "0.875rem" }}>
                        No services in this category.
                      </p>
                    ) : (
                      <div className="avail-services-grid">
                        {filteredServices.map((service) => {
                          const slot = service.todaySlot;
                          const hasQueue = service.hasQueueToday;
                          const isOpen = service.isQueueOpen;
                          const alreadyIn = slot
                            ? isAlreadyInQueue(slot.slotId)
                            : false;

                          return (
                            <div
                              key={service.serviceId}
                              className="avail-services-service-card"
                              onClick={() => handleServiceSelect(service)}
                            >
                              <div className="avail-services-service-header">
                                <div className="avail-services-service-icon">
                                  <FileText className="avail-services-service-icon-inner" />
                                </div>
                                <div className="avail-services-service-info">
                                  <h4 className="avail-services-service-name">
                                    {service.serviceName}
                                  </h4>
                                  {service.description && (
                                    <p className="avail-services-service-description">
                                      {service.description}
                                    </p>
                                  )}

                                  {/* Live queue info pill */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      flexWrap: "wrap",
                                      marginTop: "0.375rem",
                                    }}
                                  >
                                    {hasQueue ? (
                                      <>
                                        <div className="avail-services-service-time">
                                          <Clock className="avail-services-service-time-icon" />
                                          <span>
                                            {slot?.avgWaitTime ?? "No wait"}
                                          </span>
                                        </div>
                                        <div className="avail-services-service-time">
                                          <Users className="avail-services-service-time-icon" />
                                          <span>
                                            {slot?.waitingCount ?? 0} waiting
                                          </span>
                                        </div>
                                        {/* Status badge */}
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            padding: "2px 8px",
                                            borderRadius: "999px",
                                            background: alreadyIn
                                              ? "var(--color-blue, #3b82f6)"
                                              : isOpen
                                                ? "var(--color-green, #22c55e)"
                                                : "var(--color-red, #ef4444)",
                                            color: "#fff",
                                          }}
                                        >
                                          {alreadyIn
                                            ? "Joined"
                                            : isOpen
                                              ? "Open"
                                              : "Full"}
                                        </span>
                                      </>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: "0.7rem",
                                          fontWeight: 600,
                                          padding: "2px 8px",
                                          borderRadius: "999px",
                                          background: "rgba(156,163,175,0.25)",
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        No queue today
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="avail-services-service-chevron" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* ══ SERVICE DETAILS VIEW ═════════════════════════════════════════ */}
          {!apiLoading &&
            !apiError &&
            viewMode === "faq" &&
            selectedService && (
              <div className="avail-services-details-section">
                {/* Hero */}
                <div className="avail-services-service-hero">
                  <h2>{selectedService.serviceName}</h2>
                  {selectedService.description && (
                    <p>{selectedService.description}</p>
                  )}

                  {/* Live queue meta */}
                  {selectedService.todaySlot ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        flexWrap: "wrap",
                        marginTop: "0.75rem",
                      }}
                    >
                      <div className="avail-services-service-hero-meta">
                        <Clock className="avail-services-service-hero-icon" />
                        <span>
                          Avg. Wait: {selectedService.todaySlot.avgWaitTime}
                        </span>
                      </div>
                      <div className="avail-services-service-hero-meta">
                        <Users className="avail-services-service-hero-icon" />
                        <span>
                          {selectedService.todaySlot.waitingCount} currently
                          waiting
                        </span>
                      </div>
                      <div className="avail-services-service-hero-meta">
                        <Clock className="avail-services-service-hero-icon" />
                        <span>
                          Hours: {selectedService.todaySlot.startTime} –{" "}
                          {selectedService.todaySlot.endTime}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="avail-services-service-hero-meta"
                      style={{ marginTop: "0.75rem" }}
                    >
                      <AlertCircle className="avail-services-service-hero-icon" />
                      <span>No queue is open for this service today.</span>
                    </div>
                  )}
                </div>

                {/* Requirements + Procedure */}
                <div className="avail-services-details-grid">
                  {/* Requirements */}
                  <div className="avail-services-details-card">
                    <div className="avail-services-details-card-header">
                      <h3 className="avail-services-details-card-title">
                        <CheckCircle2 className="avail-services-details-card-icon" />{" "}
                        Requirements
                      </h3>
                      <p className="avail-services-details-card-description">
                        Documents and items you need to bring
                      </p>
                    </div>
                    <div className="avail-services-details-card-content">
                      {selectedService.requirements &&
                      selectedService.requirements.length > 0 ? (
                        <ul className="avail-services-requirements-list">
                          {selectedService.requirements.map((req) => (
                            <li
                              key={req.id}
                              className="avail-services-requirement-item"
                            >
                              <CheckCircle2 className="avail-services-requirement-icon" />
                              <div>
                                <span>{req.name}</span>
                                {req.description && (
                                  <p
                                    style={{
                                      fontSize: "0.75rem",
                                      opacity: 0.65,
                                      marginTop: "2px",
                                    }}
                                  >
                                    {req.description}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        // Fallback: use the service description as a single requirement
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
                      )}
                    </div>
                  </div>

                  {/* Procedure */}
                  <div className="avail-services-details-card">
                    <div className="avail-services-details-card-header">
                      <h3 className="avail-services-details-card-title">
                        <HelpCircle className="avail-services-details-card-icon" />{" "}
                        Procedure
                      </h3>
                      <p className="avail-services-details-card-description">
                        Step-by-step process
                      </p>
                    </div>
                    <div className="avail-services-details-card-content">
                      <ol className="avail-services-procedure-list">
                        {selectedService.procedure.map((step, index) => (
                          <li
                            key={index}
                            className="avail-services-procedure-item"
                          >
                            <span className="avail-services-procedure-number">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Queue Up CTA */}
                <div className="avail-services-cta-card">
                  <div className="avail-services-cta-content">
                    <h3>Ready to Avail this Service?</h3>
                    <p>
                      Make sure you have all the requirements before joining the
                      queue
                    </p>
                  </div>
                  <button
                    className="avail-services-queue-btn"
                    onClick={handleQueueUp}
                    disabled={queueBtnDisabled()}
                  >
                    {joiningId ? (
                      <Loader2
                        className="avail-services-queue-btn-icon"
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Clock className="avail-services-queue-btn-icon" />
                    )}
                    {queueBtnLabel()}
                  </button>
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

      {/* ── AI Chatbot ── */}
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
