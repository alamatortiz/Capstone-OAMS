import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, QrCode, PauseCircle, StopCircle, PlayCircle, Users } from "lucide-react";
import { toast } from "sonner";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import QueueReasonModal from "../../components/QueueReasonModal";
import FormModal from "../../components/FormModal";
import QueueJoinQrDisplay from "../../components/QueueJoinQrDisplay";
import RefreshButton from "../../components/RefreshButton";
import { useAdminQueueHosting } from "../../hooks/useAdminQueueHosting";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { getCollegeLogo } from "../../data/collegeLogo";
import { getManilaTimeString, formatTimeString, formatManilaDate, formatManilaTime } from "../../utils/dateTime";
import "./prof-dashboard.css";
// The admin hosting page's stylesheet IS the design for this screen. Importing
// it (rather than re-deriving the look under pqh-* names) is what keeps the
// two hosts' queue screens genuinely identical instead of merely similar --
// a change to the admin card style now lands here automatically.
import "../admin/adm-queue-hosting.css";
import "./prof-queue-hosting.css";

// Faculty-side queue hosting.
//
// Same server routes as the admin screen (one router, mounted under
// /api/professor too) and now the same markup + stylesheet. The only
// deliberate differences are scope, not style: a faculty member hosts
// services delegated to them, sees only their own queues, and has no
// Universal Service Queue or department-wide filters.
export default function ProfessorQueueHosting() {
  const { user } = useAuth();
  const {
    queues,
    loading,
    error,
    fetchQueues,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue,
    handleResumeQueue,
    handleReasonConfirm,
  } = useAdminQueueHosting({ apiBase: "professor" });

  const [services, setServices] = useState([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrSlot, setQrSlot] = useState(null);
  const [acting, setActing] = useState(null);

  useLockBodyScroll(!!qrSlot);

  const [form, setForm] = useState({
    serviceId: "",
    startTime: getManilaTimeString().slice(0, 5),
    endTime: "17:00",
    maxCapacity: "20",
    serviceTimeMinutes: "10",
    noShowTimeoutMinutes: "15",
  });

  // Which services the college office has delegated. An empty list is the
  // normal state for most staff, so it gets an explanation rather than an
  // empty dropdown.
  useEffect(() => {
    api
      .get("/professor/queue-hosting/services")
      .then((res) => setServices(res.data.services ?? []))
      .catch(() => toast.error("Could not load your assigned services"))
      .finally(() => setServicesLoaded(true));
  }, []);

  const liveQueues = queues.filter((q) => ["open", "paused", "full"].includes(q.status));
  const pastQueues = queues.filter((q) => !["open", "paused", "full"].includes(q.status));
  const todayActive = liveQueues.filter((q) => q.isToday && q.status === "open").length;
  const todayPaused = liveQueues.filter((q) => q.isToday && q.status === "paused").length;
  const todayWaiting = liveQueues.reduce((n, q) => n + (q.currentCount ?? 0), 0);
  const todayServed = queues.filter((q) => q.isToday).reduce((n, q) => n + (q.servedCount ?? 0), 0);

  // No event param: FormModal owns the <form>, calls preventDefault() itself
  // and invokes onSubmit() bare.
  const handleOpenQueue = useCallback(async () => {
    if (!form.serviceId) return toast.error("Choose a service first");
    setSubmitting(true);
    try {
      const res = await api.post("/professor/queue-hosting", {
        serviceId: Number(form.serviceId),
        startTime: form.startTime,
        endTime: form.endTime,
        maxCapacity: Number(form.maxCapacity),
        serviceTimeMinutes: Number(form.serviceTimeMinutes),
        noShowTimeoutMinutes: Number(form.noShowTimeoutMinutes),
      });
      toast.success("Queue opened");
      setOpenForm(false);
      await fetchQueues();
      // Jump straight to the code -- a queue nobody can scan into is of no
      // use, so showing it is the natural next step rather than an extra tap.
      const newId = res.data?.queue?.id;
      if (newId) setQrSlot({ id: newId, name: res.data.queue.queueType ?? "Queue" });
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Could not open the queue");
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchQueues]);

  const runAction = useCallback(
    async (slotId, action, label) => {
      setActing(`${slotId}:${action}`);
      try {
        await api.patch(`/professor/queue-hosting/${slotId}/${action}`);
        toast.success(label);
        await fetchQueues();
      } catch (err) {
        toast.error(err?.response?.data?.error ?? `Could not ${label.toLowerCase()}`);
      } finally {
        setActing(null);
      }
    },
    [fetchQueues],
  );

  const renderCard = (queue, variant) => (
    <div key={queue.id} className={`aqh-queue-card aqh-card-${variant}`}>
      <div className="aqh-queue-card-top">
        <div className="aqh-queue-card-title-row">
          <img
            src={getCollegeLogo(queue.department || user?.departmentAbbrev)}
            alt={`${queue.department || user?.departmentAbbrev} logo`}
            className="aqh-queue-card-logo"
          />
          <div className="aqh-queue-card-title-block">
            <h3 className="aqh-queue-card-title">{queue.queueType}</h3>
            <p className="aqh-queue-card-dept">{queue.department}</p>
          </div>
        </div>
        <div className="aqh-queue-card-top-right">
          <span className={`aqh-status-badge aqh-status-${variant === "active" ? "active" : variant}`}>
            {queue.status}
          </span>
          {queue.currentlyServingStudentNumber && (
            <span className={`aqh-status-badge ${queue.currentlyServingArrivedAt ? "aqh-status-serving" : "aqh-status-called"}`}>
              {queue.currentlyServingArrivedAt ? "being served" : "called"}
            </span>
          )}
          {variant !== "closed" && (
            <div className="aqh-queue-card-actions">
              <button
                className="aqh-action-btn aqh-action-qr"
                onClick={() => setQrSlot({ id: queue.id, name: queue.queueType })}
              >
                <QrCode width={16} height={16} />
                <span>Show QR</span>
              </button>
              <button
                className="aqh-action-btn"
                disabled={acting === `${queue.id}:call-next` || queue.status !== "open"}
                onClick={() => runAction(queue.id, "call-next", "Called next student")}
              >
                <span>Call Next</span>
              </button>
              <button
                className="aqh-action-btn"
                disabled={!queue.currentlyServingStudentNumber}
                onClick={() => runAction(queue.id, "mark-arrived", "Marked as arrived")}
              >
                <span>Mark Arrived</span>
              </button>
              <button
                className="aqh-action-btn"
                disabled={!queue.currentlyServingStudentNumber}
                onClick={() => runAction(queue.id, "serve", "Student served")}
              >
                <span>Done</span>
              </button>
              {queue.status === "paused" ? (
                <button className="aqh-action-btn" onClick={() => handleResumeQueue(queue.id)}>
                  <PlayCircle width={16} height={16} />
                  <span>Resume</span>
                </button>
              ) : (
                <button className="aqh-action-btn aqh-action-pause" onClick={() => handlePauseQueue(queue.id)}>
                  <PauseCircle width={16} height={16} />
                  <span>Pause</span>
                </button>
              )}
              <button className="aqh-action-btn aqh-action-close" onClick={() => handleCloseQueue(queue.id)}>
                <StopCircle width={16} height={16} />
                <span>Close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="aqh-queue-stats-row aqh-stats-row-4">
        <div className="aqh-queue-stat">
          <p className="aqh-queue-stat-label">Waiting / Max</p>
          <p className="aqh-queue-stat-value">{queue.currentCount} / {queue.maxCapacity}</p>
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
              <span>{formatManilaDate(queue.createdAt, { year: "numeric", month: "numeric", day: "numeric" })}</span>
              <span>{formatManilaTime(queue.createdAt)}</span>
            </span>
          </p>
        </div>
        <div className="aqh-queue-stat">
          <p className="aqh-queue-stat-label">Now Serving</p>
          <p className="aqh-queue-stat-value">{queue.currentlyServingStudentNumber ?? "—"}</p>
        </div>
      </div>
    </div>
  );

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <>
          <QueueReasonModal
            show={!!reasonModal}
            title={reasonModal?.mode === "pause" ? "Pause Queue" : "Stop Queue"}
            message={
              reasonModal?.mode === "pause"
                ? "Students will see this reason while the queue is paused. The join code stops working until you resume."
                : "Everyone still waiting will be removed from this queue and will see this reason. They'll be sent to the front of the line next time they scan in for this service."
            }
            icon={reasonModal?.mode === "pause" ? <PauseCircle width={22} height={22} /> : <StopCircle width={22} height={22} />}
            variant={reasonModal?.mode === "pause" ? "warning" : "danger"}
            accentTheme="blue"
            confirmText={reasonModal?.mode === "pause" ? "Pause" : "Stop Queue"}
            submitting={reasonSubmitting}
            onConfirm={handleReasonConfirm}
            onCancel={() => setReasonModal(null)}
          />

          {qrSlot && (
            <div className="aqh-qr-overlay" role="dialog" aria-modal="true" aria-label="Queue join code" onClick={() => setQrSlot(null)}>
              <div className="aqh-qr-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="aqh-qr-header">
                  <h2>{qrSlot.name}</h2>
                  <button type="button" onClick={() => setQrSlot(null)} aria-label="Close join code">×</button>
                </div>
                <QueueJoinQrDisplay slotId={qrSlot.id} apiBase="professor" />
              </div>
            </div>
          )}

          <FormModal
            show={openForm}
            icon={<Users />}
            title="Open a Queue"
            description="Students join by scanning the code you'll show on the next screen."
            onCancel={() => setOpenForm(false)}
            onSubmit={handleOpenQueue}
            submitText="Open Queue"
            submitDisabled={!form.serviceId}
            submitting={submitting}
          >
            <label className="pqh-field">
              <span>Service</span>
              <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                ))}
              </select>
            </label>
            <div className="pqh-field-row">
              <label className="pqh-field">
                <span>Start</span>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </label>
              <label className="pqh-field">
                <span>End</span>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </label>
            </div>
            <div className="pqh-field-row">
              <label className="pqh-field">
                <span>Capacity</span>
                <input type="number" min="1" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} required />
              </label>
              <label className="pqh-field">
                <span>Minutes each</span>
                <input type="number" min="1" value={form.serviceTimeMinutes} onChange={(e) => setForm({ ...form, serviceTimeMinutes: e.target.value })} required />
              </label>
            </div>
          </FormModal>
        </>
      }
    >
      {/* Own container class: the admin equivalent gets its padding from
          .admin-dashboard-main, which this page's shell doesn't use. */}
      <div className="pqh-page">
        <div className="aqh-header-block">
          <div className="page-breadcrumb">
            <Link to="/professor/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />
              Home
            </Link>
          </div>
          <div className="aqh-page-header">
            <div className="refresh-header-row">
              <div className="aqh-title-section">
                <div className="aqh-title-icon">
                  <Users />
                </div>
                <div>
                  <h1 className="aqh-page-title">My Queue</h1>
                  <p className="aqh-page-subtitle">
                    Run the queue for a service assigned to you by the college office.
                  </p>
                </div>
              </div>
              <RefreshButton onClick={fetchQueues} loading={loading} label="Refresh queues" />
            </div>
          </div>
        </div>

        <div className="aqh-actions-row">
          <button
            className="aqh-open-queue-btn"
            onClick={() => setOpenForm(true)}
            disabled={loading || (servicesLoaded && services.length === 0)}
          >
            Open a Queue
          </button>
        </div>

        <div className="aqh-summary-grid pqh-summary-grid">
          <div className="aqh-summary-card aqh-summary-active">
            <div className="aqh-summary-content">
              <p className="aqh-summary-label">Active Queues</p>
              <p className="aqh-summary-value aqh-value-active">{loading ? "—" : todayActive}</p>
            </div>
          </div>
          <div className="aqh-summary-card aqh-summary-paused">
            <div className="aqh-summary-content">
              <p className="aqh-summary-label">Paused Queues</p>
              <p className="aqh-summary-value aqh-value-paused">{loading ? "—" : todayPaused}</p>
            </div>
          </div>
          <div className="aqh-summary-card aqh-summary-still-serving">
            <div className="aqh-summary-content">
              <p className="aqh-summary-label">Waiting</p>
              <p className="aqh-summary-value aqh-value-still-serving">{loading ? "—" : todayWaiting}</p>
            </div>
          </div>
          <div className="aqh-summary-card aqh-summary-completed">
            <div className="aqh-summary-content">
              <p className="aqh-summary-label">Served Today</p>
              <p className="aqh-summary-value aqh-value-completed">{loading ? "—" : todayServed}</p>
            </div>
          </div>
        </div>

        {error && <div className="dash-error-banner" role="alert">{error}</div>}

        {servicesLoaded && services.length === 0 && (
          <div className="pqh-empty">
            <h3>No services assigned to you yet</h3>
            <p>
              The college office decides which service&apos;s queue you can run. Once they
              assign one, you&apos;ll be able to open it here.
            </p>
          </div>
        )}

        {loading ? (
          <p className="pqh-muted">Loading…</p>
        ) : (
          <>
            {liveQueues.length > 0 && (
              <>
                <h2 className="aqh-section-title">Running now</h2>
                {liveQueues.map((q) => renderCard(q, q.status === "paused" ? "paused" : "active"))}
              </>
            )}
            {pastQueues.length > 0 && (
              <>
                <h2 className="aqh-section-title">Earlier</h2>
                {pastQueues.map((q) => renderCard(q, "closed"))}
              </>
            )}
            {liveQueues.length === 0 && services.length > 0 && (
              <p className="pqh-muted">You aren&apos;t running any queue right now.</p>
            )}
          </>
        )}
      </div>
    </ProfessorPageShell>
  );
}
