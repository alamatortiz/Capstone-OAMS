import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_dashboard.css";
import "./admin_data_management.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Shared sidebar / chatbot icons ────────────────────────────────────────────
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ── Page-specific icons ───────────────────────────────────────────────────────
const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" />
    <path d="M21 11v6c0 1.66-4.03 3-9 3S3 18.66 3 17v-6" />
  </svg>
);
const FileTypeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);
const ServiceClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const AuditHistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4" />
    <polyline points="3 3 3 7 7 7" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditSvgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Form defaults ─────────────────────────────────────────────────────────────
const emptyDocForm = () => ({
  name: "",
  description: "",
  processingTime: "",
  fee: "",
  status: "active",
});

const emptyServiceForm = () => ({
  name: "",
  description: "",
  avgServiceTime: "",
  autoClose: true,
  status: "active",
});

const emptyReqForm = () => ({ name: "", description: "", isMandatory: true });

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDataManagement() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! I'm your OAMS Assistant. Need help with Data Management?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Tabs
  const [activeTab, setActiveTab] = useState("documents");

  // ── Document Types ─────────────────────────────────────────
  const [documentTypes, setDocumentTypes] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(emptyDocForm());
  const [docSaving, setDocSaving] = useState(false);

  // Requirements (inside doc modal)
  const [requirements, setRequirements] = useState([]);
  const [reqForm, setReqForm] = useState(emptyReqForm());
  const [reqLoading, setReqLoading] = useState(false);

  // ── Service Settings ───────────────────────────────────────
  const [serviceSettings, setServiceSettings] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm());
  const [serviceSaving, setServiceSaving] = useState(false);

  // ── Audit Logs ─────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const fetchDocumentTypes = useCallback(async (status = "all") => {
    setDocLoading(true);
    try {
      const params = status !== "all" ? { status } : {};
      const { data } = await api.get("/admin/data-management/document-types", { params });
      setDocumentTypes(data.documentTypes || []);
    } catch {
      toast.error("Failed to load document types.");
    } finally {
      setDocLoading(false);
    }
  }, []);

  const fetchServiceTypes = useCallback(async (status = "all") => {
    setServiceLoading(true);
    try {
      const params = status !== "all" ? { status } : {};
      const { data } = await api.get("/admin/data-management/service-types", { params });
      setServiceSettings(data.serviceTypes || []);
    } catch {
      toast.error("Failed to load service types.");
    } finally {
      setServiceLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (action = "all") => {
    setAuditLoading(true);
    try {
      const params = action !== "all" ? { action } : {};
      const { data } = await api.get("/admin/data-management/audit-logs", { params });
      setAuditLogs(data.auditLogs || []);
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "documents") fetchDocumentTypes(docStatusFilter);
  }, [activeTab, docStatusFilter, fetchDocumentTypes]);

  useEffect(() => {
    if (activeTab === "services") fetchServiceTypes(serviceStatusFilter);
  }, [activeTab, serviceStatusFilter, fetchServiceTypes]);

  useEffect(() => {
    if (activeTab === "audit") fetchAuditLogs(auditActionFilter);
  }, [activeTab, auditActionFilter, fetchAuditLogs]);

  // ── Handlers: sidebar / theme / chat ──────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };

  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("document") || i.includes("certificate"))
      return "Manage document types and their requirements in the Document Settings tab.";
    if (i.includes("service") || i.includes("queue"))
      return "Configure queue services — name, average service time, and auto-close — in Service Settings.";
    if (i.includes("audit") || i.includes("log"))
      return "The Audit Logs tab shows all CREATE, UPDATE, DELETE, and other admin actions. Filter by action type.";
    return "I can help with document settings, service configuration, and audit logs. What do you need?";
  };

  // ── Handlers: Document Types ───────────────────────────────
  const openAddDocModal = () => {
    setEditingDoc(null);
    setDocForm(emptyDocForm());
    setRequirements([]);
    setReqForm(emptyReqForm());
    setShowDocModal(true);
  };

  const openEditDocModal = async (doc) => {
    setEditingDoc(doc);
    setDocForm({
      name: doc.name,
      description: doc.description,
      processingTime: doc.processingTime,
      fee: String(doc.fee),
      status: doc.status,
    });
    setRequirements([]);
    setReqForm(emptyReqForm());
    setShowDocModal(true);

    setReqLoading(true);
    try {
      const { data } = await api.get(`/admin/data-management/document-types/${doc.id}/requirements`);
      setRequirements(data.requirements || []);
    } catch {
      toast.error("Failed to load requirements.");
    } finally {
      setReqLoading(false);
    }
  };

  const closeDocModal = () => {
    setShowDocModal(false);
    setEditingDoc(null);
    setDocForm(emptyDocForm());
    setRequirements([]);
    setReqForm(emptyReqForm());
  };

  const addRequirement = () => {
    if (!reqForm.name.trim()) { toast.error("Requirement name is required."); return; }
    setRequirements((prev) => [...prev, { ...reqForm, _tempId: Date.now() }]);
    setReqForm(emptyReqForm());
  };

  const removeRequirement = (index) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocSubmit = async () => {
    const { name, description, processingTime, fee } = docForm;
    if (!name || !description || !processingTime || !fee) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setDocSaving(true);
    try {
      const payload = {
        name,
        description,
        processingTime,
        fee: parseFloat(fee),
        status: docForm.status,
        requirements: requirements.map((r) => ({
          name: r.name,
          description: r.description || "",
          isMandatory: r.isMandatory !== false,
        })),
      };

      if (editingDoc) {
        await api.put(`/admin/data-management/document-types/${editingDoc.id}`, payload);
        toast.success("Document type updated.");
      } else {
        await api.post("/admin/data-management/document-types", payload);
        toast.success("Document type created.");
      }
      closeDocModal();
      fetchDocumentTypes(docStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save document type.");
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try {
      await api.delete(`/admin/data-management/document-types/${doc.id}`);
      toast.success("Document type deleted.");
      fetchDocumentTypes(docStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete document type.");
    }
  };

  // ── Handlers: Service Settings ─────────────────────────────
  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm());
    setShowServiceModal(true);
  };

  const openEditServiceModal = (s) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      description: s.description || "",
      avgServiceTime: String(s.avgServiceTime),
      autoClose: s.autoClose,
      status: s.status,
    });
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm(emptyServiceForm());
  };

  const handleServiceSubmit = async () => {
    const { name, avgServiceTime } = serviceForm;
    if (!name || !avgServiceTime) {
      toast.error("Service name and average service time are required.");
      return;
    }
    setServiceSaving(true);
    try {
      const payload = {
        name: serviceForm.name,
        description: serviceForm.description,
        avgServiceTime: parseInt(serviceForm.avgServiceTime, 10),
        autoClose: serviceForm.autoClose,
        status: serviceForm.status,
      };

      if (editingService) {
        await api.put(`/admin/data-management/service-types/${editingService.id}`, payload);
        toast.success("Service updated.");
      } else {
        await api.post("/admin/data-management/service-types", payload);
        toast.success("Service created.");
      }
      closeServiceModal();
      fetchServiceTypes(serviceStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save service.");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    try {
      await api.delete(`/admin/data-management/service-types/${s.id}`);
      toast.success("Service deleted.");
      fetchServiceTypes(serviceStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete service.");
    }
  };

  // ── Nav items ──────────────────────────────────────────────
  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/admin/transactions" },
  ];

  // ── Filter constants ───────────────────────────────────────
  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const AUDIT_ACTION_FILTERS = [
    { value: "all", label: "All" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "EXPORT", label: "Export" },
    { value: "READ", label: "Read" },
  ];

  const formatTargetLabel = (log) => {
    if (!log.targetTable) return "System";
    const tableMap = {
      document_services: "Document Type",
      services: "Service Type",
      users: "User Account",
      students: "Student",
      faculty: "Faculty",
    };
    const label = tableMap[log.targetTable] || log.targetTable;
    return log.targetRecordId ? `${label} #${log.targetRecordId}` : label;
  };

  const formatChangeSummary = (log) => {
    if (log.action === "CREATE" && log.newValues) {
      const v = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues;
      return `Created: ${v.name || ""}${v.status ? ` (${v.status})` : ""}`;
    }
    if (log.action === "UPDATE" && log.oldValues && log.newValues) {
      const o = typeof log.oldValues === "string" ? JSON.parse(log.oldValues) : log.oldValues;
      const n = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues;
      const parts = [];
      if (o.name !== n.name) parts.push(`name: "${o.name}" → "${n.name}"`);
      if (o.status !== n.status) parts.push(`status: ${o.status} → ${n.status}`);
      if (o.fee !== n.fee) parts.push(`fee: ${o.fee} → ${n.fee}`);
      return parts.length ? parts.join(", ") : "Updated record";
    }
    if (log.action === "DELETE" && log.oldValues) {
      const v = typeof log.oldValues === "string" ? JSON.parse(log.oldValues) : log.oldValues;
      return `Deleted: ${v.name || "record"}`;
    }
    return "";
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-with-sidebar">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />

      {/* ── AI Chatbot ── */}
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

      {/* ── Sidebar ── */}
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name}</p>
                <span className="user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="nav-item" title={item.label}>
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
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="admin-dashboard-main">
        <div className="admin-dashboard">

          <button className="admin-back-btn" onClick={() => navigate("/admin/dashboard")}><ChevronLeftIcon /><span>Dashboard</span></button>
          {/* Banner */}
          <div className="adm-banner">
            <div className="adm-banner-icon"><DatabaseIcon /></div>
            <div className="adm-banner-text">
              <h1 className="adm-banner-title">Data Management</h1>
              <p className="adm-banner-subtitle">
                {user?.college} ({user?.departmentAbbrev}) — Configure document types and queue services
              </p>
            </div>
          </div>

          {/* Tabs Container */}
          <div className="adm-tabs-container">
            {/* Tab Bar */}
            <div className="adm-tabs-bar">
              <button
                className={`adm-tab-btn ${activeTab === "documents" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("documents")}
              >
                <span className="adm-tab-icon"><FileTypeIcon /></span>
                Document Settings
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "services" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("services")}
              >
                <span className="adm-tab-icon"><ServiceClockIcon /></span>
                Service Settings
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "audit" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("audit")}
              >
                <span className="adm-tab-icon"><AuditHistoryIcon /></span>
                Audit Logs
              </button>
            </div>

            {/* ── Document Settings Tab ── */}
            {activeTab === "documents" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Document Type Management</h2>
                    <p className="adm-card-desc">Configure available document types, fees, and requirements for {user?.departmentAbbrev}</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddDocModal}>
                    <PlusIcon />
                    Add Document Type
                  </button>
                </div>

                {/* Status filter pills */}
                <div className="adm-filter-bar">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`adm-filter-pill ${docStatusFilter === f.value ? "adm-filter-pill-active" : ""}`}
                      onClick={() => setDocStatusFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-items-list">
                  {docLoading && <div className="adm-loading">Loading document types...</div>}
                  {!docLoading && documentTypes.length === 0 && (
                    <p className="adm-empty-state">No document types found. Add one to get started.</p>
                  )}
                  {!docLoading && documentTypes.map((doc) => (
                    <div key={doc.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{doc.name}</p>
                          <span className={`adm-badge adm-badge-status-${doc.status}`}>{doc.status}</span>
                        </div>
                        <p className="adm-item-desc">{doc.description}</p>
                        <div className="adm-item-meta">
                          <span>Processing: {doc.processingTime || "—"}</span>
                          <span>Fee: ₱{doc.fee.toFixed(2)}</span>
                          <span>{doc.requirementCount} requirement{doc.requirementCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditDocModal(doc)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => handleDeleteDoc(doc)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Service Settings Tab ── */}
            {activeTab === "services" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Service Configuration</h2>
                    <p className="adm-card-desc">Manage queue services for {user?.departmentAbbrev}</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddServiceModal}>
                    <PlusIcon />
                    Add Service
                  </button>
                </div>

                {/* Status filter pills */}
                <div className="adm-filter-bar">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`adm-filter-pill ${serviceStatusFilter === f.value ? "adm-filter-pill-active" : ""}`}
                      onClick={() => setServiceStatusFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-items-list">
                  {serviceLoading && <div className="adm-loading">Loading services...</div>}
                  {!serviceLoading && serviceSettings.length === 0 && (
                    <p className="adm-empty-state">No services found. Add one to get started.</p>
                  )}
                  {!serviceLoading && serviceSettings.map((s) => (
                    <div key={s.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{s.name}</p>
                          <span className={`adm-badge adm-badge-status-${s.status}`}>{s.status}</span>
                        </div>
                        {s.description && <p className="adm-item-desc">{s.description}</p>}
                        <div className="adm-item-meta">
                          <span>Avg. Service Time: {s.avgServiceTime} min</span>
                          <span>{s.autoClose ? "Auto-close enabled" : "Manual close"}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditServiceModal(s)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => handleDeleteService(s)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Audit Logs Tab ── */}
            {activeTab === "audit" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">System Audit Logs</h2>
                    <p className="adm-card-desc">Track all administrative actions for {user?.departmentAbbrev}</p>
                  </div>
                  <button className="adm-btn-outline" onClick={() => toast.success("Logs exported successfully.")}>
                    <DownloadIcon />
                    Export Logs
                  </button>
                </div>

                {/* Action filter pills */}
                <div className="adm-filter-bar adm-filter-bar-wrap">
                  {AUDIT_ACTION_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`adm-filter-pill adm-filter-pill-action-${f.value.toLowerCase()} ${auditActionFilter === f.value ? "adm-filter-pill-active" : ""}`}
                      onClick={() => setAuditActionFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-items-list">
                  {auditLoading && <div className="adm-loading">Loading audit logs...</div>}
                  {!auditLoading && auditLogs.length === 0 && (
                    <p className="adm-empty-state">No audit log entries found.</p>
                  )}
                  {!auditLoading && auditLogs.map((log) => (
                    <div key={log.id} className="adm-log-item">
                      <div className="adm-log-top-row">
                        <span className={`adm-badge adm-badge-${log.action.toLowerCase()}`}>{log.action}</span>
                        <span className="adm-log-user">{log.adminName} ({log.adminEmail})</span>
                      </div>
                      <p className="adm-log-target">{formatTargetLabel(log)}</p>
                      {formatChangeSummary(log) && (
                        <p className="adm-log-details">{formatChangeSummary(log)}</p>
                      )}
                      <p className="adm-log-timestamp">{log.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Document Type Modal ── */}
      {showDocModal && (
        <div className="adm-modal-overlay" onClick={closeDocModal}>
          <div className="adm-modal adm-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">{editingDoc ? "Edit Document Type" : "Add Document Type"}</h3>
                <p className="adm-modal-subtitle">
                  {editingDoc ? "Update document type details and requirements" : "Create a new document type for your department"}
                </p>
              </div>
              <button className="adm-modal-close-btn" onClick={closeDocModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label className="adm-form-label">Document Name *</label>
                <input
                  className="adm-form-input"
                  placeholder="e.g., Certificate of Grades"
                  value={docForm.name}
                  onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-form-label">Description *</label>
                <textarea
                  className="adm-form-textarea"
                  placeholder="Brief description of the document"
                  rows={3}
                  value={docForm.description}
                  onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">Processing Time *</label>
                  <input
                    className="adm-form-input"
                    placeholder="e.g., 3-5 business days"
                    value={docForm.processingTime}
                    onChange={(e) => setDocForm((p) => ({ ...p, processingTime: e.target.value }))}
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Fee (PHP) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 100"
                    value={docForm.fee}
                    onChange={(e) => setDocForm((p) => ({ ...p, fee: e.target.value }))}
                  />
                </div>
              </div>
              <div className="adm-form-group">
                <label className="adm-form-label">Status *</label>
                <select
                  className="adm-form-select"
                  value={docForm.status}
                  onChange={(e) => setDocForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* ── Document Requirements ── */}
              <div className="adm-req-section">
                <div className="adm-req-header">
                  <h4 className="adm-req-title">Document Requirements</h4>
                  <p className="adm-req-subtitle">List what students need to submit for this document type</p>
                </div>

                {reqLoading && <div className="adm-loading adm-loading-sm">Loading requirements...</div>}

                {!reqLoading && requirements.length > 0 && (
                  <div className="adm-req-list">
                    {requirements.map((req, idx) => (
                      <div key={req.id || req._tempId || idx} className="adm-req-item">
                        <div className="adm-req-item-main">
                          <div className="adm-req-item-top">
                            <span className="adm-req-item-name">{req.name}</span>
                            {(req.isMandatory !== false) && (
                              <span className="adm-badge adm-badge-mandatory">Required</span>
                            )}
                            {req.isMandatory === false && (
                              <span className="adm-badge adm-badge-optional">Optional</span>
                            )}
                          </div>
                          {req.description && <p className="adm-req-item-desc">{req.description}</p>}
                        </div>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => removeRequirement(idx)} title="Remove">
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add requirement inline form */}
                <div className="adm-req-add-form">
                  <div className="adm-req-add-fields">
                    <input
                      className="adm-form-input"
                      placeholder="Requirement name *"
                      value={reqForm.name}
                      onChange={(e) => setReqForm((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                    />
                    <input
                      className="adm-form-input"
                      placeholder="Description (optional)"
                      value={reqForm.description}
                      onChange={(e) => setReqForm((p) => ({ ...p, description: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                    />
                    <label className="adm-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={reqForm.isMandatory}
                        onChange={(e) => setReqForm((p) => ({ ...p, isMandatory: e.target.checked }))}
                      />
                      <span className="adm-checkbox-label">Mandatory</span>
                    </label>
                  </div>
                  <button className="adm-btn-add-req" onClick={addRequirement} type="button">
                    <PlusIcon /> Add Requirement
                  </button>
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-outline" onClick={closeDocModal}>Cancel</button>
              <button className="adm-btn-primary" onClick={handleDocSubmit} disabled={docSaving}>
                {docSaving ? "Saving..." : (editingDoc ? "Update" : "Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Setting Modal ── */}
      {showServiceModal && (
        <div className="adm-modal-overlay" onClick={closeServiceModal}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">{editingService ? "Edit Service" : "Add Service"}</h3>
                <p className="adm-modal-subtitle">
                  {editingService ? "Update queue service configuration" : "Create a new queue service for your department"}
                </p>
              </div>
              <button className="adm-modal-close-btn" onClick={closeServiceModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label className="adm-form-label">Service Name *</label>
                <input
                  className="adm-form-input"
                  placeholder="e.g., Enrollment Assistance"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-form-label">Description</label>
                <textarea
                  className="adm-form-textarea"
                  placeholder="Brief description of this service"
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="adm-form-grid-2">
                <div className="adm-form-group">
                  <label className="adm-form-label">Avg. Service Time (min) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 15"
                    value={serviceForm.avgServiceTime}
                    onChange={(e) => setServiceForm((p) => ({ ...p, avgServiceTime: e.target.value }))}
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Status *</label>
                  <select
                    className="adm-form-select"
                    value={serviceForm.status}
                    onChange={(e) => setServiceForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <label className="adm-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={serviceForm.autoClose}
                  onChange={(e) => setServiceForm((p) => ({ ...p, autoClose: e.target.checked }))}
                />
                <span className="adm-checkbox-label">Auto-close when capacity is reached</span>
              </label>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-outline" onClick={closeServiceModal}>Cancel</button>
              <button className="adm-btn-primary" onClick={handleServiceSubmit} disabled={serviceSaving}>
                {serviceSaving ? "Saving..." : (editingService ? "Update" : "Add Service")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
