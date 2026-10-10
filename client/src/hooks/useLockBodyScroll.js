import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

// Locks page scroll behind a modal while isLocked is true. Reference-counted
// so stacked modals (and React StrictMode's dev-mode double-invoke) don't
// clobber each other's restore value.
export default function useLockBodyScroll(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isLocked]);
}
