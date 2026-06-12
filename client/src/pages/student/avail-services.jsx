import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronRight, ChevronLeft, Clock, FileText, HelpCircle, CheckCircle2, List } from 'lucide-react';
import { COLLEGES } from '../../data/colleges';
import { getCollegeLogo } from '../../data/collegeLogo';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { useQueue } from '../../contexts/QueueContext';
import { useAuth } from '../../context/AuthContext';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import './avail-services.css';

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

// ─── Service Definitions ────────────────────────────────────────────────────────
const SERVICES = {
  'Enrollment': [
    {
      id: 'enroll-1',
      name: 'Subject Enrollment',
      category: 'Enrollment',
      description: 'Enroll in subjects for the current semester',
      estimatedTime: '15-20 minutes',
      requirements: ['Valid Student ID', 'Assessment Form', 'No outstanding balance', 'Advising form (signed by adviser)'],
      procedure: ['Get your advising form signed by your program adviser', 'Proceed to the cashier to settle any outstanding balances', 'Present your documents at the enrollment counter', 'Wait for validation and processing', 'Receive your Certificate of Registration'],
    },
    {
      id: 'enroll-2',
      name: 'Adding/Dropping of Subjects',
      category: 'Enrollment',
      description: 'Add or drop subjects within the allowed period',
      estimatedTime: '10-15 minutes',
      requirements: ['Valid Student ID', 'Certificate of Registration', 'Change of Matriculation Form', 'Adviser approval'],
      procedure: ['Secure approval from your adviser', 'Fill out the Change of Matriculation Form', 'Submit to the enrollment office', 'Wait for processing', 'Get updated Certificate of Registration'],
    },
  ],
  'Consultation': [
    {
      id: 'consult-1',
      name: 'Academic Consultation',
      category: 'Consultation',
      description: 'Discuss academic concerns with faculty or staff',
      estimatedTime: '20-30 minutes',
      requirements: ['Valid Student ID', 'List of concerns/questions', 'Previous academic records (if needed)'],
      procedure: ['Join the queue or book an appointment', 'Prepare your questions and concerns', 'Meet with the assigned faculty/staff', 'Discuss and receive guidance', 'Follow recommended actions'],
    },
    {
      id: 'consult-2',
      name: 'Thesis/Capstone Consultation',
      category: 'Consultation',
      description: 'Consult regarding thesis or capstone project',
      estimatedTime: '30-45 minutes',
      requirements: ['Valid Student ID', 'Thesis/Capstone proposal or draft', 'Progress report (if applicable)'],
      procedure: ['Book an appointment with your adviser', 'Prepare your documents and questions', 'Attend the consultation session', 'Receive feedback and recommendations', 'Implement suggested revisions'],
    },
  ],
  'Document Request': [
    {
      id: 'doc-1',
      name: 'Certificate of Grades',
      category: 'Document Request',
      description: 'Request official transcript of records',
      estimatedTime: '3-5 business days',
      requirements: ['Valid Student ID', 'Request form (filled out)', 'Payment receipt', 'No outstanding clearance'],
      procedure: ['Fill out the document request form', 'Pay the required fee at the cashier', 'Submit the form and receipt to the registrar', 'Wait for processing (3-5 business days)', 'Claim your document with valid ID'],
    },
    {
      id: 'doc-2',
      name: 'Good Moral Certificate',
      category: 'Document Request',
      description: 'Request certificate of good moral character',
      estimatedTime: '2-3 business days',
      requirements: ['Valid Student ID', 'Request form', 'Payment receipt', 'Clearance from Student Affairs'],
      procedure: ['Secure clearance from Student Affairs Office', 'Fill out request form', 'Pay the required fee', 'Submit requirements', 'Claim after 2-3 business days'],
    },
    {
      id: 'doc-3',
      name: 'Certificate of Enrollment',
      category: 'Document Request',
      description: 'Request proof of enrollment',
      estimatedTime: '1-2 business days',
      requirements: ['Valid Student ID', 'Certificate of Registration', 'Payment receipt'],
      procedure: ['Fill out request form', 'Pay processing fee', 'Submit to registrar office', 'Wait for processing', 'Claim with valid ID'],
    },
  ],
  'Clearance': [
    {
      id: 'clear-1',
      name: 'Clearance Processing',
      category: 'Clearance',
      description: 'Process clearance for graduation or transfer',
      estimatedTime: '1-2 weeks',
      requirements: ['Valid Student ID', 'Clearance form', 'No outstanding obligations', 'Return all borrowed items'],
      procedure: ['Obtain clearance form from your department', 'Visit all offices listed on the form', 'Settle any outstanding obligations', 'Get signatures from all offices', 'Submit completed form to the registrar'],
    },
  ],
  'Scholarship': [
    {
      id: 'scholar-1',
      name: 'Scholarship Application',
      category: 'Scholarship',
      description: 'Apply for scholarship programs',
      estimatedTime: '30 minutes',
      requirements: ['Valid Student ID', 'Academic records', 'Application form', 'Supporting documents (e.g., financial statements)'],
      procedure: ['Check scholarship eligibility requirements', 'Prepare required documents', 'Fill out application form', 'Submit to scholarship office', 'Wait for evaluation and notification'],
    },
    {
      id: 'scholar-2',
      name: 'Scholarship Renewal',
      category: 'Scholarship',
      description: 'Renew existing scholarship',
      estimatedTime: '20 minutes',
      requirements: ['Valid Student ID', 'Previous scholarship certificate', 'Recent grades (meets GPA requirement)', 'Renewal form'],
      procedure: ['Fill out renewal form', 'Submit recent grades', 'Meet with scholarship coordinator', 'Wait for approval', 'Receive renewal confirmation'],
    },
  ],
  'Others': [
    {
      id: 'other-1',
      name: 'ID Replacement',
      category: 'Others',
      description: 'Request replacement for lost or damaged ID',
      estimatedTime: '5-7 business days',
      requirements: ['Affidavit of loss (if lost)', '1x1 ID photo', 'Payment receipt', 'Valid secondary ID'],
      procedure: ['Report lost ID or bring damaged ID', 'Fill out ID replacement form', 'Submit photo and requirements', 'Pay replacement fee', 'Claim new ID after 5-7 days'],
    },
    {
      id: 'other-2',
      name: 'Certification/Authentication',
      category: 'Others',
      description: 'Request document certification or authentication',
      estimatedTime: '2-3 business days',
      requirements: ['Valid Student ID', 'Original document to be certified', 'Request form', 'Payment receipt'],
      procedure: ['Present original document', 'Fill out certification request form', 'Pay certification fee', 'Submit to registrar', 'Claim certified document'],
    },
  ],
};

