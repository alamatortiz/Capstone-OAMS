import { useState, useCallback } from "react";
import { toast } from "sonner";
import api from "../utils/api";

// Attachment endpoints are Bearer-auth'd (no cookie) and the API's helmet CSP
// sets `frame-ancestors 'self'`, so an <img>/<iframe> pointed straight at the
// API URL would 401 / be frame-blocked. Everything here previews the
// client-origin blob: URL instead.
const isPreviewable = (mime) =>
  typeof mime === "string" &&
  (mime.startsWith("image/") || mime === "application/pdf");

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
  const [preview, setPreview] = useState(null); // { blobUrl, mimeType, filename } | null

  const openFile = useCallback(async (path, file, onError) => {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      if (isPreviewable(file?.mimeType)) {
        setPreview({ blobUrl, mimeType: file.mimeType, filename: file.filename });
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
