import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import { DOCX_MIME } from "../hooks/useFilePreview";
import "./FilePreviewModal.css";

// Renders a client-origin blob: URL -- never an API URL (Bearer auth + the
// API's `frame-ancestors 'self'` CSP would block it). Images use <img>,
// PDFs use the browser's built-in <iframe> viewer, .docx renders via
// docx-preview (a client-side-only converter -- no file content is sent
// anywhere external, unlike Google Docs Viewer/Office Online, which would
// mean uploading the document to a third party and contradicts the Privacy
// Policy's "data stays within University-operated infrastructure" line).
// Anything else offers a download. Pair with useFilePreview().
export default function FilePreviewModal({
  open,
  onClose,
  blobUrl,
  blob,
  mimeType,
  filename,
  onDownload,
}) {
  useLockBodyScroll(open);
  const docxContainerRef = useRef(null);
  const [docxError, setDocxError] = useState(false);

  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const isDocx = mimeType === DOCX_MIME;

  useEffect(() => {
    if (!open || !isDocx || !blob || !docxContainerRef.current) return;
    setDocxError(false);
    const container = docxContainerRef.current;
    container.innerHTML = "";
    renderAsync(blob, container, undefined, {
      ignoreWidth: true, // fill the modal's width instead of the page's own paper width
      ignoreHeight: false,
    }).catch(() => setDocxError(true));
  }, [open, isDocx, blob]);

  if (!open) return null;

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
          {isDocx && !docxError && (
            <div className="fpm-docx-scroll">
              <div ref={docxContainerRef} className="fpm-docx-container" />
            </div>
          )}
          {isDocx && docxError && (
            <div className="fpm-fallback">
              <p>This document couldn&apos;t be previewed here.</p>
              <button type="button" className="fpm-btn" onClick={onDownload}>
                Download {filename}
              </button>
            </div>
          )}
          {!isImage && !isPdf && !isDocx && (
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
