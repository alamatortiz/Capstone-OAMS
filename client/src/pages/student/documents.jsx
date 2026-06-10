import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ucLogo from '../../assets/Pnc-Logo.png';
import oamsLogo from '../../assets/oams_logo.png';
import { toast } from 'sonner';
import './documents.css';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import { COLLEGES } from '../../data/colleges';

// ─── Document Object Structure (JSDoc) ────────────────────────────────────
/**
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} type
 * @property {string} college
 * @property {string} requestDate
 * @property {string} purpose
 * @property {'pending' | 'processing' | 'ready' | 'claimed' | 'rejected'} status
 * @property {string} trackingNumber
 * @property {string} [notes]
 * @property {string} [estimatedCompletion]
 */

// ─── Icons ────────────────────────────────────────────────────────────────
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

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// ─── Main Component ──────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

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

  // ── State ───────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === 'dark');
  const [documents, setDocuments] = useState([
    {
      id: '1',
      type: 'Good Moral Certificate',
      college: 'College of Computing Studies',
      requestDate: '2026-03-25',
      purpose: 'Job application requirement',
      status: 'processing',
      trackingNumber: 'DOC-2026-001234',
      estimatedCompletion: '2026-03-30',
    },
    {
      id: '2',
      type: 'Transcript of Records',
      college: 'College of Computing Studies',
      requestDate: '2026-03-20',
      purpose: 'Graduate school application',
      status: 'ready',
      trackingNumber: 'DOC-2026-001189',
      notes: 'Ready for pickup at Registrar Office',
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ type: '', college: '', purpose: '', copies: '1' });

  const documentTypes = [
    'Good Moral Certificate',
    'Transcript of Records',
    'Certificate of Enrollment',
    'Certificate of Grades',
    'Diploma',
    'Honorable Dismissal',
    'Certificate of Registration',
    'Certificate of Completion',
  ];

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? 'dark' : 'light');
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmitRequest = () => {
    if (!formData.type || !formData.college || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newDoc = {
      id: Date.now().toString(),
      type: formData.type,
      college: formData.college,
      requestDate: new Date().toISOString().split('T')[0],
      purpose: formData.purpose,
      status: 'pending',
      trackingNumber: `DOC-2026-${Math.floor(Math.random() * 900000) + 100000}`,
      estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
    setDocuments([newDoc, ...documents]);
    setDialogOpen(false);
    setFormData({ type: '', college: '', purpose: '', copies: '1' });
    toast.success('Document request submitted successfully!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'doc-badge-pending';
      case 'processing':
        return 'doc-badge-processing';
      case 'ready':
        return 'doc-badge-ready';
      case 'claimed':
        return 'doc-badge-claimed';
      case 'rejected':
        return 'doc-badge-rejected';
      default:
        return 'doc-badge-pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon />;
      case 'processing':
        return <AlertCircleIcon />;
      case 'ready':
        return <CheckCircleIcon />;
      case 'claimed':
        return <CheckCircleIcon />;
      case 'rejected':
        return <XCircleIcon />;
      default:
        return <FileTextIcon />;
    }
  };

  const activeDocuments = documents.filter(
    (doc) => doc.status !== 'claimed' && doc.status !== 'rejected'
  );
  const completedDocuments = documents.filter(
    (doc) => doc.status === 'claimed' || doc.status === 'rejected'
  );

  const navItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/student/dashboard' },
    { icon: QueueIconNav, label: 'Queue', path: '/student/queue' },
    { icon: CalendarIconNav, label: 'Appointments', path: '/student/appointments' },
    { icon: DocumentIconNav, label: 'Documents', path: '/student/documents' },
    { icon: HistoryIconNav, label: 'Transactions', path: '/student/transactions' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="documents-container">
      {/* Sidebar */}
      <aside className={`doc-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="doc-sidebar-inner">
          <div className="doc-sidebar-logo">
            <div className="doc-logo-container">
              <img src={ucLogo} alt="UC Logo" className="doc-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="doc-logo-img doc-oams-logo" />
            </div>
            <button
              className="doc-theme-toggle"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <div className="doc-sidebar-user">
            <div className="doc-user-top">
              <div className="doc-user-avatar">
                <UserIcon />
              </div>
              <div className="doc-user-info">
                <p className="doc-user-name">{user?.name ?? 'Student'}</p>
                <span className="doc-user-role">Student</span>
              </div>
            </div>
            <div className="doc-user-college">
              <p className="doc-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>

          <nav className="doc-sidebar-nav">
            <div className="doc-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="doc-nav-item"
                  title={item.label}
                >
                  <item.icon className="doc-nav-icon" />
                  <span className="doc-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="doc-sidebar-logout">
            <button className="doc-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="doc-mobile-header">
        <div className="doc-mobile-header-content">
          <div className="doc-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="doc-logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="doc-logo-img doc-oams-logo" />
          </div>
          <div className="doc-mobile-header-actions">
            <button
              className="doc-theme-toggle"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="doc-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="doc-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="doc-main">
        <div className="doc-content">
          {/* Header */}
          <div className="doc-header-section">
            <div className="doc-header-top">
              <Link to="/student/dashboard" className="doc-back-link">
                <ChevronLeftIcon /> Dashboard
              </Link>
            </div>
            <div className="doc-header-title">
              <div className="doc-title-icon">
                <FileTextIcon />
              </div>
              <div className="doc-title-text">
                <h1>Document Requests</h1>
                <p>Request and track your documents</p>
              </div>
            </div>
            <button className="doc-request-btn" onClick={() => setDialogOpen(true)}>
              <PlusIcon /> Request Document
            </button>
          </div>

          {/* Request Dialog */}
          {dialogOpen && (
            <div className="doc-dialog-overlay" onClick={() => setDialogOpen(false)}>
              <div className="doc-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="doc-dialog-header">
                  <h2>New Document Request</h2>
                  <p>Submit a request for official documents</p>
                  <button
                    className="doc-dialog-close"
                    onClick={() => setDialogOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="doc-dialog-content">
                  <div className="doc-form-group">
                    <label htmlFor="type">Document Type</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="doc-form-select"
                    >
                      <option value="">Select document type</option>
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="college">College</label>
                    <select
                      id="college"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      className="doc-form-select"
                    >
                      <option value="">Select college</option>
                      {COLLEGES.map((college) => (
                        <option key={college.name} value={college.name}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="copies">Number of Copies</label>
                    <input
                      id="copies"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.copies}
                      onChange={(e) => setFormData({ ...formData, copies: e.target.value })}
                      className="doc-form-input"
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="purpose">Purpose</label>
                    <textarea
                      id="purpose"
                      placeholder="Specify the purpose of your request"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="doc-form-textarea"
                      rows={3}
                    />
                  </div>

                  <button onClick={handleSubmitRequest} className="doc-form-submit">
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Requests */}
          <section className="doc-section">
            <div className="doc-section-header">
              <h2>
                <AlertCircleIcon /> Active Requests{' '}
                <span className="doc-badge">{activeDocuments.length}</span>
              </h2>
            </div>

            {activeDocuments.length > 0 ? (
              <div className="doc-cards-grid">
                {activeDocuments.map((doc) => (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-card-header">
                      <div className="doc-card-title-section">
                        <h3>{doc.type}</h3>
                        <p className="doc-card-college">{doc.college}</p>
                        <p className="doc-card-tracking">
                          Tracking: <span>{doc.trackingNumber}</span>
                        </p>
                      </div>
                      <span className={`doc-badge ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status}
                      </span>
                    </div>

                    <div className="doc-card-grid">
                      <div className="doc-card-field">
                        <label>Request Date</label>
                        <p>
                          {new Date(doc.requestDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {doc.estimatedCompletion && (
                        <div className="doc-card-field">
                          <label>Est. Completion</label>
                          <p>
                            {new Date(doc.estimatedCompletion).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      <div className="doc-card-field-full">
                        <label>Purpose</label>
                        <p>{doc.purpose}</p>
                      </div>
                    </div>

                    {doc.notes && (
                      <div className="doc-card-update">
                        <p className="doc-update-title">Update</p>
                        <p className="doc-update-text">{doc.notes}</p>
                      </div>
                    )}

                    {doc.status === 'ready' && (
                      <button className="doc-card-claim-btn">
                        <DownloadIcon /> Claim Document
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="doc-empty-state">
                <FileTextIcon />
                <h3>No active requests</h3>
                <p>Start by requesting a document</p>
                <button className="doc-empty-btn" onClick={() => setDialogOpen(true)}>
                  <PlusIcon /> Request Document
                </button>
              </div>
            )}
          </section>

          {/* Completed Requests */}
          {completedDocuments.length > 0 && (
            <section className="doc-section">
              <h2>Completed Requests</h2>
              <div className="doc-cards-grid">
                {completedDocuments.map((doc) => (
                  <div key={doc.id} className="doc-card doc-card-completed">
                    <div className="doc-card-header">
                      <div className="doc-card-title-section">
                        <h3>{doc.type}</h3>
                        <p className="doc-card-college">{doc.college}</p>
                        <p className="doc-card-tracking">
                          {new Date(doc.requestDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          • {doc.trackingNumber}
                        </p>
                      </div>
                      <span className={`doc-badge ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Processing Times */}
          <section className="doc-processing-section">
            <div className="doc-processing-header">
              <h2>
                <AlertCircleIcon /> Processing Times
              </h2>
              <p>Estimated completion times for documents</p>
            </div>
            <div className="doc-processing-grid">
              <div className="doc-processing-box">
                <p className="doc-processing-title">Regular Processing</p>
                <ul className="doc-processing-list">
                  <li>• Certificates: 3-5 business days</li>
                  <li>• Transcript of Records: 5-7 business days</li>
                  <li>• Diploma: 7-10 business days</li>
                </ul>
              </div>
              <div className="doc-processing-box">
                <p className="doc-processing-title">Rush Processing</p>
                <ul className="doc-processing-list">
                  <li>• Additional fee applies</li>
                  <li>• 1-2 business days</li>
                  <li>• Subject to availability</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}