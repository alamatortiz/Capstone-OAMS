import { useEffect } from "react";

const EDGE_ZONE_PX = 24;
const SWIPE_THRESHOLD_PX = 60;

// Opens the mobile sidebar drawer when the user swipes right starting from
// the very left edge of the screen, mirroring native app drawer gestures.
// Only listens while enabled (i.e. drawer closed) so it never fights with
// the drawer's own touch scrolling once open.
export default function useEdgeSwipeOpen(onOpen, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    let startX = null;
    let startY = null;
    let tracking = false;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX > EDGE_ZONE_PX) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const handleTouchMove = (e) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
        return;
      }
      if (dx > SWIPE_THRESHOLD_PX) {
        tracking = false;
        onOpen();
      }
    };

    const handleTouchEnd = () => {
      tracking = false;
      startX = null;
      startY = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onOpen, enabled]);
}
