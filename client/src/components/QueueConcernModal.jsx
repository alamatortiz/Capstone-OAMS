import { useState } from "react";
import { HelpCircle } from "lucide-react";
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
  // When present, this is a Universal Service Queue: the student must pick
  // which specific service they're here for before joining.
  universalServices = null,
}) {
  const [concern, setConcern] = useState("");
  const [pickedServiceId, setPickedServiceId] = useState("");
  const [wasShown, setWasShown] = useState(show);

  useLockBodyScroll(show);

  // Only clear once the modal actually closes (success or cancel) -- not on
  // every confirm click, so a failed join (modal stays open for retry) keeps
  // what the student already typed instead of silently wiping it. Adjusted
  // during render (React's documented alternative to an effect for "reset
  // state when a prop changes") rather than in a useEffect, which would
  // cause an extra, avoidable render on every close.
  if (show !== wasShown) {
    setWasShown(show);
    if (!show) {
      setConcern("");
      setPickedServiceId("");
    }
  }

  if (!show) return null;

  const needsServicePick = Array.isArray(universalServices);
  const canConfirm = !submitting && (!needsServicePick || !!pickedServiceId);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(concern.trim(), needsServicePick ? Number(pickedServiceId) : null);
  };

  const handleCancel = () => {
    setConcern("");
    setPickedServiceId("");
    onCancel();
  };

  return (
    <div className="qcm-overlay">
      <div className="qcm-modal">
        <div className="qcm-icon">
          <HelpCircle width={22} height={22} />
        </div>
        <h3 className="qcm-title">{title}</h3>
        {message && <div className="qcm-message">{message}</div>}
        {needsServicePick && (
          <div className="qcm-field">
            <label className="qcm-label">Which service are you here for? *</label>
            <select
              className="qcm-select"
              value={pickedServiceId}
              onChange={(e) => setPickedServiceId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select a service…</option>
              {universalServices.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.serviceName}
                </option>
              ))}
            </select>
          </div>
        )}
        <textarea
          className="qcm-textarea"
          placeholder="Briefly describe why you're joining this queue (optional)"
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          rows={3}
          maxLength={255}
          autoFocus={!needsServicePick}
          disabled={submitting}
        />
        <div className="qcm-actions">
          <button className="qcm-cancel" onClick={handleCancel} disabled={submitting}>
            {cancelText}
          </button>
          <button className="qcm-confirm" onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? "Joining…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
