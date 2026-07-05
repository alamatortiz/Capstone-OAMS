import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./admin_documents.css";
import api from "../../utils/api";
import AdminSidebar from "../../components/AdminSidebar";
import ChatWidget from "../../components/ChatWidget";

// ── Icons (all unchanged from original) ──────────────────────────────────────
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
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
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const FileTextIcon = ({ className = "icon" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="13"></line>
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CheckCircle2Icon = () => (
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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { badgeClass: "admin-documents-status-pending", Icon: AlertCircleIcon, label: "Pending" },
  processing: { badgeClass: "admin-documents-status-processing", Icon: ClockIcon, label: "Processing" },
  ready: { badgeClass: "admin-documents-status-ready", Icon: FileTextIcon, label: "Ready" },
  released: { badgeClass: "admin-documents-status-released", Icon: CheckCircle2Icon, label: "Released" },
  rejected: { badgeClass: "admin-documents-status-rejected", Icon: XCircleIcon, label: "Rejected" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`admin-documents-status-badge ${cfg.badgeClass}`}>
      <cfg.Icon />
      {cfg.label}
    </span>
  );
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TABS = ["all", "pending", "processing", "ready", "released", "rejected"];
const COLLEGES = ["All Colleges", "CCS", "CBAA", "COED", "COE", "CAS", "CHAS"];

export default function AdminDocuments() {
  // ── Document data state ──────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setDocLoading(true);
        const res = await api.get("/admin/documents/monitoring");
        setDocuments(res.data.documents ?? []);
        setDocError(null);
      } catch (err) {
        console.error("Failed to fetch document monitoring data:", err);
        setDocError("Could not load document requests.");
      } finally {
        setDocLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const pendingCount = documents.filter((d) => d.status === "pending").length;
    const processingCount = documents.filter((d) => d.status === "processing").length;
    const readyCount = documents.filter((d) => d.status === "ready").length;
    if (i.includes("pending") || i.includes("status"))
      return `There are ${pendingCount} pending documents. Use the filters to view them.`;
    if (i.includes("process") || i.includes("processing"))
      return `Currently ${processingCount} documents are being processed.`;
    if (i.includes("ready"))
      return `${readyCount} documents are ready for release.`;
    if (i.includes("export") || i.includes("download"))
      return "You can export the currently filtered document list using the Export button in the toolbar.";
    return "I can help with document status, filtering, exporting, and document details. What do you need?";
  };

  // ── Derived values ────────────────────────────────────────────────────────
  // Search + college filters applied first so tab counts reflect the current context.
  const baseFiltered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.studentName?.toLowerCase().includes(q) ||
      doc.studentId?.toString().includes(searchQuery) ||
      doc.documentType?.toLowerCase().includes(q) ||
      doc.trackingNumber?.toLowerCase().includes(q);
    const matchesCollege =
      selectedCollege === "All Colleges" || doc.college === selectedCollege;
    return matchesSearch && matchesCollege;
  });

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  const handleExport = () => {
    const header = ["Tracking Number", "Student", "Student ID", "College", "Document Type", "Purpose", "Status", "Request Date"];
    const rows = filteredDocuments.map((d) => [
      d.trackingNumber, d.studentName, d.studentId, d.college, d.documentType, d.purpose, d.status, formatDate(d.requestDate),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `document-requests-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-documents-with-sidebar">
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-documents-main">
        <div className="admin-documents">
          {docError && (
            <div className="admin-documents-error-banner">{docError}</div>
          )}

          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="admin-documents-page-header">
            <div className="admin-documents-title-section">
              <div className="admin-documents-title-icon">
                <FileTextIcon className="admin-documents-icon-lg" />
              </div>
              <div>
                <h1 className="admin-documents-page-title">
                  Centralized Document Management
                </h1>
                <p className="admin-documents-page-subtitle">
                  Monitor document processing workflow across all colleges
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="admin-documents-toolbar">
            <div className="admin-documents-toolbar-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by student name, ID, or document type..."
                className="admin-documents-toolbar-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="admin-documents-toolbar-actions">
              <div className="admin-documents-dropdown-wrapper">
                <select
                  className="admin-documents-dropdown"
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                >
                  {COLLEGES.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
              <button className="admin-documents-export-btn" onClick={handleExport}>
                <DownloadIcon />
                Export
              </button>
            </div>
          </div>

          {/* Document Requests Section */}
          <section className="admin-documents-section">
            <div className="admin-documents-section-header">
              <div className="admin-documents-section-title">
                <h2>Document Requests</h2>
                <p>System-wide document tracking and workflow management</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="admin-documents-tabs">
              {TABS.map((tab) => {
                const count =
                  tab === "all"
                    ? baseFiltered.length
                    : baseFiltered.filter((d) => d.status === tab).length;
                return (
                  <button
                    key={tab}
                    className={`admin-documents-tab ${
                      activeTab === tab ? "admin-documents-tab-active" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="admin-documents-tab-count">
                      {docLoading ? "—" : count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Documents List */}
            <div className="admin-documents-list">
              {docLoading ? (
                <p className="admin-documents-loading">Loading documents...</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="admin-documents-empty">
                  No documents found in this category.
                </p>
              ) : (
                filteredDocuments.map((doc) => (
                  <div key={doc.id} className="admin-documents-card">
                    <div className="admin-documents-card-header">
                      <div className="admin-documents-card-top">
                        <div className="admin-documents-student-info">
                          <div className="admin-documents-student-avatar">
                            <UserIcon />
                          </div>
                          <div className="admin-documents-student-text">
                            <p className="admin-documents-student-name">
                              {doc.studentName}
                            </p>
                            <p className="admin-documents-student-id">
                              ({doc.studentId}) &middot; {doc.college}
                            </p>
                          </div>
                        </div>
                        <div className="admin-documents-card-badges">
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                      <h3 className="admin-documents-document-title">
                        {doc.documentType}
                      </h3>
                    </div>

                    <div className="admin-documents-card-details">
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Purpose
                        </span>
                        <span className="admin-documents-detail-value">
                          {doc.purpose}
                        </span>
                      </div>
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Request Date
                        </span>
                        <span className="admin-documents-detail-value">
                          {formatDate(doc.requestDate)}
                        </span>
                      </div>
                      <div className="admin-documents-detail-row">
                        <span className="admin-documents-detail-label">
                          Tracking Number
                        </span>
                        <span className="admin-documents-detail-value">
                          {doc.trackingNumber}
                        </span>
                      </div>
                    </div>

                    <div className="admin-documents-card-footer">
                      <button
                        className="admin-documents-view-details-btn"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Details Modal */}
      {selectedDoc && (
        <div
          className="admin-documents-dialog-overlay"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="admin-documents-dialog-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="admin-documents-dialog-close"
              onClick={() => setSelectedDoc(null)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <p className="admin-documents-dialog-title">Request Details</p>
            <p className="admin-documents-dialog-desc">
              Full details for this document request.
            </p>

            <div className="admin-documents-dialog-name-row">
              <span className="admin-documents-dialog-student-name">
                {selectedDoc.studentName}
              </span>
              <span className="admin-documents-dialog-student-id">
                ({selectedDoc.studentId})
              </span>
            </div>
            <p className="admin-documents-dialog-doc-type">
              {selectedDoc.documentType} &middot; {selectedDoc.trackingNumber}
            </p>

            <div className="admin-documents-meta-grid">
              <div>
                <p className="admin-documents-meta-label">College</p>
                <p className="admin-documents-meta-value">{selectedDoc.college}</p>
              </div>
              <div>
                <p className="admin-documents-meta-label">Status</p>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div>
                <p className="admin-documents-meta-label">Purpose</p>
                <p className="admin-documents-meta-value">{selectedDoc.purpose}</p>
              </div>
              <div>
                <p className="admin-documents-meta-label">Request Date</p>
                <p className="admin-documents-meta-value">
                  {formatDate(selectedDoc.requestDate)}
                </p>
              </div>
            </div>

            {selectedDoc.notes && (
              <div className="admin-documents-notes-box">
                <p className="admin-documents-meta-label" style={{ marginBottom: "0.25rem" }}>
                  Notes
                </p>
                <p className="admin-documents-notes-text">{selectedDoc.notes}</p>
              </div>
            )}

            <div className="admin-documents-dialog-footer">
              <button
                className="admin-documents-view-details-btn"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you with document management?"
        getBotResponse={generateBotResponse}
      />
    </div>
  );
}
