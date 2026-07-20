import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText, XCircle, CheckCircle2, MessageSquare } from "lucide-react";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import { toast } from "sonner";
import { formatManilaDate, getManilaTomorrowDateString } from "../../utils/dateTime";
import "./prof-dashboard.css";
import "./prof-documents.css";
import "./prof-document-status.css";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";

// ─── Icons ────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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
    <path d="M12 8v5"></path>
    <circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

// ─── Status helpers ──────────────────────────────────────────────────────
const STATUS_META = {
  pending:    { cls: "doc-badge-pending",    label: "Pending" },
  processing: { cls: "doc-badge-processing", label: "Processing" },
  generated:  { cls: "doc-badge-ready",      label: "Ready for Pickup" },
  released:   { cls: "doc-badge-released",   label: "Released" },
  claimed:    { cls: "doc-badge-claimed",    label: "Claimed" },
  rejected:   { cls: "doc-badge-rejected",   label: "Rejected" },
};

function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.pending;
}

function getStatusIcon(status) {
  switch (status) {
    case "pending":
      return <ClockIcon />;
    case "processing":
      return <AlertCircleIcon />;
    case "generated":
      return <CheckCircleIcon />;
    case "released":
      return <CheckCircleIcon />;
    case "claimed":
      return <CheckCircleIcon />;
    case "rejected":
      return <XCircleIcon />;
    default:
      return <FileTextIcon />;
  }
}

const MIN_NEEDED_BY_DATE = getManilaTomorrowDateString();

// ─── Document Detail View ──────────────────────────────────────────────────
// Shown in place of the list when a card is clicked. Uses its own status/date
// formatting (dss-* classes) rather than the list's doc-* ones, ported as-is
// from the page this was merged from.
function getDetailStatusMeta(status) {
  switch (status) {
    case "pending":    return { label: "Pending",          cls: "dss-badge-pending" };
    case "processing": return { label: "Processing",       cls: "dss-badge-processing" };
    case "generated":  return { label: "Ready for Pickup", cls: "dss-badge-ready" };
    case "released":   return { label: "Released",         cls: "dss-badge-released" };
    case "claimed":    return { label: "Claimed",          cls: "dss-badge-claimed" };
    case "rejected":   return { label: "Rejected",         cls: "dss-badge-rejected" };
    default:           return { label: status,             cls: "dss-badge-pending" };
  }
}

function formatDetailDate(dateStr) {
  if (!dateStr) return "—";
  return formatManilaDate(dateStr, { month: "long" });
}

