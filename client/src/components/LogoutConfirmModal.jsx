import "./LogoutConfirmModal.css";

const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

export default function LogoutConfirmModal({ show, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-icon">
          <LogOutIcon />
        </div>
        <h3 className="logout-modal-title">Confirm Logout</h3>
        <p className="logout-modal-message">
          Are you sure you want to log out? Any unsaved changes will be lost.
        </p>
        <div className="logout-modal-actions">
          <button className="logout-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="logout-modal-confirm" onClick={onConfirm}>
            <LogOutIcon />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
