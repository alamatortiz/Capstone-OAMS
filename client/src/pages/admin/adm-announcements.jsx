import { useState, useEffect } from "react";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
import "./adm-dashboard.css";
import "./adm-announcements.css";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, HelpCircle, Megaphone } from "lucide-react";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import api from "../../utils/api";
import { formatManilaDateTime } from "../../utils/dateTime";

// ── Page-only icons ───────────────────────────────────────────────────────────
const PlusIconSmall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
// Shared megaphone icon — the same lucide `Megaphone` the student/professor
// announcement screens use. Kept as a props-forwarding wrapper so callers can
// still pass `className`/`style` through to the underlying <svg>.
const MegaphoneIcon = (props) => <Megaphone {...props} />;
const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
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
// Create form only -- audience is locked in at creation, so the Edit form
// (which reuses EMPTY_FORM) never carries it.
const EMPTY_CREATE_FORM = { ...EMPTY_FORM, audience: "students" };

// Source toggle above the list (mirrors adm-document-processing.jsx's
// Students/Faculty toggle) -- switches which entire audience is visible.
const AUDIENCE_VIEWS = [
  { id: "students", label: "Students" },
  { id: "faculty", label: "Faculty" },
];

// Type filter options (students audience only -- faculty announcements have no
// category). Fed to the shared <FilterSelect>.
const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "important", label: "Important" },
  { value: "event", label: "Events" },
  { value: "reminder", label: "Reminders" },
  { value: "general", label: "General" },
];

// Mirrors the server's limits (server/middleware/upload.js) -- purely
// advisory here for the running-total UI, the server stays authoritative.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

// Single line whose label reflects whether this announcement has ever been
// edited/restored (isReposted, set server-side) -- "Posted" the first time,
// "Reposted" from then on.
const formatPostedLabel = (announcement) => {
  const label = announcement.isReposted ? "Reposted" : "Posted";
  try {
    return `${label}: ${formatManilaDateTime(announcement.date, { month: "long" })}`;
  } catch {
    return `${label}: ${announcement.date}`;
  }
};

