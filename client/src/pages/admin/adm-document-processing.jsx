import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-document-processing.css";
import api from "../../utils/api";
import { toast } from "sonner";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { connectSocket } from "../../utils/socket";
import { formatManilaDate, getManilaDateString } from "../../utils/dateTime";

// ── Icons ─────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const FileTextIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
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
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const SOURCES = [
  { id: "student", label: "Students", endpoint: "document-processing" },
  { id: "faculty", label: "Faculty", endpoint: "faculty-document-processing" },
];

export default function AdminDocumentProcessing() {
  // ── Document processing state ─────────────────────────────────────────────
  const [source, setSource] = useState("student");
  const [documents, setDocuments] = useState([]);
  // Starts true (not false) so the very first load still shows a loading
  // state -- fetchDocuments itself no longer re-arms this on later calls.
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  // Default to "all" since This Week/Next Week/This Month all hide requests
  // with no deadline set — admins can narrow down once deadlines are in use.
  const [weekFilter, setWeekFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  useLockBodyScroll(showDetailsModal);
  const [processingNotes, setProcessingNotes] = useState("");
  const [officialCode, setOfficialCode] = useState("");

  // ── Status-change confirmation ───────────────────────────────────────────
  const [confirmStatus, setConfirmStatus] = useState(null); // target status or null
  const [confirmSaving, setConfirmSaving] = useState(false);

  const sourceEndpoint = SOURCES.find((s) => s.id === source).endpoint;

  // ── Effects ───────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get(`/admin/${sourceEndpoint}`);
      setDocuments(res.data.documents ?? []);
    } catch (err) {
      toast.error("Failed to load document requests");
    } finally {
      setLoading(false);
    }
  }, [sourceEndpoint]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Live updates: refetch when a student submits/cancels a document request ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = ["document:new-request", "document:cancelled"];
    events.forEach((event) => socket.on(event, fetchDocuments));

    return () => {
      events.forEach((event) => socket.off(event, fetchDocuments));
    };
  }, [fetchDocuments]);

  // ── Deadline buckets ──────────────────────────────────────────────────────
  // Monday-anchored this-week/next-week windows (same pattern as
  // stud-appointments.jsx) plus a full-current-month window, applied to the
  // requester-set "Needed By" deadline rather than the request date.
  const weekDates = useMemo(() => {
    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const [y, m, d] = getManilaDateString().split("-").map(Number);
    const today = new Date(y, m - 1, d);
    const dow = today.getDay(); // 0=Sun..6=Sat
    const monday = new Date(today);
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const buildWeek = (weekOffset) => Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(dt.getDate() + weekOffset * 7 + i);
      return toDateStr(dt);
    });
    const daysInMonth = new Date(y, m, 0).getDate();
    const thisMonth = Array.from({ length: daysInMonth }, (_, i) => toDateStr(new Date(y, m - 1, i + 1)));
    return { thisWeekStart: toDateStr(monday), thisWeek: buildWeek(0), nextWeek: buildWeek(1), thisMonth };
  }, []);

  const deadlineLabel = (dateString) => {
    if (!dateString) return null;
    if (weekDates.thisWeek.includes(dateString)) return "This Week";
    if (weekDates.nextWeek.includes(dateString)) return "Next Week";
    if (weekDates.thisMonth.includes(dateString)) return "This Month";
    return null;
  };

  // ── Derived values ────────────────────────────────────────────────────────
  // Search applied first so tab counts reflect the current search context.
  const searchFiltered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.trackingNumber.toLowerCase().includes(q) ||
      doc.requesterName.toLowerCase().includes(q) ||
      doc.requesterIdValue.toLowerCase().includes(q)
    );
  });

  const baseFiltered = searchFiltered.filter((doc) => {
    if (weekFilter === "all") return true;
    if (!doc.neededBy) return false;
    if (weekFilter === "this-week") return weekDates.thisWeek.includes(doc.neededBy);
    if (weekFilter === "next-week") return weekDates.nextWeek.includes(doc.neededBy);
    if (weekFilter === "this-month") return weekDates.thisMonth.includes(doc.neededBy);
    return true;
  });

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleViewDetails = (doc) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes || "");
    setOfficialCode(doc.officialCode || "");
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedDocument) return;
    const needsCode = newStatus === "ready" && selectedDocument.requiresCoding;
    try {
      await api.patch(`/admin/${sourceEndpoint}/${selectedDocument.id}/status`, {
        status: newStatus,
        notes: processingNotes,
        ...(needsCode ? { officialCode } : {}),
      });
      toast.success(`Document marked as ${newStatus}`);
      setShowDetailsModal(false);
      setSelectedDocument(null);
      setProcessingNotes("");
      setOfficialCode("");
      await fetchDocuments();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update document status");
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedDocument(null);
    setProcessingNotes("");
    setOfficialCode("");
  };

  // "Mark as Ready" needs a non-blank official code first when the document
  // type requires coding -- caught here before opening the generic confirm
  // dialog, which has no room for inline field validation.
  const handleMarkReadyClick = () => {
    if (selectedDocument?.requiresCoding && !officialCode.trim()) {
      toast.error("Enter the official code before marking this document ready.");
      return;
    }
    setConfirmStatus("ready");
  };

  const runConfirmStatusChange = async () => {
    if (!confirmStatus) return;
    setConfirmSaving(true);
    await handleUpdateStatus(confirmStatus);
    setConfirmSaving(false);
    setConfirmStatus(null);
  };

  const DOC_CONFIRM_META = selectedDocument && {
    processing: {
      title: "Start Processing?",
      message: <>Start processing the <strong>{selectedDocument.documentType}</strong> request for <strong>{selectedDocument.requesterName}</strong>?</>,
      confirmText: "Start Processing",
      icon: <ClockIcon />,
      variant: "success",
    },
    ready: {
      title: "Mark as Ready?",
      message: <>Mark the <strong>{selectedDocument.documentType}</strong> request for <strong>{selectedDocument.requesterName}</strong> as ready for pickup?</>,
      confirmText: "Mark as Ready",
      icon: <CheckCircleIcon />,
      variant: "success",
    },
    rejected: {
      title: "Reject Request?",
      message: <>Reject the <strong>{selectedDocument.documentType}</strong> request from <strong>{selectedDocument.requesterName}</strong>? This action cannot be undone.</>,
      confirmText: "Reject Request",
      icon: <XCircleIcon />,
    },
    claimed: {
      title: "Mark as Claimed?",
      message: <>Confirm that the <strong>{selectedDocument.documentType}</strong> request for <strong>{selectedDocument.requesterName}</strong> has been handed to the correct recipient, per office procedure?</>,
      confirmText: "Mark as Claimed",
      icon: <CheckCircleIcon />,
      variant: "success",
    },
  }[confirmStatus];

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":     return { label: "Pending",    cls: "adp-badge-pending",    Icon: AlertCircleIcon };
      case "processing":  return { label: "Processing", cls: "adp-badge-processing", Icon: ClockIcon };
      case "ready":       return { label: "Ready",      cls: "adp-badge-ready",      Icon: CheckCircleIcon };
      case "released":    return { label: "Released",   cls: "adp-badge-released",  Icon: CheckCircleIcon };
      case "claimed":     return { label: "Claimed",    cls: "adp-badge-claimed",   Icon: CheckCircleIcon };
      case "rejected":    return { label: "Rejected",   cls: "adp-badge-rejected",   Icon: XCircleIcon };
      default:            return { label: status,       cls: "",                     Icon: ClockIcon };
    }
  };

  const TABS = ["all", "pending", "processing", "ready", "released", "claimed", "rejected"];

  return (
    <AdminPageShell
      outerClassName="adp-layout"
      mainClassName="adp-main"
      overlay={
        <>
          {/* ── Details Modal ────────────────────────────────────────────────────── */}
          {showDetailsModal && selectedDocument && (
            <div className="adp-modal-backdrop" onClick={handleCloseModal}>
              <div className="adp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="adp-modal-header">
                  <div>
                    <h2 className="adp-modal-title">Document Request Details</h2>
                    <p className="adp-modal-subtitle">Review and process document request</p>
                  </div>
                  <button className="adp-modal-close-btn" onClick={handleCloseModal} aria-label="Close modal">
                    <CloseIcon />
                  </button>
                </div>
                <div className="adp-modal-body">
                  <div className="adp-modal-grid">
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Tracking Number</label>
                      <p className="adp-modal-value">{selectedDocument.trackingNumber}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Status</label>
                      <div className="adp-modal-value">
                        <span className={`adp-status-badge ${getStatusMeta(selectedDocument.status).cls}`}>
                          {getStatusMeta(selectedDocument.status).label}
                        </span>
                      </div>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Name</label>
                      <p className="adp-modal-value">{selectedDocument.requesterName}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">{selectedDocument.requesterIdLabel}</label>
                      <p className="adp-modal-value">{selectedDocument.requesterIdValue}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">College</label>
                      <p className="adp-modal-value">{selectedDocument.college}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Document Type</label>
                      <p className="adp-modal-value">{selectedDocument.documentType}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Number of Copies</label>
                      <p className="adp-modal-value">{selectedDocument.copies ?? 1}</p>
                    </div>
                    {selectedDocument.neededBy && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Needed By</label>
                        <p className="adp-modal-value">{formatManilaDate(selectedDocument.neededBy)}</p>
                      </div>
                    )}
                    <div className="adp-modal-field adp-modal-field--full">
                      <label className="adp-modal-label">Purpose</label>
                      <p className="adp-modal-value">{selectedDocument.purpose}</p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Request Date</label>
                      <p className="adp-modal-value">{formatManilaDate(selectedDocument.requestDate)}</p>
                    </div>
                    {selectedDocument.releasedDate && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Released Date</label>
                        <p className="adp-modal-value">{formatManilaDate(selectedDocument.releasedDate)}</p>
                      </div>
                    )}
                    {selectedDocument.claimedDate && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Claimed Date</label>
                        <p className="adp-modal-value">{formatManilaDate(selectedDocument.claimedDate)}</p>
                      </div>
                    )}
                    {selectedDocument.officialCode && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Official Code</label>
                        <p className="adp-modal-value">{selectedDocument.officialCode}</p>
                      </div>
                    )}
                  </div>

                  {selectedDocument.status === "processing" && selectedDocument.requiresCoding && (
                    <div className="adp-modal-notes-wrap">
                      <label className="adp-modal-label" htmlFor="adp-official-code">
                        Official Code <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        id="adp-official-code"
                        type="text"
                        className="adp-modal-textarea"
                        placeholder="Enter the dean-sanctioned official code for this document"
                        value={officialCode}
                        onChange={(e) => setOfficialCode(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="adp-modal-notes-wrap">
                    <label className="adp-modal-label" htmlFor="adp-notes">Processing Notes</label>
                    <textarea
                      id="adp-notes"
                      className="adp-modal-textarea"
                      placeholder="Add notes about the processing status..."
                      rows={4}
                      value={processingNotes}
                      onChange={(e) => setProcessingNotes(e.target.value)}
                    />
                  </div>

                  <div className="adp-modal-actions">
                    {selectedDocument.status === "pending" && (
                      <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => setConfirmStatus("processing")}>
                        Start Processing
                      </button>
                    )}
                    {selectedDocument.status === "processing" && (
                      <button className="adp-modal-btn adp-modal-btn--success" onClick={handleMarkReadyClick}>
                        Mark as Ready
                      </button>
                    )}
                    {selectedDocument.status === "ready" && (
                      <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => handleUpdateStatus("released")}>
                        Mark as Released
                      </button>
                    )}
                    {selectedDocument.status === "released" && (
                      <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => setConfirmStatus("claimed")}>
                        Mark as Claimed
                      </button>
                    )}
                    {(selectedDocument.status === "pending" || selectedDocument.status === "processing") && (
                      <button className="adp-modal-btn adp-modal-btn--danger" onClick={() => setConfirmStatus("rejected")}>
                        Reject Request
                      </button>
                    )}
                    <button className="adp-modal-btn adp-modal-btn--outline" onClick={handleCloseModal}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Status-change confirmation ─────────────────────────────────────── */}
          <ActionConfirmModal
            show={!!confirmStatus}
            onCancel={() => setConfirmStatus(null)}
            onConfirm={runConfirmStatusChange}
            title={DOC_CONFIRM_META?.title}
            message={DOC_CONFIRM_META?.message}
            icon={DOC_CONFIRM_META?.icon}
            confirmText={confirmSaving ? "Please wait…" : DOC_CONFIRM_META?.confirmText}
            confirmDisabled={confirmSaving}
            variant={DOC_CONFIRM_META?.variant ?? "danger"}
          />
        </>
      }
    >
        <div className="adp-content">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<FileTextIcon className="adp-icon-lg" />}
            iconClassName="adp-title-icon"
            title="Document Processing"
            subtitle="Process and manage document requests"
            headerClassName="adp-page-header"
            breadcrumbClassName="prof-breadcrumb"
            titleSectionClassName="adp-title-section"
            titleClassName="adp-page-title"
            subtitleClassName="adp-page-subtitle"
          />

          {/* Source toggle */}
          <div className="adp-source-toggle">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                className={`adp-source-btn ${source === s.id ? "adp-source-btn-active" : ""}`}
                onClick={() => {
                  setSource(s.id);
                  setActiveTab("all");
                  setSearchQuery("");
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search + Week Filter */}
          <div className="adp-filter-bar">
            <div className="adp-search-wrap">
              <span className="adp-search-icon"><SearchIcon /></span>
              <input
                type="text"
                className="adp-search-input"
                placeholder="Search by tracking number, name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="adp-search-input adp-week-select"
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              aria-label="Filter by needed-by deadline"
            >
              <option value="this-week">This Week</option>
              <option value="next-week">Next Week</option>
              <option value="this-month">This Month</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Category Tabs */}
          <div className="adp-tabs">
            {TABS.map((tab) => {
              const count =
                tab === "all"
                  ? baseFiltered.length
                  : baseFiltered.filter((d) => d.status === tab).length;
              return (
                <button
                  key={tab}
                  className={`adp-tab ${activeTab === tab ? "adp-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="adp-tab-count">{loading ? "—" : count}</span>
                </button>
              );
            })}
          </div>

          {/* Documents List */}
          <div className="adp-documents-list">
            {loading ? (
              <div className="adp-empty-state">
                <p className="adp-empty-desc">Loading document requests...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="adp-empty-state">
                <div className="adp-empty-icon"><FileTextIcon /></div>
                <h3 className="adp-empty-title">No documents found</h3>
                <p className="adp-empty-desc">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const { label, cls, Icon } = getStatusMeta(doc.status);
                const doneStatuses = ["claimed", "rejected"];
                const isOverdue = doc.neededBy && !doneStatuses.includes(doc.status) && doc.neededBy < getManilaDateString();
                return (
                  <div key={doc.id} className="adp-doc-card">
                    <div className="adp-doc-card-inner">
                      <div className="adp-doc-file-icon">
                        <FileTextIcon />
                      </div>
                      <div className="adp-doc-info">
                        <div className="adp-doc-header-row">
                          <div>
                            <div className="adp-doc-name-row">
                              <h3 className="adp-doc-student-name">{doc.requesterName}</h3>
                              <span className="adp-college-badge adp-college-badge--outline">{doc.college}</span>
                            </div>
                            <p className="adp-doc-type">{doc.documentType}</p>
                            <p className="adp-doc-meta">{doc.requesterIdLabel}: {doc.requesterIdValue} • Purpose: {doc.purpose}</p>
                          </div>
                        </div>
                        <div className="adp-doc-tags-row">
                          <span className="adp-tracking-badge">{doc.trackingNumber}</span>
                          <span className={`adp-status-badge ${cls}`}>
                            <Icon />
                            {label}
                          </span>
                          <span className="adp-doc-date">
                            Requested: {formatManilaDate(doc.requestDate)}
                          </span>
                          {doc.neededBy && (
                            <span className={`adp-status-badge ${isOverdue ? "adp-badge-rejected" : "adp-badge-pending"}`}>
                              {isOverdue ? "Overdue — " : "Needed By: "}{formatManilaDate(doc.neededBy)}
                              {deadlineLabel(doc.neededBy) && ` (${deadlineLabel(doc.neededBy)})`}
                            </span>
                          )}
                          {doc.processedBy && (
                            <span className="adp-doc-date">By: {doc.processedBy}</span>
                          )}
                        </div>
                      </div>
                      <div className="adp-doc-action">
                        <button className="adp-view-btn" onClick={() => handleViewDetails(doc)}>
                          <EyeIcon />
                          <span>View &amp; Process</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}