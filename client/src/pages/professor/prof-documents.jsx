import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import { toast } from "sonner";
import "./prof-dashboard.css";
import "./prof-documents.css";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaTomorrowDateString } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";
import { getDocStatusHubMeta } from "../../utils/documentStatus";

import { ChevronLeft, XCircle, FileText, CheckCircle2 } from "lucide-react";

// ─── Icons ────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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

// ─── Main Component ──────────────────────────────────────────────────────
export default function ProfessorDocumentRequest() {
  const navigate = useNavigate();

  // ── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    purpose: "",
    copies: "1",
    neededBy: "",
  });

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      setTypesLoading(true);
      try {
        const res = await api.get("/professor/documents/service-types");
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

  // Mirrors `requests` for the catch block below, without making
  // fetchRequests depend on (and change identity with) the state itself.
  const requestsRef = useRef(requests);
  useEffect(() => { requestsRef.current = requests; }, [requests]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get("/professor/documents");
      setRequests(
        res.data.map((r) => ({
          id: String(r.request_id),
          type: r.service_name,
          college: r.college,
          purpose: r.purpose,
          copies: r.copies,
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
      if (requestsRef.current.length === 0) {
        setRequestsError("Could not load your document requests.");
      } else {
        toast.error("Could not refresh your document requests.");
      }
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

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchRequests();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubmitRequest = async () => {
    if (submitting) return;
    if (!formData.type || !formData.purpose) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const selectedService = documentTypes.find((d) => d.name === formData.type);

    setSubmitting(true);
    try {
      await api.post("/professor/documents", {
        service_id: selectedService?.id,
        request_type: formData.type,
        purpose: formData.purpose,
        copies: formData.copies,
        needed_by: formData.neededBy || null,
      });
      await fetchRequests();
      setDialogOpen(false);
      setFormData({ type: "", purpose: "", copies: "1", neededBy: "" });
      toast.success("Document request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit document request:", err);
      toast.error(err?.response?.data?.message ?? "Failed to submit document request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setCancellingId(requestId);
    try {
      await api.delete(`/professor/documents/${requestId}`);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled" } : r)),
      );
      setCancelTarget(null);
      toast.success("Document request cancelled.");
    } catch (err) {
      console.error("Failed to cancel document request:", err);
      toast.error(err?.response?.data?.message ?? "Failed to cancel document request.");
    } finally {
      setCancellingId(null);
    }
  };

  const activeRequests = requests.filter(
    (r) => r.status !== "claimed" && r.status !== "rejected" && r.status !== "cancelled",
  );
  const claimedRequests = requests.filter((r) => r.status === "claimed");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");
  const cancelledRequests = requests.filter((r) => r.status === "cancelled");

  const selectedType = documentTypes.find((d) => d.name === formData.type);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <>
          {/* Request Document Dialog */}
          {dialogOpen && (
            <div className="doc-dialog-overlay" onClick={() => setDialogOpen(false)}>
              <div className="doc-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="doc-dialog-header">
                  <div>
                    <h2>Request a Document</h2>
                  </div>
                  <button
                    className="doc-dialog-close"
                    onClick={() => setDialogOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <form
                  className="doc-dialog-content"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitRequest();
                  }}
                >
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
                      required
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
                      <p className="doc-hint-processing">
                        <strong>Processing Time:</strong> {selectedType.processingTime || "TBD"}
                      </p>
                      {selectedType.requirements.length > 0 && (
                        <div className="doc-hint-requirements">
                          <strong>Requirements:</strong>
                          <ul className="doc-requirements-list">
                            {selectedType.requirements.map((req) => (
                              <li key={req.name}>
                                <div className="doc-req-row">
                                  <span className="doc-req-name">{req.name}</span>
                                  <span
                                    className={`doc-req-tag ${req.isMandatory ? "doc-req-tag-required" : "doc-req-tag-optional"}`}
                                  >
                                    {req.isMandatory ? "Required" : "Optional"}
                                  </span>
                                </div>
                                {req.description && <p className="doc-req-desc">{req.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="doc-form-group">
                    <label htmlFor="copies">Number of Copies</label>
                    <input
                      id="copies"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={formData.copies}
                      onChange={(e) =>
                        setFormData({ ...formData, copies: e.target.value })
                      }
                      className="doc-form-input"
                      required
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="neededBy">Date Needed (Optional)</label>
                    <input
                      id="neededBy"
                      type="date"
                      min={getManilaTomorrowDateString()}
                      value={formData.neededBy}
                      onChange={(e) =>
                        setFormData({ ...formData, neededBy: e.target.value })
                      }
                      className="doc-form-input"
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="purpose">Purpose</label>
                    <textarea
                      id="purpose"
                      placeholder="Specify the purpose of your request"
                      value={formData.purpose}
                      onChange={(e) =>
                        setFormData({ ...formData, purpose: e.target.value })
                      }
                      className="doc-form-textarea"
                      rows={3}
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="doc-dialog-actions">
                    <button
                      type="button"
                      className="doc-btn-secondary"
                      onClick={() => setDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="doc-form-submit"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
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
                <strong>{cancelTarget?.type}</strong>. It will move to your
                Cancelled requests — you're welcome to submit a new request
                anytime if you change your mind.
              </>
            }
            icon={<XCircle width={22} height={22} />}
            cancelText="Keep Request"
            confirmText={cancellingId === cancelTarget?.id ? "Cancelling…" : "Cancel Request"}
            confirmDisabled={!!cancellingId}
          />
        </>
      }
    >
      <div className="doc-content">
        {requestsError && <div className="doc-error-banner">{requestsError}</div>}
        {/* Header */}
        <PageHeader
          breadcrumb={
            <Link to="/professor/dashboard" className="breadcrumb-link">
              <ChevronLeft className="breadcrumb-icon" /> Home
            </Link>
          }
          icon={<FileText />}
          iconClassName="doc-title-icon"
          title="Document Requests"
          subtitle="Request documents and track their status."
          headerClassName="doc-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="doc-title-section"
          titleClassName="doc-title"
          subtitleClassName="doc-subtitle"
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
              className={`doc-tab ${activeTab === "claimed" ? "active" : ""}`}
              onClick={() => setActiveTab("claimed")}
            >
              <CheckCircle2 /> Claimed <span className="doc-tab-count">{claimedRequests.length}</span>
            </button>
            <button
              className={`doc-tab ${activeTab === "rejected" ? "active" : ""}`}
              onClick={() => setActiveTab("rejected")}
            >
              <XCircleIcon /> Rejected <span className="doc-tab-count">{rejectedRequests.length}</span>
            </button>
            <button
              className={`doc-tab ${activeTab === "cancelled" ? "active" : ""}`}
              onClick={() => setActiveTab("cancelled")}
            >
              <XCircleIcon /> Cancelled <span className="doc-tab-count">{cancelledRequests.length}</span>
            </button>
          </div>

          {/* Active Tab */}
          {activeTab === "active" && (
            <div className="doc-tab-content">
              {requestsLoading ? (
                <div className="doc-empty-state">
                  <FileText />
                  <h3>Loading requests...</h3>
                </div>
              ) : activeRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {activeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="doc-card"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate("/professor/document-status", {
                          state: { docId: req.id, from: "documents" },
                        })
                      }
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon-wrap">
                          <FileText />
                        </div>
                        <div className="doc-card-title-section">
                          <h3>{req.type}</h3>
                          <p className="doc-card-college">{req.college}</p>
                        </div>
                        <div className="doc-card-header-right">
                          <span className="doc-tracking-pill">{req.trackingNumber}</span>
                          <span className={`doc-badge ${getDocStatusHubMeta(req.status).cls}`}>
                            {getDocStatusHubMeta(req.status).label}
                          </span>
                        </div>
                      </div>

                      <div className="doc-card-grid">
                        <div className="doc-card-field">
                          <label>Request Date</label>
                          <p className="doc-card-date-value">
                            {formatManilaDate(req.requestDate, { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        {req.neededBy && (
                          <div className="doc-card-field">
                            <label>Needed By</label>
                            <p className="doc-card-date-value">
                              {formatManilaDate(req.neededBy, { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        )}
                        <div className="doc-card-field">
                          <label>Number of Copies</label>
                          <p className="doc-card-date-value">{req.copies ?? 1}</p>
                        </div>
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

                      {(req.status === "generated" || req.status === "released") && (
                        <button
                          className="doc-card-view-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/professor/document-status", {
                              state: { from: "documents", docId: req.id },
                            });
                          }}
                        >
                          <DownloadIcon /> View Pickup Details
                        </button>
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
                  ))}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <FileText />
                  <h3>No Active Requests</h3>
                  <p>You have no active document requests.</p>
                </div>
              )}
            </div>
          )}

          {/* Claimed Tab */}
          {activeTab === "claimed" && (
            <div className="doc-tab-content">
              {requestsLoading ? (
                <div className="doc-empty-state">
                  <FileText />
                  <h3>Loading requests...</h3>
                </div>
              ) : claimedRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {claimedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="doc-card"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate("/professor/document-status", {
                          state: { docId: req.id, from: "documents" },
                        })
                      }
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon-wrap">
                          <FileText />
                        </div>
                        <div className="doc-card-title-section">
                          <h3>{req.type}</h3>
                          <p className="doc-card-college">{req.college}</p>
                          {req.claimedDate && (
                            <>
                              <p className="doc-card-claimed-date">
                                {formatManilaDate(req.claimedDate, { month: "long", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="doc-card-claimed-time">{formatManilaTime(req.claimedDate)}</p>
                            </>
                          )}
                        </div>
                        <div className="doc-card-header-right">
                          <span className="doc-tracking-pill">{req.trackingNumber}</span>
                          <span className={`doc-badge ${getDocStatusHubMeta(req.status).cls}`}>
                            {getDocStatusHubMeta(req.status).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <CheckCircle2 />
                  <h3>No Completed Requests</h3>
                  <p>You have no records of claimed documents.</p>
                </div>
              )}
            </div>
          )}

          {/* Rejected Tab */}
          {activeTab === "rejected" && (
            <div className="doc-tab-content">
              {requestsLoading ? (
                <div className="doc-empty-state">
                  <FileText />
                  <h3>Loading requests...</h3>
                </div>
              ) : rejectedRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {rejectedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="doc-card"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate("/professor/document-status", {
                          state: { docId: req.id, from: "documents" },
                        })
                      }
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon-wrap">
                          <FileText />
                        </div>
                        <div className="doc-card-title-section">
                          <h3>{req.type}</h3>
                          <p className="doc-card-college">
                            {req.college} •{" "}
                            {formatManilaDate(req.requestDate, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="doc-card-header-right">
                          <span className="doc-tracking-pill">{req.trackingNumber}</span>
                          <span className={`doc-badge ${getDocStatusHubMeta(req.status).cls}`}>
                            {getDocStatusHubMeta(req.status).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <XCircleIcon />
                  <h3>No Rejected Requests</h3>
                  <p>You have no records of rejected document requests.</p>
                </div>
              )}
            </div>
          )}

          {/* Cancelled Tab */}
          {activeTab === "cancelled" && (
            <div className="doc-tab-content">
              {requestsLoading ? (
                <div className="doc-empty-state">
                  <FileText />
                  <h3>Loading requests...</h3>
                </div>
              ) : cancelledRequests.length > 0 ? (
                <div className="doc-cards-grid">
                  {cancelledRequests.map((req) => (
                    <div
                      key={req.id}
                      className="doc-card"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate("/professor/document-status", {
                          state: { docId: req.id, from: "documents" },
                        })
                      }
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon-wrap">
                          <FileText />
                        </div>
                        <div className="doc-card-title-section">
                          <h3>{req.type}</h3>
                          <p className="doc-card-college">
                            {req.college} •{" "}
                            {formatManilaDate(req.requestDate, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="doc-card-header-right">
                          <span className="doc-tracking-pill">{req.trackingNumber}</span>
                          <span className={`doc-badge ${getDocStatusHubMeta(req.status).cls}`}>
                            {getDocStatusHubMeta(req.status).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="doc-empty-state">
                  <XCircleIcon />
                  <h3>No Cancelled Requests</h3>
                  <p>You have no records of cancelled document requests.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProfessorPageShell>
  );
}
