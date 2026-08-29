import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import "./adm-scan-document.css";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import api from "../../utils/api";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { toast } from "sonner";

const DOCUMENT_STATUS_LABELS = {
  generated: "Ready for Pickup",
  released: "Released — awaiting claim",
  claimed: "Claimed",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const QRScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
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
const PrintIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.3rem", height: "1.3rem" }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);


export default function AdminScanDocument() {
  const { user: authUser } = useAuth();

  // Scanner state
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verifiedDoc, setVerifiedDoc] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  useLockBodyScroll(modalOpen);
  const [scanToast, setScanToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [claiming, setClaiming] = useState(false);

  // Live camera scanner refs -- video element the camera stream is attached
  // to, an offscreen canvas used to sample frames for jsQR, the active
  // MediaStream (so it can be stopped), and the requestAnimationFrame handle
  // for the decode loop.
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // Load recent scans on mount
  useEffect(() => {
    if (!authUser) return;
    api.get("/admin/scan-document/recent")
      .then((res) => setRecentScans(res.data.scans ?? []))
      .catch((err) => console.error("Recent scans fetch error:", err));
  }, [authUser]);

  // Stop the camera stream + decode loop on unmount, in case the admin
  // navigates away mid-scan.
  useEffect(() => stopScanning, []);

  function stopScanning() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  }

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data) {
      stopScanning();
      setScanning(false);
      processCode(result.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleStartScanning = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      // Wait a tick for the <video> element to mount before attaching the stream.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg(
        "Couldn't access the camera. Please allow camera permission, or enter the QR code manually below.",
      );
    }
  };

  const handleStopScanning = () => {
    stopScanning();
    setScanning(false);
  };

  const processCode = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setErrorMsg("");
    try {
      const res = await api.get(`/admin/scan-document/verify/${encodeURIComponent(trimmed)}`);
      if (!res.data.found) {
        setErrorMsg("No document found for this QR code. Please check and try again.");
        return;
      }
      const doc = res.data.doc;
      setVerifiedDoc(doc);
      setModalOpen(true);
      setScanToast(true);
      setTimeout(() => setScanToast(false), 3000);
      setRecentScans((prev) => [
        {
          name: doc.studentName,
          docType: doc.documentType,
          tracking: doc.trackingNumber,
          time: "Just now",
          status: doc.status.toLowerCase(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      console.error("Scan verify error:", err);
      setErrorMsg("Scan failed. Please try again.");
    }
  };

  const handleVerify = () => {
    if (!manualCode.trim()) return;
    processCode(manualCode);
  };

  const handleMarkClaimed = async () => {
    if (!verifiedDoc?.requestId) return;
    setClaiming(true);
    try {
      const endpoint =
        verifiedDoc.requesterType === "faculty"
          ? "faculty-document-processing"
          : "document-processing";
      await api.patch(`/admin/${endpoint}/${verifiedDoc.requestId}/status`, {
        status: "claimed",
      });
      toast.success("Document marked as claimed.");
      setVerifiedDoc((prev) => prev && { ...prev, documentStatus: "claimed" });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to mark document as claimed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AdminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
      overlay={
        <>
          {/* Document Verification Modal */}
          {modalOpen && verifiedDoc && (
            <div className="asd-modal-overlay">
              <div className="asd-modal" onClick={(e) => e.stopPropagation()}>
                <div className="asd-modal-header">
                  <div>
                    <h2 className="asd-modal-title">Document Verification</h2>
                    <p className="asd-modal-subtitle">
                      Scanned document details and softcopy content
                    </p>
                  </div>
                  <button
                    className="asd-modal-close"
                    onClick={() => setModalOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="asd-modal-body">
                  {/* Verified Banner */}
                  <div
                    className={`asd-verified-banner ${verifiedDoc.status === "VALID" ? "asd-verified-banner--valid" : "asd-verified-banner--expired"}`}
                  >
                    {verifiedDoc.status === "VALID" ? (
                      <>
                        <CheckCircleIcon />
                        <div>
                          <p className="asd-verified-title">Document Verified ✓</p>
                          <p className="asd-verified-desc">
                            This document has been authenticated against university
                            records
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ width: "1.3rem", height: "1.3rem" }}
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                          <p className="asd-verified-title">Document Expired</p>
                          <p className="asd-verified-desc">
                            This document has passed its validity date
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Doc Meta Grid */}
                  <div className="asd-meta-grid">
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Tracking Number</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.trackingNumber}
                      </span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Document Type</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.documentType}
                      </span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Student Name</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.studentName}
                      </span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Student ID</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.studentId}
                      </span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">College</span>
                      <span className="asd-meta-value">{verifiedDoc.college}</span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Status</span>
                      <span
                        className={`asd-status-badge asd-status-${verifiedDoc.status.toLowerCase()}`}
                      >
                        {verifiedDoc.status}
                      </span>
                    </div>
                    {verifiedDoc.documentStatus && (
                      <div className="asd-meta-item">
                        <span className="asd-meta-label">Document Status</span>
                        <span className="asd-meta-value">
                          {DOCUMENT_STATUS_LABELS[verifiedDoc.documentStatus] ?? verifiedDoc.documentStatus}
                        </span>
                      </div>
                    )}
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Issue Date</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.issueDate}
                      </span>
                    </div>
                    <div className="asd-meta-item">
                      <span className="asd-meta-label">Valid Until</span>
                      <span className="asd-meta-value">
                        {verifiedDoc.validUntil}
                      </span>
                    </div>
                  </div>

                  {/* Document Content */}
                  {verifiedDoc.content && (
                    <div className="asd-doc-content-section">
                      <h3 className="asd-doc-content-title">Document Content</h3>
                      <pre className="asd-doc-content-pre">{verifiedDoc.content}</pre>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="asd-modal-footer-info">
                    {verifiedDoc.issuedBy && (
                      <p>
                        <strong>Issued by:</strong> {verifiedDoc.issuedBy}
                      </p>
                    )}
                    {verifiedDoc.authorizedSignatory && (
                      <p>
                        <strong>Authorized Signatory:</strong>{" "}
                        {verifiedDoc.authorizedSignatory}
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="asd-modal-actions">
                  {verifiedDoc.documentStatus === "released" && (
                    <button
                      className="asd-btn-claim"
                      onClick={handleMarkClaimed}
                      disabled={claiming}
                    >
                      <CheckCircleIcon /> {claiming ? "Marking…" : "Mark as Claimed"}
                    </button>
                  )}
                  <button className="asd-btn-print" onClick={() => window.print()}>
                    <PrintIcon /> Print
                  </button>
                  <button
                    className="asd-btn-close-modal"
                    onClick={() => setModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {scanToast && (
            <div className="asd-toast">
              <CheckCircleIcon />
              <span>QR Code scanned successfully!</span>
            </div>
          )}

        </>
      }
    >
        <div className="asd-page">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<QRScanIcon />}
            iconClassName="asd-title-icon"
            title="Document Scanner"
            subtitle="Scan QR codes to verify and view document details."
            headerClassName="asd-page-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="asd-title-section"
            titleClassName="asd-page-title"
            subtitleClassName="asd-page-subtitle"
          />

          <div className="asd-content-grid">
            {/* Left Column */}
            <div className="asd-left-col">
              {/* QR Code Scanner */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <QRScanIcon />
                  <div>
                    <h2 className="asd-card-title">QR Code Scanner</h2>
                    <p className="asd-card-subtitle">
                      Position the QR code within the scanner area
                    </p>
                  </div>
                </div>
                <div className="asd-scanner-viewport">
                  {scanning ? (
                    <div className="asd-scanner-active">
                      <div className="asd-scanner-frame asd-scanner-frame--scanning">
                        <video
                          ref={videoRef}
                          className="asd-scanner-video"
                          muted
                          playsInline
                        />
                        <div className="asd-scanner-line"></div>
                      </div>
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      <p className="asd-scanner-hint">
                        Point the camera at a QR code…
                      </p>
                    </div>
                  ) : (
                    <div className="asd-scanner-idle">
                      <div className="asd-scanner-frame">
                        <svg
                          viewBox="0 0 80 80"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            width: "5rem",
                            height: "5rem",
                            opacity: 0.5,
                          }}
                        >
                          <rect
                            x="5"
                            y="5"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="10"
                            y="10"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="5"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="58"
                            y="10"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="5"
                            y="53"
                            width="22"
                            height="22"
                            rx="2"
                            stroke="#6b7280"
                            strokeWidth="3"
                            fill="none"
                          />
                          <rect
                            x="10"
                            y="58"
                            width="12"
                            height="12"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="53"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="65"
                            y="53"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="53"
                            y="65"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                          <rect
                            x="65"
                            y="65"
                            width="10"
                            height="10"
                            fill="#6b7280"
                            opacity="0.6"
                          />
                        </svg>
                      </div>
                      <p className="asd-scanner-hint">
                        Click the button below to start scanning
                      </p>
                      <p className="asd-scanner-hint-small">
                        Or enter the QR code manually
                      </p>
                    </div>
                  )}
                </div>
                <button
                  className="asd-btn-scan"
                  onClick={scanning ? handleStopScanning : handleStartScanning}
                >
                  {scanning ? "Stop Scanning" : "Start Scanning"}
                </button>
              </div>

              {/* Manual QR Code Entry */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <FileText style={{ width: "1.2rem", height: "1.2rem" }} />
                  <div>
                    <h2 className="asd-card-title">Manual QR Code Entry</h2>
                    <p className="asd-card-subtitle">
                      Enter the QR code manually if scanner is unavailable
                    </p>
                  </div>
                </div>
                <div className="asd-manual-entry">
                  <div className="asd-input-row">
                    <input
                      type="text"
                      className="asd-input"
                      placeholder="Enter QR code (e.g., DOC-2026-0327-001-QR)"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value);
                        setErrorMsg("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    />
                    <button className="asd-btn-verify" onClick={handleVerify}>
                      Verify
                    </button>
                  </div>
                  {errorMsg && <p className="asd-error-msg">{errorMsg}</p>}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="asd-right-col">
              {/* Recent Scans */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    style={{ width: "1.2rem", height: "1.2rem" }}
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <div>
                    <h2 className="asd-card-title">Recent Scans</h2>
                    <p className="asd-card-subtitle">
                      Recently scanned documents
                    </p>
                  </div>
                </div>
                <div className="asd-recent-list">
                  {recentScans.map((scan, i) => (
                    <div key={scan.tracking} className="asd-recent-item">
                      <div className="asd-recent-info">
                        <div className="asd-recent-top">
                          <span className="asd-recent-name">{scan.name}</span>
                          <span
                            className={`asd-status-badge asd-status-${scan.status}`}
                          >
                            {scan.status}
                          </span>
                        </div>
                        <p className="asd-recent-doctype">{scan.docType}</p>
                        <div className="asd-recent-bottom">
                          <span className="asd-recent-tracking">
                            {scan.tracking}
                          </span>
                          <span className="asd-recent-time">{scan.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scanning Tips */}
              <div className="asd-card asd-tips-card">
                <h3 className="asd-tips-title">Scanning Tips</h3>
                <ul className="asd-tips-list">
                  <li>Ensure good lighting for optimal scanning</li>
                  <li>Hold the QR code steady within the frame</li>
                  <li>Keep the document flat and unwrinkled</li>
                  <li>Use manual entry if QR code is damaged</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
    </AdminPageShell>
  );
}
