import { useState } from "react";
import "./ActionConfirmModal.css";
import "./QueueReasonModal.css";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

// Prompts the admin for a required reason before pausing or stopping a
// queue. Students see this reason (paused banner / "queue stopped" toast +
// transaction history), so it must not be empty.
export default function QueueReasonModal({
  show,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  submitting = false,
}) {
  const [reason, setReason] = useState("");

  useLockBodyScroll(show);

  if (!show) return null;

  const trimmed = reason.trim();

  const handleConfirm = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <div className="acm-overlay">
      <div className="acm-modal">
        <h3 className="acm-title">{title}</h3>
        {message && <div className="acm-message">{message}</div>}
        <textarea
          className="qrm-textarea"
          placeholder="Enter a reason (required)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          disabled={submitting}
        />
        <div className="acm-actions" style={{ marginTop: "1rem" }}>
          <button className="acm-cancel" onClick={handleCancel} disabled={submitting}>
            {cancelText}
          </button>
          <button
            className="acm-confirm acm-confirm--danger"
            onClick={handleConfirm}
            disabled={submitting || !trimmed}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
