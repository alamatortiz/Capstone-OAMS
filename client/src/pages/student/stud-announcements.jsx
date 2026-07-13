import { useState, useEffect, useMemo } from "react";
import { Megaphone as LucideMegaphone } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import { formatManilaDate } from "../../utils/dateTime";
import { formatCollegeLabel } from "../../utils/formatCollege";

import "./stud-announcements.css";

// ─── Content Icons ────────────────────────────────────────────────────────────
const MegaphoneIcon = () => <LucideMegaphone />;

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

const ChevronDownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  // ── UI State ──────────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState("pinned");
  const [selectedCollege, setSelectedCollege] = useState("all");

  // ── Live data state (replaces the old static ANNOUNCEMENTS_DATA array) ────
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState(null);

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    setAnnError(null);
    try {
      const { data } = await api.get("/student/announcements");
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      console.error("Fetch announcements error:", err);
      setAnnError("Could not load announcements. Please try again.");
    } finally {
      setAnnLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const filterTabs = [
    { id: "pinned", label: "Pinned" },
    { id: "all", label: "All" },
    { id: "important", label: "Important" },
    { id: "event", label: "Events" },
    { id: "reminder", label: "Reminders" },
    { id: "general", label: "General" },
  ];

  // ── College options derived from live data: each department that actually
  //    has at least one announcement, keyed by abbreviation (e.g. "CCS").
  //    Cross-college announcements still belong to one real department, so
  //    they're a selectable filter like any other -- they also always
  //    remain visible regardless of which college is selected (see
  //    isCrossCollege check below), since they apply to every department. ──
  const collegeOptions = useMemo(() => {
    const seen = new Map();
    announcements.forEach((a) => {
      if (!seen.has(a.departmentAbbrev)) {
        seen.set(a.departmentAbbrev, a.departmentName);
      }
    });
    return [...seen.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([abbrev, name]) => ({ abbrev, name }));
  }, [announcements]);

  // ── Filtered announcements (category tab + department dropdown both apply).
  //    Selecting a college (e.g. "CCS") shows that college's announcements
  //    PLUS cross-college ones -- never hides cross-college notices. ───────
  const pinnedAnnouncements = announcements
    .filter((a) => a.isPinned)
    .filter(
      (a) =>
        selectedCollege === "all" ||
        a.departmentAbbrev === selectedCollege ||
        a.isCrossCollege,
    );
  const filteredAnnouncements = announcements
    .filter((a) => selectedFilter === "all" || a.category === selectedFilter)
    .filter(
      (a) =>
        selectedCollege === "all" ||
        a.departmentAbbrev === selectedCollege ||
        a.isCrossCollege,
    )
    .filter((a) => !a.isPinned);

  const generateBotResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes("announcement")) {
      const total = announcements.length;
      const pinned = pinnedAnnouncements.length;
      return `There are currently ${total} announcements, with ${pinned} pinned as important. You can filter by category or college using the controls above!`;
    } else if (lowerInput.includes("important")) {
      const importantCount = announcements.filter(
        (a) => a.category === "important",
      ).length;
      return `Important announcements are marked with red badges. We have ${importantCount} important announcement(s) currently visible. Check them out to stay updated!`;
    } else if (
      lowerInput.includes("event") ||
      lowerInput.includes("activity")
    ) {
      const events = announcements.filter((a) => a.category === "event");
      return `There are ${events.length} upcoming events. Click on 'Events' tab to see all of them!`;
    } else if (
      lowerInput.includes("college") ||
      lowerInput.includes("department")
    ) {
      return "Use the College dropdown to filter announcements down to a specific department, or leave it on 'All Colleges' to see everything.";
    } else {
      return "I can help you find announcements, learn about upcoming events, deadlines, and more. What would you like to know?";
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      important: "announcement-important",
      event: "announcement-event",
      reminder: "announcement-reminder",
      general: "announcement-general",
    };
    return colors[category] || colors.general;
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="ann-with-sidebar"
      mainClassName="ann-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! 👋 I'm your OAMS Assistant. Ask me about announcements or any college updates!"
          getBotResponse={generateBotResponse}
        />
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
            subtitle="Stay updated with the latest notices"
          />

          {/* Error banner */}
          {annError && (
            <div className="ann-empty-state">
              <AlertCircleIcon />
              <h3>Something went wrong</h3>
              <p>{annError}</p>
              <button className="ann-retry-btn" onClick={fetchAnnouncements}>
                Retry
              </button>
            </div>
          )}

          {/* Tabs + College Filter */}
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
            <div className="ann-college-wrapper">
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                aria-label="Filter by college"
                className="ann-college-select"
              >
                <option value="all">All Colleges</option>
                {collegeOptions.map((opt) => (
                  <option key={opt.abbrev} value={opt.abbrev}>
                    {formatCollegeLabel(opt.abbrev, opt.name)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>

          {/* Loading state */}
          {annLoading && (
            <div className="ann-empty-state">
              <Loader2Icon style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading announcements…</p>
            </div>
          )}

          {/* Pinned Tab Content */}
          {!annLoading && selectedFilter === "pinned" && (
            <section className="announcements-section">
              <h2 className="ann-section-title">Pinned Announcements</h2>
              {pinnedAnnouncements.length === 0 ? (
                <div className="ann-empty-state">
                  <BellIcon />
                  <h3>No Pinned Announcements</h3>
                  <p>Announcements marked as important will appear here.</p>
                </div>
              ) : (
                <div className="announcements-list">
                  {pinnedAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-card ${getCategoryColor(announcement.category)}`}
                    >
                      <div className="announcement-header">
                        <div className="announcement-icon">
                          {getAnnouncementIcon(announcement.category)}
                        </div>
                        <div className="announcement-content">
                          <h3 className="announcement-title">
                            {announcement.title}
                          </h3>
                          <p className="announcement-description">
                            {announcement.description}
                          </p>
                          <div className="announcement-meta">
                            <span className="announcement-college">
                              {announcement.college}
                            </span>
                            <span className="announcement-date">
                              {formatManilaDate(announcement.date, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`announcement-badge badge-${announcement.category}`}
                        >
                          {announcement.category.charAt(0).toUpperCase() +
                            announcement.category.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* All / Category Tab Content */}
          {!annLoading && selectedFilter !== "pinned" && (
            <section className="announcements-section">
              <h2 className="ann-section-title">
                {selectedFilter === "all"
                  ? "All Announcements"
                  : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Announcements`}
              </h2>
              {filteredAnnouncements.length === 0 ? (
                <div className="ann-empty-state">
                  <BellIcon />
                  <h3>No Announcements Found</h3>
                  <p>Try adjusting your filters to see more results.</p>
                </div>
              ) : (
                <div className="announcements-list">
                  {filteredAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-card ${getCategoryColor(announcement.category)}`}
                    >
                      <div className="announcement-header">
                        <div className="announcement-icon">
                          {getAnnouncementIcon(announcement.category)}
                        </div>
                        <div className="announcement-content">
                          <h3 className="announcement-title">
                            {announcement.title}
                          </h3>
                          <p className="announcement-description">
                            {announcement.description}
                          </p>
                          <div className="announcement-meta">
                            <span className="announcement-college">
                              {announcement.college}
                            </span>
                            <span className="announcement-date">
                              {formatManilaDate(announcement.date, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`announcement-badge badge-${announcement.category}`}
                        >
                          {announcement.category.charAt(0).toUpperCase() +
                            announcement.category.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
    </StudentPageShell>
  );
}
