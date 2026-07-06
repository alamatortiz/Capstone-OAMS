import "./ActionConfirmModal.css";

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
}) {
  if (!show) return null;

  return (
    <div className="acm-overlay">
      <div className="acm-modal">
        {icon && <div className="acm-icon">{icon}</div>}
        <h3 className="acm-title">{title}</h3>
        <div className="acm-message">{message}</div>
        <div className="acm-actions">
          <button
            className="acm-cancel"
            onClick={onCancel}
            disabled={confirmDisabled}
          >
            {cancelText}
          </button>
          <button
            className="acm-confirm"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
