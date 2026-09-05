import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./adm-queue-hosting.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { useAdminQueueHosting } from "../../hooks/useAdminQueueHosting";
import AdminPageShell from "../../components/AdminPageShell";
import QueueReasonModal from "../../components/QueueReasonModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { formatManilaDate, formatManilaTime, getManilaTimeString, addMinutesClampedToDay, formatTimeString } from "../../utils/dateTime";

// ── Icons ──────────────────────────────────────────────────────
// Plus-in-circle — matches adm-queue's .aq-host-link-btn-icon-box glyph so the
// two screens' "hosting" affordance reads the same.
const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

// ── College logo resolver ────────────────────────────────────────────────
// Resolves a college's logo image from /src/assets/{CODE}.png, falling
// back to the CCS logo if the specific college image is missing/404s.
const ccsLogoFallback = new URL("../../assets/CCS.png", import.meta.url).href;
const getCollegeLogo = (code) =>
  new URL(
    `../../assets/${(code || "CCS").toString().toUpperCase()}.png`,
    import.meta.url,
  ).href;

export default function AdminQueueHosting() {
  const navigate = useNavigate();
  const location = useLocation();
  // Origin-aware breadcrumb: "Queue Management" when opened from adm-queue's
  // host link (nav state), "Home" otherwise (dashboard quick action, direct
  // URL, refresh).
  const cameFromQueue = location.state?.from === "queue";
  // Open the monitor view on adm-queue, tagging the origin so its breadcrumb
  // links back here ("Queue Hosting") instead of the in-page queue list.
  const openMonitor = (id) =>
    navigate("/admin/queue", { state: { monitorQueueId: id, from: "hosting" } });
  const { user: authUser } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "CCS" };

  // ── Real queue data, its live-update wiring, and pause/resume/close, all
  // shared with adm-queue.jsx via useAdminQueueHosting so the two pages'
  // event lists and business logic can't drift out of sync again. ─────────
  const {
    queues,
    loading,
    error: queueHostingError,
    fetchQueues,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue,
    handleResumeQueue,
    handleReasonConfirm,
  } = useAdminQueueHosting();

  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting/services");
      setServices(res.data.services ?? []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchServices();
  }, [authUser, fetchServices]);

  // ── Search & filter state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ── "Open New Queue Line" modal state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  useLockBodyScroll(showModal);
  const [serviceId, setServiceId] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("100");
  const [serviceStart, setServiceStart] = useState("08:00");
  const [serviceEnd, setServiceEnd] = useState("17:00");
  const [noShowTimeout, setNoShowTimeout] = useState("15");
  const [serviceTime, setServiceTime] = useState("15");
  // True only right after resetForm() auto-computes an end time that got
  // clamped to 23:59 instead of the full +240min window (see
  // addMinutesClampedToDay) — cleared as soon as the admin edits either time
  // field themselves, since past that point it's their explicit choice.
  const [defaultEndClamped, setDefaultEndClamped] = useState(false);

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setServiceId("");
    setMaxCapacity("100");
    const now = getManilaTimeString();
    const [h, m] = now.split(":").map(Number);
    const rawTargetMinutes = h * 60 + m + 240;
    setServiceStart(now);
    setServiceEnd(addMinutesClampedToDay(now, 240));
    setNoShowTimeout("15");
    setServiceTime("15");
    setDefaultEndClamped(rawTargetMinutes > 23 * 60 + 59);
  };
  const openModal = () => {
    resetForm();
    setShowModal(true);
  };
  // Pre-fills the modal from a past queue's config instead of blanking it --
  // "Host Again" on a Completed/Closed card. Start/End Time are reused as-is:
  // serviceHours are plain HH:MM clock times, not date-anchored, and POST
  // always opens the new slot for today regardless of the source queue's
  // actual date, so no conversion is needed. The existing serviceEnd <=
  // getManilaTimeString() check on submit already covers the one real edge
  // case (re-hosting an old "8am-5pm" queue after 5pm today).
  const openModalWithConfig = (queue) => {
    setServiceId(String(queue.serviceId));
    setMaxCapacity(String(queue.maxCapacity));
    setServiceTime(String(queue.avgServiceMinutes ?? 15));
    setNoShowTimeout(String(queue.noShowTimeoutMinutes ?? 15));
    setServiceStart(queue.serviceHours.start);
    setServiceEnd(queue.serviceHours.end);
    setDefaultEndClamped(false);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleOpenQueueSubmit = async () => {
    if (!serviceId) {
      toast.error("Please select a service to queue");
      return;
    }
    const capacityNum = parseInt(maxCapacity, 10);
    if (!capacityNum || capacityNum <= 0) {
      toast.error("Please enter a valid maximum queue capacity");
      return;
    }
    if (serviceStart >= serviceEnd) {
      toast.error("Start time must be before end time");
      return;
    }
    if (serviceEnd <= getManilaTimeString()) {
      toast.error("End time has already passed — choose a window that ends later than the current time");
      return;
    }
    const noShowTimeoutNum = parseInt(noShowTimeout, 10);
    if (!noShowTimeoutNum || noShowTimeoutNum <= 0) {
      toast.error("Please enter a valid no-show timeout in minutes");
      return;
    }
    const serviceTimeNum = parseInt(serviceTime, 10);
    if (!serviceTimeNum || serviceTimeNum <= 0) {
      toast.error("Please enter a valid service time in minutes");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/admin/queue-hosting", {
        serviceId,
        maxCapacity: capacityNum,
        startTime: `${serviceStart}:00`,
        endTime: `${serviceEnd}:00`,
        noShowTimeoutMinutes: noShowTimeoutNum,
        serviceTimeMinutes: serviceTimeNum,
      });
      toast.success("Queue line opened successfully!");
      closeModal();
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to open queue line");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  // Unique service types currently hosted, regardless of how many queue lines
  // of that same type are open/paused/closed today — always computed from the
  // full queue list so the dropdown options don't shift as filters are applied.
  const serviceTypeOptions = [...new Set(queues.map((q) => q.queueType))].sort();

  const filteredQueues = queues.filter((q) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      q.queueType.toLowerCase().includes(query) ||
      (q.department || "").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesType = typeFilter === "all" || q.queueType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeQueues = filteredQueues.filter((q) => q.status === "open");
  const pausedQueues = filteredQueues.filter((q) => q.status === "paused");
  // 'full' (capacity reached) and 'expired' (hours ended) both mean "closed
  // to new joins, but still has unserved students" -- grouped together so
  // they don't silently vanish from this page once they leave open/paused.
  const stillServingQueues = filteredQueues.filter(
    (q) => q.status === "full" || q.status === "expired",
  );
  const completedQueues = filteredQueues.filter((q) => q.status === "completed");
  // 'closed' now means exclusively "an admin manually stopped this queue".
  const closedQueues = filteredQueues.filter((q) => q.status === "closed");
  // The flat card list, ordered by status priority. These five groups are
  // exhaustive of every possible queue_slots.status value, so gate the list
  // on this, not filteredQueues.length.
  const visibleQueues = [
    ...activeQueues,
    ...pausedQueues,
    ...stillServingQueues,
    ...completedQueues,
    ...closedQueues,
  ];
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  return (
    <AdminPageShell
      outerClassName="aqh-dashboard-with-sidebar"
      mainClassName="aqh-dashboard-main"
      overlay={
        <>
          <QueueReasonModal
            show={!!reasonModal}
            title={reasonModal?.mode === "pause" ? "Pause Queue" : "Stop Queue"}
            message={
              reasonModal?.mode === "pause"
                ? queues.find((q) => q.id === reasonModal.id)?.currentlyServingStudentNumber
                  ? "Students in this queue will see this reason while it's paused. A student is currently being served — pausing will return them to waiting instead of leaving their call in progress."
                  : "Students in this queue will see this reason while it's paused."
                : "All students still waiting or being served will be removed from this queue and will see this reason. This cannot be undone."
            }
            confirmText={reasonModal?.mode === "pause" ? "Pause" : "Stop Queue"}
            submitting={reasonSubmitting}
            onConfirm={handleReasonConfirm}
            onCancel={() => setReasonModal(null)}
          />

          {/* Open New Queue Line Modal */}
          {showModal && (
            <div className="aqh-modal-overlay">
              <div className="aqh-modal" onClick={(e) => e.stopPropagation()}>
                <div className="aqh-modal-header">
                  <h2 className="aqh-modal-title">Open New Queue Line</h2>
                  <button
                    className="aqh-modal-close-btn"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="aqh-modal-body">
                  <div className="aqh-modal-hero">
                    <p className="aqh-modal-hero-label">New Queue Line</p>
                    <p className="aqh-modal-hero-title">
                      {user.college} ({user.departmentAbbrev})
                    </p>
                    <p className="aqh-modal-hero-purpose">
                      Set the service, capacity, and hours below. Students can
                      join as soon as the line is open.
                    </p>
                  </div>

                  <div className="aqh-form-group">
                    <label className="aqh-form-label">Service *</label>
                    <div className="aqh-form-select-wrap">
                      <select
                        className="aqh-form-select"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                      >
                        <option value="">Select a service</option>
                        {services.map((s) => (
                          <option key={s.service_id} value={s.service_id}>
                            {s.service_name}
                          </option>
                        ))}
                      </select>
                      <span className="aqh-select-chevron">
                        <ChevronDownIcon />
                      </span>
                    </div>
                    {services.length === 0 && (
                      <p className="aqh-modal-subtitle">
                        No services configured for your department yet.
                      </p>
                    )}
                  </div>

                  <div className="aqh-form-group">
                    <label className="aqh-form-label">
                      Maximum Queue Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="aqh-form-input"
                      placeholder="e.g., 100"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                    />
                  </div>

                  <div className="aqh-form-group">
                    <label className="aqh-form-label">
                      Service Time (minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="aqh-form-input"
                      placeholder="e.g., 15"
                      value={serviceTime}
                      onChange={(e) => setServiceTime(e.target.value)}
                    />
                    <p className="aqh-modal-subtitle">
                      Estimated time to serve one student in this queue — used to
                      calculate students' wait-time estimates.
                    </p>
                  </div>

                  <div className="aqh-form-group">
                    <label className="aqh-form-label">
                      No-Show Timeout (minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="aqh-form-input"
                      placeholder="e.g., 15"
                      value={noShowTimeout}
                      onChange={(e) => setNoShowTimeout(e.target.value)}
                    />
                    <p className="aqh-modal-subtitle">
                      A called student who doesn't show up within this many
                      minutes is automatically voided so you can call the next one.
                    </p>
                  </div>

                  <div className="aqh-form-row">
                    <div className="aqh-form-group">
                      <label className="aqh-form-label">Service Start Time *</label>
                      <div className="aqh-time-input-wrap">
                        <input
                          type="time"
                          className="aqh-form-input"
                          value={serviceStart}
                          onChange={(e) => { setServiceStart(e.target.value); setDefaultEndClamped(false); }}
                        />
                        <ClockIcon />
                      </div>
                    </div>
                    <div className="aqh-form-group">
                      <label className="aqh-form-label">Service End Time *</label>
                      <div className="aqh-time-input-wrap">
                        <input
                          type="time"
                          className="aqh-form-input"
                          value={serviceEnd}
                          onChange={(e) => { setServiceEnd(e.target.value); setDefaultEndClamped(false); }}
                        />
                        <ClockIcon />
                      </div>
                      {defaultEndClamped && (
                        <p className="aqh-modal-subtitle" style={{ color: "var(--warning, #f59e0b)" }}>
                          It's late enough today that the usual 4-hour window would run past midnight — the end time was capped at 11:59 PM instead. Adjust it if you meant a shorter window.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="aqh-modal-footer">
                  <button className="aqh-btn-cancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="aqh-btn-submit"
                    onClick={handleOpenQueueSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Opening..." : "Open Queue Line"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
        <div className="aqh-page-container">
          <div className="aqh-header-block">
            <div className="page-breadcrumb">
              {cameFromQueue ? (
                <Link to="/admin/queue" className="page-breadcrumb-link">
                  <ChevronLeft />
                  Queue Management
                </Link>
              ) : (
                <Link to="/admin/dashboard" className="page-breadcrumb-link">
                  <ChevronLeft />
                  Home
                </Link>
              )}
            </div>
            {/* Page Header */}
            <div className="aqh-page-header">
              <div className="aqh-title-section">
                <div className="aqh-title-icon">
                  <PlusCircleIcon />
                </div>
                <div>
                  <h1 className="aqh-page-title">Queue Hosting</h1>
                  <p className="aqh-page-subtitle">
                    Host and manage queues within your department.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="aqh-actions-row">
            <button
              className="aqh-open-queue-btn"
              onClick={openModal}
              disabled={loading}
            >
              <PlusIcon />
              Open Queue Line
            </button>
          </div>

          {queueHostingError && (
            <div className="dash-error-banner" role="alert">
              {queueHostingError}
            </div>
          )}

          {/* Summary Stats */}
          <div className="aqh-summary-grid">
            <div className="aqh-summary-card aqh-summary-active">
              <div className="aqh-summary-icon aqh-icon-active">
                <PlayIcon />
              </div>
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Active Queues</p>
                <p className="aqh-summary-value aqh-value-active">
                  {loading ? "—" : activeQueues.length}
                </p>
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-paused">
              <div className="aqh-summary-icon aqh-icon-paused">
                <PauseIcon />
              </div>
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Paused Queues</p>
                <p className="aqh-summary-value aqh-value-paused">
                  {loading ? "—" : pausedQueues.length}
                </p>
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-still-serving">
              <div className="aqh-summary-icon aqh-icon-still-serving">
                <ClockIcon />
              </div>
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Still Serving</p>
                <p className="aqh-summary-value aqh-value-still-serving">
                  {loading ? "—" : stillServingQueues.length}
                </p>
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-completed">
              <div className="aqh-summary-icon aqh-icon-completed">
                <CheckIcon />
              </div>
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Completed Queues</p>
                <p className="aqh-summary-value aqh-value-completed">
                  {loading ? "—" : completedQueues.length}
                </p>
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-closed">
              <div className="aqh-summary-icon aqh-icon-closed">
                <CloseIcon />
              </div>
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Manually Closed</p>
                <p className="aqh-summary-value aqh-value-closed">
                  {loading ? "—" : closedQueues.length}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="aqh-filters-card">
            <div className="aqh-filters-header">
              <h3 className="aqh-filters-title">Queue Filter</h3>
              <p className="aqh-filters-description">
                Search and filter your department's queue lines by status and
                service type.
              </p>
            </div>
            <div className="aqh-filters-grid">
              <div className="aqh-filter-group aqh-filter-group--search">
                <label className="aqh-filter-label" htmlFor="aqh-search">Search</label>
                <div className="aqh-search-wrapper">
                  <SearchIcon />
                  <input
                    id="aqh-search"
                    type="text"
                    className="aqh-form-input aqh-search-input"
                    placeholder="Search by service or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="aqh-filter-group">
                <label className="aqh-filter-label" htmlFor="aqh-status-filter">Status</label>
                <div className="aqh-form-select-wrap">
                  <select
                    id="aqh-status-filter"
                    className="aqh-form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Active</option>
                    <option value="paused">Paused</option>
                    <option value="full">Full</option>
                    <option value="expired">Hours Ended</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className="aqh-select-chevron">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>
              <div className="aqh-filter-group">
                <label className="aqh-filter-label" htmlFor="aqh-type-filter">Service Type</label>
                <div className="aqh-form-select-wrap">
                  <select
                    id="aqh-type-filter"
                    className="aqh-form-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="Filter by service type"
                  >
                    <option value="all">All Service Types</option>
                    {serviceTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <span className="aqh-select-chevron">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="aqh-empty-state">
              <ClockIcon />
              <p>Loading your department&apos;s queues&hellip;</p>
            </div>
          )}

          {/* All queue lines, flat, ordered by status priority */}
          {!loading && visibleQueues.length > 0 && (
            <div className="aqh-queue-list">
                {activeQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-active aqh-queue-card--clickable"
                    onClick={() => openMonitor(queue.id)}
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-active">
                          active
                        </span>
                        {queue.currentlyServingStudentNumber && (
                          <span className={`aqh-status-badge ${queue.currentlyServingArrivedAt ? "aqh-status-serving" : "aqh-status-called"}`}>
                            {queue.currentlyServingArrivedAt ? "being served" : "called"}
                          </span>
                        )}
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-pause"
                            onClick={(e) => { e.stopPropagation(); handlePauseQueue(queue.id); }}
                          >
                            <PauseIcon />
                            <span>Pause</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                          >
                            <CloseIcon />
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="aqh-queue-stats-row aqh-stats-row-4">
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Waiting / Max</p>
                        <p className="aqh-queue-stat-value">
                          {queue.currentCount} / {queue.maxCapacity}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Service Hours</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {formatTimeString(queue.serviceHours.start)} - {formatTimeString(queue.serviceHours.end)}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Opened At</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          <span className="aqh-stat-datetime">
                            <span>
                              {formatManilaDate(queue.createdAt, {
                                year: "numeric",
                                month: "numeric",
                                day: "numeric",
                              })}
                            </span>
                            <span>{formatManilaTime(queue.createdAt)}</span>
                          </span>
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Occupied Slots</p>
                        <div className="aqh-capacity-bar-track">
                          <div
                            className="aqh-capacity-bar-fill"
                            style={{
                              width: `${Math.min(100, (queue.currentCount / queue.maxCapacity) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {pausedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-paused aqh-queue-card--clickable"
                    onClick={() => openMonitor(queue.id)}
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-paused">
                          paused
                        </span>
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-resume"
                            onClick={(e) => { e.stopPropagation(); handleResumeQueue(queue.id); }}
                          >
                            <PlayIcon />
                            <span>Resume</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                          >
                            <CloseIcon />
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="aqh-queue-stats-row aqh-stats-row-3">
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Waiting / Max</p>
                        <p className="aqh-queue-stat-value">
                          {queue.currentCount} / {queue.maxCapacity}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Service Hours</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {formatTimeString(queue.serviceHours.start)} - {formatTimeString(queue.serviceHours.end)}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Served Today</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {queue.servedCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {stillServingQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-still-serving aqh-queue-card--clickable"
                    onClick={() => openMonitor(queue.id)}
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-still-serving">
                          {queue.status === "full" ? "full" : "hours ended"}
                        </span>
                        {queue.currentlyServingStudentNumber && (
                          <span className={`aqh-status-badge ${queue.currentlyServingArrivedAt ? "aqh-status-serving" : "aqh-status-called"}`}>
                            {queue.currentlyServingArrivedAt ? "being served" : "called"}
                          </span>
                        )}
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                          >
                            <CloseIcon />
                            <span>Stop Queue</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="aqh-queue-stats-row aqh-stats-row-3">
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Waiting / Max</p>
                        <p className="aqh-queue-stat-value">
                          {queue.currentCount} / {queue.maxCapacity}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Service Hours</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {formatTimeString(queue.serviceHours.start)} - {formatTimeString(queue.serviceHours.end)}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Served Today</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {queue.servedCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {completedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-completed aqh-queue-card--clickable"
                    onClick={() => openMonitor(queue.id)}
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-completed">
                          completed
                        </span>
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-btn--repeat"
                            onClick={(e) => { e.stopPropagation(); openModalWithConfig(queue); }}
                          >
                            <RepeatIcon />
                            <span>Host Again</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="aqh-closed-meta">
                      Served {queue.servedCount} student(s), capacity{" "}
                      {queue.maxCapacity}
                    </p>
                  </div>
                ))}
                {closedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-closed aqh-queue-card--clickable"
                    onClick={() => openMonitor(queue.id)}
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-closed">
                          closed
                        </span>
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-btn--repeat"
                            onClick={(e) => { e.stopPropagation(); openModalWithConfig(queue); }}
                          >
                            <RepeatIcon />
                            <span>Host Again</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="aqh-closed-meta">
                      Served {queue.servedCount} student(s), capacity{" "}
                      {queue.maxCapacity}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {!loading && queues.length === 0 && (
            <div className="aqh-empty-state">
              <ClockIcon />
              <h3>No Queue Lines Yet</h3>
              <p>
                No queue lines yet today for {user.departmentAbbrev}. Open one
                to start serving students.
              </p>
            </div>
          )}

          {!loading && queues.length > 0 && visibleQueues.length === 0 && (
            <div className="aqh-empty-state">
              <ClockIcon />
              <h3>No Matches</h3>
              <p>No queue lines match your search or filters.</p>
              {hasActiveFilters && (
                <button
                  className="aqh-clear-filters-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
    </AdminPageShell>
  );
}