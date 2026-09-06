import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import "./TutorialTour.css";

const MARGIN = 16;

// A step with no `selector` renders as a plain centered welcome card with
// no spotlight -- used for the intro step. Every other step's `selector`
// is looked up live via document.querySelector each time it's shown, so
// this works against real DOM nodes (sidebar nav links) rather than refs
// threaded in from elsewhere.
function computeTooltipPosition(rect, tooltipSize) {
  const { width: tw, height: th } = tooltipSize;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer sitting to the right of the target (fits the sidebar-nav use
  // case, which always sits at the left edge of the screen).
  let left = rect.right + MARGIN;
  let top = rect.top + rect.height / 2 - th / 2;

  if (left + tw > vw - MARGIN) {
    // No room to the right (narrow/mobile viewport) -- stack below instead,
    // then above if there's no room below either.
    left = rect.left;
    top = rect.bottom + MARGIN;
    if (top + th > vh - MARGIN) {
      top = rect.top - th - MARGIN;
    }
  }

  left = Math.max(MARGIN, Math.min(left, vw - tw - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - th - MARGIN));
  return { left, top };
}

export default function TutorialTour({ steps, isOpen, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const tooltipRef = useRef(null);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Recomputes both the spotlight cutout and the tooltip's position against
  // the step's real target element -- re-run on every step change and on
  // resize/scroll so it tracks a responsive sidebar instead of going stale.
  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const recompute = () => {
      const target = step?.selector ? document.querySelector(step.selector) : null;
      const tooltipSize = tooltipRef.current
        ? { width: tooltipRef.current.offsetWidth, height: tooltipRef.current.offsetHeight }
        : { width: 320, height: 180 };

      if (target) {
        const rect = target.getBoundingClientRect();
        setSpotlightRect(rect);
        setTooltipPos(computeTooltipPosition(rect, tooltipSize));
      } else {
        setSpotlightRect(null);
        // No target -- center the card in the viewport.
        setTooltipPos({
          left: window.innerWidth / 2 - tooltipSize.width / 2,
          top: window.innerHeight / 2 - tooltipSize.height / 2,
        });
      }
    };

    recompute();
    // A second pass after paint catches the tooltip's real measured size on
    // the very first render of a step (its ref is null on the first call).
    const raf = requestAnimationFrame(recompute);

    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [isOpen, stepIndex, step]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !step) return null;

  return (
    <div className={`tutorial-tour-overlay ${!spotlightRect ? "tutorial-tour-overlay--dim" : ""}`}>
      {spotlightRect && (
        <div
          className="tutorial-tour-spotlight"
          style={{
            left: spotlightRect.left - 6,
            top: spotlightRect.top - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}

      <div
        className="tutorial-tour-card"
        ref={tooltipRef}
        style={tooltipPos ? { left: tooltipPos.left, top: tooltipPos.top } : { opacity: 0 }}
      >
        <button
          type="button"
          className="tutorial-tour-close"
          onClick={onClose}
          aria-label="Close tutorial"
        >
          <X size={16} />
        </button>

        <p className="tutorial-tour-step-count">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="tutorial-tour-title">{step.title}</h3>
        <p className="tutorial-tour-description">{step.description}</p>

        <div className="tutorial-tour-dots">
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={`tutorial-tour-dot ${i === stepIndex ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="tutorial-tour-actions">
          <button type="button" className="tutorial-tour-skip" onClick={onClose}>
            Skip
          </button>
          <div className="tutorial-tour-nav-btns">
            {stepIndex > 0 && (
              <button
                type="button"
                className="tutorial-tour-btn tutorial-tour-btn--outline"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="tutorial-tour-btn tutorial-tour-btn--primary"
              onClick={() => (isLast ? onClose() : setStepIndex((i) => i + 1))}
            >
              {isLast ? "Got it!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
