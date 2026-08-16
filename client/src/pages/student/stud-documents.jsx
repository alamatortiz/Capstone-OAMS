import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import StudentPageShell from "../../components/StudentPageShell";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import PageHeader from "../../components/PageHeader";
import { toast } from "sonner";
import "./stud-documents.css";
import api from "../../utils/api";
import { formatManilaDate, formatManilaTime, getManilaTomorrowDateString } from "../../utils/dateTime";
import { formatCollegeLabel } from "../../utils/formatCollege";
import { connectSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
import { getDocStatusHubMeta } from "../../utils/documentStatus";

import { ChevronLeft, XCircle, FileText, CheckCircle2 } from "lucide-react";

// Mirrors the server's limits (server/middleware/upload.js) -- purely
// advisory here for the running-total UI, the server stays authoritative.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

// ─── Document Object Structure (JSDoc) ────────────────────────────────────
/**
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} type
 * @property {string} college
 * @property {string} requestDate
 * @property {string} purpose
 * @property {'pending' | 'processing' | 'ready' | 'released' | 'claimed' | 'rejected' | 'cancelled'} status
 * @property {string} trackingNumber
 * @property {string} [notes]
 * @property {string} [estimatedCompletion]
 * @property {string} [neededBy]
 */

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
export default function DocumentsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("active");
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [servicesByDepartmentId, setServicesByDepartmentId] = useState({});
  const [collegesFromDB, setCollegesFromDB] = useState([]);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  useLockBodyScroll(dialogOpen || sendDialogOpen);
  const [formData, setFormData] = useState({
    type: "",
    college: "",
    purpose: "",
    copies: "1",
    neededBy: "",
  });

  // ── "Send a Document" form state ───────────────────────────────────────
  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [sendFormData, setSendFormData] = useState({
    title: "",
    purpose: "",
    neededBy: "",
  });
  const [sendFiles, setSendFiles] = useState([]); // { id, file }[]

  // Accepts as many of the newly-picked files as still fit under MAX_FILES /
  // MAX_TOTAL_BYTES, rejecting anything individually over MAX_FILE_BYTES
  // outright -- mirrors adm-announcements.jsx's queueFiles().
  const addSendFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const accepted = [];
    let count = sendFiles.length;
    let bytes = sendFiles.reduce((sum, f) => sum + f.file.size, 0);
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
    if (accepted.length > 0) setSendFiles((prev) => [...prev, ...accepted]);
    if (tooLarge > 0) {
      toast.error(`${tooLarge} file(s) skipped — each file must be ${formatBytes(MAX_FILE_BYTES)} or smaller`);
    }
    if (overBudget > 0) {
      toast.error(`${overBudget} file(s) skipped — attachment limit reached`);
    }
  };
  const removeSendFile = (id) => setSendFiles((prev) => prev.filter((f) => f.id !== id));

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchServiceTypes = async () => {
      setFormOptionsLoading(true);
      try {
        const res = await api.get("/student/documents/service-types");
        setCollegesFromDB(res.data.departments ?? []);
        setServicesByDepartmentId(res.data.servicesByDepartmentId ?? {});
      } catch (err) {
        console.error("Failed to fetch document service types:", err);
      } finally {
        setFormOptionsLoading(false);
      }
    };
    fetchServiceTypes();
  }, []);

  // Mirrors `documents` for the catch block below, without making
  // fetchDocuments depend on (and change identity with) the state itself.
  const documentsRef = useRef(documents);
  useEffect(() => { documentsRef.current = documents; }, [documents]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get("/student/documents");
      setDocuments(res.data.documents ?? []);
      setDocsError(null);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      if (documentsRef.current.length === 0) {
        setDocsError("Could not load your documents.");
      } else {
        toast.error("Could not refresh your documents.");
      }
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Live updates: refetch when a document's status changes.
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("document:status-updated", fetchDocuments);
    return () => {
      socket.off("document:status-updated", fetchDocuments);
    };
  }, [fetchDocuments, token]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchDocuments();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubmitRequest = async () => {
    if (submitting) return;
    if (!formData.type || !formData.college || !formData.purpose) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/student/documents", formData);
      if (!res.data?.document) {
        throw new Error("Unexpected response from server");
      }
      setDocuments((prev) => [res.data.document, ...prev]);
      setDialogOpen(false);
      setFormData({ type: "", college: "", purpose: "", copies: "1", neededBy: "" });
      toast.success("Document request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit document request:", err);
      toast.error(
        err?.response?.data?.error ?? "Failed to submit document request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSendDocument = async () => {
    if (sendSubmitting) return;
    if (!sendFormData.title.trim() || !sendFormData.purpose.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSendSubmitting(true);
    try {
      const body = new FormData();
      body.append("title", sendFormData.title);
      body.append("purpose", sendFormData.purpose);
      body.append("neededBy", sendFormData.neededBy);
      sendFiles.forEach((f) => body.append("attachments", f.file));

      const res = await api.post("/student/document-submissions", body);
      if (!res.data?.document) {
        throw new Error("Unexpected response from server");
      }
      setDocuments((prev) => [res.data.document, ...prev]);
      setSendDialogOpen(false);
      setSendFormData({ title: "", purpose: "", neededBy: "" });
      setSendFiles([]);
      toast.success("Document sent successfully!");
    } catch (err) {
      console.error("Failed to send document:", err);
      toast.error(err?.response?.data?.error ?? "Failed to send document");
    } finally {
      setSendSubmitting(false);
    }
  };

  const handleCancelRequest = async (docId) => {
    setCancellingId(docId);
    try {
      await api.delete(`/student/documents/${docId}`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "cancelled" } : d)),
      );
      setCancelTarget(null);
      toast.success("Document request cancelled.");
    } catch (err) {
      console.error("Failed to cancel document request:", err);
      toast.error(
        err?.response?.data?.error ?? "Failed to cancel document request",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const activeDocuments = documents.filter(
    (doc) =>
      doc.status !== "claimed" &&
      doc.status !== "rejected" &&
      doc.status !== "cancelled",
  );
  const claimedDocuments = documents.filter((doc) => doc.status === "claimed");
  const rejectedDocuments = documents.filter((doc) => doc.status === "rejected");
  const cancelledDocuments = documents.filter((doc) => doc.status === "cancelled");

  const availableTypes =
    servicesByDepartmentId[
      collegesFromDB.find((c) => c.name === formData.college)?.id ?? -1
    ] ?? [];
  const hasServicesForCollege = availableTypes.length > 0;
  const selectedTypeDetails = availableTypes.find((t) => t.name === formData.type);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="documents-container"
      mainClassName="doc-main"
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
                    <label htmlFor="college">College</label>
                    <select
                      id="college"
                      value={formData.college}
                      onChange={(e) =>
                        setFormData({ ...formData, college: e.target.value, type: "" })
                      }
                      className="doc-form-select"
                      disabled={formOptionsLoading}
                      required
                    >
                      <option value="">
                        {formOptionsLoading ? "Loading colleges…" : "Select college"}
                      </option>
                      {collegesFromDB.map((college) => (
                        <option key={college.id} value={college.name}>
                          {formatCollegeLabel(college.abbrev, college.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="type">Document Type</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="doc-form-select"
                      disabled={
                        formOptionsLoading || !formData.college || !hasServicesForCollege
                      }
                      required
                    >
                      <option value="">
                        {!formData.college
                          ? "Select a college first"
                          : !hasServicesForCollege
                            ? "No Documents Available"
                            : "Select document type"}
                      </option>
                      {availableTypes.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTypeDetails && (
                    <div className="doc-form-hint">
                      <p className="doc-hint-processing">
                        <strong>Processing Time:</strong> {selectedTypeDetails.processingTime || "TBD"}
                      </p>
                      {selectedTypeDetails.requirements.length > 0 && (
                        <div className="doc-hint-requirements">
                          <strong>Requirements:</strong>
                          <ul className="doc-requirements-list">
                            {selectedTypeDetails.requirements.map((req, i) => (
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

          {/* Send a Document Dialog */}
          {sendDialogOpen && (
            <div className="doc-dialog-overlay" onClick={() => setSendDialogOpen(false)}>
              <div className="doc-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="doc-dialog-header">
                  <div>
                    <h2>Send a Document</h2>
                  </div>
                  <button
                    className="doc-dialog-close"
                    onClick={() => setSendDialogOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <form
                  className="doc-dialog-content"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitSendDocument();
                  }}
                >
                  <div className="doc-form-group">
                    <label htmlFor="send-title">Title</label>
                    <input
                      id="send-title"
                      type="text"
                      placeholder="What are you sending?"
                      value={sendFormData.title}
                      onChange={(e) =>
                        setSendFormData({ ...sendFormData, title: e.target.value })
                      }
                      className="doc-form-input"
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="send-neededBy">Date Needed (Optional)</label>
                    <input
                      id="send-neededBy"
                      type="date"
                      min={getManilaTomorrowDateString()}
                      value={sendFormData.neededBy}
                      onChange={(e) =>
                        setSendFormData({ ...sendFormData, neededBy: e.target.value })
                      }
                      className="doc-form-input"
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="send-purpose">Purpose</label>
                    <textarea
                      id="send-purpose"
                      placeholder="Specify the purpose of sending this document"
                      value={sendFormData.purpose}
                      onChange={(e) =>
                        setSendFormData({ ...sendFormData, purpose: e.target.value })
                      }
                      className="doc-form-textarea"
                      rows={3}
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="doc-form-group">
                    <label htmlFor="send-attachments">
                      Attachments{" "}
                      <span className="doc-attach-budget">
                        ({sendFiles.length}/{MAX_FILES} files, {formatBytes(sendFiles.reduce((sum, f) => sum + f.file.size, 0))}/{formatBytes(MAX_TOTAL_BYTES)})
                      </span>
                    </label>
                    <p className="doc-attach-hint">Each file up to {formatBytes(MAX_FILE_BYTES)}.</p>

                    {sendFiles.length > 0 && (
                      <div className="doc-attach-list">
                        {sendFiles.map((f) => (
                          <div key={f.id} className="doc-attach-chip">
                            <span className="doc-attach-filename">
                              <FileText /> {f.file.name}
                            </span>
                            <button
                              type="button"
                              className="doc-attach-remove"
                              aria-label={`Remove ${f.file.name}`}
                              onClick={() => removeSendFile(f.id)}
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      id="send-attachments"
                      type="file"
                      multiple
                      accept={ATTACHMENT_ACCEPT}
                      className="doc-attach-input"
                      disabled={sendFiles.length >= MAX_FILES}
                      onChange={(e) => {
                        addSendFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {sendFiles.length >= MAX_FILES && (
                      <span className="doc-attach-hint">Attachment limit reached</span>
                    )}
                  </div>

                  <div className="doc-dialog-actions">
                    <button
                      type="button"
                      className="doc-btn-secondary"
                      onClick={() => setSendDialogOpen(false)}
                      disabled={sendSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="doc-form-submit"
                      disabled={sendSubmitting}
                    >
                      {sendSubmitting ? "Sending..." : "Send Document"}
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
          {/* Header */}
          {docsError && <div className="doc-error-banner">{docsError}</div>}
          <PageHeader
            breadcrumb={
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" /> Home
              </Link>
            }
            icon={<FileText />}
            iconClassName="doc-title-icon"
            title="Document Requests"
            subtitle="Request documents and track their status."
          />

          <div className="doc-action-buttons">
            <button
              className="doc-request-btn"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon /> Request Document
            </button>
            <button
              className="doc-send-btn"
              onClick={() => setSendDialogOpen(true)}
            >
              <PlusIcon /> Send a Document
            </button>
          </div>

          {/* Document Tabs */}
          <div className="doc-tabs-container">
            <div className="doc-tabs-list">
              <button
                className={`doc-tab ${activeTab === "active" ? "active" : ""}`}
                onClick={() => setActiveTab("active")}
              >
                <AlertCircleIcon /> Active Requests <span className="doc-tab-count">{activeDocuments.length}</span>
              </button>
              <button
                className={`doc-tab ${activeTab === "claimed" ? "active" : ""}`}
                onClick={() => setActiveTab("claimed")}
              >
                <CheckCircle2 /> Claimed <span className="doc-tab-count">{claimedDocuments.length}</span>
              </button>
              <button
                className={`doc-tab ${activeTab === "rejected" ? "active" : ""}`}
                onClick={() => setActiveTab("rejected")}
              >
                <XCircleIcon /> Rejected <span className="doc-tab-count">{rejectedDocuments.length}</span>
              </button>
              <button
                className={`doc-tab ${activeTab === "cancelled" ? "active" : ""}`}
                onClick={() => setActiveTab("cancelled")}
              >
                <XCircleIcon /> Cancelled <span className="doc-tab-count">{cancelledDocuments.length}</span>
              </button>
            </div>

            {/* Active Tab */}
            {activeTab === "active" && (
              <div className="doc-tab-content">
                {docsLoading ? (
                  <div className="doc-empty-state">
                    <FileText />
                    <h3>Loading documents...</h3>
                  </div>
                ) : activeDocuments.length > 0 ? (
                  <div className="doc-cards-grid">
                    {activeDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-card"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate("/student/document-status", {
                            state: { docId: doc.id, from: "documents" },
                          })
                        }
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileText />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{doc.type}</h3>
                            <p className="doc-card-college">{doc.college}</p>
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{doc.trackingNumber}</span>
                            <span
                              className={`doc-badge ${getDocStatusHubMeta(doc.status).cls}`}
                            >
                              {getDocStatusHubMeta(doc.status).label}
                            </span>
                          </div>
                        </div>

                        <div className="doc-card-grid">
                          <div className="doc-card-field">
                            <label>Request Date</label>
                            <p className="doc-card-date-value">
                              {formatManilaDate(doc.requestDate, {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          {doc.neededBy && (
                            <div className="doc-card-field">
                              <label>Needed By</label>
                              <p className="doc-card-date-value">
                                {formatManilaDate(doc.neededBy, {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                          {doc.copies != null && (
                            <div className="doc-card-field">
                              <label>Number of Copies</label>
                              <p className="doc-card-date-value">{doc.copies}</p>
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

                        {(doc.status === "ready" || doc.status === "released") && (
                          <button
                            className="doc-card-view-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/student/document-status", {
                                state: { from: "documents", docId: doc.id },
                              });
                            }}
                          >
                            <DownloadIcon /> View Pickup Details
                          </button>
                        )}

                        {(doc.status === "pending" ||
                          doc.status === "processing") && (
                          <button
                            className="doc-cancel-request-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelTarget(doc);
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
                {docsLoading ? (
                  <div className="doc-empty-state">
                    <FileText />
                    <h3>Loading documents...</h3>
                  </div>
                ) : claimedDocuments.length > 0 ? (
                  <div className="doc-cards-grid">
                    {claimedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-card"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate("/student/document-status", {
                            state: { docId: doc.id, from: "documents" },
                          })
                        }
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileText />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{doc.type}</h3>
                            <p className="doc-card-college">{doc.college}</p>
                            {doc.claimedDate && (
                              <>
                                <p className="doc-card-claimed-date">
                                  {formatManilaDate(doc.claimedDate, {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="doc-card-claimed-time">
                                  {formatManilaTime(doc.claimedDate)}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{doc.trackingNumber}</span>
                            <span
                              className={`doc-badge ${getDocStatusHubMeta(doc.status).cls}`}
                            >
                              {getDocStatusHubMeta(doc.status).label}
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
                {docsLoading ? (
                  <div className="doc-empty-state">
                    <FileText />
                    <h3>Loading documents...</h3>
                  </div>
                ) : rejectedDocuments.length > 0 ? (
                  <div className="doc-cards-grid">
                    {rejectedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-card"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate("/student/document-status", {
                            state: { docId: doc.id, from: "documents" },
                          })
                        }
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileText />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{doc.type}</h3>
                            <p className="doc-card-college">
                              {doc.college} •{" "}
                              {formatManilaDate(doc.requestDate, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{doc.trackingNumber}</span>
                            <span
                              className={`doc-badge ${getDocStatusHubMeta(doc.status).cls}`}
                            >
                              {getDocStatusHubMeta(doc.status).label}
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
                {docsLoading ? (
                  <div className="doc-empty-state">
                    <FileText />
                    <h3>Loading documents...</h3>
                  </div>
                ) : cancelledDocuments.length > 0 ? (
                  <div className="doc-cards-grid">
                    {cancelledDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-card"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate("/student/document-status", {
                            state: { docId: doc.id, from: "documents" },
                          })
                        }
                      >
                        <div className="doc-card-header">
                          <div className="doc-card-icon-wrap">
                            <FileText />
                          </div>
                          <div className="doc-card-title-section">
                            <h3>{doc.type}</h3>
                            <p className="doc-card-college">
                              {doc.college} •{" "}
                              {formatManilaDate(doc.requestDate, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="doc-card-header-right">
                            <span className="doc-tracking-pill">{doc.trackingNumber}</span>
                            <span
                              className={`doc-badge ${getDocStatusHubMeta(doc.status).cls}`}
                            >
                              {getDocStatusHubMeta(doc.status).label}
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
    </StudentPageShell>
  );
}
