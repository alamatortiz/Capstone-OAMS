import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import "./admin-scan-document.css";
import AdminSidebar from "../../components/AdminSidebar";
import ChatWidget from "../../components/ChatWidget";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
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
const QRScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
  </svg>
);
const FileEntryIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.2rem", height: "1.2rem" }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
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
const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
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
  const [scanToast, setScanToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentScans, setRecentScans] = useState([]);

  // Load recent scans on mount
  useEffect(() => {
    if (!authUser) return;
    api.get("/admin/scan-document/recent")
      .then((res) => setRecentScans(res.data.scans ?? []))
      .catch((err) => console.error("Recent scans fetch error:", err));
  }, [authUser]);

  const generateBotResponse = () =>
    "I can help with scanning documents and verifying QR codes. Enter a QR code manually below or use the scanner.";

  const handleStartScanning = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      processCode("REQ-00002-QR");
    }, 2500);
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

  const handleQuickCode = (code) => {
    setManualCode(code);
    processCode(code);
  };

  return (
    <div className="admin-dashboard-with-sidebar">
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-dashboard-main">
        <div className="asd-page">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="asd-page-header">
            <div className="asd-title-section">
              <div className="asd-title-icon">
                <QRScanIcon />
              </div>
              <div>
                <h1 className="asd-page-title">Document Scanner</h1>
                <p className="asd-page-subtitle">
                  Scan QR codes to verify and view document details
                </p>
              </div>
            </div>
          </div>

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
                        <div className="asd-scanner-line"></div>
                      </div>
                      <p className="asd-scanner-hint">Scanning…</p>
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
                  onClick={handleStartScanning}
                  disabled={scanning}
                >
                  {scanning ? "Scanning…" : "Start Scanning"}
                </button>
              </div>

              {/* Manual QR Code Entry */}
              <div className="asd-card">
                <div className="asd-card-header">
                  <FileEntryIcon />
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
                  <p className="asd-quick-label">Quick test codes:</p>
                  <div className="asd-quick-codes">
                    {[
                      "REQ-00002-QR",
                      "REQ-00005-QR",
                    ].map((code) => (
                      <button
                        key={code}
                        className="asd-quick-code-btn"
                        onClick={() => handleQuickCode(code)}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
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
                    <div key={i} className="asd-recent-item">
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
      </main>

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
              <button className="asd-btn-print" onClick={() => window.print()}>
                <PrintIcon /> Print
              </button>
              <button className="asd-btn-download">
                <DownloadIcon /> Download
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

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
        getBotResponse={generateBotResponse}
      />
    </div>
  );
}
