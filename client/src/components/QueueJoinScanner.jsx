import { useEffect, useState } from "react";
import { useQrScanner } from "../hooks/useQrScanner";
import "./QueueJoinScanner.css";

// The student-side half of on-site queueing. Opens the camera, and the first
// decoded code is handed straight to `onScanned` -- there is deliberately no
// "are you sure?" step, because the act of walking up and scanning IS the
// confirmation. A second prompt would just be a tax on someone standing at
// the counter.
//
// Camera work is shared with the admin document scanner via useQrScanner;
// this component owns only the overlay chrome and the submitting state.
export default function QueueJoinScanner({ open, onClose, onScanned, submitting, errorMessage }) {
  const [hasScanned, setHasScanned] = useState(false);

  const { scanning, error: cameraError, start, stop, videoRef, canvasRef } = useQrScanner({
    onDecode: (code) => {
      // The decode loop stops itself on first hit, but guard anyway: a
      // double-fire here would post two join requests.
      if (hasScanned) return;
      setHasScanned(true);
      onScanned(code);
    },
  });

  useEffect(() => {
    if (open) {
      setHasScanned(false);
      start();
    } else {
      stop();
    }
    // `start`/`stop` are stable useCallbacks from the hook.
  }, [open, start, stop]);

  // A failed join (expired code, already queued, blocked) must let them try
  // again without reopening the whole sheet.
  useEffect(() => {
    if (errorMessage) setHasScanned(false);
  }, [errorMessage]);

  if (!open) return null;

  const retry = () => {
    setHasScanned(false);
    start();
  };

  return (
    <div className="qjs-overlay" role="dialog" aria-modal="true" aria-label="Scan QR to join the queue">
      <div className="qjs-sheet">
        <div className="qjs-header">
          <h2 className="qjs-title">Scan to Join</h2>
          <button type="button" className="qjs-close" onClick={onClose} aria-label="Close scanner">
            ×
          </button>
        </div>

        <div className="qjs-viewport">
          <video ref={videoRef} className="qjs-video" muted playsInline />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {scanning && <div className="qjs-frame" aria-hidden="true" />}
          {submitting && <div className="qjs-busy" role="status">Joining…</div>}
        </div>

        {cameraError && <p className="qjs-error">{cameraError}</p>}
        {errorMessage && <p className="qjs-error">{errorMessage}</p>}

        {!cameraError && !errorMessage && (
          <p className="qjs-hint">
            Point your camera at the QR code shown at the office counter.
          </p>
        )}

        {(cameraError || errorMessage) && !submitting && (
          <button type="button" className="qjs-retry" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
