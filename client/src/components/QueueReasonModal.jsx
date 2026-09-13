import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./ActionConfirmModal.css";
import "./QueueReasonModal.css";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

// Prompts for a free-text reason/comment. Originally built for the admin's
// required pause/stop-queue reason (students see it in a paused banner /
// "queue stopped" toast + transaction history, so it must not be empty by
// default), and now also reused for the professor's optional appointment
// comment editor (prof-appointments.jsx) -- `required`/`icon`/`variant`/
// `initialValue` all default to that original required-reason behavior, so
// none of this component's other call sites (admin queue pause/stop,
// professor-unavailable toggle, admin document rejection) need any changes.
export default function QueueReasonModal({
  show,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  submitting = false,
  icon = null,
  variant = "danger",
  required = true,
  initialValue = "",
  placeholder = "Enter a reason (required)...",
  accentTheme,
}) {
  const [reason, setReason] = useState(initialValue);

  useLockBodyScroll(show);

  // Re-sync the field to initialValue each time the modal opens, since the
  // component instance may stay mounted across show/hide toggles rather than
  // remounting (which would otherwise leave a stale draft from the last time
  // it was opened, or lose a freshly-passed initialValue on first open).
  useEffect(() => {
    if (show) setReason(initialValue ?? "");
  }, [show, initialValue]);

  if (!show) return null;

  const trimmed = reason.trim();

  const handleConfirm = () => {
    if (required && !trimmed) return;
    onConfirm(trimmed);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  // Portaled to document.body -- otherwise this fixed-position overlay would
  // be confined to (and jump around with) any ancestor card that applies a
  // transform on hover, since a transform creates a new containing block for
  // position:fixed descendants.
  return createPortal(
    <div className="acm-overlay">
      <div className="acm-modal">
        {icon && <div className={`acm-icon acm-icon--${variant}`}>{icon}</div>}
        <h3 className="acm-title">{title}</h3>
        {message && <div className="acm-message">{message}</div>}
        <textarea
          className={`qrm-textarea${accentTheme === "blue" ? " qrm-textarea--blue" : ""}`}
          placeholder={placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          disabled={submitting}
        />
        <div className="acm-actions" style={{ marginTop: "1rem" }}>
          <button
            className={`acm-cancel${accentTheme === "blue" ? " acm-cancel--hover-blue" : ""}`}
            onClick={handleCancel}
            disabled={submitting}
          >
            {cancelText}
          </button>
          <button
            className={`acm-confirm acm-confirm--${variant}`}
            onClick={handleConfirm}
            disabled={submitting || (required && !trimmed)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
