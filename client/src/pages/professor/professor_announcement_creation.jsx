import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_announcement_creation.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import { toast } from "sonner";

// ── Icons ──────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.25rem", height: "1.25rem" }}>
    <polyline points="15 18 9 12 15 6"></polyline>
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
const BellIcon = () => (
  <svg className="anc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
const PlusIcon = () => (
  <svg className="anc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const EditIcon = () => (
  <svg className="anc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const TrashIcon = () => (
  <svg className="anc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4h6v2"></path>
  </svg>
);
const EyeIcon = () => (
  <svg className="anc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default function ProfessorAnnouncementCreation() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Faculty",
        role: "faculty",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Announcement State ────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("general");
  const [formAudience, setFormAudience] = useState("all");

  const [announcements, setAnnouncements] = useState([]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get("/faculty/announcements");
      setAnnouncements(res.data);
    } catch {
      toast.error("Failed to load announcements");
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: "I can help you create and manage announcements for your students. Use the 'Create Announcement' button to get started!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("general");
    setFormAudience("all");
    setEditingAnnouncement(null);
    setShowCreateModal(false);
  };

  const handleCreateOrUpdate = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      if (editingAnnouncement) {
        await api.put(`/faculty/announcements/${editingAnnouncement.id}`, {
          title: formTitle, content: formContent, type: formType,
        });
        toast.success("Announcement updated");
      } else {
        await api.post("/faculty/announcements", {
          title: formTitle, content: formContent, type: formType, status: "draft",
        });
        toast.success("Announcement created as draft");
      }
      await fetchAnnouncements();
    } catch {
      toast.error("Failed to save announcement");
    }
    resetForm();
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormType(announcement.type);
    setFormAudience("all");
    setShowCreateModal(true);
  };

  const handlePublish = async (id) => {
    try {
      await api.put(`/faculty/announcements/${id}`, { status: "published" });
      await fetchAnnouncements();
    } catch { toast.error("Failed to publish"); }
  };

  const handleUnpublish = async (id) => {
    try {
      await api.put(`/faculty/announcements/${id}`, { status: "draft" });
      await fetchAnnouncements();
    } catch { toast.error("Failed to unpublish"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/faculty/announcements/${id}`);
      await fetchAnnouncements();
      toast.success("Announcement deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case "important": return { backgroundColor: "#ef4444", color: "#fff" };
      case "event":     return { backgroundColor: "#3b82f6", color: "#fff" };
      case "reminder":  return { backgroundColor: "#f59e0b", color: "#fff" };
      default:          return { backgroundColor: "#6b7280", color: "#fff" };
    }
  };

  const draftAnnouncements = announcements.filter((a) => a.status === "draft");
  const publishedAnnouncements = announcements.filter((a) => a.status === "published");

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
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
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
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
                  <item.icon />
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
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
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
        <div className="anc-page">

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="anc-page-header">
            <div className="anc-page-header-left">
              <h1 className="anc-page-title">Announcement Management</h1>
              <p className="anc-page-subtitle">Create and manage announcements for your students</p>
            </div>
            <button
              className="anc-create-btn"
              onClick={() => { resetForm(); setShowCreateModal(true); }}
            >
              <PlusIcon />
              Create Announcement
            </button>
          </div>

          {/* Drafts Section */}
          {draftAnnouncements.length > 0 && (
            <section className="anc-section">
              <h2 className="anc-section-title">Drafts ({draftAnnouncements.length})</h2>
              <div className="anc-list">
                {draftAnnouncements.map((ann) => (
                  <div key={ann.id} className="anc-card anc-card--draft">
                    <div className="anc-card-body">
                      <div className="anc-card-info">
                        <h3 className="anc-card-title">{ann.title}</h3>
                        <p className="anc-card-content">{ann.content}</p>
                        <div className="anc-card-meta">
                          <span className="anc-badge" style={getTypeBadgeStyle(ann.type)}>{ann.type}</span>
                          <span className="anc-badge anc-badge--draft">draft</span>
                          <span className="anc-badge anc-badge--outline">{ann.targetAudience}</span>
                          <span className="anc-card-date">
                            Created: {new Date(ann.createdDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="anc-card-actions">
                        <button className="anc-btn anc-btn--edit" onClick={() => handleEdit(ann)}>
                          <EditIcon /> Edit
                        </button>
                        <button className="anc-btn anc-btn--publish" onClick={() => handlePublish(ann.id)}>
                          <BellIcon /> Publish
                        </button>
                        <button className="anc-btn anc-btn--delete" onClick={() => handleDelete(ann.id)}>
                          <TrashIcon /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Published Section */}
          {publishedAnnouncements.length > 0 && (
            <section className="anc-section">
              <h2 className="anc-section-title">Published ({publishedAnnouncements.length})</h2>
              <div className="anc-list">
                {publishedAnnouncements.map((ann) => (
                  <div key={ann.id} className="anc-card anc-card--published">
                    <div className="anc-card-body">
                      <div className="anc-card-info">
                        <h3 className="anc-card-title">{ann.title}</h3>
                        <p className="anc-card-content">{ann.content}</p>
                        <div className="anc-card-meta">
                          <span className="anc-badge" style={getTypeBadgeStyle(ann.type)}>{ann.type}</span>
                          <span className="anc-badge anc-badge--published">published</span>
                          <span className="anc-badge anc-badge--outline">{ann.targetAudience}</span>
                          <span className="anc-card-date">
                            Published: {new Date(ann.createdDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="anc-card-actions">
                        <button className="anc-btn anc-btn--edit" onClick={() => handleEdit(ann)}>
                          <EditIcon /> Edit
                        </button>
                        <button className="anc-btn anc-btn--unpublish" onClick={() => handleUnpublish(ann.id)}>
                          <EyeIcon /> Unpublish
                        </button>
                        <button className="anc-btn anc-btn--delete" onClick={() => handleDelete(ann.id)}>
                          <TrashIcon /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {announcements.length === 0 && (
            <div className="anc-empty">
              <BellIcon />
              <h3 className="anc-empty-title">No Announcements Yet</h3>
              <p className="anc-empty-subtitle">Create your first announcement to get started</p>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="anc-modal-overlay">
          <div className="anc-modal">
            <div className="anc-modal-header">
              <h2 className="anc-modal-title">
                {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <p className="anc-modal-subtitle">
                {editingAnnouncement
                  ? "Update the announcement details"
                  : "Fill in the details for your new announcement"}
              </p>
            </div>
            <div className="anc-modal-body">
              <div className="anc-form-group">
                <label className="anc-label" htmlFor="anc-title">Title *</label>
                <input
                  id="anc-title"
                  className="anc-input"
                  placeholder="Enter announcement title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="anc-form-group">
                <label className="anc-label" htmlFor="anc-content">Content *</label>
                <textarea
                  id="anc-content"
                  className="anc-textarea"
                  placeholder="Enter announcement content"
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
              <div className="anc-form-row">
                <div className="anc-form-group">
                  <label className="anc-label" htmlFor="anc-type">Type *</label>
                  <select
                    id="anc-type"
                    className="anc-select"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="important">Important</option>
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div className="anc-form-group">
                  <label className="anc-label" htmlFor="anc-audience">Target Audience *</label>
                  <select
                    id="anc-audience"
                    className="anc-select"
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value)}
                  >
                    <option value="all">All Students</option>
                    <option value="My Students">My Students Only</option>
                    <option value="Department">Department</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="anc-modal-footer">
              <button className="anc-btn anc-btn--cancel" onClick={resetForm}>Cancel</button>
              <button className="anc-btn anc-btn--save" onClick={handleCreateOrUpdate}>
                {editingAnnouncement ? "Update" : "Create"} as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat">
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
              <button type="submit" className="chat-send-btn" aria-label="Send message">
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat">
          <ChatIcon />
        </button>
      </div>

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}