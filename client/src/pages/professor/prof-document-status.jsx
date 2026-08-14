import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  FileText,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import api from "../../utils/api";
import { getCollegeLogo } from "../../data/collegeLogo";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import { formatManilaDate, formatManilaTime, formatManilaDateTime } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";
import { getDocStatusDetailMeta } from "../../utils/documentStatus";
import "./prof-dashboard.css";
import "./prof-document-status.css";

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return formatManilaDate(dateStr, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  return formatManilaDate(dateStr, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function DocumentDetail({ doc, onBack, onCancel, cancelling, backLabel = "All Documents", requirements, reqLoading }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const statusMeta = getDocStatusDetailMeta(doc.status);
  const canCancel = doc.status === "pending" || doc.status === "processing";

  return (
    <div className="dss-status-container">
      {/* Page Header */}
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
        subtitle="Your document request details and status."
      />

      {/* Hero */}
      <div className="dss-hero-card">
        <div className="dss-hero-content">
          <div className="dss-hero-logo">
            <img src={getCollegeLogo(doc.college)} alt={doc.college} />
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

      {/* Ready alert */}
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
          Your document is ready for pickup — please proceed to the designated location
        </div>
      )}

      {/* Released alert */}
      {doc.status === "released" && (
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
          Your document has been released to the designated location — visit to complete pickup.
        </div>
      )}

      {/* Detail Grid */}
      <div className="dss-detail-grid">
        {/* Main column */}
        <div className="dss-detail-main">
          {/* Request details card */}
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
                <span className="dss-detail-label">Date Requested</span>
                <span className="dss-detail-value">{formatDate(doc.requestDate)}</span>
              </div>
              <div className="dss-detail-row">
                <span className="dss-detail-label">Date Needed</span>
                <span className="dss-detail-value">
                  {doc.neededBy
                    ? formatDate(doc.neededBy)
                    : "No date requested for the document to be claimable."}
                </span>
              </div>
              {doc.status === "released" && doc.releasedDate && (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Date Released</span>
                  <span className="dss-detail-value">{formatDate(doc.releasedDate)}</span>
                </div>
              )}
              {doc.status === "claimed" && doc.claimedDate && (
                <div className="dss-detail-row">
                  <span className="dss-detail-label">Date and Time Claimed</span>
                  <span className="dss-detail-value">{formatManilaDateTime(doc.claimedDate)}</span>
                </div>
              )}
              <div className="dss-detail-row">
                <span className="dss-detail-label">Number of Copies</span>
                <span className="dss-detail-value">{doc.copies ?? 1}</span>
              </div>
              <div className="dss-detail-row" style={{ borderBottom: "none" }}>
                <span className="dss-detail-label">Purpose</span>
                <span className="dss-detail-value">{doc.purpose}</span>
              </div>
            </div>
          </div>

          {/* Requirements card */}
          <div className="dss-card">
            <div className="dss-card-header">
              <h3 className="dss-card-title">
                <CheckCircle2 style={{ width: "1.375rem", height: "1.375rem" }} />
                Requirements
              </h3>
            </div>
            <div className="dss-card-content">
              {reqLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                  <Loader2 style={{ width: "1.125rem", height: "1.125rem", animation: "spin 1s linear infinite" }} />
                  Loading requirements…
                </div>
              ) : requirements.length > 0 ? (
                <ul className="dss-requirements-list">
                  {requirements.map((req) => (
                    <li key={req.name} className="dss-requirement-item">
                      <CheckCircle2 className="dss-requirement-icon" />
                      <div>
                        <div className="dss-requirement-name-row">
                          <span>{req.name}</span>
                          <span className={`dss-requirement-badge ${req.isMandatory ? "is-mandatory" : "is-optional"}`}>
                            {req.isMandatory ? "Required" : "Optional"}
                          </span>
                        </div>
                        {req.description && (
                          <p style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: "2px" }}>
                            {req.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: "0.9rem", color: "var(--text-tertiary)", margin: 0 }}>
                  No specific requirements have been defined for this service yet. Contact the office for details.
                </p>
              )}
            </div>
          </div>

          {/* Notes card */}
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

        {/* Sidebar */}
        <div className="dss-detail-sidebar">
          {/* Cancel card (only for pending/processing) */}
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
                  Cancelling will move this request to your Cancelled
                  requests. You're welcome to submit a new one if you change
                  your mind.
                </p>
                <button
                  className="dss-cancel-btn"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirm Dialog */}
      <ActionConfirmModal
        show={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => onCancel(doc.id)}
        title="Cancel Request?"
        message={
          <>
            You are about to cancel your request for{" "}
            <strong>{doc.type}</strong>. It will move to your Cancelled
            requests — you're welcome to submit a new one if you change your mind.
          </>
        }
        icon={<XCircle width={22} height={22} />}
        cancelText="Keep Request"
        confirmText={cancelling ? "Cancelling…" : "Cancel Request"}
        confirmDisabled={cancelling}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfessorDocumentStatus() {
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state ?? {};

  const fromDocuments = navState.from === "documents";

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState(navState.docId ?? null);
  const [detailOpenedFromExternal, setDetailOpenedFromExternal] = useState(
    fromDocuments && !!navState.docId,
  );
  const [activeTab, setActiveTab] = useState("active");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [reqLoading, setReqLoading] = useState(true);

  const selectedDoc = selectedDocId
    ? (documents.find((d) => d.id === selectedDocId) ?? null)
    : null;

  // Requirements for the selected document's type, looked up by name against
  // the same document-services catalog prof-documents.jsx uses (no stable
  // service id is exposed on either payload, so name is the shared key).
  const getDocRequirements = useCallback(
    (typeName) => documentTypes.find((t) => t.name === typeName)?.requirements ?? [],
    [documentTypes],
  );
  const selectedDocRequirements = selectedDoc ? getDocRequirements(selectedDoc.type) : [];

  useEffect(() => {
    if (!loading && selectedDocId && !selectedDoc) setSelectedDocId(null);
  }, [loading, selectedDocId, selectedDoc]);

  // Mirrors `documents` for the catch block below, without making
  // fetchDocuments depend on (and change identity with) the state itself.
  const documentsRef = useRef(documents);
  useEffect(() => { documentsRef.current = documents; }, [documents]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get("/professor/documents");
      setDocuments(
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
      setError(null);
    } catch (err) {
      console.error("Failed to fetch document requests:", err);
      if (documentsRef.current.length === 0) {
        setError("Could not load your document requests.");
      } else {
        toast.error("Could not refresh your document requests.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      setReqLoading(true);
      try {
        const res = await api.get("/professor/documents/service-types");
        setDocumentTypes(
          res.data.map((s) => ({
            id: s.service_id,
            name: s.service_name,
            requirements: s.requirements ?? [],
          })),
        );
      } catch (err) {
        console.error("Failed to fetch document service types:", err);
      } finally {
        setReqLoading(false);
      }
    };
    fetchDocumentTypes();
  }, []);

  // ── Live updates: refetch when a document's status changes ────────────────
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    socket.on("document:status-updated", fetchDocuments);

    return () => {
      socket.off("document:status-updated", fetchDocuments);
    };
  }, [fetchDocuments]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchDocuments();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCancel = async (docId) => {
    setCancelling(true);
    try {
      await api.delete(`/professor/documents/${docId}`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "cancelled" } : d)),
      );
      toast.success("Document request cancelled.");
      setSelectedDocId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  const activeDocuments = documents.filter(
    (d) => d.status !== "claimed" && d.status !== "rejected" && d.status !== "cancelled",
  );
  const claimedDocuments = documents.filter((d) => d.status === "claimed");
  const rejectedDocuments = documents.filter((d) => d.status === "rejected");
  const cancelledDocuments = documents.filter((d) => d.status === "cancelled");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main doc-status-page"
    >
        {selectedDoc ? (
          <DocumentDetail
            doc={selectedDoc}
            backLabel={detailOpenedFromExternal ? "Document Requests" : "All Documents"}
            onBack={() =>
              detailOpenedFromExternal
                ? navigate("/professor/document-request")
                : setSelectedDocId(null)
            }
            onCancel={handleCancel}
            cancelling={cancelling}
            requirements={selectedDocRequirements}
            reqLoading={reqLoading}
          />
        ) : (
          <div className="dss-status-container">
            {/* Page Header */}
            <PageHeader
              breadcrumb={
                <Link
                  to={navState.from === "documents" ? "/professor/document-request" : "/professor/dashboard"}
                  className="breadcrumb-link"
                >
                  <ChevronLeft className="breadcrumb-icon" />
                  {navState.from === "documents" ? "Documents" : "Home"}
                </Link>
              }
              icon={<FileText style={{ width: "1.75rem", height: "1.75rem" }} />}
              iconClassName="dss-title-icon"
              title="My Document Requests"
              subtitle="Track all of your document requests."
            />

            {/* Error */}
            {error && (
              <div
                className="dss-empty-state"
                style={{ borderColor: "rgba(239,68,68,0.3)" }}
              >
                <AlertCircle
                  className="dss-empty-icon"
                  style={{ color: "#ef4444" }}
                />
                <p className="dss-empty-text">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="dss-empty-state">
                <Loader2
                  className="dss-empty-icon"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <p className="dss-empty-text">Loading your documents…</p>
              </div>
            )}

            {/* Document Tabs */}
            {!loading && !error && (
              <div className="dss-tabs-container">
                <div className="dss-tabs-list">
                  <button
                    className={`dss-tab ${activeTab === "active" ? "active" : ""}`}
                    onClick={() => setActiveTab("active")}
                  >
                    <AlertCircle />
                    Active Requests <span className="dss-tab-count">{activeDocuments.length}</span>
                  </button>
                  <button
                    className={`dss-tab ${activeTab === "claimed" ? "active" : ""}`}
                    onClick={() => setActiveTab("claimed")}
                  >
                    <CheckCircleIcon />
                    Claimed <span className="dss-tab-count">{claimedDocuments.length}</span>
                  </button>
                  <button
                    className={`dss-tab ${activeTab === "rejected" ? "active" : ""}`}
                    onClick={() => setActiveTab("rejected")}
                  >
                    <XCircle />
                    Rejected <span className="dss-tab-count">{rejectedDocuments.length}</span>
                  </button>
                  <button
                    className={`dss-tab ${activeTab === "cancelled" ? "active" : ""}`}
                    onClick={() => setActiveTab("cancelled")}
                  >
                    <XCircle />
                    Cancelled <span className="dss-tab-count">{cancelledDocuments.length}</span>
                  </button>
                </div>

                {/* Active Tab */}
                {activeTab === "active" && (
                  <div className="dss-list-container">
                    {activeDocuments.length > 0 ? (
                      activeDocuments.map((doc) => {
                        const statusMeta = getDocStatusDetailMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "#f97316" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">{doc.college}</p>
                              </div>
                              <div className="dss-list-header-right">
                                <span className="dss-tracking-pill">{doc.trackingNumber}</span>
                                <span className={`dss-badge ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                            <div className="dss-list-card-grid">
                              <div className="dss-list-card-field">
                                <label>Request Date</label>
                                <p>{formatDateShort(doc.requestDate)}</p>
                              </div>
                              <div className="dss-list-card-field-full">
                                <label>Purpose</label>
                                <p>{doc.purpose}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="dss-empty-state">
                        <FileText className="dss-empty-icon" />
                        <h3 className="dss-empty-title">No Active Requests</h3>
                        <p className="dss-empty-text">
                          You have no active document requests.
                        </p>
                        <button
                          onClick={() => navigate("/professor/document-request")}
                          style={{
                            marginTop: "0.5rem",
                            background: "linear-gradient(135deg, #f97316, #ea580c)",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "0.75rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                          Request a Document
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Claimed Tab */}
                {activeTab === "claimed" && (
                  <div className="dss-list-container">
                    {claimedDocuments.length > 0 ? (
                      claimedDocuments.map((doc) => {
                        const statusMeta = getDocStatusDetailMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "#f97316" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">{doc.college}</p>
                                {doc.claimedDate && (
                                  <>
                                    <p className="dss-list-claimed-date">
                                      {formatDate(doc.claimedDate)}
                                    </p>
                                    <p className="dss-list-claimed-time">
                                      {formatManilaTime(doc.claimedDate)}
                                    </p>
                                  </>
                                )}
                              </div>
                              <div className="dss-list-header-right">
                                <span className="dss-tracking-pill">{doc.trackingNumber}</span>
                                <span className={`dss-badge ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="dss-empty-state">
                        <CheckCircle2 className="dss-empty-icon" />
                        <h3 className="dss-empty-title">No Completed Requests</h3>
                        <p className="dss-empty-text">
                          You have no records of claimed documents.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Tab */}
                {activeTab === "rejected" && (
                  <div className="dss-list-container">
                    {rejectedDocuments.length > 0 ? (
                      rejectedDocuments.map((doc) => {
                        const statusMeta = getDocStatusDetailMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "#f97316" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">
                                  {doc.college} • {formatDateShort(doc.requestDate)}
                                </p>
                              </div>
                              <div className="dss-list-header-right">
                                <span className="dss-tracking-pill">{doc.trackingNumber}</span>
                                <span className={`dss-badge ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="dss-empty-state">
                        <XCircle className="dss-empty-icon" />
                        <h3 className="dss-empty-title">No Rejected Requests</h3>
                        <p className="dss-empty-text">
                          You have no records of rejected document requests.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cancelled Tab */}
                {activeTab === "cancelled" && (
                  <div className="dss-list-container">
                    {cancelledDocuments.length > 0 ? (
                      cancelledDocuments.map((doc) => {
                        const statusMeta = getDocStatusDetailMeta(doc.status);
                        return (
                          <div
                            key={doc.id}
                            className="dss-list-item"
                            onClick={() => { setDetailOpenedFromExternal(false); setSelectedDocId(doc.id); }}
                          >
                            <div className="dss-list-header">
                              <div className="dss-list-icon-wrap">
                                <FileText style={{ width: "1.5rem", height: "1.5rem", color: "#f97316" }} />
                              </div>
                              <div className="dss-list-title-section">
                                <h3>{doc.type}</h3>
                                <p className="dss-list-college">
                                  {doc.college} • {formatDateShort(doc.requestDate)}
                                </p>
                              </div>
                              <div className="dss-list-header-right">
                                <span className="dss-tracking-pill">{doc.trackingNumber}</span>
                                <span className={`dss-badge ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="dss-empty-state">
                        <XCircle className="dss-empty-icon" />
                        <h3 className="dss-empty-title">No Cancelled Requests</h3>
                        <p className="dss-empty-text">
                          You have no records of cancelled document requests.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </ProfessorPageShell>
  );
}
