import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import "./adm-document-processing.css";
import api from "../../utils/api";
import { toast } from "sonner";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import FilterSelect from "../../components/FilterSelect";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { useLiveRefetch } from "../../hooks/useLiveRefetch";

const DOCUMENT_LIVE_EVENTS = [
  "document:new-request",
  "document:status-updated",
  "document:cancelled",
];
import { formatManilaDate, getManilaDateString } from "../../utils/dateTime";
import { COLLEGES } from "../../data/colleges";

// ── Icons ─────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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
    <circle
      cx="12"
      cy="17"
      r="0.5"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
    />
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
const ChevronDownIcon = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const SOURCES = [
  { id: "student", label: "Students" },
  { id: "faculty", label: "Faculty" },
];
const REQUEST_ENDPOINTS = {
  student: "document-processing",
  faculty: "faculty-document-processing",
};

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "request", label: "Requests" },
  { value: "submission", label: "Submissions" },
];
const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const fullCollegeName = (abbrev) =>
  COLLEGES.find((c) => c.abbreviation === abbrev)?.name ?? abbrev;

// Per-status empty-state copy, mirroring the icon+header+description pattern
// stud-documents.jsx/prof-documents.jsx use per-tab (no shared config object
// exists there either -- each hardcodes its own copy; this is the same idea
// applied to this page's 8 status tabs instead).
const EMPTY_STATE_META = {
  all: {
    Icon: FileText,
    title: "No Documents Found",
    desc: "There are no document requests or submissions yet.",
  },
  pending: {
    Icon: AlertCircleIcon,
    title: "No Pending Documents",
    desc: "There are no pending document requests or submissions.",
  },
  processing: {
    Icon: ClockIcon,
    title: "No Documents Processing",
    desc: "There are no documents currently being processed.",
  },
  ready: {
    Icon: CheckCircleIcon,
    title: "No Documents Ready",
    desc: "There are no documents ready for release.",
  },
  released: {
    Icon: CheckCircleIcon,
    title: "No Released Documents",
    desc: "There are no records of released documents.",
  },
  claimed: {
    Icon: CheckCircleIcon,
    title: "No Claimed Documents",
    desc: "There are no records of claimed documents.",
  },
  rejected: {
    Icon: XCircleIcon,
    title: "No Rejected Documents",
    desc: "There are no records of rejected documents.",
  },
  cancelled: {
    Icon: XCircleIcon,
    title: "No Cancelled Documents",
    desc: "There are no records of cancelled documents.",
  },
};

// Mirrors the server's limits (server/middleware/upload.js) -- purely
// advisory here for the running-total UI, the server stays authoritative.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";
const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