function DocumentDetail({ doc, onBack, onCancel, cancelling, backLabel = "Document Requests" }) {
  const statusMeta = getDetailStatusMeta(doc.status);
  const canCancel = doc.status === "pending" || doc.status === "processing";

  return (
    <div className="dss-status-container">
      <PageHeader
        breadcrumb={
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        }
        icon={<FileText style={{ width: "1.75rem", height: "1.75rem" }} />}
        iconClassName="dss-title-icon"
        title="Document Details"
        subtitle="Track your document request status"
      />

      <div className="dss-hero-card">
        <div className="dss-hero-content">
          <div className="dss-hero-logo">
            <FileText style={{ width: "2.25rem", height: "2.25rem", color: "white" }} />
          </div>
          <div className="dss-hero-text">
            <div className="dss-hero-header">
              <div className="dss-hero-title">
                <p className="dss-hero-doc-name">{doc.type}</p>
                <p>{doc.college}</p>
              </div>
              <div className="dss-hero-badge">{doc.trackingNumber}</div>
            </div>
          </div>
        </div>
      </div>

      {doc.status === "generated" && (
        <div
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "1rem",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}
        >
          <CheckCircle2 style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }} />
          Your document is ready for pickup — please visit the HR/Records office!
        </div>
      )}

      <div className="dss-detail-grid">
        <div className="dss-detail-main">
          <div className="dss-card">
            <div className="dss-card-header">
              <h3 className="dss-card-title">
                <FileText style={{ width: "1.25rem", height: "1.25rem" }} />
                Request Details
              </h3>
              <span className={`dss-badge ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="dss-card-content">
              <div className="dss-detail-row">
                <span className="dss-detail-label">Request Date</span>
                <span className="dss-detail-value">{formatDetailDate(doc.requestDate)}</span>
              </div>
              {doc.status === "claimed" && doc.claimedDate ? (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Date Claimed</span>
                  <span className="dss-detail-value">{formatDetailDate(doc.claimedDate)}</span>
                </div>
              ) : doc.status === "released" && doc.releasedDate ? (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Date Released</span>
                  <span className="dss-detail-value">{formatDetailDate(doc.releasedDate)}</span>
                </div>
              ) : doc.estimatedCompletion ? (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Estimated Completion</span>
                  <span className="dss-detail-value">{formatDetailDate(doc.estimatedCompletion)}</span>
                </div>
              ) : null}
              <div className="dss-detail-row" style={{ borderBottom: "none" }}>
                <span className="dss-detail-label">Purpose</span>
                <span className="dss-detail-value">{doc.purpose}</span>
              </div>
            </div>
          </div>

          {doc.notes && (
            <div className="dss-card">
              <div className="dss-card-header">
                <h3 className="dss-card-title">
                  <MessageSquare style={{ width: "1.25rem", height: "1.25rem" }} />
                  Notes
                </h3>
              </div>
              <div className="dss-card-content">
                <p className="dss-concern-text">{doc.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="dss-detail-sidebar">
          {canCancel && (
            <div className="dss-card dss-cancel-card">
              <div className="dss-card-header">
                <h3 className="dss-card-title dss-cancel-title">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                  Cancel Request
                </h3>
              </div>
              <div className="dss-card-content">
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Cancelling will permanently remove this request. You'll need
                  to resubmit if you change your mind.
                </p>
                <button
                  className="dss-cancel-btn"
                  onClick={() => onCancel(doc.id)}
                  disabled={cancelling}
                >
                  Cancel Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function ProfessorDocumentRequest() {
  // ── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    purpose: "",
    notes: "",
    neededBy: "",
  });

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      setTypesLoading(true);
      try {
        const res = await api.get("/faculty/document-services");
        setDocumentTypes(
          res.data.map((s) => ({
            id: s.service_id,
            name: s.service_name,
            description: s.description ?? "",
            processingTime: s.processing_time ?? "TBD",
            requirements: s.requirements ?? [],
          })),
        );
      } catch (err) {
        console.error("Failed to fetch document types:", err);
      } finally {
        setTypesLoading(false);
      }
    };
    fetchDocumentTypes();
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const res = await api.get("/faculty/my-document-requests");
      setRequests(
        res.data.map((r) => ({
          id: String(r.request_id),
          type: r.service_name,
          college: r.college,
          purpose: r.purpose,
          requestDate: r.created_at,
          status: r.status,
          trackingNumber: r.tracking_number,
          notes: r.notes || undefined,
          estimatedCompletion: r.estimated_completion || undefined,
          neededBy: r.needed_by || undefined,
          releasedDate: r.released_at || undefined,
          claimedDate: r.claimed_at || undefined,
        })),
      );
      setRequestsError(null);
    } catch (err) {
      console.error("Failed to fetch document requests:", err);
      setRequestsError("Could not load your document requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Live updates: refetch when admin changes a request's status ───────────
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    socket.on("document:status-updated", fetchRequests);

    return () => {
      socket.off("document:status-updated", fetchRequests);
    };
  }, [fetchRequests]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubmitRequest = async () => {
    if (!formData.type || !formData.purpose) {
      toast.error("Please fill in all required fields");
      return;
    }
    const selectedService = documentTypes.find((d) => d.name === formData.type);

    setSubmitting(true);
    try {
      await api.post("/faculty/my-document-requests", {
        service_id: selectedService?.id,
        request_type: formData.type,
        purpose: formData.purpose,
        notes: formData.notes,
        needed_by: formData.neededBy || null,
      });
      await fetchRequests();
      setDialogOpen(false);
      setFormData({ type: "", purpose: "", notes: "", neededBy: "" });
      toast.success("Document request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit document request:", err);
      toast.error(err?.response?.data?.message ?? "Failed to submit document request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setCancellingId(requestId);
    try {
      await api.delete(`/faculty/my-document-requests/${requestId}`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setCancelTarget(null);
      toast.success("Document request cancelled.");
    } catch (err) {
      console.error("Failed to cancel document request:", err);
      toast.error(err?.response?.data?.message ?? "Failed to cancel document request");
    } finally {
      setCancellingId(null);
    }
  };

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    const activeCount = requests.filter(
      (r) => r.status !== "claimed" && r.status !== "rejected",
    ).length;
    const readyCount = requests.filter((r) => r.status === "generated").length;
    const pendingCount = requests.filter((r) => r.status === "pending").length;

    if (lowerInput.includes("document") || lowerInput.includes("tracking")) {
      return pendingCount > 0
        ? `You have ${pendingCount} pending document request(s). You currently have ${activeCount} active request(s). If you need help, tell me the document type or tracking number.`
        : readyCount > 0
          ? `You have ${readyCount} document(s) ready for pickup. Tell me which one you're looking for and I can guide you.`
          : `Right now you have no pending requests. You have ${activeCount} active request(s). Want to request a new document?`;
    }

    if (
      lowerInput.includes("status") ||
      lowerInput.includes("where") ||
      lowerInput.includes("progress")
    ) {
      return activeCount > 0
        ? `You have ${activeCount} active request(s). Use the list to check each document's current status.`
        : 'You have no active requests right now. You can request a document using the "Request Document" button.';
    }

    if (
      lowerInput.includes("request") ||
      lowerInput.includes("apply") ||
      lowerInput.includes("new")
    ) {
      return 'To request a document, click "Request Document", choose the document type, then enter the purpose. Want help choosing what to request?';
    }

    return 'I can help with document requests, tracking, and statuses. Try asking: "What is my document status?" or "How do I request a document?"';
  };

  const activeRequests = requests.filter(
    (r) => r.status !== "claimed" && r.status !== "rejected",
  );
  const completedRequests = requests.filter(
    (r) => r.status === "claimed" || r.status === "rejected",
  );

  const selectedType = documentTypes.find((d) => d.name === formData.type);
  const selectedDoc = selectedDocId
    ? requests.find((r) => r.id === selectedDocId) ?? null
    : null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <>
          {/* Request Document Dialog */}
          {dialogOpen && (
            <div className="doc-dialog-overlay">
              <div className="doc-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="doc-dialog-header">
                  <div>
                    <h2>New Document Request</h2>
                    <p>Submit a request for an official HR/Records document</p>
                  </div>
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
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="doc-form-select"
                      disabled={typesLoading}
                    >
                      <option value="">
                        {typesLoading ? "Loading document types…" : "Select document type"}
                      </option>
                      {documentTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedType && (
                    <div className="doc-form-hint">
                      <p>
                        <strong>Processing Time:</strong> {selectedType.processingTime}
                      </p>
                      {selectedType.requirements.length > 0 && (
                        <p>
                          <strong>Requirements:</strong> {selectedType.requirements.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="doc-form-group">
                    <label htmlFor="purpose">Purpose</label>
                    <textarea
                      id="purpose"
                      placeholder="e.g., Bank loan application, Visa application"
                      value={formData.purpose}
                      onChange={(e) =>
                        setFormData({ ...formData, purpose: e.target.value })
                      }
                      className="doc-form-textarea"
                      rows={3}
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="neededBy">Needed By (optional)</label>
                    <input
                      id="neededBy"
                      type="date"
                      min={MIN_NEEDED_BY_DATE}
                      value={formData.neededBy}
                      onChange={(e) =>
                        setFormData({ ...formData, neededBy: e.target.value })
                      }
                      className="doc-form-input"
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="notes">Additional Notes</label>
                    <textarea
                      id="notes"
                      placeholder="Any special instructions or urgency notes (optional)"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="doc-form-textarea"
                      rows={2}
                    />
                  </div>

                  <div className="doc-dialog-actions">
                    <button
                      className="doc-btn-secondary"
                      onClick={() => setDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitRequest}
                      className="doc-form-submit"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Confirm Dialog */}
          <ActionConfirmModal
            show={cancelTarget !== null}
            onCancel={() => setCancelTarget(null)}
            onConfirm={() => handleCancelRequest(cancelTarget.id)}
            title="Cancel Request?"
            message={
              <>
                You are about to cancel your request for{" "}
                <strong>{cancelTarget?.type}</strong>. This will permanently remove
                your request — you will need to resubmit if you change your mind.
              </>
            }
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="10" y1="13" x2="14" y2="17"></line>
                <line x1="14" y1="13" x2="10" y2="17"></line>
              </svg>
            }
            cancelText="Keep Request"
            confirmText={cancellingId === cancelTarget?.id ? "Cancelling…" : "Cancel Request"}
            confirmDisabled={!!cancellingId}
          />

          {/* AI Chatbot Widget */}
          <ChatWidget
            initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you with document requests?"
            getBotResponse={generateBotResponse}
          />
        </>
      }
    >
      {selectedDoc ? (
        <DocumentDetail
          doc={selectedDoc}
          onBack={() => setSelectedDocId(null)}
          onCancel={(id) => setCancelTarget(requests.find((r) => r.id === id) ?? null)}
          cancelling={cancellingId === selectedDoc.id}
        />
      ) : (
      <div className="doc-content">
        {requestsError && <div className="doc-error-banner">{requestsError}</div>}
        {/* Header */}
        <PageHeader
          breadcrumb={
            <Link to="/professor/dashboard" className="breadcrumb-link">
              <ChevronLeft className="breadcrumb-icon" /> Home
            </Link>
          }
          icon={<FileTextIcon />}
          iconClassName="doc-title-icon"
          title="Document Requests"
          subtitle="Request official documents and track your submissions"
        />

        <button
          className="doc-request-btn"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon /> Request Document
        </button>

        {/* Document Tabs */}
        <div className="doc-tabs-container">
          <div className="doc-tabs-list">
            <button
              className={`doc-tab ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              <AlertCircleIcon /> Active Requests <span className="doc-tab-count">{activeRequests.length}</span>
            </button>
            <button
              className={`doc-tab ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              <CheckCircleIcon /> Completed <span className="doc-tab-count">{completedRequests.length}</span>
            </button>
          </div>

          {/* Active Tab */}
          {activeTab === "active" && (
            <div className="doc-tab-content">
              {requestsLoading ? (
                <div className="doc-empty-state">
                  <FileTextIcon />
                  <h3>Loading requests...</h3>
                </div>
              ) : activeRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {activeRequests.map((req) => {
                    const statusMeta = getStatusMeta(req.status);
                    return (
                      <div
                        key={req.id}
                        className="doc-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedDocId(req.id)}
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileTextIcon />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{req.type}</h3>
                            <p className="doc-card-college">{req.college}</p>
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{req.trackingNumber}</span>
                            <span className={`doc-badge ${statusMeta.cls}`}>
                              {getStatusIcon(req.status)}
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>

                        <div className="doc-card-grid">
                          <div className="doc-card-field">
                            <label>Request Date</label>
                            <p className="doc-card-date-value">
                              {formatManilaDate(req.requestDate, { month: "long" })}
                            </p>
                          </div>
                          {req.estimatedCompletion && (
                            <div className="doc-card-field">
                              <label>Est. Completion</label>
                              <p className="doc-card-date-value">
                                {formatManilaDate(req.estimatedCompletion, { month: "long" })}
                              </p>
                            </div>
                          )}
                          {req.neededBy && (
                            <div className="doc-card-field">
                              <label>Needed By</label>
                              <p className="doc-card-date-value">
                                {formatManilaDate(req.neededBy, { month: "long" })}
                              </p>
                            </div>
                          )}
                          <div className="doc-card-field-full">
                            <label>Purpose</label>
                            <p>{req.purpose}</p>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="doc-card-update">
                            <p className="doc-update-title">Update</p>
                            <p className="doc-update-text">{req.notes}</p>
                          </div>
                        )}

                        {(req.status === "pending" || req.status === "processing") && (
                          <button
                            className="doc-cancel-request-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelTarget(req);
                            }}
                          >
                            <XCircleIcon /> Cancel Request
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <FileTextIcon />
                  <h3>No active requests</h3>
                  <p>Start by requesting a document</p>
                </div>
              )}
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === "completed" && (
            <div className="doc-tab-content">
              {completedRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {completedRequests.map((req) => {
                    const statusMeta = getStatusMeta(req.status);
                    return (
                      <div
                        key={req.id}
                        className="doc-card doc-card-completed"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedDocId(req.id)}
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileTextIcon />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{req.type}</h3>
                            <p className="doc-card-college">
                              {req.college} • {formatManilaDate(req.requestDate)}
                            </p>
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{req.trackingNumber}</span>
                            <span className={`doc-badge ${statusMeta.cls}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <CheckCircleIcon />
                  <h3>No completed requests</h3>
                  <p>Your released and rejected requests will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </ProfessorPageShell>
  );
}
