import "./Pagination.css";

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Simple page-number + prev/next control. Caller owns the actual slicing --
// this component only renders controls and reports the requested page.
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const windowSize = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= page - windowSize && p <= page + windowSize)
    ) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination-btn pagination-page ${p === page ? "pagination-page--active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </button>
    </nav>
  );
}
