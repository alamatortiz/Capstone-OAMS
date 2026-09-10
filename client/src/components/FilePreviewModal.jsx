import useLockBodyScroll from "../hooks/useLockBodyScroll";
import "./FilePreviewModal.css";

// Renders a client-origin blob: URL -- never an API URL (Bearer auth + the
// API's `frame-ancestors 'self'` CSP would block it). Images use <img>,
// PDFs use the browser's built-in <iframe> viewer; anything else offers a
// download. Pair with useFilePreview().
export default function FilePreviewModal({
  open,
  onClose,
  blobUrl,
  mimeType,
  filename,
  onDownload,
}) {
  useLockBodyScroll(open);
  if (!open) return null;

  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  // Hide the built-in PDF viewer's sidebar (navpanes=0 = Chromium,
  // pagemode=none = Firefox pdf.js) so the page gets the full width.
  const pdfSrc = isPdf ? `${blobUrl}#navpanes=0&pagemode=none` : blobUrl;

  return (
    <div className="fpm-overlay" onClick={onClose}>
      <div className="fpm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fpm-header">
          <span className="fpm-filename" title={filename}>
            {filename || "Attachment"}
          </span>
          <div className="fpm-header-actions">
            <button type="button" className="fpm-btn" onClick={onDownload}>
              Download
            </button>
            <button
              type="button"
              className="fpm-btn fpm-btn--icon"
              onClick={onClose}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
        <div className="fpm-body">
          {isImage && (
            <img src={blobUrl} alt={filename || "attachment"} className="fpm-media" />
          )}
          {isPdf && (
            <iframe src={pdfSrc} title={filename || "PDF preview"} className="fpm-frame" />
          )}
          {!isImage && !isPdf && (
            <div className="fpm-fallback">
              <p>This file can&apos;t be previewed here.</p>
              <button type="button" className="fpm-btn" onClick={onDownload}>
                Download {filename}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
