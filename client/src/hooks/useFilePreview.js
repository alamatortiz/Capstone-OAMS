import { useState, useCallback } from "react";
import { toast } from "sonner";
import api from "../utils/api";

// Attachment endpoints are Bearer-auth'd (no cookie) and the API's helmet CSP
// sets `frame-ancestors 'self'`, so an <img>/<iframe> pointed straight at the
// API URL would 401 / be frame-blocked. Everything here previews the
// client-origin blob: URL instead.
//
// .docx (modern, OOXML) previews via docx-preview -- a client-side-only
// renderer (no third-party viewer service involved, unlike Google Docs
// Viewer/Office Online, which would mean uploading the file to an outside
// company and contradicts the Privacy Policy's "data stays within
// University-operated infrastructure" statement). Legacy binary .doc isn't
// supported by that library and still falls back to a plain download.
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const isPreviewable = (mime) =>
  typeof mime === "string" &&
  (mime.startsWith("image/") || mime === "application/pdf" || mime === DOCX_MIME);

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Shared "open an attachment" behaviour: image/PDF -> preview modal state,
// anything else -> straight download. `openFile(path, { mimeType, filename }, onError?)`.
export default function useFilePreview() {
  const [preview, setPreview] = useState(null); // { blobUrl, blob, mimeType, filename } | null

  const openFile = useCallback(async (path, file, onError) => {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      if (isPreviewable(file?.mimeType)) {
        // `blob` (the raw Blob, not just its object URL) is kept alongside
        // blobUrl specifically for docx-preview below -- it renders from a
        // Blob/ArrayBuffer directly, not from a URL.
        setPreview({ blobUrl, blob: res.data, mimeType: file.mimeType, filename: file.filename });
      } else {
        triggerDownload(blobUrl, file?.filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch {
      if (onError) onError();
      else toast.error("Failed to load file");
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.blobUrl);
      return null;
    });
  }, []);

  const downloadPreview = useCallback(() => {
    setPreview((p) => {
      if (p) triggerDownload(p.blobUrl, p.filename);
      return p;
    });
  }, []);

  return { preview, openFile, closePreview, downloadPreview };
}
