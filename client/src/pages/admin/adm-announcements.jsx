import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
import "./adm-dashboard.css";
import "./adm-announcements.css";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import AdminPageShell from "../../components/AdminPageShell";
import ChatWidget from "../../components/ChatWidget";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import api from "../../utils/api";
import { formatManilaDate } from "../../utils/dateTime";

// ── Page-only icons ───────────────────────────────────────────────────────────
const PlusIconSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const MegaphoneIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 11l18-5v12L3 13v-2z"></path>
    <path d="M11.6 16.8a3 3 0 0 1-5.8-1.6"></path>
  </svg>
);
const PinIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5"></path>
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
  </svg>
);
const AlertCircleIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);
const CalendarIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const BellIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
const InfoIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
const SearchIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EyeIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const XIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const CheckCircleIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const PaperclipIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);
const FileIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
// ── Static reference data ─────────────────────────────────────────────────────
const TYPE_META = {
  important: { label: "Important", icon: AlertCircleIcon, iconClass: "ann-icon-important", badgeClass: "ann-badge-important" },
  event:     { label: "Event",     icon: CalendarIcon,    iconClass: "ann-icon-event",     badgeClass: "ann-badge-event"     },
  reminder:  { label: "Reminder",  icon: BellIcon,        iconClass: "ann-icon-reminder",  badgeClass: "ann-badge-reminder"  },
  general:   { label: "General",   icon: InfoIcon,        iconClass: "ann-icon-general",   badgeClass: "ann-badge-general"   },
};

const EMPTY_FORM = { title: "", content: "", type: "general", isPinned: false };

