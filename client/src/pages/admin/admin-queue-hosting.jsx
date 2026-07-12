import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./admin-queue-hosting.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";
import AdminPageShell from "../../components/AdminPageShell";
import ChatWidget from "../../components/ChatWidget";
import QueueReasonModal from "../../components/QueueReasonModal";
import { formatManilaDateTime, getManilaTimeString, addMinutesClampedToDay } from "../../utils/dateTime";

// ── Icons ──────────────────────────────────────────────────────
const QueueIconNav = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
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
  const { user: authUser } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "CCS" };

  // ── Real queue + service data (scoped server-side to admin's dept) ───────
  const [queues, setQueues] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting");
      setQueues(res.data.queues ?? []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Could not load queue data");
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting/services");
      setServices(res.data.services ?? []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchQueues(), fetchServices()]);
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchQueues, fetchServices]);

  // ── Live updates: refetch when a socket event affects this dept's queues ──
  useEffect(() => {
    const token = sessionStorage.getItem("oams_token");
    if (!authUser || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const events = [
      "queue:slot-opened",
      "queue:slot-status",
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:student-joined",
      "queue:student-left",
    ];
    events.forEach((event) => socket.on(event, fetchQueues));

    return () => {
      events.forEach((event) => socket.off(event, fetchQueues));
    };
  }, [authUser, fetchQueues]);

  // ── Search & filter state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ── "Open New Queue Line" modal state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("100");
  const [serviceStart, setServiceStart] = useState("08:00");
  const [serviceEnd, setServiceEnd] = useState("17:00");
  const [noShowTimeout, setNoShowTimeout] = useState("15");

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("open") || i.includes("new queue") || i.includes("host"))
      return 'Click "Open Queue Line" at the top of the page to launch a new queue for a service in your department.';
    if (i.includes("pause"))
      return "Use the Pause button on an active queue's card to stop new students from joining.";
    if (i.includes("resume"))
      return "Resume a paused queue from the Paused Queue Lines section to start accepting students again.";
    if (i.includes("close"))
      return "Closing a queue permanently ends it for today. You'll be asked to confirm before it closes.";
    if (i.includes("capacity"))
      return "Capacity shows how many students are currently waiting relative to the queue's maximum.";
    return `I can help with opening, pausing, resuming, and closing queue lines for ${user.departmentAbbrev}. What do you need?`;
  };

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setServiceId("");
    setMaxCapacity("100");
    const now = getManilaTimeString();
    setServiceStart(now);
    setServiceEnd(addMinutesClampedToDay(now, 240));
    setNoShowTimeout("15");
  };
  const openModal = () => {
    resetForm();
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

    setSubmitting(true);
    try {
      await api.post("/admin/queue-hosting", {
        serviceId,
        maxCapacity: capacityNum,
        startTime: `${serviceStart}:00`,
        endTime: `${serviceEnd}:00`,
        noShowTimeoutMinutes: noShowTimeoutNum,
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

  // ── Queue lifecycle handlers (server-authoritative) ───────────────────────
  // Pause and close both require a reason, collected via QueueReasonModal.
  const [reasonModal, setReasonModal] = useState(null); // { mode: 'pause'|'close', queueId }
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const handlePauseQueue = (id) => setReasonModal({ mode: "pause", queueId: id });
  const handleCloseQueue = (id) => setReasonModal({ mode: "close", queueId: id });

  const handleResumeQueue = async (id) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/resume`);
      toast.success("Queue resumed");
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to resume queue");
    }
  };

  const handleReasonConfirm = async (reason) => {
    if (!reasonModal) return;
    const { mode, queueId } = reasonModal;
    setReasonSubmitting(true);
    try {
      await api.patch(`/admin/queue-hosting/${queueId}/${mode}`, { reason });
      toast[mode === "pause" ? "message" : "success"](
        mode === "pause" ? "Queue paused" : "Queue stopped",
      );
      setReasonModal(null);
      await fetchQueues();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ?? `Failed to ${mode} queue`,
      );
    } finally {
      setReasonSubmitting(false);
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
  const closedQueues = filteredQueues.filter((q) => q.status === "closed");
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  return (
    <AdminPageShell
      outerClassName="aqh-dashboard-with-sidebar"
      mainClassName="aqh-dashboard-main"
      overlay={
        <>
          <ChatWidget
            initialGreeting={`Hello! 👋 I'm your OAMS Assistant. How can I help you host queues for ${user.departmentAbbrev} today?`}
            getBotResponse={generateBotResponse}
          />

          <QueueReasonModal
            show={!!reasonModal}
            title={reasonModal?.mode === "pause" ? "Pause Queue" : "Stop Queue"}
            message={
              reasonModal?.mode === "pause"
                ? "Students in this queue will see this reason while it's paused."
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
                  <div>
                    <h2 className="aqh-modal-title">Open New Queue Line</h2>
                    <p className="aqh-modal-subtitle">
                      For {user.college} ({user.departmentAbbrev}) only
                    </p>
                  </div>
                  <button
                    className="aqh-modal-close-btn"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="aqh-modal-body">
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
                          onChange={(e) => setServiceStart(e.target.value)}
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
                          onChange={(e) => setServiceEnd(e.target.value)}
                        />
                        <ClockIcon />
                      </div>
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
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link></div>
          {/* Page Header */}
          <div className="aqh-page-header">
            <div className="aqh-title-section">
              <div className="aqh-title-icon">
                <QueueIconNav />
              </div>
              <div>
                <h1 className="aqh-page-title">Queue Hosting Management</h1>
                <p className="aqh-page-subtitle">
                  {user.college} ({user.departmentAbbrev}) — open, manage, and
                  close your department's queue lines
                </p>
              </div>
            </div>
            <button
              className="aqh-open-queue-btn"
              onClick={openModal}
              disabled={loading}
            >
              <PlusIcon />
              Open Queue Line
            </button>
          </div>
          </div>

          {/* Summary Stats */}
          <div className="aqh-summary-grid">
            <div className="aqh-summary-card aqh-summary-active">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Active Queues</p>
                <p className="aqh-summary-value aqh-value-active">
                  {loading ? "—" : activeQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-active">
                <PlayIcon />
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-paused">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Paused Queues</p>
                <p className="aqh-summary-value aqh-value-paused">
                  {loading ? "—" : pausedQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-paused">
                <PauseIcon />
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-closed">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Closed Queues</p>
                <p className="aqh-summary-value aqh-value-closed">
                  {loading ? "—" : closedQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-closed">
                <CloseIcon />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="aqh-filters-card">
            <div className="aqh-filter-bar">
              <div className="aqh-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  className="aqh-form-input aqh-search-input"
                  placeholder="Search by service or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="aqh-form-select-wrap aqh-filter-select-wrap">
                <select
                  className="aqh-form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
                <span className="aqh-select-chevron">
                  <ChevronDownIcon />
                </span>
              </div>
              <div className="aqh-form-select-wrap aqh-filter-select-wrap">
                <select
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

          {loading && (
            <p className="aqh-empty-state">
              Loading your department's queues...
            </p>
          )}

          {/* Active Queue Lines */}
          {!loading && activeQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Active Queue Lines</h2>
              <div className="aqh-queue-list">
                {activeQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-active"
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
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-pause"
                            onClick={() => handlePauseQueue(queue.id)}
                          >
                            <PauseIcon />
                            <span>Pause</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={() => handleCloseQueue(queue.id)}
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
                          {queue.serviceHours.start} - {queue.serviceHours.end}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Opened At</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {formatManilaDateTime(queue.createdAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Capacity</p>
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
              </div>
            </section>
          )}

          {/* Paused Queue Lines */}
          {!loading && pausedQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Paused Queue Lines</h2>
              <div className="aqh-queue-list">
                {pausedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-paused"
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
                            onClick={() => handleResumeQueue(queue.id)}
                          >
                            <PlayIcon />
                            <span>Resume</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={() => handleCloseQueue(queue.id)}
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
                          {queue.serviceHours.start} - {queue.serviceHours.end}
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
              </div>
            </section>
          )}

          {/* Closed Queue Lines */}
          {!loading && closedQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Closed Queue Lines (Today)</h2>
              <div className="aqh-queue-list">
                {closedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-closed"
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
                      <span className="aqh-status-badge aqh-status-closed">
                        closed
                      </span>
                    </div>
                    <p className="aqh-closed-meta">
                      Served {queue.servedCount} student(s), capacity{" "}
                      {queue.maxCapacity}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && queues.length === 0 && (
            <div className="aqh-empty-state">
              <p>
                No queue lines yet today for {user.departmentAbbrev}. Open one
                to start serving students.
              </p>
            </div>
          )}

          {!loading && queues.length > 0 && filteredQueues.length === 0 && (
            <div className="aqh-empty-state">
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