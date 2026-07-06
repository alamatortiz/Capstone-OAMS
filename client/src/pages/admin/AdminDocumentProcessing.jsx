import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./admin_document_processing.css";
import api from "../../utils/api";
import { toast } from "sonner";
import AdminSidebar from "../../components/AdminSidebar";
import ChatWidget from "../../components/ChatWidget";

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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingNotes, setProcessingNotes] = useState("");

  const sourceEndpoint = SOURCES.find((s) => s.id === source).endpoint;

  // ── Effects ───────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
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

  // ── Derived values ────────────────────────────────────────────────────────
  // Search applied first so tab counts reflect the current search context.
  const baseFiltered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.trackingNumber.toLowerCase().includes(q) ||
      doc.requesterName.toLowerCase().includes(q) ||
      doc.requesterIdValue.toLowerCase().includes(q)
    );
  });

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const count = (status) => documents.filter((d) => d.status === status).length;
    if (i.includes("pending")) return `There are ${count("pending")} pending documents awaiting processing.`;
    if (i.includes("processing")) return `${count("processing")} document(s) are currently being processed.`;
    if (i.includes("ready")) return `${count("ready")} document(s) are ready for student pickup.`;
    if (i.includes("completed")) return `${count("completed")} document request(s) have been completed.`;
    if (i.includes("search") || i.includes("find")) return "Use the search bar to look up by tracking number, student name, or student ID.";
    return "I can help you with document processing. Ask about pending, processing, ready, or completed documents!";
  };

  const handleViewDetails = (doc) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes || "");
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedDocument) return;
    try {
      await api.patch(`/admin/${sourceEndpoint}/${selectedDocument.id}/status`, {
        status: newStatus,
        notes: processingNotes,
      });
      toast.success(`Document marked as ${newStatus}`);
      setShowDetailsModal(false);
      setSelectedDocument(null);
      setProcessingNotes("");
      await fetchDocuments();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update document status");
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedDocument(null);
    setProcessingNotes("");
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":     return { label: "Pending",    cls: "adp-badge-pending",    Icon: AlertCircleIcon };
      case "processing":  return { label: "Processing", cls: "adp-badge-processing", Icon: ClockIcon };
      case "ready":       return { label: "Ready",      cls: "adp-badge-ready",      Icon: CheckCircleIcon };
      case "completed":   return { label: "Completed",  cls: "adp-badge-completed",  Icon: CheckCircleIcon };
      case "rejected":    return { label: "Rejected",   cls: "adp-badge-rejected",   Icon: XCircleIcon };
      default:            return { label: status,       cls: "",                     Icon: ClockIcon };
    }
  };

  const TABS = ["all", "pending", "processing", "ready", "completed", "rejected"];

  return (
    <div className="adp-layout">
      <AdminSidebar />

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="adp-main">
        <div className="adp-content">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="adp-page-header">
            <div className="adp-title-section">
              <div className="adp-title-icon">
                <FileTextIcon className="adp-icon-lg" />
              </div>
              <div>
                <h1 className="adp-page-title">Document Processing</h1>
                <p className="adp-page-subtitle">Process and manage document requests</p>
              </div>
            </div>
          </div>

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

          {/* Search */}
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
                            Requested: {new Date(doc.requestDate).toLocaleDateString()}
                          </span>
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
      </main>

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
        getBotResponse={generateBotResponse}
      />

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
                <div className="adp-modal-field adp-modal-field--full">
                  <label className="adp-modal-label">Purpose</label>
                  <p className="adp-modal-value">{selectedDocument.purpose}</p>
                </div>
                <div className="adp-modal-field">
                  <label className="adp-modal-label">Request Date</label>
                  <p className="adp-modal-value">{new Date(selectedDocument.requestDate).toLocaleDateString()}</p>
                </div>
                {selectedDocument.completedDate && (
                  <div className="adp-modal-field">
                    <label className="adp-modal-label">Completed Date</label>
                    <p className="adp-modal-value">{new Date(selectedDocument.completedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

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
                  <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => handleUpdateStatus("processing")}>
                    Start Processing
                  </button>
                )}
                {selectedDocument.status === "processing" && (
                  <button className="adp-modal-btn adp-modal-btn--success" onClick={() => handleUpdateStatus("ready")}>
                    Mark as Ready
                  </button>
                )}
                {selectedDocument.status === "ready" && (
                  <button className="adp-modal-btn adp-modal-btn--primary" onClick={() => handleUpdateStatus("completed")}>
                    Mark as Completed
                  </button>
                )}
                {(selectedDocument.status === "pending" || selectedDocument.status === "processing") && (
                  <button className="adp-modal-btn adp-modal-btn--danger" onClick={() => handleUpdateStatus("rejected")}>
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
    </div>
  );
}