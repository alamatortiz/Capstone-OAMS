import { useEffect, useRef, useState } from "react";
import api from "../utils/api";
import "./AttachmentChip.css";

// Hide the built-in PDF viewer's thumbnail/outline sidebar so the page area
// gets the full width. `navpanes=0` is Chromium's param, `pagemode=none` is
// pdf.js's (Firefox); each ignores the other harmlessly.
const PDF_VIEW_PARAMS = "#navpanes=0&pagemode=none";

// Renders an attachment inline so it's viewable without a click:
//   * image  -> a small thumbnail beside the filename (chip)
//   * pdf    -> a short embedded <iframe> (browser's built-in viewer) under a
//               filename header; the header opens the full-size modal
//   * other  -> the caller's icon (chip); click downloads / opens the modal
// The preview bytes are fetched once on mount from the client origin and
// shown via a blob: URL (Bearer-auth + the API's `frame-ancestors 'self'`
// CSP rule out pointing an <img>/<iframe> straight at the API URL).
export default function AttachmentChip({
  path,
  mimeType,
  filename,
  className = "",
  icon,
  onOpen,
}) {
  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const wantsBlob = isImage || isPdf;

  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const urlRef = useRef(null);

  useEffect(() => {
    if (!wantsBlob) return undefined;
    let cancelled = false;
    api
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        urlRef.current = URL.createObjectURL(res.data);
        setBlobUrl(urlRef.current);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [wantsBlob, path]);

  // ── PDF: filename header + inline embedded viewer ──
  if (isPdf && !failed) {
    return (
      <div className="attach-pdf">
        <button
          type="button"
          className={`attach-pdf-head ${className}`}
          onClick={onOpen}
          title={`Open ${filename}`}
        >
          <span className="attach-chip-icon">{icon}</span>
          <span className="attach-chip-name">{filename}</span>
          <span className="attach-pdf-open">Open ↗</span>
        </button>
        {blobUrl ? (
          <iframe
            src={`${blobUrl}${PDF_VIEW_PARAMS}`}
            title={filename}
            className="attach-pdf-frame"
          />
        ) : (
          <div className="attach-pdf-frame attach-pdf-frame--loading">
            Loading preview…
          </div>
        )}
      </div>
    );
  }

  // ── Image / other: chip ──
  const showThumb = isImage && blobUrl && !failed;
  return (
    <button
      type="button"
      className={`attach-chip ${showThumb ? "attach-chip--has-thumb" : ""} ${className}`}
      onClick={onOpen}
      title={filename}
    >
      {showThumb ? (
        <img src={blobUrl} alt={filename} className="attach-chip-thumb" />
      ) : (
        <span className="attach-chip-icon">{icon}</span>
      )}
      <span className="attach-chip-name">{filename}</span>
    </button>
  );
}
