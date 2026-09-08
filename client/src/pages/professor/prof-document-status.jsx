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
import { getDocStatusDetailMeta, normalizeDocStatus } from "../../utils/documentStatus";
import { QRCodeSVG } from "qrcode.react";
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

// Fetches one file's bytes on demand and opens/downloads it -- mirrors
// stud-document-status.jsx.
async function openFileBlob(path, file) {
  try {
    const res = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf") {
      window.open(url, "_blank");
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    toast.error("Failed to load file");
  }
}

const openSubmissionFile = (submissionId, file) =>
  openFileBlob(`/professor/document-submissions/${submissionId}/files/${file.id}`, file);

const openRequestFile = (requestId, file) =>
  openFileBlob(`/professor/documents/${requestId}/files/${file.id}`, file);

// ─── Detail View ──────────────────────────────────────────────────────────────
function DocumentDetail({ doc, onBack, onCancel, cancelling, onClaim, claiming, backLabel = "All Documents", requirements, reqLoading }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const statusMeta = getDocStatusDetailMeta(doc.status);
  const canCancel = doc.status === "pending" || doc.status === "processing";
  const canClaim = normalizeDocStatus(doc.status) === "ready";

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
        headerClassName="dss-header"
        breadcrumbClassName="page-breadcrumb"
        titleSectionClassName="dss-title-section"
        titleClassName="dss-title"
        subtitleClassName="dss-subtitle"
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
      {normalizeDocStatus(doc.status) === "ready" && (
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

      {/* Digital delivery: QR + text code. Shown once the document is Ready (or
          after it's Claimed, as a verification/audit record). Claiming is done
          from the "Mark as Claimed" card in the sidebar now. */}
      {doc.isDigitalDelivery && (normalizeDocStatus(doc.status) === "ready" || doc.status === "claimed") && (
        <div className="dss-card">
          <div className="dss-card-header">
            <h3 className="dss-card-title">
              <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem" }} />
              Digital Pickup Code
            </h3>
          </div>
          <div
            className="dss-card-content"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}
          >
            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", margin: 0, textAlign: "center" }}>
              {doc.status === "claimed"
                ? "Kept here for verification purposes."
                : "Show this QR code (or read out the text code) to the office when you collect your document."}
            </p>
            <QRCodeSVG value={doc.deliveryCode} size={160} />
            <p style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "0.03em", margin: 0 }}>
              {doc.deliveryCode}
            </p>
          </div>
        </div>
      )}

      {/* Satisfaction survey card intentionally not shown here yet --
          feature is built and configurable (see superadmin's Satisfaction
          Survey settings) but held back from end users pending school
          approval. Re-add `<SatisfactionSurveyCard endpointBase="professor" />`
          gated on doc.status === "claimed" once approved. */}

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

          {/* Requirements card -- N/A for a sent document: doc.type there is
              the faculty member's free-text Title, which could coincidentally
              match a real service name and pull in unrelated requirements, so
              this is hidden outright rather than just visually de-emphasized. */}
          {doc.kind !== "submission" && (
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
          )}

          {/* Attachments card -- only for a sent document */}
          {doc.kind === "submission" && (
            <div className="dss-card">
              <div className="dss-card-header">
                <h3 className="dss-card-title">
                  <FileText style={{ width: "1.25rem", height: "1.25rem" }} />
                  Attachments
                </h3>
              </div>
              <div className="dss-card-content">
                <p className="dss-detail-label" style={{ marginBottom: "0.4rem" }}>Your Files</p>
                {doc.facultyFiles?.length > 0 ? (
                  <div className="dss-attach-list">
                    {doc.facultyFiles.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="dss-attach-chip"
                        onClick={() => openSubmissionFile(doc.id.replace(/^sub-/, ""), f)}
                      >
                        <FileText /> {f.filename}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", margin: "0 0 0.75rem" }}>
                    No files attached.
                  </p>
                )}

                <p className="dss-detail-label" style={{ margin: "0.75rem 0 0.4rem" }}>Office Return Files</p>
                {doc.adminFiles?.length > 0 ? (
                  <div className="dss-attach-list">
                    {doc.adminFiles.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="dss-attach-chip"
                        onClick={() => openSubmissionFile(doc.id.replace(/^sub-/, ""), f)}
                      >
                        <FileText /> {f.filename}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", margin: 0 }}>
                    Nothing returned yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Soft-copy files the office attached to a document request */}
          {doc.kind !== "submission" && doc.adminFiles?.length > 0 && (
            <div className="dss-card">
              <div className="dss-card-header">
                <h3 className="dss-card-title">
                  <FileText style={{ width: "1.25rem", height: "1.25rem" }} />
                  Files from the Office
                </h3>
              </div>
              <div className="dss-card-content">
                <div className="dss-attach-list">
                  {doc.adminFiles.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="dss-attach-chip"
                      onClick={() => openRequestFile(doc.id.replace(/^req-/, ""), f)}
                    >
                      <FileText /> {f.filename}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rejection reason -- emphasized callout, not the plain Notes
              card below (which stays as-is for every other status). */}
          {doc.status === "rejected" && doc.notes && (
            <div className="dss-card">
              <div className="dss-card-content">
                <div className="dss-reject-notice">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                  <div>
                    <p>This request was rejected.</p>
                    <p className="dss-reject-reason">Reason: {doc.notes}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes card */}
          {doc.status !== "rejected" && doc.notes && (
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

          {/* Mark as Claimed card (only while Ready) -- the document counterpart
              to marking an appointment as done. */}
          {canClaim && (
            <div className="dss-card dss-claim-card">
              <div className="dss-card-header">
                <h3 className="dss-card-title dss-claim-title">
                  <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem" }} />
                  Mark as Claimed
                </h3>
              </div>
              <div className="dss-card-content">
                <p className="dss-claim-desc">
                  Once you've collected this document, mark it as claimed here so
                  its status stays up to date.
                </p>
                <button
                  className="dss-claim-btn"
                  onClick={() => setShowClaimDialog(true)}
                  disabled={claiming}
                >
                  <CheckCircle2 style={{ width: "1rem", height: "1rem" }} />
                  {claiming ? "Marking…" : "Mark as Claimed"}
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

      {/* Mark as Claimed Confirm Dialog */}
      <ActionConfirmModal
        show={showClaimDialog}
        variant="success"
        onCancel={() => setShowClaimDialog(false)}
        onConfirm={() => { setShowClaimDialog(false); onClaim(doc.id); }}
        title="Mark Document as Claimed?"
        message={
          <>
            Mark <strong>{doc.type}</strong> as claimed? Only do this once
            you've received your document.
          </>
        }
        icon={<CheckCircle2 width={22} height={22} />}
        cancelText="Not Yet"
        confirmText={claiming ? "Marking…" : "Mark as Claimed"}
        confirmDisabled={claiming}
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
  const [claiming, setClaiming] = useState(false);
  const selectedDoc = selectedDocId
    ? (documents.find((d) => d.id === selectedDocId) ?? null)
    : null;

  // Requirements come from the request's own frozen service_snapshot (captured
  // at submit), so a later catalogue edit can't retro-change a finished request.
  const selectedDocRequirements = selectedDoc?.serviceSnapshot?.requirements ?? [];

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
          kind: r.kind,
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
          claimedDate: r.claimed_at || undefined,
          updatedAt: r.updated_at || undefined,
          isDigitalDelivery: !!r.is_digital_delivery,
          deliveryCode: r.delivery_code || undefined,
          serviceSnapshot: r.service_snapshot ?? null,
          facultyFiles: r.faculty_files || [],
          adminFiles: r.admin_files || [],
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

  // Owner self-claim (Ready -> Claimed), mirroring how a student marks an
  // appointment as done. doc.id is already prefixed ("req-12"/"sub-7") from
  // GET /documents and the /claim route parses that prefix, so pass it through.
  const handleClaim = async (docId) => {
    setClaiming(true);
    try {
      await api.patch(`/professor/documents/${docId}/claim`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "claimed" } : d)),
      );
      toast.success("Document marked as claimed.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to mark the document as claimed.");
    } finally {
      setClaiming(false);
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
            backLabel={detailOpenedFromExternal ? "Document Requests and Submissions" : "All Documents"}
            onBack={() =>
              detailOpenedFromExternal
                ? navigate("/professor/document-request")
                : setSelectedDocId(null)
            }
            onCancel={handleCancel}
            cancelling={cancelling}
            onClaim={handleClaim}
            claiming={claiming}
            requirements={selectedDocRequirements}
            reqLoading={loading && !selectedDoc}
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
              title="My Document Requests and Submissions"
              subtitle="Track all of your document requests and submissions."
              headerClassName="dss-header"
              breadcrumbClassName="page-breadcrumb"
              titleSectionClassName="dss-title-section"
              titleClassName="dss-title"
              subtitleClassName="dss-subtitle"
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
                                <FileText style={{ width: "1.15rem", height: "1.15rem", color: "#f97316" }} />
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
                                <FileText style={{ width: "1.15rem", height: "1.15rem", color: "#f97316" }} />
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
                                <FileText style={{ width: "1.15rem", height: "1.15rem", color: "#f97316" }} />
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
                                <FileText style={{ width: "1.15rem", height: "1.15rem", color: "#f97316" }} />
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
