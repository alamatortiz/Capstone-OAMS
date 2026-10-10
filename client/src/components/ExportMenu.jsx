import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown } from "lucide-react";
import "./ExportMenu.css";

// Shared CSV/PDF export dropdown for the three transaction pages (student,
// professor, admin) -- built once so a second export format never has to be
// wired into each page's own bespoke button/menu again. `triggerClassName`
// lets each page keep its existing button look (color, padding) instead of
// this component imposing its own; only the caret + dropdown list are new.
export default function ExportMenu({
  label = "Export",
  triggerClassName = "",
  disabled = false,
  onExportCsv,
  onExportPdf,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const choose = (fn) => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className="export-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`export-menu-trigger ${triggerClassName}`}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="export-menu-icon" />
        {label}
        <ChevronDown className="export-menu-caret" />
      </button>

      {open && (
        <div className="export-menu-list" role="menu">
          <button type="button" className="export-menu-item" role="menuitem" onClick={() => choose(onExportCsv)}>
            Export as CSV
          </button>
          <button type="button" className="export-menu-item" role="menuitem" onClick={() => choose(onExportPdf)}>
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
