import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Users,
  UserCheck,
  CheckCircle2,
  UserX,
  Clock,
  Undo2,
  Megaphone,
  MapPin,
  ClipboardCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import QueueReasonModal from "../../components/QueueReasonModal";
import RefreshButton from "../../components/RefreshButton";
import { useLiveRefetch } from "../../hooks/useLiveRefetch";
import api from "../../utils/api";
import { formatManilaTime } from "../../utils/dateTime";
import "./prof-dashboard.css";
import "./prof-queue.css";

// Any queue activity in the department can change this professor's line
// (a student passed to them, one leaving, the office reassigning), and the
// server also emits directly to the professor for the ones that concern them.
// Module-level so useLiveRefetch never resubscribes.
const QUEUE_EVENTS = [
  "queue:passed",
  "queue:returned",
  "queue:called",
  "queue:arrived",
  "queue:served",
  "queue:no-show",
  "queue:student-left",
  "queue:notes-updated",
  "queue:requirements-updated",
  "queue:slot-status",
  "queue:slot-opened",
];

// Professor Queue.
//
// Professors don't host queues. The college office passes them students who
// need a service the office assigned them; this page is where they call and
// serve those students. The office's queue rules still apply -- its no-show
// grace period and service time -- and a no-show here counts toward the
// student's restriction strikes like anywhere else.
export default function ProfessorQueue() {
  const [data, setData] = useState({ services: [], stats: null, current: null, entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipSubmitting, setSkipSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get("/professor/queue");
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load professor queue:", err);
      setError("Could not load your queue. Retrying automatically.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useLiveRefetch(QUEUE_EVENTS, fetchQueue);

  const runAction = useCallback(
    async (key, request, successMessage, failMessage) => {
      setActing(key);
      try {
        const res = await request();
        toast.success(successMessage ?? res.data?.message);
        await fetchQueue();
      } catch (err) {
        toast.error(err?.response?.data?.error ?? failMessage);
      } finally {
        setActing(null);
      }
    },
    [fetchQueue],
  );

  const handleCallNext = () =>
    runAction("call", () => api.patch("/professor/queue/call-next"), "Next student called", "Could not call the next student");
  const handleArrived = () =>
    runAction("arrived", () => api.patch("/professor/queue/mark-arrived"), "Student marked as arrived", "Could not mark the student as arrived");
  const handleServe = () =>
    runAction("serve", () => api.patch("/professor/queue/serve"), "Student marked as served", "Could not mark the student as served");

  const handleReturn = (entry) =>
    runAction(
      `return:${entry.queueId}`,
      async () => {
        const res = await api.post(`/professor/queue/entries/${entry.queueId}/return`);
        if (res.data?.cancelled) {
          // The office already stopped that queue, so the ticket was cancelled
          // (with a priority credit) rather than returned -- say so plainly.
          toast.error(res.data.message);
        }
        return res;
      },
      undefined,
      "Could not return the student to the office line",
    );

  // Skip / no-show: red, like every other negative outcome in the app.
  const handleSkipConfirm = async (reason) => {
    setSkipSubmitting(true);
    try {
      await api.patch("/professor/queue/skip", { reason });
      toast.error("Student skipped and marked as no-show");
      setSkipOpen(false);
      await fetchQueue();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to skip student");
    } finally {
      setSkipSubmitting(false);
    }
  };

  const { services, stats, current, entries } = data;
  const nextUp = entries[0] ?? null;

  const renderRequirements = (entry) =>
    entry.requirementsReady && (
      <span
        className={`pq-chip ${entry.requirementsReady.checked === entry.requirementsReady.total ? "pq-chip--ready" : "pq-chip--not-ready"}`}
      >
        <ClipboardCheck />
        {entry.requirementsReady.checked}/{entry.requirementsReady.total} requirements confirmed
      </span>
    );

  return (
    <ProfessorPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <QueueReasonModal
          show={skipOpen}
          title="Skip Student"
          message="This voids the current student's ticket as a no-show and frees their seat on the office's queue. It counts toward their no-show limit, and they'll see this reason. This cannot be undone."
          icon={<UserX width={22} height={22} />}
          accentTheme="blue"
          confirmText="Skip Student"
          submitting={skipSubmitting}
          onConfirm={handleSkipConfirm}
          onCancel={() => setSkipOpen(false)}
        />
      }
    >
      <div className="pq-page">
        <div className="refresh-header-row">
          <PageHeader
            breadcrumb={
              <Link to="/professor/dashboard" className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                Home
              </Link>
            }
            icon={<Users />}
            iconClassName="pq-title-icon"
            title="Queue"
            subtitle="Serve students passed to you by the college office."
            headerClassName="pq-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="pq-title-section"
            titleClassName="pq-title"
            subtitleClassName="pq-subtitle"
          />
          <RefreshButton onClick={fetchQueue} loading={loading} label="Refresh queue" />
        </div>

        {error && <div className="pq-error" role="alert">{error}</div>}

        {/* Tracker */}
        <div className="pq-stats">
          <div className="pq-stat-card">
            <div className="pq-stat-icon pq-stat-icon--blue"><Users /></div>
            <p className="pq-stat-label">Waiting for You</p>
            <p className="pq-stat-value pq-val-blue">{loading ? "—" : stats?.waiting ?? 0}</p>
          </div>
          <div className="pq-stat-card">
            <div className="pq-stat-icon pq-stat-icon--violet"><UserCheck /></div>
            <p className="pq-stat-label">Now Serving</p>
            <p className="pq-stat-value pq-stat-value--text pq-val-violet">
              {loading ? "—" : current ? current.studentNumber : "—"}
            </p>
          </div>
          <div className="pq-stat-card">
            <div className="pq-stat-icon pq-stat-icon--green"><CheckCircle2 /></div>
            <p className="pq-stat-label">Served Today</p>
            <p className="pq-stat-value pq-val-green">{loading ? "—" : stats?.servedToday ?? 0}</p>
          </div>
          <div className="pq-stat-card">
            <div className="pq-stat-icon pq-stat-icon--red"><UserX /></div>
            <p className="pq-stat-label">No-Shows Today</p>
            <p className="pq-stat-value pq-val-red">{loading ? "—" : stats?.noShowToday ?? 0}</p>
          </div>
        </div>

        {/* Services this professor handles */}
        <div className="pq-card">
          <div className="pq-card-header">
            <h3><Layers />Services You Handle</h3>
          </div>
          {loading ? (
            <p className="pq-muted">Loading…</p>
          ) : services.length === 0 ? (
            <div className="pq-empty">
              <h3>No Services Assigned Yet</h3>
              <p>
                The college office decides which services you handle. Once they assign one,
                students who need it can be passed to you here.
              </p>
            </div>
          ) : (
            <div className="pq-service-list">
              {services.map((s) => (
                <div key={s.serviceId} className="pq-service">
                  <span className="pq-service-name">{s.serviceName}</span>
                  {s.location && (
                    <span className="pq-service-location"><MapPin />{s.location}</span>
                  )}
                  <span className={`pq-badge ${s.isLive ? "pq-badge--live" : "pq-badge--idle"}`}>
                    {s.isLive ? "Live" : "No live queue"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current / next student */}
        <div className="pq-card pq-current-card">
          <div className="pq-card-header">
            <h3><UserCheck />{current ? "Current Student" : "Next Up"}</h3>
            {current && (
              <span className={`pq-badge ${current.arrivedAt ? "pq-badge--serving" : "pq-badge--called"}`}>
                {current.arrivedAt ? "Being Served" : "Called"}
              </span>
            )}
          </div>

          {current ? (
            <>
              <div className="pq-student">
                <div className="pq-student-top">
                  <h4 className="pq-student-name">{current.studentName}</h4>
                  <span className="pq-id-badge">{current.studentNumber}</span>
                  <span className="pq-ticket-badge">{current.queueNumberBadge}</span>
                </div>
                <p className="pq-detail"><strong>Service:</strong> {current.service}</p>
                <p className="pq-detail"><strong>Concern:</strong> {current.concern}</p>
                <div className="pq-chip-row">
                  {renderRequirements(current)}
                  <span className="pq-chip"><Clock />Called at {formatManilaTime(current.calledAt)}</span>
                </div>
                {!current.arrivedAt && (
                  <p className="pq-hint">
                    If they don&apos;t arrive within {current.noShowTimeoutMinutes} minutes of being
                    called, they&apos;re marked as a no-show automatically. Mark them as arrived once
                    they&apos;re here.
                  </p>
                )}
              </div>
              <div className="pq-actions">
                {!current.arrivedAt && (
                  <button
                    className="pq-action-btn pq-action-btn--primary"
                    onClick={handleArrived}
                    disabled={!!acting}
                  >
                    <UserCheck />
                    Mark Arrived
                  </button>
                )}
                <button
                  className="pq-action-btn pq-action-btn--success"
                  onClick={handleServe}
                  disabled={!!acting}
                >
                  <CheckCircle2 />
                  Mark as Served
                </button>
                <button
                  className="pq-action-btn pq-action-btn--danger"
                  onClick={() => setSkipOpen(true)}
                  disabled={!!acting}
                >
                  <UserX />
                  Skip / No-Show
                </button>
              </div>
            </>
          ) : nextUp ? (
            <>
              <div className="pq-student">
                <div className="pq-student-top">
                  <h4 className="pq-student-name">{nextUp.studentName}</h4>
                  <span className="pq-id-badge">{nextUp.studentNumber}</span>
                  <span className="pq-ticket-badge">{nextUp.queueNumberBadge}</span>
                </div>
                <p className="pq-detail"><strong>Service:</strong> {nextUp.service}</p>
                <p className="pq-detail"><strong>Concern:</strong> {nextUp.concern}</p>
                <div className="pq-chip-row">{renderRequirements(nextUp)}</div>
              </div>
              <div className="pq-actions">
                <button
                  className="pq-action-btn pq-action-btn--primary"
                  onClick={handleCallNext}
                  disabled={!!acting}
                >
                  <Megaphone />
                  Call Next Student
                </button>
              </div>
            </>
          ) : (
            <p className="pq-muted pq-muted--center">
              {loading ? "Loading…" : "No students have been passed to you right now."}
            </p>
          )}
        </div>

        {/* Line */}
        <div className="pq-card">
          <div className="pq-card-header">
            <h3>
              <Users />
              Students Passed to You
              <span className="pq-count-badge">{entries.length}</span>
            </h3>
          </div>
          {entries.length === 0 ? (
            <p className="pq-muted">{loading ? "Loading…" : "No one is waiting for you."}</p>
          ) : (
            <div className="pq-entry-list">
              {entries.map((entry) => (
                <div key={entry.queueId} className="pq-entry">
                  <div className="pq-entry-top">
                    <div className="pq-entry-position">{entry.position}</div>
                    <div className="pq-entry-info">
                      <h4 className="pq-entry-name">
                        {entry.studentName}
                        <span className="pq-id-badge">{entry.studentNumber}</span>
                      </h4>
                      <p className="pq-entry-meta">
                        {entry.service} · from {entry.fromQueue}
                        {entry.passedBy ? ` · passed by ${entry.passedBy}` : ""}
                      </p>
                    </div>
                    <div className="pq-entry-badges">
                      {entry.isPriority && (
                        <span className="pq-badge pq-badge--priority" title="Was left unserved previously">Priority</span>
                      )}
                      <span className="pq-ticket-badge">{entry.queueNumberBadge}</span>
                    </div>
                  </div>
                  <p className="pq-detail"><strong>Concern:</strong> {entry.concern}</p>
                  <div className="pq-entry-bottom">
                    <div className="pq-chip-row">
                      {renderRequirements(entry)}
                      <span className="pq-chip"><Clock />Joined at {entry.joinedAt}</span>
                      {entry.estimatedWait && <span className="pq-chip">Est. wait {entry.estimatedWait}</span>}
                    </div>
                    <button
                      type="button"
                      className="pq-return-btn"
                      onClick={() => handleReturn(entry)}
                      disabled={!!acting}
                      title="Send this student back to the office line"
                    >
                      <Undo2 />
                      Return to Office
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProfessorPageShell>
  );
}