const formatDate = (iso) => {
  try {
    return formatManilaDate(iso, { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

export default function AdminAnnouncements() {
  const { user: authUser } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Admin", college: "", departmentAbbrev: "CCS" };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("pin")) return "Use the Pin button on any active announcement to keep it at the top, or Unpin to remove it.";
    if (i.includes("archive")) return "Archiving moves an announcement out of the active list. You can restore it anytime from the Archived tab.";
    if (i.includes("delete")) return "Deleting an archived announcement removes it permanently — this can't be undone.";
    if (i.includes("filter") || i.includes("college") || i.includes("type"))
      return "Use the search bar and the Type dropdown above the list to narrow down announcements.";
    if (i.includes("create") || i.includes("new")) return "Click 'New Announcement' at the top right to publish a new one.";
    return "I can help with creating, pinning, filtering, archiving, or deleting announcements. What do you need?";
  };

  // ── Announcements state ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);

  // ── Attachments (one per announcement, image or PDF) ──────────────────────
  const [createAttachmentFile, setCreateAttachmentFile] = useState(null);
  const [createPreviewUrl, setCreatePreviewUrl] = useState(null);
  const [editAttachmentFile, setEditAttachmentFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [editExistingAttachmentUrl, setEditExistingAttachmentUrl] = useState(null);
  const [viewAttachmentUrl, setViewAttachmentUrl] = useState(null);

  const fetchAttachmentBlobUrl = async (id) => {
    try {
      const res = await api.get(`/admin/announcements/${id}/attachment`, { responseType: "blob" });
      return URL.createObjectURL(res.data);
    } catch {
      return null;
    }
  };

  // Preview for a newly-picked file in the Create modal (image only -- a
  // picked PDF just shows its filename, no need for a blob URL).
  useEffect(() => {
    if (createAttachmentFile?.type.startsWith("image/")) {
      const url = URL.createObjectURL(createAttachmentFile);
      setCreatePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCreatePreviewUrl(null);
  }, [createAttachmentFile]);

  // Same, for a newly-picked replacement file in the Edit modal.
  useEffect(() => {
    if (editAttachmentFile?.type.startsWith("image/")) {
      const url = URL.createObjectURL(editAttachmentFile);
      setEditPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setEditPreviewUrl(null);
  }, [editAttachmentFile]);

  // The *existing* attachment already saved on the announcement being edited
  // (fetched once when the Edit modal opens, not re-fetched on every keystroke).
  useEffect(() => {
    let url;
    let cancelled = false;
    if (editingAnnouncement?.hasAttachment) {
      fetchAttachmentBlobUrl(editingAnnouncement.id).then((u) => {
        if (!cancelled) { url = u; setEditExistingAttachmentUrl(u); }
      });
    } else {
      setEditExistingAttachmentUrl(null);
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [editingAnnouncement?.id, editingAnnouncement?.hasAttachment]);

  // The attachment shown in the read-only View modal.
  useEffect(() => {
    let url;
    let cancelled = false;
    if (viewingAnnouncement?.hasAttachment) {
      fetchAttachmentBlobUrl(viewingAnnouncement.id).then((u) => {
        if (!cancelled) { url = u; setViewAttachmentUrl(u); }
      });
    } else {
      setViewAttachmentUrl(null);
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [viewingAnnouncement?.id, viewingAnnouncement?.hasAttachment]);

  const [toasts, setToasts] = useState([]);
  const showToast = (message, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // ── Fetch from API ─────────────────────────────────────────────────────────
  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/admin/announcements");
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      showToast("Failed to load announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = {
    total:     announcements.filter((a) => a.status === "active").length,
    pinned:    announcements.filter((a) => a.isPinned && a.status === "active").length,
    important: announcements.filter((a) => a.type === "important" && a.status === "active").length,
    archived:  announcements.filter((a) => a.status === "archived").length,
  };

  const getFiltered = (tab) => {
    let list = announcements.filter((a) => {
      if (tab === "archived") return a.status === "archived";
      if (tab === "pinned") return a.status === "active" && a.isPinned;
      if (tab === "unpinned") return a.status === "active" && !a.isPinned;
      return a.status === "active";
    });
    if (selectedType !== "all") list = list.filter((a) => a.type === selectedType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          (a.createdBy || "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleTogglePin = async (id) => {
    try {
      const { data } = await api.patch(`/admin/announcements/${id}/pin`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isPinned: data.isPinned } : a)));
      showToast("Pin status updated");
    } catch {
      showToast("Failed to update pin status", "error");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/admin/announcements/${id}/archive`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status: "archived" } : a)));
      showToast("Announcement archived");
    } catch {
      showToast("Failed to archive announcement", "error");
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/admin/announcements/${id}/restore`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)));
      showToast("Announcement restored");
    } catch {
      showToast("Failed to restore announcement", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("Announcement deleted permanently");
    } catch {
      showToast("Failed to delete announcement", "error");
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isPinned: announcement.isPinned,
    });
    setEditAttachmentFile(null);
  };
  const closeEdit = () => { setEditingAnnouncement(null); setEditForm(EMPTY_FORM); setEditAttachmentFile(null); };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", editForm.title);
      formData.append("content", editForm.content);
      formData.append("type", editForm.type);
      if (editAttachmentFile) formData.append("attachment", editAttachmentFile);
      await api.put(`/admin/announcements/${editingAnnouncement.id}`, formData);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === editingAnnouncement.id
            ? {
                ...a,
                title: editForm.title,
                content: editForm.content,
                type: editForm.type,
                isCrossCollege: false,
                ...(editAttachmentFile
                  ? { hasAttachment: true, attachmentMimeType: editAttachmentFile.type }
                  : {}),
              }
            : a,
        ),
      );
      showToast("Announcement updated successfully");
      closeEdit();
    } catch {
      showToast("Failed to update announcement", "error");
    }
  };

  const closeCreate = () => { setIsCreating(false); setCreateForm(EMPTY_FORM); setCreateAttachmentFile(null); };

  const saveCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", createForm.title);
      formData.append("content", createForm.content);
      formData.append("type", createForm.type);
      formData.append("isPinned", createForm.isPinned);
      if (createAttachmentFile) formData.append("attachment", createAttachmentFile);
      const { data } = await api.post("/admin/announcements", formData);
      setAnnouncements((prev) => [data.announcement, ...prev]);
      showToast("Announcement created successfully");
      closeCreate();
    } catch {
      showToast("Failed to create announcement", "error");
    }
  };

  const list = getFiltered(activeTab);

  return (
    <AdminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
      overlay={
        <>
          {/* Toasts */}
          <div className="ann-toast-stack">
            {toasts.map((t) => (
              <div key={t.id} className={`ann-toast ${t.kind === "error" ? "ann-toast-error" : ""}`}>
                {t.message}
              </div>
            ))}
          </div>

          <ChatWidget
            initialGreeting="Hello! 👋 I'm your OAMS Assistant. Ask me about announcements, pinning, or filters."
            getBotResponse={generateBotResponse}
          />

          {/* View Modal */}
          {viewingAnnouncement && (
            <div className="ann-modal-overlay">
              <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ann-modal-header">
                  <div>
                    <h3 className="ann-modal-title"><EyeIcon /> Announcement Details</h3>
                    <p className="ann-modal-desc">View complete information about this announcement</p>
                  </div>
                  <button className="ann-modal-close" onClick={() => setViewingAnnouncement(null)} aria-label="Close">
                    <XIcon />
                  </button>
                </div>

                <div className="ann-view-banner">
                  <div>
                    <h2>{viewingAnnouncement.title}</h2>
                    <div className="ann-view-banner-date"><CalendarIcon />{formatDate(viewingAnnouncement.date)}</div>
                  </div>
                  <div className="ann-view-banner-badges">
                    <span className={`ann-badge ${TYPE_META[viewingAnnouncement.type].badgeClass}`}>
                      {TYPE_META[viewingAnnouncement.type].label}
                    </span>
                    {viewingAnnouncement.isPinned && (
                      <span className="ann-pinned-pill"><PinIcon /> Pinned</span>
                    )}
                    {viewingAnnouncement.isCrossCollege && (
                      <span className="ann-badge ann-badge-cross-college">Cross-College</span>
                    )}
                  </div>
                </div>

                <p className="ann-view-label">Content</p>
                <div className="ann-view-block"><p>{viewingAnnouncement.content}</p></div>

                {viewingAnnouncement.hasAttachment && (
                  <div className="ann-attachment-view">
                    <p className="ann-view-label">Attachment</p>
                    {viewAttachmentUrl ? (
                      viewingAnnouncement.attachmentMimeType?.startsWith("image/") ? (
                        <img src={viewAttachmentUrl} alt="Announcement attachment" className="ann-attachment-image" />
                      ) : (
                        <button
                          type="button"
                          className="ann-btn-secondary"
                          onClick={() => window.open(viewAttachmentUrl, "_blank")}
                        >
                          <FileIcon /> View Attachment
                        </button>
                      )
                    ) : (
                      <p className="ann-view-value">Loading attachment…</p>
                    )}
                  </div>
                )}

                <div className="ann-view-grid">
                  <div>
                    <p className="ann-view-label">Created By</p>
                    <p className="ann-view-value">{viewingAnnouncement.createdBy || "Admin Office"}</p>
                  </div>
                  <div>
                    <p className="ann-view-label">Status</p>
                    <p className="ann-view-value">
                      <span className={`ann-status-pill ${viewingAnnouncement.status === "active" ? "ann-status-active" : "ann-status-archived"}`}>
                        {viewingAnnouncement.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="ann-view-label">Published Date</p>
                    <p className="ann-view-value">{formatDate(viewingAnnouncement.date)}</p>
                  </div>
                </div>

                <div className="ann-modal-footer">
                  <button className="ann-btn-secondary" onClick={() => { const a = viewingAnnouncement; setViewingAnnouncement(null); openEdit(a); }}>
                    Edit Announcement
                  </button>
                  <button className="ann-btn-primary" onClick={() => setViewingAnnouncement(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editingAnnouncement && (
            <div className="ann-modal-overlay">
              <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ann-modal-header">
                  <div>
                    <h3 className="ann-modal-title">Edit Announcement</h3>
                    <p className="ann-modal-desc">Make changes and save when you're done.</p>
                  </div>
                  <button className="ann-modal-close" onClick={closeEdit} aria-label="Close"><XIcon /></button>
                </div>

                <div className="ann-field">
                  <label htmlFor="edit-title">Title *</label>
                  <input id="edit-title" className="ann-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="ann-field">
                  <label htmlFor="edit-content">Content *</label>
                  <textarea id="edit-content" className="ann-textarea" value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} />
                </div>
                <div className="ann-field-row">
                  <div className="ann-field">
                    <label htmlFor="edit-type">Type *</label>
                    <select id="edit-type" className="ann-select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                      <option value="general">General</option>
                      <option value="important">Important</option>
                      <option value="event">Event</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                </div>

                <div className="ann-field">
                  <label htmlFor="edit-attachment">Attachment (optional)</label>
                  {!editAttachmentFile && editExistingAttachmentUrl && (
                    <div className="ann-attachment-preview">
                      {editingAnnouncement.attachmentMimeType?.startsWith("image/") ? (
                        <img src={editExistingAttachmentUrl} alt="Current attachment" className="ann-attachment-thumb" />
                      ) : (
                        <span className="ann-attachment-filename"><FileIcon /> Current attachment (PDF)</span>
                      )}
                      <span className="ann-attachment-hint">Choose a new file below to replace it</span>
                    </div>
                  )}
                  <input
                    id="edit-attachment"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="ann-file-input"
                    onChange={(e) => setEditAttachmentFile(e.target.files[0] || null)}
                  />
                  {editAttachmentFile && (
                    <div className="ann-attachment-preview">
                      {editPreviewUrl ? (
                        <img src={editPreviewUrl} alt="New attachment preview" className="ann-attachment-thumb" />
                      ) : (
                        <span className="ann-attachment-filename"><FileIcon /> {editAttachmentFile.name}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="ann-modal-footer">
                  <button className="ann-btn-secondary" onClick={closeEdit}>Cancel</button>
                  <button className="ann-btn-primary" onClick={saveEdit}><CheckCircleIcon /> Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* Create Modal */}
          {isCreating && (
            <div className="ann-modal-overlay">
              <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ann-modal-header">
                  <div>
                    <h3 className="ann-modal-title"><PlusIconSmall /> New Announcement</h3>
                    <p className="ann-modal-desc">Create a new announcement for your department.</p>
                  </div>
                  <button className="ann-modal-close" onClick={closeCreate} aria-label="Close"><XIcon /></button>
                </div>

                <div className="ann-field">
                  <label htmlFor="create-title">Title *</label>
                  <input id="create-title" className="ann-input" placeholder="Enter announcement title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
                </div>
                <div className="ann-field">
                  <label htmlFor="create-content">Content *</label>
                  <textarea id="create-content" className="ann-textarea" placeholder="Enter announcement content" value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} />
                </div>
                <div className="ann-field-row">
                  <div className="ann-field">
                    <label htmlFor="create-type">Type *</label>
                    <select id="create-type" className="ann-select" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                      <option value="general">General</option>
                      <option value="important">Important</option>
                      <option value="event">Event</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                  <div className="ann-field">
                    <label htmlFor="create-pinned">Pin Announcement</label>
                    <select id="create-pinned" className="ann-select" value={createForm.isPinned ? "true" : "false"} onChange={(e) => setCreateForm({ ...createForm, isPinned: e.target.value === "true" })}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="ann-field">
                  <label htmlFor="create-attachment">Attachment (optional)</label>
                  <input
                    id="create-attachment"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="ann-file-input"
                    onChange={(e) => setCreateAttachmentFile(e.target.files[0] || null)}
                  />
                  {createAttachmentFile && (
                    <div className="ann-attachment-preview">
                      {createPreviewUrl ? (
                        <img src={createPreviewUrl} alt="Attachment preview" className="ann-attachment-thumb" />
                      ) : (
                        <span className="ann-attachment-filename"><FileIcon /> {createAttachmentFile.name}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="ann-modal-footer">
                  <button className="ann-btn-secondary" onClick={closeCreate}>Cancel</button>
                  <button className="ann-btn-primary" onClick={saveCreate}><CheckCircleIcon /> Save Announcement</button>
                </div>
              </div>
            </div>
          )}

          <ActionConfirmModal
            show={deleteId !== null}
            onCancel={() => setDeleteId(null)}
            onConfirm={() => handleDelete(deleteId)}
            title="Delete Announcement?"
            message="Delete this announcement permanently? This can't be undone."
            confirmText="Delete"
          />
        </>
      }
    >
        <div className="ann-page">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<MegaphoneIcon />}
            iconClassName="ann-title-icon"
            title="Announcements Management"
            subtitle={`Manage announcements for ${user?.college || "your department"}`}
            headerClassName="ann-header-row"
            breadcrumbClassName="prof-breadcrumb"
            titleSectionClassName="ann-title-section"
            titleClassName="ann-page-title"
            subtitleClassName="ann-page-subtitle"
          />

          <button className="ann-btn-new" onClick={() => setIsCreating(true)}>
            <PlusIconSmall />
            New Announcement
          </button>

          {/* Stats */}
          <div className="ann-stats-grid">
            <div className="ann-stat-card ann-stat-total">
              <div><p className="ann-stat-label">Total Active</p><p className="ann-stat-value">{stats.total}</p></div>
              <MegaphoneIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-pinned">
              <div><p className="ann-stat-label">Pinned</p><p className="ann-stat-value">{stats.pinned}</p></div>
              <PinIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-important">
              <div><p className="ann-stat-label">Important</p><p className="ann-stat-value">{stats.important}</p></div>
              <AlertCircleIcon className="ann-stat-icon" />
            </div>
            <div className="ann-stat-card ann-stat-archived">
              <div><p className="ann-stat-label">Archived</p><p className="ann-stat-value">{stats.archived}</p></div>
              <XIcon className="ann-stat-icon" />
            </div>
          </div>

          {/* Filters */}
          <div className="ann-filters-card">
            <div className="ann-search-wrap">
              <SearchIcon className="ann-search-icon" />
              <input
                className="ann-search-input"
                placeholder="Search announcements by title, content, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="ann-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="important">Important</option>
              <option value="event">Events</option>
              <option value="reminder">Reminders</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* List */}
          <div className="ann-list-card">
            <div className="ann-list-header">
              <h2>Announcements — {user?.college || "Your Department"}</h2>
              <p>View and manage your department's announcements</p>
            </div>

            <div className="ann-tabs">
              <button className={`ann-tab ${activeTab === "active" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("active")}>
                Active
              </button>
              <button className={`ann-tab ${activeTab === "pinned" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("pinned")}>
                Pinned
              </button>
              <button className={`ann-tab ${activeTab === "unpinned" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("unpinned")}>
                Unpinned
              </button>
              <button className={`ann-tab ${activeTab === "archived" ? "ann-tab-active" : ""}`} onClick={() => setActiveTab("archived")}>
                Archived
              </button>
            </div>

            {isLoading ? (
              <div className="ann-loading">
                <div className="ann-loading-spinner" />
                <p>Loading announcements…</p>
              </div>
            ) : (
              <div className="ann-items">
                {list.length === 0 ? (
                  <div className="ann-empty">
                    <MegaphoneIcon />
                    <p>No {activeTab} announcements found.</p>
                  </div>
                ) : (
                  list.map((a) => {
                    const meta = TYPE_META[a.type] || TYPE_META.general;
                    const TypeIcon = meta.icon;
                    return (
                      <div key={a.id} className={`ann-item ${a.isPinned ? "ann-item-pinned" : ""}`}>
                        <div className={`ann-item-icon ${meta.iconClass}`}>
                          <TypeIcon />
                        </div>
                        <div className="ann-item-body">
                          <div className="ann-item-top">
                            <div className="ann-item-title-row">
                              <h3 className="ann-item-title">{a.title}</h3>
                              {a.isPinned && <PinIcon className="ann-pin-flag" />}
                              {a.hasAttachment && <PaperclipIcon className="ann-attachment-flag" title="Has attachment" />}
                            </div>
                            <span className={`ann-badge ${meta.badgeClass}`}>{meta.label}</span>
                            {a.isCrossCollege && <span className="ann-badge ann-badge-cross-college">Cross-College</span>}
                          </div>
                          <p className="ann-item-desc">{a.content}</p>
                          <div className="ann-item-meta">
                            <span><CalendarIcon />{formatDate(a.date)}</span>
                            <span>•</span>
                            <span>By: {a.createdBy || "Admin Office"}</span>
                          </div>
                          <div className="ann-item-actions">
                            <button className="ann-action-btn" onClick={() => setViewingAnnouncement(a)}>
                              <EyeIcon /> View
                            </button>
                            <button className="ann-action-btn" onClick={() => openEdit(a)}>
                              <img src={editIcon} alt="" /> Edit
                            </button>
                            {a.status === "active" ? (
                              <>
                                <button
                                  className={`ann-action-btn ${a.isPinned ? "ann-action-pin-on" : ""}`}
                                  onClick={() => handleTogglePin(a.id)}
                                >
                                  <PinIcon /> {a.isPinned ? "Unpin" : "Pin"}
                                </button>
                                <button className="ann-action-btn ann-action-archive" onClick={() => handleArchive(a.id)}>
                                  <img src={deleteIcon} alt="" /> Archive
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="ann-action-btn ann-action-restore" onClick={() => handleRestore(a.id)}>
                                  Restore
                                </button>
                                <button className="ann-action-btn ann-action-delete" onClick={() => setDeleteId(a.id)}>
                                  <img src={deleteIcon} alt="" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}
