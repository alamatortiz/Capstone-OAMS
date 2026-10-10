import { useState } from "react";
import { MessageSquare, ChevronDown } from "lucide-react";
import "./ActionsTakenToggle.css";

// Collapsed-by-default "Actions Taken" note for an appointment row in
// Transaction History -- closed so long notes don't stretch every row, open
// on click. `meta` is the already-formatted "last updated by ..." line.
export default function ActionsTakenToggle({ text, meta }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="att-box">
      <button
        type="button"
        className="att-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <MessageSquare size={14} />
        <span className="att-title">Actions Taken</span>
        <ChevronDown size={14} className={`att-chevron${open ? " att-chevron--open" : ""}`} />
      </button>
      {open && (
        <div className="att-body">
          <p className="att-text">{text}</p>
          {meta && <span className="att-meta">{meta}</span>}
        </div>
      )}
    </div>
  );
}