export default function AdminDocumentProcessing() {
  // ── Document processing state ─────────────────────────────────────────────
  const [source, setSource] = useState("student");
  const [documents, setDocuments] = useState([]);
  // Starts true (not false) so the very first load still shows a loading
  // state -- fetchDocuments itself no longer re-arms this on later calls.
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  // Default to "all" since Today/This Week/This Month all hide anything
  // older — admins can narrow down once they actually want a recent slice.
  const [dateRange, setDateRange] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  useLockBodyScroll(showDetailsModal);
  const [processingNotes, setProcessingNotes] = useState("");
  const [officialCode, setOfficialCode] = useState("");

  // ── Return-file attachments (submission source only) ────────────────────
  const [returnFiles, setReturnFiles] = useState([]); // { id, file }[] queued to send back to the student
  const addReturnFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const accepted = [];
    let count = returnFiles.length;
    let bytes = returnFiles.reduce((sum, f) => sum + f.file.size, 0);
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
    if (accepted.length > 0) setReturnFiles((prev) => [...prev, ...accepted]);
    if (tooLarge > 0) {
      toast.error(
        `${tooLarge} file(s) skipped — each file must be ${formatBytes(MAX_FILE_BYTES)} or smaller`,
      );
    }
    if (overBudget > 0) {
      toast.error(`${overBudget} file(s) skipped — attachment limit reached`);
    }
  };
  const removeReturnFile = (id) =>
    setReturnFiles((prev) => prev.filter((f) => f.id !== id));

  // Fetches one document-submission file's bytes on demand and opens/
  // downloads it -- mirrors adm-announcements.jsx's openAttachment().
  const openSubmissionFile = async (submissionId, file) => {
    try {
      const res = await api.get(
        `/admin/document-submissions/${submissionId}/files/${file.id}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      if (
        file.mimeType?.startsWith("image/") ||
        file.mimeType === "application/pdf"
      ) {
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
  };

  // ── Status-change confirmation ───────────────────────────────────────────
  const [confirmStatus, setConfirmStatus] = useState(null); // target status or null
  const [confirmSaving, setConfirmSaving] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  // Guards against a stale response landing after a newer one -- switching
  // the source tab quickly (Students -> Faculty) re-triggers this on every
  // change, and without this guard an earlier tab's slower response could
  // resolve after a later tab's and silently overwrite the list with the
  // wrong audience's documents while the UI still shows the newer tab
  // selected.
  const requestIdRef = useRef(0);
  const fetchDocuments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const requestEndpoint = REQUEST_ENDPOINTS[source];
      const [reqRes, subRes] = await Promise.all([
        api.get(`/admin/${requestEndpoint}`),
        api.get(`/admin/document-submissions`),
      ]);
      if (requestId !== requestIdRef.current) return;
      const requests = (reqRes.data.documents ?? []).map((d) => ({
        ...d,
        _kind: "request",
        _endpoint: requestEndpoint,
      }));
      // Submissions come back for both student- and faculty-submitters in
      // one list (see GET /admin/document-submissions) -- split by the
      // audience currently selected so Students/Faculty each only see their
      // own sent documents, same as the request half already does.
      const submissions = (subRes.data.documents ?? [])
        .filter((d) => d.submitterType === source)
        .map((d) => ({
          ...d,
          _kind: "submission",
          _endpoint: "document-submissions",
        }));
      setDocuments([...requests, ...submissions]);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load document requests:", err);
      toast.error("Failed to load document requests");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Live updates (also reconciles on socket reconnect). ──
  useLiveRefetch(DOCUMENT_LIVE_EVENTS, fetchDocuments);

  // ── Date buckets ──────────────────────────────────────────────────────────
  // Monday-anchored this-week/next-week windows (same pattern as
  // stud-appointments.jsx) plus a full-current-month window. `nextWeek` is
  // only used by deadlineLabel()'s "Needed By" annotation below; the Date
  // Range filter itself only needs today/thisWeek/thisMonth.
  const weekDates = useMemo(() => {
    const toDateStr = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const [y, m, d] = getManilaDateString().split("-").map(Number);
    const today = new Date(y, m - 1, d);
    const dow = today.getDay(); // 0=Sun..6=Sat
    const monday = new Date(today);
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const buildWeek = (weekOffset) =>
      Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(monday);
        dt.setDate(dt.getDate() + weekOffset * 7 + i);
        return toDateStr(dt);
      });
    const daysInMonth = new Date(y, m, 0).getDate();
    const thisMonth = Array.from({ length: daysInMonth }, (_, i) =>
      toDateStr(new Date(y, m - 1, i + 1)),
    );
    return {
      today: toDateStr(today),
      thisWeek: buildWeek(0),
      nextWeek: buildWeek(1),
      thisMonth,
    };
  }, []);

  // Still used for the per-card "Needed By: ... (This Week)" annotation --
  // unrelated to the Date Range filter below, which filters by requestDate.
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

  const dateFiltered = searchFiltered.filter((doc) => {
    if (dateRange === "all") return true;
    if (dateRange === "today") return doc.requestDate === weekDates.today;
    if (dateRange === "week")
      return weekDates.thisWeek.includes(doc.requestDate);
    if (dateRange === "month")
      return weekDates.thisMonth.includes(doc.requestDate);
    return true;
  });

  const baseFiltered =
    typeFilter === "all"
      ? dateFiltered
      : dateFiltered.filter((doc) => doc._kind === typeFilter);

  const filteredDocuments =
    activeTab === "all"
      ? baseFiltered
      : baseFiltered.filter((doc) => doc.status === activeTab);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleViewDetails = (doc) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes || "");
    setOfficialCode(doc.officialCode || "");
    setReturnFiles([]);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedDocument) return;
    const isSubmission = selectedDocument._kind === "submission";
    const needsCode = newStatus === "ready" && selectedDocument.requiresCoding;
    // Re-sending the document's own current status is how "Attach Files"
    // works without also changing the status -- same endpoint doubles as
    // both actions, mirroring PUT /admin/announcements/:id.
    const isFileOnlyUpdate =
      isSubmission && newStatus === selectedDocument.status;
    // GET /admin/document-submissions prefixes ids ("sub-42") so this list
    // stays merge-safe alongside other sources elsewhere (e.g. the admin
    // dashboard widget) -- but the PATCH route itself expects the raw
    // numeric submission_id, so the prefix must be stripped here.
    const rawId = isSubmission
      ? selectedDocument.id.replace(/^sub-/, "")
      : selectedDocument.id;
    try {
      if (isSubmission) {
        const body = new FormData();
        body.append("status", newStatus);
        body.append("notes", processingNotes);
        returnFiles.forEach((f) => body.append("returnFiles", f.file));
        await api.patch(
          `/admin/${selectedDocument._endpoint}/${rawId}/status`,
          body,
        );
      } else {
        await api.patch(
          `/admin/${selectedDocument._endpoint}/${rawId}/status`,
          {
            status: newStatus,
            notes: processingNotes,
            ...(needsCode ? { officialCode } : {}),
          },
        );
      }
      toast.success(
        isFileOnlyUpdate
          ? "Files attached successfully"
          : `Document marked as ${newStatus}`,
      );
      setShowDetailsModal(false);
      setSelectedDocument(null);
      setProcessingNotes("");
      setOfficialCode("");
      setReturnFiles([]);
      await fetchDocuments();
    } catch (err) {
      toast.error(
        err?.response?.data?.error || "Failed to update document status",
      );
    }
  };

  // "Generate Document" prototype -- an alternative to Mark as Released,
  // only ever offered for requests (never submissions) at "ready". Its own
  // endpoint, not handleUpdateStatus's PATCH .../status, since it takes no
  // body and does more than a plain status change server-side (attaches a
  // QR/text code, flags the request as a digital delivery).
  const handleGenerateDocument = async () => {
    if (!selectedDocument) return;
    try {
      await api.patch(`/admin/${selectedDocument._endpoint}/${selectedDocument.id}/generate`);
      toast.success("Document generated and sent digitally");
      setShowDetailsModal(false);
      setSelectedDocument(null);
      await fetchDocuments();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to generate document");
    }
  };

  const handleAttachReturnFiles = () => {
    if (!selectedDocument || returnFiles.length === 0) return;
    handleUpdateStatus(selectedDocument.status);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedDocument(null);
    setProcessingNotes("");
    setOfficialCode("");
    setReturnFiles([]);
  };

  // "Mark as Ready" needs a non-blank official code first when the document
  // type requires coding -- caught here before opening the generic confirm
  // dialog, which has no room for inline field validation.
  const handleMarkReadyClick = () => {
    if (selectedDocument?.requiresCoding && !officialCode.trim()) {
      toast.error(
        "Enter the official code before marking this document ready.",
      );
      return;
    }
    setConfirmStatus("ready");
  };

  const runConfirmStatusChange = async () => {
    if (!confirmStatus) return;
    setConfirmSaving(true);
    if (confirmStatus === "generate") {
      await handleGenerateDocument();
    } else {
      await handleUpdateStatus(confirmStatus);
    }
    setConfirmSaving(false);
    setConfirmStatus(null);
  };

  const DOC_CONFIRM_META =
    selectedDocument &&
    {
      processing: {
        title: "Start Processing?",
        message: (
          <>
            Start processing the{" "}
            <strong>{selectedDocument.documentType}</strong> request for{" "}
            <strong>{selectedDocument.requesterName}</strong>?
          </>
        ),
        confirmText: "Start Processing",
        icon: <ClockIcon />,
        variant: "success",
      },
      generate: {
        title: "Generate Document?",
        message: (
          <>
            Skip the physical hand-off and generate a QR + text code for the{" "}
            <strong>{selectedDocument.documentType}</strong> request for{" "}
            <strong>{selectedDocument.requesterName}</strong>? They'll confirm
            receipt themselves from their own Documents page -- this is a
            testing prototype, not the normal release process.
          </>
        ),
        confirmText: "Generate Document",
        icon: <CheckCircleIcon />,
        variant: "success",
      },
      ready: {
        title: "Mark as Ready?",
        message: (
          <>
            Mark the <strong>{selectedDocument.documentType}</strong> request
            for <strong>{selectedDocument.requesterName}</strong> as ready for
            pickup?
          </>
        ),
        confirmText: "Mark as Ready",
        icon: <CheckCircleIcon />,
        variant: "success",
      },
      rejected: {
        title: "Reject Request?",
        message: (
          <>
            Reject the <strong>{selectedDocument.documentType}</strong> request
            from <strong>{selectedDocument.requesterName}</strong>? This action
            cannot be undone.
          </>
        ),
        confirmText: "Reject Request",
        icon: <XCircleIcon />,
      },
      claimed:
        selectedDocument._kind === "submission"
          ? {
              title: "Mark as Received?",
              message: (
                <>
                  Confirm that <strong>{selectedDocument.documentType}</strong>{" "}
                  from <strong>{selectedDocument.requesterName}</strong> has
                  been received and processed by the office?
                </>
              ),
              confirmText: "Mark as Received",
              icon: <CheckCircleIcon />,
              variant: "success",
            }
          : {
              title: "Mark as Claimed?",
              message: (
                <>
                  Confirm that the{" "}
                  <strong>{selectedDocument.documentType}</strong> request for{" "}
                  <strong>{selectedDocument.requesterName}</strong> has been
                  handed to the correct recipient, per office procedure?
                </>
              ),
              confirmText: "Mark as Claimed",
              icon: <CheckCircleIcon />,
              variant: "success",
            },
    }[confirmStatus];

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          cls: "adp-badge-pending",
          Icon: AlertCircleIcon,
        };
      case "processing":
        return {
          label: "Processing",
          cls: "adp-badge-processing",
          Icon: ClockIcon,
        };
      case "ready":
        return {
          label: "Ready",
          cls: "adp-badge-ready",
          Icon: CheckCircleIcon,
        };
      case "released":
        return {
          label: "Released",
          cls: "adp-badge-released",
          Icon: CheckCircleIcon,
        };
      case "claimed":
        return {
          label: "Claimed",
          cls: "adp-badge-claimed",
          Icon: CheckCircleIcon,
        };
      case "rejected":
        return {
          label: "Rejected",
          cls: "adp-badge-rejected",
          Icon: XCircleIcon,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          cls: "adp-badge-cancelled",
          Icon: XCircleIcon,
        };
      default:
        return { label: status, cls: "", Icon: ClockIcon };
    }
  };

  // One fixed status list for the merged (requests + submissions) view.
  // Submissions never populate 'ready'/'released' -- nothing is physically
  // generated or picked up in that direction, claimed is reached directly
  // from processing -- but that's just an empty tab for them, not a reason
  // to hide the tab from the merged list.
  const TABS = [
    "all",
    "pending",
    "processing",
    "ready",
    "released",
    "claimed",
    "rejected",
    "cancelled",
  ];

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
                    <h2 className="adp-modal-title">
                      {selectedDocument._kind === "submission"
                        ? "Document Submission Details"
                        : "Document Request Details"}
                    </h2>
                  </div>
                  <button
                    className="adp-modal-close-btn"
                    onClick={handleCloseModal}
                    aria-label="Close modal"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="adp-modal-body">
                  <div className="adp-modal-hero">
                    <p className="adp-modal-hero-label">
                      {selectedDocument._kind === "submission"
                        ? "Title"
                        : "Document Type"}
                    </p>
                    <p className="adp-modal-hero-title">
                      {selectedDocument.documentType}
                    </p>
                    <p className="adp-modal-hero-purpose">
                      {selectedDocument.purpose}
                    </p>
                  </div>
                  <div className="adp-modal-grid">
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Tracking Number</label>
                      <p className="adp-modal-value">
                        {selectedDocument.trackingNumber}
                      </p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Status</label>
                      <div className="adp-modal-value">
                        <span
                          className={`adp-status-badge ${getStatusMeta(selectedDocument.status).cls}`}
                        >
                          {getStatusMeta(selectedDocument.status).label}
                        </span>
                      </div>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Name</label>
                      <p className="adp-modal-value">
                        {selectedDocument.requesterName}
                      </p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">
                        {selectedDocument.requesterIdLabel}
                      </label>
                      <p className="adp-modal-value">
                        {selectedDocument.requesterIdValue}
                      </p>
                    </div>
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">College</label>
                      <p className="adp-modal-value">
                        {selectedDocument.college}
                      </p>
                    </div>
                    {selectedDocument.copies != null && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">
                          Number of Copies
                        </label>
                        <p className="adp-modal-value">
                          {selectedDocument.copies}
                        </p>
                      </div>
                    )}
                    {selectedDocument.neededBy && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Needed By</label>
                        <p className="adp-modal-value">
                          {formatManilaDate(selectedDocument.neededBy)}
                        </p>
                      </div>
                    )}
                    <div className="adp-modal-field">
                      <label className="adp-modal-label">Request Date</label>
                      <p className="adp-modal-value">
                        {formatManilaDate(selectedDocument.requestDate)}
                      </p>
                    </div>
                    {selectedDocument.releasedDate && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Released Date</label>
                        <p className="adp-modal-value">
                          {formatManilaDate(selectedDocument.releasedDate)}
                        </p>
                      </div>
                    )}
                    {selectedDocument.claimedDate && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Claimed Date</label>
                        <p className="adp-modal-value">
                          {formatManilaDate(selectedDocument.claimedDate)}
                        </p>
                      </div>
                    )}
                    {selectedDocument.officialCode && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Official Code</label>
                        <p className="adp-modal-value">
                          {selectedDocument.officialCode}
                        </p>
                      </div>
                    )}
                    {selectedDocument.deliveryCode && (
                      <div className="adp-modal-field">
                        <label className="adp-modal-label">Delivery Code</label>
                        <p className="adp-modal-value">
                          {selectedDocument.deliveryCode}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedDocument._kind === "submission" && (
                    <div className="adp-modal-notes-wrap">
                      <label className="adp-modal-label">
                        Files from Student
                      </label>
                      {selectedDocument.studentFiles?.length > 0 ? (
                        <div className="adp-attach-list">
                          {selectedDocument.studentFiles.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className="adp-attach-chip"
                              onClick={() =>
                                openSubmissionFile(
                                  selectedDocument.id.replace(/^sub-/, ""),
                                  f,
                                )
                              }
                            >
                              <FileText /> {f.filename}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="adp-modal-value">No files attached.</p>
                      )}

                      <label
                        className="adp-modal-label"
                        style={{ marginTop: "0.75rem" }}
                      >
                        Return Files{" "}
                        <span className="adp-attach-budget">
                          ({returnFiles.length}/{MAX_FILES} files,{" "}
                          {formatBytes(
                            returnFiles.reduce(
                              (sum, f) => sum + f.file.size,
                              0,
                            ),
                          )}
                          /{formatBytes(MAX_TOTAL_BYTES)})
                        </span>
                      </label>
                      {selectedDocument.adminFiles?.length > 0 && (
                        <div className="adp-attach-list">
                          {selectedDocument.adminFiles.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className="adp-attach-chip"
                              onClick={() =>
                                openSubmissionFile(
                                  selectedDocument.id.replace(/^sub-/, ""),
                                  f,
                                )
                              }
                            >
                              <FileText /> {f.filename}
                            </button>
                          ))}
                        </div>
                      )}
                      {returnFiles.length > 0 && (
                        <div className="adp-attach-list">
                          {returnFiles.map((f) => (
                            <div
                              key={f.id}
                              className="adp-attach-chip adp-attach-chip--queued"
                            >
                              <span className="adp-attach-filename">
                                <FileText /> {f.file.name}
                              </span>
                              <button
                                type="button"
                                className="adp-attach-remove"
                                aria-label={`Remove ${f.file.name}`}
                                onClick={() => removeReturnFile(f.id)}
                              >
                                <CloseIcon />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {(selectedDocument.status === "pending" ||
                        selectedDocument.status === "processing") && (
                        <>
                          <input
                            type="file"
                            multiple
                            accept={ATTACHMENT_ACCEPT}
                            className="adp-attach-input"
                            disabled={returnFiles.length >= MAX_FILES}
                            onChange={(e) => {
                              addReturnFiles(e.target.files);
                              e.target.value = "";
                            }}
                          />
                          <p className="adp-attach-hint">
                            Each file up to {formatBytes(MAX_FILE_BYTES)}.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {selectedDocument.status === "processing" &&
                    selectedDocument.requiresCoding && (
                      <div className="adp-modal-notes-wrap">
                        <label
                          className="adp-modal-label"
                          htmlFor="adp-official-code"
                        >
                          Official Code{" "}
                          <span style={{ color: "#dc2626" }}>*</span>
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
                    <label className="adp-modal-label" htmlFor="adp-notes">
                      Processing Notes
                    </label>
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
                      <button
                        className="adp-modal-btn adp-modal-btn--primary"
                        onClick={() => setConfirmStatus("processing")}
                      >
                        Start Processing
                      </button>
                    )}
                    {selectedDocument.status === "processing" &&
                      selectedDocument._kind === "submission" && (
                        <button
                          className="adp-modal-btn adp-modal-btn--success"
                          onClick={() => setConfirmStatus("claimed")}
                        >
                          Mark as Received
                        </button>
                      )}
                    {selectedDocument.status === "processing" &&
                      selectedDocument._kind !== "submission" && (
                        <button
                          className="adp-modal-btn adp-modal-btn--success"
                          onClick={handleMarkReadyClick}
                        >
                          Mark as Ready
                        </button>
                      )}
                    {selectedDocument.status === "ready" && (
                      <button
                        className="adp-modal-btn adp-modal-btn--primary"
                        onClick={() => handleUpdateStatus("released")}
                      >
                        Mark as Released
                      </button>
                    )}
                    {selectedDocument.status === "ready" &&
                      selectedDocument._kind !== "submission" && (
                        <button
                          className="adp-modal-btn adp-modal-btn--outline"
                          onClick={() => setConfirmStatus("generate")}
                        >
                          Generate Document
                        </button>
                      )}
                    {selectedDocument.status === "released" && (
                      <button
                        className="adp-modal-btn adp-modal-btn--primary"
                        onClick={() => setConfirmStatus("claimed")}
                      >
                        Mark as Claimed
                      </button>
                    )}
                    {(selectedDocument.status === "pending" ||
                      selectedDocument.status === "processing") && (
                      <button
                        className="adp-modal-btn adp-modal-btn--danger"
                        onClick={() => setConfirmStatus("rejected")}
                      >
                        Reject Request
                      </button>
                    )}
                    {selectedDocument._kind === "submission" &&
                      (selectedDocument.status === "pending" ||
                        selectedDocument.status === "processing") && (
                        <button
                          className="adp-modal-btn adp-modal-btn--outline"
                          onClick={handleAttachReturnFiles}
                          disabled={returnFiles.length === 0}
                        >
                          Attach Files
                        </button>
                      )}
                    <button
                      className="adp-modal-btn adp-modal-btn--outline"
                      onClick={handleCloseModal}
                    >
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
            confirmText={
              confirmSaving ? "Please wait…" : DOC_CONFIRM_META?.confirmText
            }
            confirmDisabled={confirmSaving}
            variant={DOC_CONFIRM_META?.variant ?? "danger"}
          />
        </>
      }
    >
      <div className="adp-content">
        <PageHeader
          breadcrumb={
            <Link to="/admin/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />
              Home
            </Link>
          }
          icon={<FileText className="adp-icon-lg" />}
          iconClassName="adp-title-icon"
          title="Document Processing"
          subtitle="Process and manage document requests and submissions within your department."
          headerClassName="adp-page-header"
          breadcrumbClassName="page-breadcrumb"
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

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-header">
            <div className="filters-header-text">
              <h3 className="filters-title">Document Processes Filter</h3>
              <p className="filters-description">
                Search and filter document requests and submissions.
              </p>
            </div>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label" htmlFor="adp-search">
                Search
              </label>
              <div className="filter-search-wrapper">
                <SearchIcon />
                <input
                  id="adp-search"
                  type="text"
                  className="filter-search-input"
                  placeholder="Search for document requests or submissions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <FilterSelect
              id="adp-type-filter"
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={TYPE_OPTIONS}
              chevronIcon={<ChevronDownIcon className="filter-chevron" />}
            />

            <FilterSelect
              id="adp-date-range-filter"
              label="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={DATE_OPTIONS}
              chevronIcon={<ChevronDownIcon className="filter-chevron" />}
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
            (() => {
              const meta = EMPTY_STATE_META[activeTab] ?? EMPTY_STATE_META.all;
              const EmptyIcon = meta.Icon;
              return (
                <div className="adp-empty-state">
                  <div className="adp-empty-icon">
                    <EmptyIcon />
                  </div>
                  <h3 className="adp-empty-title">{meta.title}</h3>
                  <p className="adp-empty-desc">{meta.desc}</p>
                </div>
              );
            })()
          ) : (
            filteredDocuments.map((doc) => {
              const { label, cls, Icon } = getStatusMeta(doc.status);
              const doneStatuses = ["claimed", "rejected", "cancelled"];
              const isOverdue =
                doc.neededBy &&
                !doneStatuses.includes(doc.status) &&
                doc.neededBy < getManilaDateString();
              const cardTitle =
                doc._kind === "submission"
                  ? `Document Submission: ${doc.documentType}`
                  : `${doc.documentType} Request`;
              return (
                <div key={doc.id} className="adp-doc-card">
                  <div className="adp-doc-card-inner">
                    <div className="adp-doc-file-icon">
                      <FileText />
                    </div>
                    <div className="adp-doc-info">
                      <h3 className="adp-doc-title">{cardTitle}</h3>
                      <p className="adp-doc-college">
                        {fullCollegeName(doc.college)}
                      </p>
                      <div className="adp-doc-requester-row">
                        <span className="adp-doc-requester-name">
                          {doc.requesterName}
                        </span>
                        <span className="adp-id-badge">
                          {doc.requesterIdValue}
                        </span>
                      </div>
                      <p className="adp-doc-purpose">{doc.purpose}</p>
                      {(doc.neededBy || doc.processedBy) && (
                        <div className="adp-doc-tags-row">
                          {doc.neededBy && (
                            <span
                              className={`adp-status-badge ${isOverdue ? "adp-badge-rejected" : "adp-badge-pending"}`}
                            >
                              {isOverdue ? "Overdue — " : "Needed By: "}
                              {formatManilaDate(doc.neededBy)}
                              {deadlineLabel(doc.neededBy) &&
                                ` (${deadlineLabel(doc.neededBy)})`}
                            </span>
                          )}
                          {doc.processedBy && (
                            <span className="adp-doc-date">
                              By: {doc.processedBy}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="adp-doc-action">
                      <button
                        className="adp-view-btn"
                        onClick={() => handleViewDetails(doc)}
                      >
                        <EyeIcon />
                        <span>View</span>
                      </button>
                      <div className="adp-doc-action-badges">
                        <span className="adp-tracking-badge">
                          {doc.trackingNumber}
                        </span>
                        <span className={`adp-status-badge ${cls}`}>
                          <Icon />
                          {label}
                        </span>
                      </div>
                      <span className="adp-doc-date">
                        <CalendarIcon />
                        Requested: {formatManilaDate(doc.requestDate)}
                      </span>
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
