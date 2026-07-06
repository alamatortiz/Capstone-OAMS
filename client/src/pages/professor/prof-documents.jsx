import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import ProfessorSidebar from "../../components/ProfessorSidebar";
import PageHeader from "../../components/PageHeader";
import "./prof-dashboard.css";
import "./prof-documents.css";
import { toast } from "sonner";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const ChatIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
const InfoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="7" x2="12" y2="13"></line>
    <circle
      cx="12"
      cy="17"
      r="0.5"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
    ></circle>
  </svg>
);
const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const AlertCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v5"></path>
    <circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const XCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const FileTextIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.5rem", height: "1.5rem" }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export default function ProfessorDocumentRequest() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with document requests today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Modal states ────────────────────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [requestsTab, setRequestsTab] = useState("active");

  // ── Document services + my requests ──────────────────────────────────────────
  const [documentTypes, setDocumentTypes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const fetchDocumentTypes = async () => {
    try {
      const res = await api.get("/faculty/document-services");
      setDocumentTypes(
        res.data.map((s) => ({
          id: s.service_id,
          name: s.service_name,
          description: s.description ?? "",
          processingTime: s.processing_time ?? "TBD",
          availability: s.status === "active" ? "Available" : "Unavailable",
          availabilityType: s.status === "active" ? "available" : "unavailable",
          requirements: s.requirements ?? [],
        })),
      );
    } catch {
      toast.error("Failed to load document types");
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await api.get("/faculty/my-document-requests");
      setMyRequests(
        res.data.map((r) => ({
          id: String(r.request_id),
          type: r.service_name,
          purpose: r.purpose,
          requestedDate: r.created_at?.slice(0, 10),
          status: r.status,
          trackingNumber: r.tracking_number,
          additionalNotes: r.notes,
          estimatedCompletion: null,
          processingNotes: null,
        })),
      );
    } catch {
      // table may not exist yet; silently ignore
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
    fetchMyRequests();
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("certificate of employment"))
      return "The Certificate of Employment takes 3-5 business days to process. Requirements: Valid ID and Request form.";
    if (i.includes("service record"))
      return "The Service Record takes 5-7 business days. Requirements: Valid ID, Request form, and Clearance.";
    if (i.includes("teaching load"))
      return "The Teaching Load Certificate takes 2-3 business days. Requirements: Valid ID and Request form.";
    if (i.includes("bir") || i.includes("income tax"))
      return "The Income Tax Form (BIR 2316) is available January-April only and takes 7-10 business days.";
    if (i.includes("status") || i.includes("track"))
      return `You have ${myRequests.length} request(s). Check the 'My Requests' section below for status updates.`;
    if (i.includes("how") || i.includes("request"))
      return "To request a document: click 'Request Document', select the type, fill in the purpose, and submit. You'll receive a tracking number.";
    return "I can help with document requests, processing times, and tracking. What do you need?";
  };

  const handleSubmitRequest = async () => {
    if (!documentType || !purpose.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    const selectedService = documentTypes.find((d) => d.name === documentType);
    try {
      await api.post("/faculty/my-document-requests", {
        service_id: selectedService?.id,
        request_type: documentType,
        purpose,
        notes: additionalNotes,
      });
      await fetchMyRequests();
      setShowRequestModal(false);
      setDocumentType("");
      setPurpose("");
      setAdditionalNotes("");
      toast.success("Document request submitted successfully!");
    } catch {
      toast.error("Failed to submit request");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "pdr-status-badge pdr-status-pending";
      case "processing":
        return "pdr-status-badge pdr-status-processing";
      case "generated":
        return "pdr-status-badge pdr-status-ready";
      case "released":
        return "pdr-status-badge pdr-status-completed";
      case "rejected":
        return "pdr-status-badge pdr-status-rejected";
      default:
        return "pdr-status-badge pdr-status-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "generated":
      case "released":
        return <CheckCircleIcon />;
      case "rejected":
        return <XCircleIcon />;
      default:
        return <ClockIcon />;
    }
  };

  const getStatusLabel = (status) => {
    if (status === "generated") return "Ready for Pickup";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Banner styles were authored against generic keys (ready/completed);
  // map the real DB status values onto them.
  const bannerStatusKey = (status) => {
    if (status === "generated") return "ready";
    if (status === "released") return "completed";
    return status;
  };

  const formatDate = (dateStr, opts) =>
    new Date(dateStr).toLocaleDateString(
      "en-US",
      opts || { year: "numeric", month: "long", day: "numeric" },
    );

  const activeRequests = myRequests.filter(
    (r) => r.status !== "released" && r.status !== "rejected",
  );
  const completedRequests = myRequests.filter(
    (r) => r.status === "released" || r.status === "rejected",
  );
  const visibleRequests =
    requestsTab === "active" ? activeRequests : completedRequests;

  return (
    <div className="dashboard-with-sidebar">
      <ProfessorSidebar />

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        <div className="pdr-page">
          {/* Page Header */}
          <PageHeader
            breadcrumb={
              <Link to="/professor/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<DocumentIconNav />}
            iconClassName="pdr-title-icon"
            title="Document Requests"
            subtitle="Request official documents and track your submissions"
          />

          <button
            className="pdr-request-btn"
            onClick={() => setShowRequestModal(true)}
          >
            <PlusIcon />
            Request Document
          </button>

          {/* Instructions */}
          <div className="pdr-info-card">
            <div className="pdr-info-title">
              <InfoIcon />
              <span>Document Request Process</span>
            </div>
            <ol className="pdr-info-list">
              <li>
                Select the type of document you need from the available options
                below
              </li>
              <li>
                Click the "Request Document" button and fill in the necessary
                details
              </li>
              <li>Your request will be processed by the HR/Records office</li>
              <li>
                Track the status of your request in the "My Requests" section
              </li>
              <li>Once ready, you will be notified to claim your document</li>
              <li>Bring a valid ID when claiming your document</li>
            </ol>
          </div>

          {/* Available Document Types */}
          <div className="pdr-section">
            <div className="pdr-doc-types-grid">
              {documentTypes.map((doc) => (
                <div key={doc.name} className="pdr-doc-card">
                  <div className="pdr-doc-card-header">
                    <div>
                      <h3 className="pdr-doc-name">{doc.name}</h3>
                      <p className="pdr-doc-desc">{doc.description}</p>
                    </div>
                    <span
                      className={`pdr-availability-badge pdr-avail-${doc.availabilityType}`}
                    >
                      {doc.availability}
                    </span>
                  </div>
                  <div className="pdr-doc-processing">
                    <ClockIcon />
                    <span className="pdr-processing-label">
                      Processing Time:
                    </span>
                    <span className="pdr-processing-time">
                      {doc.processingTime}
                    </span>
                  </div>
                  <div className="pdr-doc-requirements">
                    <p className="pdr-req-label">Requirements:</p>
                    {doc.requirements.map((req) => (
                      <div key={req} className="pdr-req-item">
                        <CheckCircleIcon />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Requests */}
          <div className="pdr-section">
            <h2 className="pdr-section-title">My Requests</h2>

            <div className="pdr-tabs-container">
              <div className="pdr-tabs-list">
                <button
                  className={`pdr-tab ${requestsTab === "active" ? "active" : ""}`}
                  onClick={() => setRequestsTab("active")}
                >
                  <AlertCircleIcon /> Active Requests{" "}
                  <span className="pdr-tab-count">{activeRequests.length}</span>
                </button>
                <button
                  className={`pdr-tab ${requestsTab === "completed" ? "active" : ""}`}
                  onClick={() => setRequestsTab("completed")}
                >
                  <CheckCircleIcon /> Completed{" "}
                  <span className="pdr-tab-count">
                    {completedRequests.length}
                  </span>
                </button>
              </div>

              <div className="pdr-requests-list">
                {visibleRequests.length === 0 ? (
                  <div className="pdr-empty-state">
                    <p>
                      {requestsTab === "active"
                        ? 'No active requests. Click "Request Document" to get started.'
                        : "Your released and rejected requests will appear here."}
                    </p>
                  </div>
                ) : (
                  visibleRequests.map((req) => (
                    <div key={req.id} className="pdr-request-card">
                      <div className="pdr-request-icon">
                        <FileTextIcon />
                      </div>
                      <div className="pdr-request-body">
                        <div className="pdr-request-top">
                          <div className="pdr-request-info">
                            <h3 className="pdr-request-type">{req.type}</h3>
                            <p className="pdr-request-purpose">
                              Purpose: {req.purpose}
                            </p>
                          </div>
                          <span className="pdr-tracking-badge">
                            {req.trackingNumber}
                          </span>
                        </div>
                        <div className="pdr-request-meta">
                          <span className="pdr-requested-date">
                            Requested:{" "}
                            {new Date(req.requestedDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "numeric",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          <span className={getStatusBadgeClass(req.status)}>
                            {getStatusIcon(req.status)}
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="pdr-view-btn"
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowDetailsModal(true);
                        }}
                      >
                        <EyeIcon />
                        View Details
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── AI Chatbot ── */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}>
                  <div className="message-content">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`chat-fab ${chatOpen ? "hidden" : ""}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>

      {/* ── Request Document Modal ── */}
      {showRequestModal && (
        <div className="pdr-modal-overlay">
          <div className="pdr-modal">
            <div className="pdr-modal-header">
              <h2 className="pdr-modal-title">Request Document</h2>
              <p className="pdr-modal-desc">
                Fill in the details for your document request
              </p>
              <button
                className="pdr-modal-close"
                onClick={() => setShowRequestModal(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="pdr-modal-body">
              <div className="pdr-form-group">
                <label className="pdr-form-label">
                  Document Type{" "}
                  <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <select
                  className="pdr-form-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pdr-form-group">
                <label className="pdr-form-label">
                  Purpose <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  className="pdr-form-input"
                  type="text"
                  placeholder="e.g., Bank loan application, Promotion requirements"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              <div className="pdr-form-group">
                <label className="pdr-form-label">Additional Notes</label>
                <textarea
                  className="pdr-form-textarea"
                  placeholder="Any special instructions or urgency notes..."
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
              {documentType && (
                <div className="pdr-modal-info-box">
                  {(() => {
                    const dt = documentTypes.find(
                      (d) => d.name === documentType,
                    );
                    return dt ? (
                      <>
                        <p className="pdr-modal-info-label">
                          Processing Time: <strong>{dt.processingTime}</strong>
                        </p>
                        <p className="pdr-modal-info-label">
                          Requirements: {dt.requirements.join(", ")}
                        </p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="pdr-modal-footer">
              <button
                className="pdr-btn-cancel"
                onClick={() => setShowRequestModal(false)}
              >
                Cancel
              </button>
              <button className="pdr-btn-submit" onClick={handleSubmitRequest}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {showDetailsModal && selectedRequest && (
        <div className="pdr-modal-overlay">
          <div className="pdr-modal pdr-modal-lg">
            <div className="pdr-modal-header">
              <h2 className="pdr-modal-title">Document Request Details</h2>
              <p className="pdr-modal-desc">
                Complete information about your document request
              </p>
              <button
                className="pdr-modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="pdr-modal-body">
              {/* Status Banner */}
              <div
                className={`pdr-status-banner pdr-status-banner-${bannerStatusKey(selectedRequest.status)}`}
              >
                <div
                  className={`pdr-status-icon-circle pdr-status-icon-${bannerStatusKey(selectedRequest.status)}`}
                >
                  {getStatusIcon(selectedRequest.status)}
                </div>
                <div>
                  <p className="pdr-status-banner-title">
                    Status: {getStatusLabel(selectedRequest.status)}
                  </p>
                  <p className="pdr-status-banner-sub">
                    {selectedRequest.status === "generated" &&
                      "Your document is ready for pickup"}
                    {selectedRequest.status === "processing" &&
                      "Your request is currently being processed"}
                    {selectedRequest.status === "pending" &&
                      "Your request is waiting to be processed"}
                    {selectedRequest.status === "released" &&
                      "Your document has been released"}
                    {selectedRequest.status === "rejected" &&
                      "Your request has been rejected"}
                  </p>
                </div>
              </div>

              {/* Request Info Grid */}
              <div className="pdr-details-grid">
                <div>
                  <p className="pdr-details-label">Tracking Number</p>
                  <p className="pdr-details-value">
                    {selectedRequest.trackingNumber}
                  </p>
                </div>
                <div>
                  <p className="pdr-details-label">Document Type</p>
                  <p className="pdr-details-value">{selectedRequest.type}</p>
                </div>
                <div className="pdr-details-full">
                  <p className="pdr-details-label">Purpose</p>
                  <p className="pdr-details-value">{selectedRequest.purpose}</p>
                </div>
                <div>
                  <p className="pdr-details-label">Request Date</p>
                  <p className="pdr-details-value">
                    {formatDate(selectedRequest.requestedDate)}
                  </p>
                </div>
                {selectedRequest.estimatedCompletion && (
                  <div>
                    <p className="pdr-details-label">Estimated Completion</p>
                    <p className="pdr-details-value">
                      {formatDate(selectedRequest.estimatedCompletion)}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.additionalNotes && (
                <div className="pdr-details-notes">
                  <p className="pdr-details-label">Your Notes</p>
                  <div className="pdr-notes-box">
                    {selectedRequest.additionalNotes}
                  </div>
                </div>
              )}

              {selectedRequest.processingNotes && (
                <div className="pdr-details-notes">
                  <p className="pdr-details-label">Processing Updates</p>
                  <div className="pdr-notes-box pdr-notes-blue">
                    {selectedRequest.processingNotes}
                  </div>
                </div>
              )}

              {/* Reminders */}
              <div className="pdr-reminders-box">
                <h4 className="pdr-reminders-title">Important Reminders</h4>
                <ul className="pdr-reminders-list">
                  <li>Bring a valid government-issued ID when claiming</li>
                  <li>Processing office: HR/Records Office, Ground Floor</li>
                  <li>Office hours: Monday-Friday, 8:00 AM - 5:00 PM</li>
                  <li>Documents not claimed within 30 days will be archived</li>
                </ul>
              </div>
            </div>
            <div className="pdr-modal-footer">
              <button
                className="pdr-btn-cancel"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
