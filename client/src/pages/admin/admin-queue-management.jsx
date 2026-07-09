import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import './admin-queue-management.css';
import { getCollegeLogo } from '../../data/collegeLogo';
import api from '../../utils/api';
import { connectSocket } from '../../utils/socket';
import AdminSidebar from '../../components/AdminSidebar';
import ChatWidget from '../../components/ChatWidget';
import QueueReasonModal from '../../components/QueueReasonModal';
import { formatManilaDateTime } from '../../utils/dateTime';


// ─── Icons (all from admin dashboard) ───────────────────────────────────────
const QueueIconNav = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const UserIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
const Clock = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const Users = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const TrendingUp = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);
const MapPin = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);


const Calendar = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const AlertCircle = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <circle cx="12" cy="16" r="0.5" fill="currentColor"></circle>
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const PlayIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>
);
const ServedIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

function mapQueueFromApi(q) {
  return {
    id: q.id,
    queueType: q.queueType,
    department: q.department,
    maxCapacity: q.maxCapacity,
    noShowTimeoutMinutes: q.noShowTimeoutMinutes,
    currentCount: q.currentCount,
    servedCount: q.servedCount,
    status: q.status === 'open' ? 'active' : q.status,
    createdAt: q.createdAt
      ? formatManilaDateTime(q.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })
      : '—',
    serviceHours: q.serviceHours,
    location: q.location || 'N/A',
    currentlyServing: q.currentlyServingStudentNumber || '—',
    averageServiceTime: q.avgServiceMinutes != null ? `~${q.avgServiceMinutes} min` : 'N/A',
  };
}