export default function AvailServicesPage() {
  const navigate = useNavigate();
  const { addQueue } = useQueue();
  const { user: authUser, logout } = useAuth();

  // ── User data ────────────────────────────────────────────────────────────
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? 'N/A College',
        studentNumber: authUser.studentNumber ?? 'N/A Student Number',
        departmentAbbrev: authUser.departmentAbbrev ?? 'N/A Abbreviation',
        course: authUser.course ?? 'N/A Course',
      }
    : {
        name: 'Student',
        role: 'student',
        college: '',
        studentId: '',
        studentNumber: 'N/A Student Number',
        departmentAbbrev: '',
        course: '',
      };

  // ── View state ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('departments');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you avail a service today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

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

  const categories = Object.keys(SERVICES);

  const handleDepartmentSelect = (deptName) => {
    setSelectedDepartment(deptName);
    setViewMode('services');
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setViewMode('faq');
  };

  const handleQueueUp = () => {
    if (selectedService && selectedDepartment) {
      const collegeAcronym = selectedDepartment.match(/\(([^)]+)\)/)?.[1] || selectedDepartment;
      const location = `${collegeAcronym} Office - ${selectedCategory} Counter`;

      addQueue({
        service: selectedService.name,
        college: selectedDepartment,
        estimatedWaitTime: selectedService.estimatedTime,
        status: 'waiting',
        serviceHours: { start: '8:00 AM', end: '5:00 PM', breakTime: '12:00 PM - 1:00 PM' },
        concern: `Request for ${selectedService.name}`,
        location: location,
        averageServiceTime: selectedService.estimatedTime,
        announcementsjson: [
          'Please prepare all required documents',
          'Queue will be served on a first-come, first-served basis',
          'Estimated processing time may vary',
        ],
      });

      toast.success(`Successfully joined the queue for ${selectedService.name}!`);
      setTimeout(() => navigate('/student/queue-status'), 1500);
    }
  };

  const handleBack = () => {
    if (viewMode === 'faq') {
      setViewMode('services');
      setSelectedService(null);
    } else if (viewMode === 'services') {
      setViewMode('departments');
      setSelectedDepartment(null);
      setSelectedCategory(null);
    }
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
    if (lowerInput.includes('service') || lowerInput.includes('avail')) {
      return 'I can help you browse available services, understand requirements, and join queues. Which service are you interested in?';
    } else if (lowerInput.includes('requirement') || lowerInput.includes('document')) {
      return 'Each service has specific requirements listed on the service details page. Make sure to prepare all required documents before joining the queue.';
    } else if (lowerInput.includes('time') || lowerInput.includes('wait')) {
      return 'Service times vary by type. Check the estimated time on each service card before joining the queue.';
    } else {
      return 'That\'s a great question! For more detailed assistance, please check the service details or contact your college office.';
    }
  };

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/student/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/student/transactions' },
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
        <div className="avail-services-page">
          {/* Header */}
          <div className="avail-services-header">
            <div className="avail-services-breadcrumb">
              {viewMode === 'departments' ? (
                <Link to="/student/dashboard" className="avail-services-breadcrumb-link">
                  <ChevronLeft className="avail-services-breadcrumb-icon" />
                  Dashboard
                </Link>
              ) : (
                <button className="avail-services-breadcrumb-link" onClick={handleBack}>
                  <ChevronLeft className="avail-services-breadcrumb-icon" />
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

          {/* Breadcrumb Navigation */}
          <div className="avail-services-breadcrumb-nav">
            <span
              className={viewMode === 'departments' ? 'avail-services-breadcrumb-active' : 'avail-services-breadcrumb-inactive'}
              onClick={() => viewMode !== 'departments' && setViewMode('departments')}
            >
              Select Department
            </span>
            {selectedDepartment && (
              <>
                <ChevronRight className="avail-services-breadcrumb-separator" />
                <span
                  className={viewMode === 'services' ? 'avail-services-breadcrumb-active' : 'avail-services-breadcrumb-inactive'}
                  onClick={() => viewMode === 'faq' && setViewMode('services')}
                >
                  Select Service
                </span>
              </>
            )}
            {selectedService && (
              <>
                <ChevronRight className="avail-services-breadcrumb-separator" />
                <span className="avail-services-breadcrumb-active">Service Details</span>
              </>
            )}
          </div>

          {/* Departments View */}
          {viewMode === 'departments' && (
            <div className="avail-services-departments-grid">
              {COLLEGES.map((college) => {
                const logoSrc = getCollegeLogo(college.name);
                return (
                  <div
                    key={college.name}
                    className="avail-services-college-card"
                    onClick={() => handleDepartmentSelect(college.name)}
                  >
                    <div className="avail-services-college-content">
                      <div className="avail-services-college-logo">
                        <img src={logoSrc} alt={`${college.name} logo`} />
                      </div>
                      <div className="avail-services-college-info">
                        <h3 className="avail-services-college-name">{college.name}</h3>
                        <p className="avail-services-college-short">{college.shortName}</p>
                        <span className="avail-services-college-badge">
                          Available Services
                        </span>
                      </div>
                      <ChevronRight className="avail-services-college-chevron" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Services View */}
          {viewMode === 'services' && (
            <div className="avail-services-services-section">
              <div className="avail-services-department-header">
                <div className="avail-services-department-header-content">
                  <Building2 className="avail-services-department-icon" />
                  <h2>{selectedDepartment}</h2>
                </div>
                <p>Select a service category and specific service</p>
              </div>

              <div className="avail-services-categories-grid">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`avail-services-category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div className="avail-services-services-list">
                  <h3 className="avail-services-category-title">{selectedCategory} Services</h3>
                  <div className="avail-services-grid">
                    {SERVICES[selectedCategory].map((service) => (
                      <div
                        key={service.id}
                        className="avail-services-service-card"
                        onClick={() => handleServiceSelect(service)}
                      >
                        <div className="avail-services-service-header">
                          <div className="avail-services-service-icon">
                            <FileText className="avail-services-service-icon-inner" />
                          </div>
                          <div className="avail-services-service-info">
                            <h4 className="avail-services-service-name">{service.name}</h4>
                            <p className="avail-services-service-description">{service.description}</p>
                            <div className="avail-services-service-time">
                              <Clock className="avail-services-service-time-icon" />
                              <span>{service.estimatedTime}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="avail-services-service-chevron" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FAQ/Service Details View */}
          {viewMode === 'faq' && selectedService && (
            <div className="avail-services-details-section">
              <div className="avail-services-service-hero">
                <h2>{selectedService.name}</h2>
                <p>{selectedService.description}</p>
                <div className="avail-services-service-hero-meta">
                  <Clock className="avail-services-service-hero-icon" />
                  <span>Estimated Time: {selectedService.estimatedTime}</span>
                </div>
              </div>

              <div className="avail-services-details-grid">
                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <CheckCircle2 className="avail-services-details-card-icon" />
                      Requirements
                    </h3>
                    <p className="avail-services-details-card-description">
                      Documents and items you need to bring
                    </p>
                  </div>
                  <div className="avail-services-details-card-content">
                    <ul className="avail-services-requirements-list">
                      {selectedService.requirements.map((req, index) => (
                        <li key={index} className="avail-services-requirement-item">
                          <CheckCircle2 className="avail-services-requirement-icon" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <HelpCircle className="avail-services-details-card-icon" />
                      Procedure
                    </h3>
                    <p className="avail-services-details-card-description">Step-by-step process</p>
                  </div>
                  <div className="avail-services-details-card-content">
                    <ol className="avail-services-procedure-list">
                      {selectedService.procedure.map((step, index) => (
                        <li key={index} className="avail-services-procedure-item">
                          <span className="avail-services-procedure-number">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              <div className="avail-services-cta-card">
                <div className="avail-services-cta-content">
                  <h3>Ready to Avail this Service?</h3>
                  <p>Make sure you have all the requirements before joining the queue</p>
                </div>
                <button className="avail-services-queue-btn" onClick={handleQueueUp}>
                  <Clock className="avail-services-queue-btn-icon" />
                  Queue Up Now
                </button>
              </div>
            </div>
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