export default function AdminAnnouncements() {
  // ── Announcements state ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [audienceView, setAudienceView] = useState("students");
  const [activeTab, setActiveTab] = useState("active");

  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [deleteId, setDeleteId] = useState(null);

  // ── Attachments (up to MAX_FILES per announcement, each ≤ MAX_FILE_BYTES) ──
  const [createFiles, setCreateFiles] = useState([]); // { id, file }[] queued for the Create modal
  const [editFiles, setEditFiles] = useState([]); // { id, file }[] queued to add to editingAnnouncement.attachments

  const [toasts, setToasts] = useState([]);
  const showToast = (message, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // Fetches one attachment's bytes on demand and opens/downloads it -- used
  // by both the View modal and the Edit modal's existing-attachments list.
  const openAttachment = async (announcementId, attachment) => {
    try {
      const res = await api.get(
        `/admin/announcements/${announcementId}/attachments/${attachment.id}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      if (attachment.mimeType?.startsWith("image/") || attachment.mimeType === "application/pdf") {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.filename;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      showToast("Failed to load attachment", "error");
    }
  };

  const removeExistingAttachment = async (announcementId, attachmentId) => {
    try {
      await api.delete(`/admin/announcements/${announcementId}/attachments/${attachmentId}`);
      const strip = (list) => (list || []).filter((att) => att.id !== attachmentId);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, attachments: strip(a.attachments) } : a)),
      );
      setEditingAnnouncement((prev) =>
        prev && prev.id === announcementId ? { ...prev, attachments: strip(prev.attachments) } : prev,
      );
      setViewingAnnouncement((prev) =>
        prev && prev.id === announcementId ? { ...prev, attachments: strip(prev.attachments) } : prev,
      );
      showToast("Attachment removed");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to remove attachment", "error");
    }
  };

  // Accepts as many of the newly-picked files as still fit under MAX_FILES /
  // MAX_TOTAL_BYTES (given what's already saved + already queued), rejecting
  // anything individually over MAX_FILE_BYTES outright -- and reports back
  // how many were skipped and why, so the caller can toast immediately
  // instead of only failing at Save.
  const queueFiles = (fileList, existingQueued, existingSavedCount, existingSavedBytes, setQueued) => {
    const incoming = Array.from(fileList || []);
    const accepted = [];
    let count = existingSavedCount + existingQueued.length;
    let bytes = existingSavedBytes + existingQueued.reduce((sum, f) => sum + f.file.size, 0);
    let tooLarge = 0;
    let overBudget = 0;
    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        tooLarge += 1;
        continue;
      }
      if (count + 1 > MAX_FILES || bytes + file.size > MAX_TOTAL_BYTES) {
        overBudget += 1;
        continue;
      }
      accepted.push({ id: Date.now() + Math.random(), file });
      count += 1;
      bytes += file.size;
    }
    if (accepted.length > 0) setQueued((prev) => [...prev, ...accepted]);
    if (tooLarge > 0) {
      showToast(`${tooLarge} file(s) skipped — each file must be ${formatBytes(MAX_FILE_BYTES)} or smaller`, "error");
    }
    if (overBudget > 0) {
      showToast(`${overBudget} file(s) skipped — attachment limit reached`, "error");
    }
  };

  const addCreateFiles = (fileList) => queueFiles(fileList, createFiles, 0, 0, setCreateFiles);
  const removeCreateFile = (id) => setCreateFiles((prev) => prev.filter((f) => f.id !== id));
  const addEditFiles = (fileList) => {
    const existingAttachments = editingAnnouncement?.attachments || [];
    const existingBytes = existingAttachments.reduce((sum, a) => sum + (a.size || 0), 0);
    queueFiles(fileList, editFiles, existingAttachments.length, existingBytes, setEditFiles);
  };
  const removeEditFile = (id) => setEditFiles((prev) => prev.filter((f) => f.id !== id));

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

  // Mirrors adm-document-processing.jsx's source-switch handler -- switching
  // audience swaps the entire visible dataset, so the type filter and search
  // reset since they scoped the previous audience's content.
  const handleAudienceViewChange = (id) => {
    setAudienceView(id);
    setSelectedType("all");
    setSearchQuery("");
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  // The audience toggle swaps the entire visible dataset -- stats included --
  // matching adm-document-processing.jsx's full-dataset-swap semantics.
  const audienceScoped = announcements.filter((a) => a.audience === audienceView);

  const stats = {
    total:     audienceScoped.filter((a) => a.status === "active").length,
    pinned:    audienceScoped.filter((a) => a.isPinned && a.status === "active").length,
    important: audienceScoped.filter((a) => a.type === "important" && a.status === "active").length,
    archived:  audienceScoped.filter((a) => a.status === "archived").length,
  };

  const getFiltered = (tab) => {
    let list = audienceScoped.filter((a) => {
      if (tab === "archived") return a.status === "archived";
      if (tab === "pinned") return a.status === "active" && a.isPinned;
      if (tab === "unpinned") return a.status === "active" && !a.isPinned;
      return a.status === "active";
    });
    if (audienceView === "students" && selectedType !== "all") list = list.filter((a) => a.type === selectedType);
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
      const { data } = await api.patch(`/admin/announcements/${id}/restore`);
      // Restoring counts as a repost too -- same resurface-to-front
      // treatment as saveEdit, for the same reason.
      setAnnouncements((prev) => {
        const restored = { ...prev.find((a) => a.id === id), status: "active", date: data.date, isReposted: data.isReposted };
        return [restored, ...prev.filter((a) => a.id !== id)];
      });
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
    setEditFiles([]);
  };
  const closeEdit = () => { setEditingAnnouncement(null); setEditForm(EMPTY_FORM); setEditFiles([]); };

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
      editFiles.forEach((f) => formData.append("attachments", f.file));
      const { data } = await api.put(`/admin/announcements/${editingAnnouncement.id}`, formData);
      // An edit is a repost -- move the edited item to the front of the
      // array (getFiltered's stable pinned-sort still correctly keeps any
      // actually-pinned items above it) instead of patching it in place, so
      // it visibly resurfaces the same way the server's own updated_at-based
      // ordering would show it on a fresh fetch.
      setAnnouncements((prev) => {
        const updated = {
          ...prev.find((a) => a.id === editingAnnouncement.id),
          title: editForm.title,
          content: editForm.content,
          type: editForm.type,
          date: data.date,
          isReposted: data.isReposted,
          attachments: data.attachments,
        };
        return [updated, ...prev.filter((a) => a.id !== editingAnnouncement.id)];
      });
      showToast("Announcement updated successfully");
      closeEdit();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update announcement", "error");
    }
  };

  const closeCreate = () => { setIsCreating(false); setCreateForm(EMPTY_CREATE_FORM); setCreateFiles([]); };

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
      formData.append("audience", createForm.audience);
      createFiles.forEach((f) => formData.append("attachments", f.file));
      const { data } = await api.post("/admin/announcements", formData);
      setAnnouncements((prev) => [data.announcement, ...prev]);
      showToast("Announcement created successfully");
      closeCreate();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create announcement", "error");
    }
  };

  const list = getFiltered(activeTab);

  const createTotalBytes = createFiles.reduce((sum, f) => sum + f.file.size, 0);
  const createAtLimit = createFiles.length >= MAX_FILES || createTotalBytes >= MAX_TOTAL_BYTES;

  const editExistingAttachments = editingAnnouncement?.attachments || [];
  const editExistingBytes = editExistingAttachments.reduce((sum, a) => sum + (a.size || 0), 0);
  const editNewBytes = editFiles.reduce((sum, f) => sum + f.file.size, 0);
  const editTotalCount = editExistingAttachments.length + editFiles.length;
  const editTotalBytes = editExistingBytes + editNewBytes;
  const editAtLimit = editTotalCount >= MAX_FILES || editTotalBytes >= MAX_TOTAL_BYTES;

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
                    <div className="ann-view-banner-date"><CalendarIcon />{formatPostedLabel(viewingAnnouncement)}</div>
                  </div>
                  <div className="ann-view-banner-badges">
                    {viewingAnnouncement.audience === "students" && (
                      <span className={`ann-badge ${viewingAnnouncement.isPinned ? "ann-badge-pinned" : TYPE_META[viewingAnnouncement.type].badgeClass}`}>
                        {TYPE_META[viewingAnnouncement.type].label}
                      </span>
                    )}
                    {viewingAnnouncement.isPinned && (
                      <span className="ann-pinned-pill"><PinIcon /> Pinned</span>
                    )}
                  </div>
                </div>

                <p className="ann-view-label">Content</p>
                <div className="ann-view-block"><p>{viewingAnnouncement.content}</p></div>

                {viewingAnnouncement.attachments?.length > 0 && (
                  <div className="ann-attachment-view">
                    <p className="ann-view-label">Attachments ({viewingAnnouncement.attachments.length})</p>
                    <div className="ann-attachment-list">
                      {viewingAnnouncement.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          className="ann-btn-secondary"
                          onClick={() => openAttachment(viewingAnnouncement.id, att)}
                        >
                          <FileIcon /> {att.filename}
                        </button>
                      ))}
                    </div>
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
                {editingAnnouncement?.audience !== "faculty" && (
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
                )}

                <div className="ann-field">
                  <label htmlFor="edit-attachment">
                    Attachments{" "}
                    <span className="ann-attachment-budget">
                      ({editTotalCount}/{MAX_FILES} files, {formatBytes(editTotalBytes)}/{formatBytes(MAX_TOTAL_BYTES)})
                    </span>
                  </label>
                  <p className="ann-attachment-hint">Each file up to {formatBytes(MAX_FILE_BYTES)}.</p>

                  {editExistingAttachments.length > 0 && (
                    <div className="ann-attachment-list">
                      {editExistingAttachments.map((att) => (
                        <div key={att.id} className="ann-attachment-chip">
                          <button
                            type="button"
                            className="ann-attachment-filename"
                            onClick={() => openAttachment(editingAnnouncement.id, att)}
                          >
                            <FileIcon /> {att.filename}
                          </button>
                          <button
                            type="button"
                            className="ann-attachment-remove"
                            aria-label={`Remove ${att.filename}`}
                            onClick={() => removeExistingAttachment(editingAnnouncement.id, att.id)}
                          >
                            <XIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {editFiles.length > 0 && (
                    <div className="ann-attachment-list">
                      {editFiles.map((f) => (
                        <div key={f.id} className="ann-attachment-chip">
                          <span className="ann-attachment-filename"><FileIcon /> {f.file.name}</span>
                          <button
                            type="button"
                            className="ann-attachment-remove"
                            aria-label={`Remove ${f.file.name}`}
                            onClick={() => removeEditFile(f.id)}
                          >
                            <XIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    id="edit-attachment"
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    className="ann-file-input"
                    disabled={editAtLimit}
                    onChange={(e) => { addEditFiles(e.target.files); e.target.value = ""; }}
                  />
                  {editAtLimit && <span className="ann-attachment-hint">Attachment limit reached</span>}
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
                <div className="ann-field">
                  <label htmlFor="create-audience">Audience *</label>
                  <select
                    id="create-audience"
                    className="ann-select"
                    value={createForm.audience}
                    onChange={(e) => {
                      const audience = e.target.value;
                      // Faculty announcements have no real category -- clear
                      // it locally too so the form doesn't show a stale type
                      // selection the server would silently override anyway.
                      setCreateForm({ ...createForm, audience, type: audience === "faculty" ? "general" : createForm.type });
                    }}
                  >
                    <option value="students">Students</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                <div className="ann-field-row">
                  {createForm.audience === "students" && (
                    <div className="ann-field">
                      <label htmlFor="create-type">Type *</label>
                      <select id="create-type" className="ann-select" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                        <option value="general">General</option>
                        <option value="important">Important</option>
                        <option value="event">Event</option>
                        <option value="reminder">Reminder</option>
                      </select>
                    </div>
                  )}
                  <div className="ann-field">
                    <label htmlFor="create-pinned">Pin Announcement</label>
                    <select id="create-pinned" className="ann-select" value={createForm.isPinned ? "true" : "false"} onChange={(e) => setCreateForm({ ...createForm, isPinned: e.target.value === "true" })}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="ann-field">
                  <label htmlFor="create-attachment">
                    Attachments (optional){" "}
                    <span className="ann-attachment-budget">
                      ({createFiles.length}/{MAX_FILES} files, {formatBytes(createTotalBytes)}/{formatBytes(MAX_TOTAL_BYTES)})
                    </span>
                  </label>
                  <p className="ann-attachment-hint">Each file up to {formatBytes(MAX_FILE_BYTES)}.</p>

                  {createFiles.length > 0 && (
                    <div className="ann-attachment-list">
                      {createFiles.map((f) => (
                        <div key={f.id} className="ann-attachment-chip">
                          <span className="ann-attachment-filename"><FileIcon /> {f.file.name}</span>
                          <button
                            type="button"
                            className="ann-attachment-remove"
                            aria-label={`Remove ${f.file.name}`}
                            onClick={() => removeCreateFile(f.id)}
                          >
                            <XIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    id="create-attachment"
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    className="ann-file-input"
                    disabled={createAtLimit}
                    onChange={(e) => { addCreateFiles(e.target.files); e.target.value = ""; }}
                  />
                  {createAtLimit && <span className="ann-attachment-hint">Attachment limit reached</span>}
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
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<MegaphoneIcon />}
            iconClassName="ann-title-icon"
            title="Announcements and FAQs Management"
            subtitle="Manage department announcements and frequently asked questions."
            headerClassName="ann-header-row"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="ann-title-section"
            titleClassName="ann-page-title"
            subtitleClassName="ann-page-subtitle"
          />

          <div className="ann-header-actions">
            <button
              className="ann-btn-new"
              onClick={() => { setCreateForm({ ...EMPTY_CREATE_FORM, audience: audienceView }); setIsCreating(true); }}
            >
              <PlusIconSmall />
              New Announcement
            </button>
          </div>

          {/* FAQs management entry -- full card button (green; mirrors the
              stud-appointments ab-prof-sched-card) */}
          <Link to="/admin/faqs" className="ann-faqs-card">
            <div className="ann-faqs-card-icon">
              <HelpCircle />
            </div>
            <div className="ann-faqs-card-text">
              <span className="ann-faqs-card-title">Manage FAQs</span>
              <span className="ann-faqs-card-subtitle">
                Add and edit your department's frequently asked questions.
              </span>
            </div>
            <ChevronRight className="ann-faqs-card-chevron" />
          </Link>

          {/* Source toggle */}
          <div className="ann-source-toggle">
            {AUDIENCE_VIEWS.map((v) => (
              <button
                key={v.id}
                className={`ann-source-btn ${audienceView === v.id ? "ann-source-btn-active" : ""}`}
                onClick={() => handleAudienceViewChange(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="ann-stats-grid">
            <div className="ann-stat-card">
              <div className="ann-stat-icon-box"><MegaphoneIcon /></div>
              <p className="ann-stat-label">Total Active</p>
              <p className="ann-stat-value">{stats.total}</p>
            </div>
            <div className="ann-stat-card">
              <div className="ann-stat-icon-box"><PinIcon /></div>
              <p className="ann-stat-label">Pinned</p>
              <p className="ann-stat-value">{stats.pinned}</p>
            </div>
            <div className="ann-stat-card">
              <div className="ann-stat-icon-box"><AlertCircleIcon /></div>
              <p className="ann-stat-label">Important</p>
              <p className="ann-stat-value">{stats.important}</p>
            </div>
            <div className="ann-stat-card">
              <div className="ann-stat-icon-box"><XIcon /></div>
              <p className="ann-stat-label">Archived</p>
              <p className="ann-stat-value">{stats.archived}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <div className="filters-header">
              <div className="filters-header-text">
                <h3 className="filters-title">Announcement Filter</h3>
                <p className="filters-description">
                  Search and filter department announcements.
                </p>
              </div>
            </div>
            <div className="filters-search-row">
              <div className="filter-group">
                <label className="filter-label" htmlFor="ann-search">Search</label>
                <div className="filter-search-wrapper">
                  <SearchIcon />
                  <input
                    id="ann-search"
                    type="text"
                    className="filter-search-input"
                    placeholder="Search by title, content, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {audienceView === "students" && (
              <div className="filters-grid">
                <FilterSelect
                  id="ann-filter-type"
                  label="Type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  options={TYPE_FILTER_OPTIONS}
                  chevronIcon={<ChevronDownIcon className="filter-chevron" />}
                />
              </div>
            )}
          </div>

          {/* List */}
          <div className="ann-list">
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
                    const typeMeta = TYPE_META[a.type] || TYPE_META.general;
                    const meta = a.isPinned
                      ? { ...typeMeta, iconClass: "ann-icon-pinned", badgeClass: "ann-badge-pinned" }
                      : typeMeta;
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
                              {a.attachments?.length > 0 && <PaperclipIcon className="ann-attachment-flag" title="Has attachment" />}
                            </div>
                            {audienceView === "students" && (
                              <span className={`ann-badge ${meta.badgeClass}`}>{meta.label}</span>
                            )}
                          </div>
                          <p className="ann-item-desc">{a.content}</p>
                          <div className="ann-item-meta">
                            <span><CalendarIcon />{formatPostedLabel(a)}</span>
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
