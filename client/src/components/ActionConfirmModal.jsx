import { createPortal } from "react-dom";
import "./ActionConfirmModal.css";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

export default function ActionConfirmModal({
  show,
  onConfirm,
  onCancel,
  title,
  message,
  icon,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmDisabled = false,
  variant = "danger",
  centered = false,
}) {
  useLockBodyScroll(show);

  if (!show) return null;

  // Portaled to document.body -- otherwise this fixed-position overlay would
  // be confined to (and jump around with) any ancestor card that applies a
  // transform on hover, since a transform creates a new containing block for
  // position:fixed descendants.
  return createPortal(
    <div className="acm-overlay">
      <div className="acm-modal">
        {icon && <div className={`acm-icon acm-icon--${variant}`}>{icon}</div>}
        <h3 className="acm-title">{title}</h3>
        <div className={`acm-message${centered ? " acm-message--centered" : ""}`}>{message}</div>
        <div className="acm-actions">
          <button
            className={`acm-cancel acm-cancel--${variant}`}
            onClick={onCancel}
            disabled={confirmDisabled}
          >
            {cancelText}
          </button>
          <button
            className={`acm-confirm acm-confirm--${variant}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
