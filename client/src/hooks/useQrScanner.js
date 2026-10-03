import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Camera-based QR scanning, lifted out of adm-scan-document.jsx so the
// student queue-join screen can reuse the exact same decode loop instead of
// growing a second copy that drifts.
//
// The caller owns what a decoded string MEANS -- this hook only turns the
// camera into strings and hands them to `onDecode`. That split is why it can
// serve both the admin document-claim flow and queue joining.
//
// Mechanics worth knowing:
// - Frames are sampled onto an offscreen canvas because jsQR wants raw pixel
//   data, which a <video> element can't give directly.
// - The loop is single-shot: it stops itself on the first successful decode,
//   so there's no need for a de-duplication guard the way the Expo scanner
//   needs one (that fires repeatedly for the same code).
// - The stream is always torn down on unmount; forgetting that leaves the
//   camera light on after navigating away.
export function useQrScanner({ onDecode }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // Kept in a ref so the rAF loop never closes over a stale callback; the
  // caller is free to pass an inline arrow without restarting the camera.
  const onDecodeRef = useRef(onDecode);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  });

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    setScanning(false);
  }, [teardown]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data) {
      teardown();
      setScanning(false);
      onDecodeRef.current?.(result.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [teardown]);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      // Wait a frame for the <video> to mount before attaching the stream.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch (err) {
      console.error("Camera access error:", err);
      // Denial is the common case and needs to be actionable, not silent --
      // on a phone the camera prompt is easy to dismiss by accident.
      setError(
        "Couldn't access the camera. Please allow camera permission in your browser settings and try again.",
      );
      setScanning(false);
    }
  }, [tick]);

  useEffect(() => teardown, [teardown]);

  return { scanning, error, setError, start, stop, videoRef, canvasRef };
}

export default useQrScanner;
