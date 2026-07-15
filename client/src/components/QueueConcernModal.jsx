import { useState } from "react";
import "./QueueConcernModal.css";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

// Prompts the student for an optional concern before joining a queue. Unlike
// QueueReasonModal (admin pause/stop reasons, required text), this concern
// is optional -- confirming with empty text is allowed.
export default function QueueConcernModal({
  show,
  onConfirm,
  onCancel,
  title = "What's your concern?",
  message,
  confirmText = "Join Queue",
  cancelText = "Cancel",
  submitting = false,
}) {
  const [concern, setConcern] = useState("");

  useLockBodyScroll(show);

  if (!show) return null;

  const handleConfirm = () => {
    onConfirm(concern.trim());
    setConcern("");
  };

  const handleCancel = () => {
    setConcern("");
    onCancel();
  };

  return (
    <div className="qcm-overlay">
      <div className="qcm-modal">
        <h3 className="qcm-title">{title}</h3>
        {message && <div className="qcm-message">{message}</div>}
        <textarea
          className="qcm-textarea"
          placeholder="Briefly describe why you're joining this queue (optional)"
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          rows={3}
          maxLength={255}
          autoFocus
          disabled={submitting}
        />
        <div className="qcm-actions">
          <button className="qcm-cancel" onClick={handleCancel} disabled={submitting}>
            {cancelText}
          </button>
          <button className="qcm-confirm" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Joining…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
