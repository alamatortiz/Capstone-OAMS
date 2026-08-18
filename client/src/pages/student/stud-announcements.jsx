import { useState, useEffect, useCallback, useRef } from "react";
import { Megaphone as LucideMegaphone, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "../../utils/api";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import { formatManilaDateTime } from "../../utils/dateTime";
import { connectSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";

import "./stud-announcements.css";

// ─── Content Icons ────────────────────────────────────────────────────────────
const MegaphoneIcon = () => <LucideMegaphone />;
const HelpCircleIcon = () => <HelpCircle />;

const AlertCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PaperclipIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const Loader2Icon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

// Single line whose label reflects whether this announcement has ever been
// edited/restored (isReposted, set server-side) -- "Posted" the first time,
// "Reposted" from then on.
const formatPostedLabel = (announcement, monthFormat = "long") =>
  `${announcement.isReposted ? "Reposted" : "Posted"}: ${formatManilaDateTime(announcement.date, { month: monthFormat })}`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const { token } = useAuth();
  // ── UI State ──────────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState("pinned");
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  useLockBodyScroll(!!viewingAnnouncement);

  // Fetches one attachment's bytes on demand (authenticated, so a plain
  // <img src> won't work -- the JWT only ever goes out via axios'
  // Authorization header) and opens/downloads it.
  const openAttachment = async (announcementId, attachment) => {
    try {
      const res = await api.get(
        `/student/announcements/${announcementId}/attachments/${attachment.id}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      if (attachment.mimeType?.startsWith("image/") || attachment.mimeType === "application/pdf") {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.filename;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error("Could not load attachment.");
    }
  };

  // ── Live data state (replaces the old static ANNOUNCEMENTS_DATA array) ────
  // `announcements` holds whatever page(s) have been loaded for the CURRENT
  // tab only -- filtering/pagination now happens server-side (see
  // fetchAnnouncements), so there's no separate "all announcements ever
  // fetched" cache to filter client-side anymore.
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mirrors `announcements` for the catch block below, without making
  // fetchAnnouncements depend on (and change identity with) the state itself.
  const announcementsRef = useRef(announcements);
  useEffect(() => { announcementsRef.current = announcements; }, [announcements]);

  // Guards against out-of-order responses: e.g. switching tabs while a Load
  // More request for the previous tab is still in flight would otherwise let
  // the stale response land after the fresh one and get appended onto the
  // wrong tab's list. Each call captures the current token; a response is
  // only applied if its token is still the latest by the time it resolves.
  const requestIdRef = useRef(0);

  const fetchAnnouncements = useCallback(async (pageNum, category) => {
    const requestId = ++requestIdRef.current;
    setAnnError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await api.get("/student/announcements", {
        params: { category, page: pageNum },
      });
      if (requestId !== requestIdRef.current) return;
      const fetched = data.announcements ?? [];
      setAnnouncements((prev) => (pageNum > 1 ? [...prev, ...fetched] : fetched));
      setPage(data.page ?? pageNum);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Fetch announcements error:", err);
      if (announcementsRef.current.length === 0) {
        setAnnError("Could not load announcements. Please try again.");
      } else {
        toast.error("Could not refresh announcements.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setAnnLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Fresh load at page 1 whenever the mount happens or the selected tab
  // changes -- explicitly shows the loading state (rather than a silent
  // background refresh) since the visible content is about to change.
  useEffect(() => {
    setAnnLoading(true);
    fetchAnnouncements(1, selectedFilter);
  }, [selectedFilter, fetchAnnouncements]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchAnnouncements(page + 1, selectedFilter);
  };

  // ── Live updates: refetch when an admin posts/edits/removes an
  // announcement. Refetches the currently active tab from page 1 (a full
  // resync), silently -- unlike the effect above, this doesn't toggle
  // annLoading, since it's a background refresh of content already on
  // screen, not a user-driven navigation to new content. ────────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refetchCurrentTab = () => fetchAnnouncements(1, selectedFilter);
    socket.on("announcement:changed", refetchCurrentTab);

    return () => {
      socket.off("announcement:changed", refetchCurrentTab);
    };
  }, [fetchAnnouncements, selectedFilter, token]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchAnnouncements(1, selectedFilter);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements, selectedFilter]);

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const filterTabs = [
    { id: "pinned", label: "Pinned" },
    { id: "all", label: "All" },
    { id: "important", label: "Important" },
    { id: "event", label: "Events" },
    { id: "reminder", label: "Reminders" },
    { id: "general", label: "General" },
  ];

  const hasMore = page < totalPages;

  const getCategoryColor = (announcement) => {
    if (announcement.isPinned) return "announcement-pinned";
    const colors = {
      important: "announcement-important",
      event: "announcement-event",
      reminder: "announcement-reminder",
      general: "announcement-general",
    };
    return colors[announcement.category] || colors.general;
  };

  const getAnnouncementIcon = (category) => {
    switch (category) {
      case "important":
        return <AlertCircleIcon />;
      case "event":
        return <CalendarIcon />;
      case "reminder":
        return <BellIcon />;
      default:
        return <AlertCircleIcon />;
    }
  };

  // ── Per-tab empty state copy ────────────────────────────────────────────
  const emptyStateCopy = {
    pinned: { title: "No Pinned Announcements", description: "There are no pinned announcements yet." },
    all: { title: "No Announcements Found", description: "There are no announcements yet." },
    important: { title: "No Important Announcements Found", description: "There are no important announcements yet." },
    event: { title: "No Event Announcements Found", description: "There are no event announcements yet." },
    reminder: { title: "No Reminder Announcements Found", description: "There are no reminder announcements yet." },
    general: { title: "No General Announcements Found", description: "There are no general announcements yet." },
  };
  const currentEmptyState = emptyStateCopy[selectedFilter] ?? emptyStateCopy.all;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="ann-with-sidebar"
      mainClassName="ann-main"
      overlay={
        <>
          {viewingAnnouncement && (
            <div
              className="ann-detail-overlay"
              onClick={() => setViewingAnnouncement(null)}
            >
              <div className="ann-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ann-detail-header">
                  <div className={`ann-detail-header-icon ${getCategoryColor(viewingAnnouncement)}`}>
                    {getAnnouncementIcon(viewingAnnouncement.category)}
                  </div>
                  <button
                    className="ann-detail-close"
                    onClick={() => setViewingAnnouncement(null)}
                    aria-label="Close"
                  >
                    <XIcon />
                  </button>
                </div>

                <h2 className="ann-detail-title">{viewingAnnouncement.title}</h2>

                <div className="ann-detail-badges">
                  <span className={`announcement-badge ${viewingAnnouncement.isPinned ? "badge-pinned" : `badge-${viewingAnnouncement.category}`}`}>
                    {viewingAnnouncement.category
                      ? viewingAnnouncement.category.charAt(0).toUpperCase() +
                        viewingAnnouncement.category.slice(1)
                      : "Notice"}
                  </span>
                  {viewingAnnouncement.isPinned && (
                    <span className="ann-detail-pinned-pill">
                      <MegaphoneIcon /> Pinned
                    </span>
                  )}
                </div>

                <p className="ann-detail-content">{viewingAnnouncement.description}</p>

                {viewingAnnouncement.attachments?.length > 0 && (
                  <div className="ann-detail-attachment">
                    {viewingAnnouncement.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        className="ann-detail-attachment-btn"
                        onClick={() => openAttachment(viewingAnnouncement.id, att)}
                      >
                        <FileIcon /> {att.filename}
                      </button>
                    ))}
                  </div>
                )}

                <div className="ann-detail-meta">
                  <span className="announcement-college">{viewingAnnouncement.college}</span>
                  <span className="announcement-date">{formatPostedLabel(viewingAnnouncement)}</span>
                </div>

                <div className="ann-detail-footer">
                  <button
                    className="ann-detail-close-btn"
                    onClick={() => setViewingAnnouncement(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
        <div className="announcements-page">
          {/* Header */}
          <PageHeader
            breadcrumb={
              <Link to="/student/dashboard" className="breadcrumb-link">
                <ChevronLeftIcon />
                Home
              </Link>
            }
            icon={<MegaphoneIcon />}
            title="Announcements"
            subtitle="Stay updated with the latest notices from your department."
          />

          <Link to="/student/faqs" className="ann-btn-faqs-link">
            <HelpCircleIcon />
            View FAQs
          </Link>

          {/* Error banner */}
          {annError && (
            <div className="ann-empty-state">
              <AlertCircleIcon />
              <h3>Something went wrong</h3>
              <p>{annError}</p>
              <button className="ann-retry-btn" onClick={() => fetchAnnouncements(1, selectedFilter)}>
                Retry
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="ann-tabs-bar">
            <div className="ann-tabs-list">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`ann-tab ${selectedFilter === tab.id ? "active" : ""}`}
                  onClick={() => setSelectedFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {annLoading && (
            <div className="ann-empty-state">
              <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading announcements…</p>
            </div>
          )}

          {/* Active tab's content -- server already returns exactly this
              tab's items (see fetchAnnouncements), so there's just one list
              to render regardless of which tab is selected. */}
          {!annLoading && (
            <section className="announcements-section">
              {announcements.length === 0 ? (
                <div className="ann-empty-state">
                  <MegaphoneIcon />
                  <h3>{currentEmptyState.title}</h3>
                  <p>{currentEmptyState.description}</p>
                </div>
              ) : (
                <>
                  <div className="announcements-list">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`announcement-card announcement-card-clickable ${getCategoryColor(announcement)}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setViewingAnnouncement(announcement)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setViewingAnnouncement(announcement);
                          }
                        }}
                      >
                        <div className="announcement-header">
                          <div className="announcement-icon">
                            {getAnnouncementIcon(announcement.category)}
                          </div>
                          <div className="announcement-content">
                            <div className="announcement-title-group">
                              <h3 className="announcement-title">
                                {announcement.title}
                                {announcement.attachments?.length > 0 && (
                                  <PaperclipIcon className="announcement-attachment-flag" />
                                )}
                              </h3>
                              <div className="announcement-meta">
                                <span className="announcement-college">
                                  {announcement.college}
                                </span>
                                <span className="announcement-date">
                                  {formatPostedLabel(announcement, "short")}
                                </span>
                              </div>
                            </div>
                            <p className="announcement-description">
                              {announcement.description}
                            </p>
                          </div>
                          <span
                            className={`announcement-badge ${announcement.isPinned ? "badge-pinned" : `badge-${announcement.category}`}`}
                          >
                            {announcement.category
                              ? announcement.category.charAt(0).toUpperCase() +
                                announcement.category.slice(1)
                              : "Notice"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      type="button"
                      className="ann-load-more-btn"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading…" : "Load More"}
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </div>
    </StudentPageShell>
  );
}
