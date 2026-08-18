import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./AccordionItem.css";

export default function AccordionItem({
  summary,
  children,
  defaultExpanded = false,
  isExpanded,
  onToggle,
  className = "",
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const controlled = isExpanded !== undefined;
  const expanded = controlled ? isExpanded : internalExpanded;
  const detailId = useId();

  const toggle = () => {
    if (controlled) {
      onToggle?.(!expanded);
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={`accordion-item ${expanded ? "accordion-item-expanded" : ""} ${className}`}
    >
      <button
        type="button"
        className="accordion-item-trigger"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={toggle}
      >
        <span className="accordion-item-summary">{summary}</span>
        <ChevronDown className="accordion-item-chevron" />
      </button>
      {expanded && (
        <div id={detailId} className="accordion-item-detail">
          {children}
        </div>
      )}
    </div>
  );
}