export default function AdminQueueManagement() {
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [entriesPage, setEntriesPage] = useState(0);

  const selectedQueue = queues.find(q => q.id === selectedQueueId) || null;

  const serviceTypes = [...new Set(queues.map((q) => q.queueType))].sort();
  const filteredQueues =
    serviceTypeFilter === 'all'
      ? queues
      : queues.filter((q) => q.queueType === serviceTypeFilter);

  // ─── Queue entries pagination ────────────────────────────────────────────
  const ENTRIES_PER_PAGE = 5;
  const totalEntryPages = Math.max(1, Math.ceil(queueEntries.length / ENTRIES_PER_PAGE));
  const currentEntriesPage = Math.min(entriesPage, totalEntryPages - 1);
  const entriesStartIndex = currentEntriesPage * ENTRIES_PER_PAGE;
  const paginatedEntries = queueEntries.slice(entriesStartIndex, entriesStartIndex + ENTRIES_PER_PAGE);

  // ─── Effects ───────────────────────────────────────────────────────────────
  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get('/admin/queue-hosting');
      setQueues((res.data.queues || []).map(mapQueueFromApi));
    } catch {
      setError('Failed to load queues. Please try again.');
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!selectedQueueId) {
      setQueueEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const res = await api.get(`/admin/queue-hosting/${selectedQueueId}/entries`);
      setQueueEntries(res.data.entries || []);
    } catch {
      setQueueEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedQueueId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchQueues();
      setLoading(false);
    };
    init();
  }, [fetchQueues]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Live updates: refetch when a socket event affects this dept's queues ──
  useEffect(() => {
    const token = sessionStorage.getItem('oams_token');
    if (!token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refetch = () => {
      fetchQueues();
      fetchEntries();
    };

    const events = [
      'queue:slot-opened',
      'queue:slot-status',
      'queue:called',
      'queue:served',
      'queue:no-show',
      'queue:student-joined',
      'queue:student-left',
      'queue:notes-updated',
    ];
    events.forEach((event) => socket.on(event, refetch));

    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [fetchQueues, fetchEntries]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const generateQueueBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes('pause') || i.includes('stop'))
      return 'You can pause/resume queues from the queue details view. Click on a queue to manage its status.';
    if (i.includes('waiting') || i.includes('student'))
      return `There are currently ${queues.reduce((acc, q) => acc + q.currentCount, 0)} students waiting across all queues.`;
    if (i.includes('served') || i.includes('complete'))
      return `Today, ${queues.reduce((acc, q) => acc + q.servedCount, 0)} students have been served.`;
    if (i.includes('capacity'))
      return 'Monitor capacity using the progress bars in the queue details. Pause when reaching max capacity.';
    return 'I can help you manage queues, track students, and monitor queue status. What do you need?';
  };

  const handleViewDetails = (queue) => {
    setSelectedQueueId(queue.id);
    setEntriesPage(0);
  };

  const handleBack = () => {
    setSelectedQueueId(null);
  };

  // ─── Queue Action Handlers ─────────────────────────────────────────────────
  const handleCallNext = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/call-next`);
      toast.success('Next student called');
      await Promise.all([fetchQueues(), fetchEntries()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to call next student');
    }
  };

  const handleMarkServed = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/serve`);
      toast.success('Student marked as served');
      await Promise.all([fetchQueues(), fetchEntries()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to mark as served');
    }
  };

  // Pause and stop both require a reason, collected via QueueReasonModal.
  const [reasonModal, setReasonModal] = useState(null); // { mode: 'pause'|'close' }
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const handlePause = () => setReasonModal({ mode: 'pause' });
  const handleStop = () => setReasonModal({ mode: 'close' });

  const handleResume = async () => {
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/resume`);
      toast.success('Queue resumed');
      await fetchQueues();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to resume queue');
    }
  };

  const handleReasonConfirm = async (reason) => {
    if (!reasonModal) return;
    const { mode } = reasonModal;
    setReasonSubmitting(true);
    try {
      await api.patch(`/admin/queue-hosting/${selectedQueueId}/${mode}`, { reason });
      toast[mode === 'pause' ? 'message' : 'success'](
        mode === 'pause' ? 'Queue paused' : 'Queue stopped',
      );
      setReasonModal(null);
      if (mode === 'close') setSelectedQueueId(null);
      await Promise.all([fetchQueues(), fetchEntries()]);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? `Failed to ${mode} queue`);
    } finally {
      setReasonSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'aqm-status-badge-active';
      case 'paused':
        return 'aqm-status-badge-paused';
      case 'closed':
        return 'aqm-status-badge-closed';
      default:
        return 'aqm-status-badge-closed';
    }
  };

  const getEntryStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'aqm-entry-status-waiting';
      case 'serving':
        return 'aqm-entry-status-serving';
      case 'completed':
        return 'aqm-entry-status-completed';
      case 'cancelled':
        return 'aqm-entry-status-cancelled';
      case 'no_show':
        return 'aqm-entry-status-no-show';
      default:
        return 'aqm-entry-status-completed';
    }
  };

  const getEntryStatusLabel = (status) =>
    status === 'no_show' ? 'No-Show' : status;

  // ─── Details View ──────────────────────────────────────────────────────────
  if (selectedQueue) {
    const queueProgress = (selectedQueue.servedCount / (selectedQueue.servedCount + selectedQueue.currentCount)) * 100;
    const capacityUsed = (selectedQueue.currentCount / selectedQueue.maxCapacity) * 100;

    return (
      <div className="aqm-dashboard-with-sidebar">
        <AdminSidebar />

        {/* Main Content - Details View */}
        <main className="aqm-dashboard-main">
          <div className="aqm-details-container">
            {/* Back Button */}
            <div className="aqm-details-header">
              <button className="aqm-back-btn" onClick={handleBack}>
                <ArrowLeftIcon />
                Back to Queue List
              </button>
            </div>

            {/* Queue Header */}
            <div className="aqm-page-header">
              <div className="aqm-title-section">
                <div className="aqm-title-icon">
                  <QueueIconNav className="aqm-icon-xl" />
                </div>
                <div>
                  <h1 className="aqm-page-title">{selectedQueue.queueType}</h1>
                  <p className="aqm-queue-department">{selectedQueue.department}</p>
                  <p className="aqm-queue-location">Location: {selectedQueue.location}</p>
                </div>
              </div>
              <span className={`aqm-queue-status-badge ${getStatusColor(selectedQueue.status)}`}>
                {selectedQueue.status}
              </span>
            </div>

            <div className="aqm-details-grid">
              {/* Main Content */}
              <div className="aqm-details-main">
                {/* Stats Grid */}
                <div className="aqm-stats-grid">
                  <div className="aqm-stat-card aqm-stat-waiting">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-queue">
                      <PlayIcon className="aqm-stat-icon" />
                    </div>
                    <p className="aqm-stat-label">Active queues</p>
                    <p className="aqm-stat-value">{queues.filter((q) => q.status === 'active').length}</p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-total">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-waiting">
                      <Users className="aqm-icon-header" />
                    </div>
                    <p className="aqm-stat-label">Total waiting</p>
                    <p className="aqm-stat-value">
                      {queues.reduce((acc, q) => acc + q.currentCount, 0)}
                    </p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-served">
                    <div className="aqm-stat-icon-wrap aqm-stat-icon-served">
                      <ServedIcon className="aqm-stat-icon" />
                    </div>
                    <p className="aqm-stat-label">Served today</p>
                    <p className="aqm-stat-value">
                      {queues.reduce((acc, q) => acc + q.servedCount, 0)}
                    </p>
                  </div>

                  <div className="aqm-stat-card aqm-stat-capacity">
                    <p className="aqm-stat-label">Capacity</p>
                    <p className="aqm-stat-value">{Math.round(capacityUsed)}%</p>
                  </div>
                </div>


                {/* Queue Actions */}
                <div className="aqm-progress-card aqm-actions-card">
                  <div className="aqm-progress-header">
                    <h3>Queue Actions</h3>
                  </div>
                  <div className="aqm-actions-grid">
                    <button
                      className="aqm-action-btn aqm-action-btn-primary"
                      onClick={handleCallNext}
                      disabled={
                        !!queueEntries.find(e => e.status === 'serving') ||
                        selectedQueue.currentCount === 0 ||
                        selectedQueue.status !== 'active'
                      }
                    >
                      Call Next
                    </button>
                    <button
                      className="aqm-action-btn aqm-action-btn-success"
                      onClick={handleMarkServed}
                      disabled={!queueEntries.find(e => e.status === 'serving')}
                    >
                      Mark as Served
                    </button>
                    {selectedQueue.status === 'paused' ? (
                      <button className="aqm-action-btn aqm-action-btn-success" onClick={handleResume}>
                        Resume Queue
                      </button>
                    ) : (
                      <button
                        className="aqm-action-btn aqm-action-btn-warning"
                        onClick={handlePause}
                        disabled={selectedQueue.status !== 'active'}
                      >
                        Pause Queue
                      </button>
                    )}
                    <button
                      className="aqm-action-btn aqm-action-btn-danger"
                      onClick={handleStop}
                      disabled={selectedQueue.status === 'closed' || selectedQueue.status === 'cancelled'}
                    >
                      Stop Queue
                    </button>
                  </div>
                </div>

                {/* Progress Metrics */}
                <div className="aqm-progress-card">
                  <div className="aqm-progress-header">
                    <TrendingUp className="aqm-icon-header" />
                    <h3>Queue Progress</h3>
                  </div>
                  <div className="aqm-progress-body">
                    <div className="aqm-progress-item">
                      <div className="aqm-progress-label">
                        <span>Completion Rate</span>
                        <span className="aqm-progress-value">{Math.round(queueProgress)}%</span>
                      </div>
                      <div className="aqm-progress-bar">
                        <div className="aqm-progress-fill" style={{ width: `${queueProgress}%` }}></div>
                      </div>
                    </div>
                    <div className="aqm-progress-item">
                      <div className="aqm-progress-label">
                        <span>Capacity Used</span>
                        <span className="aqm-progress-value">
                          {selectedQueue.currentCount} / {selectedQueue.maxCapacity}
                        </span>
                      </div>
                      <div className="aqm-progress-bar">
                        <div className="aqm-progress-fill" style={{ width: `${capacityUsed}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queue Entries */}
                <div className="aqm-entries-card">
                  <div className="aqm-entries-header">
                    <Users className="aqm-icon-header" />
                    <h3>Queue Entries ({queueEntries.length})</h3>
                  </div>
                  <p className="aqm-entries-subtitle">Students currently in queue</p>
                  <div className="aqm-entries-list">
                    {loadingEntries ? (
                      <p style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>Loading entries...</p>
                    ) : queueEntries.length === 0 ? (
                      <p style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>No students in queue.</p>
                    ) : (
                      paginatedEntries.map((entry, index) => (
                        <div
                          key={entry.queueNumber}
                          className={`aqm-entry-item ${entry.status === 'serving' ? 'aqm-entry-serving' : ''}`}
                        >
                          <div className="aqm-entry-top">
                            <div className="aqm-entry-number">{entriesStartIndex + index + 1}</div>
                            <div className="aqm-entry-info">
                              <h4 className="aqm-entry-name">{entry.studentName}</h4>
                              <p className="aqm-entry-id">ID: {entry.studentId}</p>
                            </div>
                            <div className="aqm-entry-badges">
                              <span className={`aqm-entry-status ${getEntryStatusColor(entry.status)}`}>
                                {getEntryStatusLabel(entry.status)}
                              </span>
                              <span className="aqm-entry-queue-number">{entry.queueNumber}</span>
                            </div>
                          </div>
                          <div className="aqm-entry-details">
                            <p className="aqm-entry-concern">
                              <strong>Concern:</strong> {entry.concern}
                            </p>
                            <p className="aqm-entry-time">
                              <Clock className="aqm-icon-small" />
                              Joined at {entry.joinedAt}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {!loadingEntries && queueEntries.length > ENTRIES_PER_PAGE && (
                    <div className="aqm-entries-pagination">
                      <button
                        className="aqm-entries-page-btn"
                        onClick={() => setEntriesPage((p) => Math.max(0, p - 1))}
                        disabled={currentEntriesPage === 0}
                        aria-label="Previous batch"
                      >
                        <ChevronLeft />
                      </button>
                      <span className="aqm-entries-page-label">
                        {entriesStartIndex + 1}–{Math.min(queueEntries.length, entriesStartIndex + ENTRIES_PER_PAGE)} of {queueEntries.length}
                      </span>
                      <button
                        className="aqm-entries-page-btn"
                        onClick={() => setEntriesPage((p) => Math.min(totalEntryPages - 1, p + 1))}
                        disabled={currentEntriesPage >= totalEntryPages - 1}
                        aria-label="Next batch"
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Info */}
              <aside className="aqm-details-sidebar">
                {/* Service Hours */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-header">
                    <Calendar className="aqm-icon-header" />
                    <h4>Service Hours</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Opens</span>
                      <span className="aqm-item-value">{selectedQueue.serviceHours.start}</span>
                    </div>
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Closes</span>
                      <span className="aqm-item-value">{selectedQueue.serviceHours.end}</span>
                    </div>
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">Avg. Time</span>
                      <span className="aqm-item-value">{selectedQueue.averageServiceTime}</span>
                    </div>
                    <div className="aqm-sidebar-item">
                      <span className="aqm-item-label">No-show after</span>
                      <span className="aqm-item-value">{selectedQueue.noShowTimeoutMinutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Currently Serving */}
                <div className="aqm-sidebar-card aqm-sidebar-card-highlight">
                  <div className="aqm-sidebar-card-header">
                    <AlertCircle className="aqm-icon-header" />
                    <h4>Now Serving</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-now-serving-number">
                      {queueEntries.find((e) => e.status === 'serving')?.queueNumber || selectedQueue.currentlyServing}
                    </p>
                    <p className="aqm-now-serving-name">
                      {queueEntries.find((e) => e.status === 'serving')?.studentName || 'None'}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-header">
                    <MapPin className="aqm-icon-header" />
                    <h4>Location</h4>
                  </div>
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-location-text">{selectedQueue.location}</p>
                  </div>
                </div>

                {/* Queue Created */}
                <div className="aqm-sidebar-card">
                  <div className="aqm-sidebar-card-body">
                    <p className="aqm-created-label">Queue Created</p>
                    <p className="aqm-created-date">{selectedQueue.createdAt}</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>

        <ChatWidget
          initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you manage queues?"
          getBotResponse={generateQueueBotResponse}
        />

        <QueueReasonModal
          show={!!reasonModal}
          title={reasonModal?.mode === 'pause' ? 'Pause Queue' : 'Stop Queue'}
          message={
            reasonModal?.mode === 'pause'
              ? "Students in this queue will see this reason while it's paused."
              : 'All students still waiting or being served will be removed from this queue and will see this reason. This cannot be undone.'
          }
          confirmText={reasonModal?.mode === 'pause' ? 'Pause' : 'Stop Queue'}
          submitting={reasonSubmitting}
          onConfirm={handleReasonConfirm}
          onCancel={() => setReasonModal(null)}
        />
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="aqm-dashboard-with-sidebar">
      <AdminSidebar />

      {/* Main Content - List View */}
      <main className="aqm-dashboard-main">
        <div className="aqm-list-container">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeft />Home</Link></div>
          <div className="aqm-page-header">
            <div className="aqm-title-section">
              <div className="aqm-title-icon">
                <QueueIconNav className="aqm-icon-xl" />
              </div>
              <div>
                <h1 className="aqm-page-title">Queue Management</h1>
                <p className="aqm-page-subtitle">Monitor and manage all active queues</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="aqm-summary-grid">
            <div className="aqm-summary-card aqm-summary-active">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Active Queues</p>
                <p className="aqm-summary-value">
                  {queues.filter((q) => q.status === 'active').length}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-active" aria-hidden="true">
                <PlayIcon className="aqm-summary-icon-svg-small" />
              </div>
            </div>

            <div className="aqm-summary-card aqm-summary-waiting">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Total Waiting</p>
                <p className="aqm-summary-value">
                  {queues.reduce((acc, q) => acc + q.currentCount, 0)}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-waiting" aria-hidden="true">
                <UserIcon className="aqm-summary-icon-svg-large" />
              </div>
            </div>

            <div className="aqm-summary-card aqm-summary-served">
              <div className="aqm-summary-content">
                <p className="aqm-summary-label">Served Today</p>
                <p className="aqm-summary-value">
                  {queues.reduce((acc, q) => acc + q.servedCount, 0)}
                </p>
              </div>
              <div className="aqm-summary-icon aqm-summary-icon-served" aria-hidden="true">
                <TrendingUp className="aqm-summary-icon-svg-small" />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="aqm-toolbar">
            <div className="aqm-dropdown-wrapper">
              <select
                className="aqm-dropdown"
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                aria-label="Filter by service type"
              >
                <option value="all">All Service Types</option>
                {serviceTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </div>

          {/* Queue List */}
          <div className="aqm-queue-list">
            {loading ? (
              <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading queues...</p>
            ) : error ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error, #e53e3e)' }}>{error}</p>
            ) : queues.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No queues opened today for your department.</p>
            ) : filteredQueues.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No queues match this service type.</p>
            ) : (
              filteredQueues.map((queue) => (
                <div
                  key={queue.id}
                  className="aqm-queue-card"
                  onClick={() => handleViewDetails(queue)}
                >
                  <div className="aqm-queue-card-content">
                    <div className="aqm-queue-card-main">
                      <div className="aqm-queue-card-header">
                        <div className="aqm-queue-card-left">
                          <img
                            className="aqm-queue-college-logo"
                            src={getCollegeLogo(queue.department)}
                            alt={`${queue.department} logo`}
                          />
                          <div className="aqm-queue-card-left-text">
                            <h3 className="aqm-queue-card-title">{queue.queueType}</h3>
                            <p className="aqm-queue-card-department">{queue.department}</p>
                          </div>
                        </div>

                        <span className={`aqm-queue-status-badge ${getStatusColor(queue.status)}`}>
                          {queue.status}
                        </span>
                      </div>

                      <div className="aqm-queue-card-stats">
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Waiting</p>
                          <p className="aqm-queue-stat-value">{queue.currentCount}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Served</p>
                          <p className="aqm-queue-stat-value">{queue.servedCount}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Now Serving</p>
                          <p className="aqm-queue-stat-value-small">{queue.currentlyServing}</p>
                        </div>
                        <div className="aqm-queue-stat">
                          <p className="aqm-queue-stat-label">Avg. Time</p>
                          <p className="aqm-queue-stat-value-small">{queue.averageServiceTime}</p>
                        </div>
                      </div>

                      <div className="aqm-queue-card-footer">
                        <Clock className="aqm-icon-small" />
                        <span>{queue.serviceHours.start} - {queue.serviceHours.end}</span>
                        <span>•</span>
                        <MapPin className="aqm-icon-small" />
                        <span>{queue.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you manage queues?"
        getBotResponse={generateQueueBotResponse}
      />
    </div>
  );
}