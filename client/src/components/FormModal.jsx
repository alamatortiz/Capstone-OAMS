import "./FormModal.css";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

export default function FormModal({
  show,
  title,
  description,
  icon,
  onCancel,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  submitDisabled = false,
  submitting = false,
  children,
}) {
  useLockBodyScroll(show);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitDisabled || submitting) return;
    onSubmit();
  };

  return (
    <div className="fm-overlay">
      <div className="fm-modal">
        <div className="fm-header">
          <div className="fm-title-row">
            {icon && <div className="fm-icon">{icon}</div>}
            <div>
              <h3 className="fm-title">{title}</h3>
              {description && <p className="fm-description">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            className="fm-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="fm-body" onSubmit={handleSubmit}>
          {children}

          <div className="fm-footer">
            <button
              type="button"
              className="fm-cancel"
              onClick={onCancel}
              disabled={submitting}
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className="fm-submit"
              disabled={submitDisabled || submitting}
            >
              {submitting ? "Saving..." : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
