import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ===== Chat Widget Icons =====
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

import { Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Loader2, ChevronDown, HelpCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

import ActionConfirmModal from "../../components/ActionConfirmModal";
import StudentSidebar from "../../components/StudentSidebar";
import { useQueue } from '../../contexts/QueueContext';
import { getCollegeLogo } from '../../data/collegeLogo';
import api from '../../utils/api';

import './stud-queue.css';

export default function QueuePage() {
  const {
    queues,
    availableSlots,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    isAlreadyInQueue,
  } = useQueue();

  const navigate = useNavigate();

  // Track which slot/queue buttons are in-flight to prevent double-clicks
  const [joiningSlotId, setJoiningSlotId] = useState(null);
  const [leavingQueueId, setLeavingQueueId] = useState(null);

  // Detail view state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [servicesData, setServicesData] = useState([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with your queue today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(1); // initial bot message uses id:1

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedService, setSelectedService] = useState('all');

  // Derive unique college names from all departments in the database
  const collegeOptions = useMemo(() => {
    const seen = new Map();
    for (const dept of servicesData) {
      if (!seen.has(dept.departmentName)) {
        seen.set(dept.departmentName, dept.departmentAbbrev);
      }
    }
    return [...seen.entries()]
      .map(([name, abbrev]) => ({ name, abbrev }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [servicesData]);

  // Derive service names scoped to the selected college (or all if none selected)
  const serviceOptions = useMemo(() => {
    const departments =
      selectedCollege === 'all'
        ? servicesData
        : servicesData.filter((dept) => dept.departmentName === selectedCollege);
    const names = [
      ...new Set(
        departments.flatMap((dept) => dept.services?.map((s) => s.serviceName) ?? [])
      ),
    ].sort();
    return names;
  }, [servicesData, selectedCollege]);

  // Reset service filter when college changes
  useEffect(() => {
    setSelectedService('all');
  }, [selectedCollege]);

  // Sync selectedSlot from live availableSlots on each poll.
  // If the student just joined this slot it will appear in queues, so
  // navigate back to the list immediately instead of re-asserting the slot.
  useEffect(() => {
    if (!selectedSlot) return;
    if (isAlreadyInQueue(selectedSlot.slotId)) {
      setSelectedSlot(null);
      return;
    }
    const fresh = availableSlots.find((s) => s.slotId === selectedSlot.slotId);
    if (fresh) setSelectedSlot(fresh);
    else setSelectedSlot(null);
  }, [availableSlots, selectedSlot, isAlreadyInQueue]);

  // Filter available slots client-side
  const filteredSlots = useMemo(
    () =>
      availableSlots.filter((slot) => {
        const collegeMatch =
          selectedCollege === 'all' ||
          slot.departmentName === selectedCollege;
        const serviceMatch =
          selectedService === 'all' || slot.serviceName === selectedService;
        const notAlreadyJoined = !isAlreadyInQueue(slot.slotId);
        return collegeMatch && serviceMatch && notAlreadyJoined;
      }),
    [availableSlots, selectedCollege, selectedService, isAlreadyInQueue],
  );

  // ── Chat ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch services data for requirements lookup ───────────────────────────
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/student/services/by-department');
        setServicesData(data.departments ?? []);
      } catch {
        // silent — requirements fall back to generic defaults
      }
    };
    fetchServices();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleJoinQueue = useCallback(
    async (slotId) => {
      if (joiningSlotId === slotId) return;
      setJoiningSlotId(slotId);
      try {
        await joinQueue(slotId);
        toast.success('Successfully joined the queue!');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setJoiningSlotId(null);
      }
    },
    [joinQueue, joiningSlotId],
  );

  const handleLeaveQueue = useCallback(
    async (queueId) => {
      if (leavingQueueId) return;
      setLeavingQueueId(queueId);
      try {
        await leaveQueue(queueId);
        toast.info('You have left the queue');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLeavingQueueId(null);
      }
    },
    [leaveQueue, leavingQueueId],
  );

  // ── Service detail helpers ────────────────────────────────────────────────
  const getServiceRequirements = (serviceName) => {
    for (const dept of servicesData) {
      const svc = dept.services?.find(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      );
      if (svc?.requirements?.length) return svc.requirements;
    }
    return [];
  };

  const getProcedureSteps = (serviceName) => {
    for (const dept of servicesData) {
      const svc = dept.services?.find(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      );
      if (svc?.procedureSteps?.length) return svc.procedureSteps;
    }
    return [];
  };

  const handleJoinFromDetail = async () => {
    if (!selectedSlot || joiningSlotId) return;
    setJoiningSlotId(selectedSlot.slotId);
    try {
      await joinQueue(selectedSlot.slotId);
      toast.success(`Successfully joined the queue for ${selectedSlot.serviceName}!`);
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err.message ?? 'Failed to join the queue. Please try again.');
    } finally {
      setJoiningSlotId(null);
    }
  };

  const detailJoinBtnLabel = () => {
    if (!selectedSlot) return 'Join Queue';
    if (isAlreadyInQueue(selectedSlot.slotId)) return 'Already in Queue';
    if (!selectedSlot.hasCapacity) return 'Queue Full';
    if (joiningSlotId === selectedSlot.slotId) return 'Joining…';
    return 'Join Queue';
  };

  const detailJoinBtnDisabled = () => {
    if (!selectedSlot) return true;
    if (isAlreadyInQueue(selectedSlot.slotId)) return true;
    if (!selectedSlot.hasCapacity) return true;
    if (joiningSlotId === selectedSlot.slotId) return true;
    return false;
  };

  const [leaveConfirmQueue, setLeaveConfirmQueue] = useState(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const capturedInput = inputValue;
    const userMessage = {
      id: ++messageIdRef.current,
      type: 'user',
      text: capturedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponse = {
        id: ++messageIdRef.current,
        type: 'bot',
        text: generateBotResponse(capturedInput),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput) => {
    const lower = userInput.toLowerCase();
    if (lower.includes('queue') || lower.includes('position')) {
      return queues.length > 0
        ? `You have ${queues.length} active queue${queues.length > 1 ? 's' : ''}. Your first queue position is ${queues[0].position}. Est. wait: ${queues[0].estimatedWait}`
        : "You don't have any active queues. Would you like to join one?";
    }
    if (lower.includes('wait') || lower.includes('time')) {
      return queues.length > 0
        ? `Your estimated wait time is ${queues[0].estimatedWait}. Currently ${queues[0].totalWaiting} people are waiting.`
        : 'Join a queue to see your estimated wait time!';
    }
    if (lower.includes('service') || lower.includes('available')) {
      return `There are ${availableSlots.length} open queue${availableSlots.length !== 1 ? 's' : ''} available today. Use the filters to find what you need.`;
    }
    return "I can help you with queue information, wait times, and available services. What would you like to know?";
  };

  return (
    <div className="dashboard-with-sidebar">
      <StudentSidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="queue-page">

          {/* Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              {selectedSlot ? (
                <button className="breadcrumb-link" onClick={() => setSelectedSlot(null)}>
                  <ChevronLeft className="breadcrumb-icon" />
                  Queues
                </button>
              ) : (
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Home
                </Link>
              )}
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <Users className="icon" />
              </div>
              <div>
                <h1 className="queue-title">
                  {selectedSlot ? 'Queue Details' : 'Queues'}
                </h1>
                <p className="queue-subtitle">
                  Join queues and track your position in real-time
                </p>
              </div>
            </div>
          </div>

          {!selectedSlot && (
            <Link
              to="/student/queue-tracking"
              state={{ from: 'queue' }}
              className="queue-tracking-link-btn"
            >
              <div className="queue-tracking-link-btn-icon-box">
                <Activity />
              </div>
              <div className="queue-tracking-link-btn-text">
                <span className="queue-tracking-link-btn-title">Queue Tracking</span>
                <span className="queue-tracking-link-btn-subtitle">Monitor your active queue positions in real-time</span>
              </div>
              <svg className="queue-tracking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>
          )}

          {/* ── DETAIL VIEW ── */}
          {selectedSlot && (
            <div className="avail-services-details-section">
              {/* Hero */}
              <div className="avail-services-service-hero">
                <div className="avail-services-hero-content">
                  <div className="avail-services-hero-logo">
                    <img
                      src={getCollegeLogo(selectedSlot.departmentName)}
                      alt={selectedSlot.departmentName}
                    />
                  </div>
                  <div className="avail-services-hero-text">
                    <div className="avail-services-hero-title">
                      <p className="avail-services-hero-service-name">{selectedSlot.serviceName}</p>
                      <p>{selectedSlot.departmentName}</p>
                    </div>
                    <div className="avail-services-hero-meta-row">
                      <div className="avail-services-service-hero-meta">
                        <Clock className="avail-services-service-hero-icon" />
                        <span>Avg. Wait: {selectedSlot.avgWaitTime}</span>
                      </div>
                      <div className="avail-services-service-hero-meta">
                        <Users className="avail-services-service-hero-icon" />
                        <span>{selectedSlot.waitingCount} currently waiting</span>
                      </div>
                      <div className="avail-services-service-hero-meta">
                        <CheckCircle2 className="avail-services-service-hero-icon" />
                        <span>Now Serving: {selectedSlot.currentlyServing}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="avail-services-cta-card">
                <div className="avail-services-cta-content">
                  <h3>Ready to join this queue?</h3>
                  <p>Make sure you have all the requirements before joining the queue</p>
                </div>
                <button
                  className="avail-services-queue-btn"
                  onClick={handleJoinFromDetail}
                  disabled={detailJoinBtnDisabled()}
                >
                  {joiningSlotId === selectedSlot.slotId ? (
                    <Loader2
                      className="avail-services-queue-btn-icon"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  ) : (
                    <Clock className="avail-services-queue-btn-icon" />
                  )}
                  {detailJoinBtnLabel()}
                </button>
              </div>

              {/* Requirements + Procedure */}
              <div className="avail-services-details-grid">
                {/* Requirements */}
                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <CheckCircle2 className="avail-services-details-card-icon" /> Requirements
                    </h3>
                    <p className="avail-services-details-card-description">
                      Documents and items you need to bring
                    </p>
                  </div>
                  <div className="avail-services-details-card-content">
                    {(() => {
                      const reqs = getServiceRequirements(selectedSlot.serviceName);
                      return reqs.length > 0 ? (
                        <ul className="avail-services-requirements-list">
                          {reqs.map((req) => (
                            <li key={req.id} className="avail-services-requirement-item">
                              <CheckCircle2 className="avail-services-requirement-icon" />
                              <div>
                                <span>{req.name}</span>
                                {req.description && (
                                  <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>
                                    {req.description}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="avail-services-requirements-list">
                          <li className="avail-services-requirement-item">
                            <CheckCircle2 className="avail-services-requirement-icon" />
                            <span>Valid Student ID</span>
                          </li>
                          <li className="avail-services-requirement-item">
                            <CheckCircle2 className="avail-services-requirement-icon" />
                            <span>Any relevant supporting documents</span>
                          </li>
                        </ul>
                      );
                    })()}
                  </div>
                </div>

                {/* Procedure */}
                <div className="avail-services-details-card">
                  <div className="avail-services-details-card-header">
                    <h3 className="avail-services-details-card-title">
                      <HelpCircle className="avail-services-details-card-icon" /> Procedure
                    </h3>
                    <p className="avail-services-details-card-description">
                      Step-by-step process
                    </p>
                  </div>
                  <div className="avail-services-details-card-content">
                    {(() => {
                      const steps = getProcedureSteps(selectedSlot.serviceName);
                      return steps.length > 0 ? (
                        <ol className="avail-services-procedure-list">
                          {steps.map((step) => (
                            <li key={step.id} className="avail-services-procedure-item">
                              <span className="avail-services-procedure-number">{step.stepNumber}</span>
                              <span>{step.title}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
                          No procedure steps have been defined for this service yet. Contact the office for details.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {!selectedSlot && (
            <>
              {/* Global loading / error states */}
              {isLoading && (
                <div className="no-queues-card">
                  <Loader2 className="no-queues-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  <p className="no-queues-description">Loading queues…</p>
                </div>
              )}

              {!isLoading && error && (
                <div className="no-queues-card">
                  <AlertCircle className="no-queues-icon" />
                  <h3 className="no-queues-title">Something went wrong</h3>
                  <p className="no-queues-description">{error}</p>
                </div>
              )}

              {/* My Active Queues */}
              {!isLoading && queues.length > 0 && (
                <section className="my-queues-section">
                  <div className="section-title-wrapper">
                    <Clock className="section-icon" />
                    <h2 className="section-title">My Active Queues</h2>
                    <span className="queue-badge">{queues.length}</span>
                  </div>
                  <div className="queues-list">
                    {queues.map((queue) => (
                      <div
                        key={queue.queueId}
                        className="queue-card active-queue-card"
                        onClick={() => navigate('/student/queue-status', { state: { queueId: queue.queueId, fromQueue: true } })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="queue-card-content">
                          <div className="queue-left">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                              className="queue-college-logo"
                            />
                            <div className="queue-info">
                              <div className="queue-header-row">
                                <div>
                                  <h3 className="queue-service-name">{queue.serviceName}</h3>
                                  <p className="queue-college-name">{queue.departmentName}</p>
                                </div>
                                <span className="queue-number-badge">{queue.queueNumberBadge}</span>
                              </div>
                              <div className="queue-stats-grid">
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Your Position</p>
                                  <p className="queue-stat-value">{queue.position}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Total Waiting</p>
                                  <p className="queue-stat-value">{queue.totalWaiting}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Est. Wait Time</p>
                                  <p className="queue-stat-value-sm">{queue.estimatedWait}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Joined At</p>
                                  <p className="queue-stat-value-sm">{queue.joinedAt}</p>
                                </div>
                              </div>
                              <div className="qs-progress-card">
                                <div className="queue-progress-group">
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">People in Queue</p>
                                      <p className="qs-progress-value">
                                        {queue.totalInQueue ?? 0}/{queue.maxCapacity ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.queueOccupancyPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill"
                                        style={{ width: `${queue.queueOccupancyPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">Serviced</p>
                                      <p className="qs-progress-value">
                                        {queue.servicedCount ?? 0}/{queue.totalInQueue ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.servicedPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill qs-progress-fill-serviced"
                                        style={{ width: `${queue.servicedPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                className="queue-leave-btn"
                                onClick={(e) => { e.stopPropagation(); setLeaveConfirmQueue({ queueId: queue.queueId, serviceName: queue.serviceName }); }}
                                disabled={leavingQueueId === queue.queueId}
                                title="Leave this queue"
                                type="button"
                                aria-label={`Leave queue for ${queue.serviceName}`}
                              >
                                {leavingQueueId === queue.queueId ? (
                                  <Loader2 className="icon" style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <XCircle className="icon" />
                                )}
                                <span className="leave-text">
                                  {leavingQueueId === queue.queueId ? 'Leaving…' : 'Leave Queue'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Filters + Available Queues */}
              {!isLoading && (
                <>
                  <div className="filters-card">
                    <div className="filters-header">
                      <h3 className="filters-title">Queues Filter</h3>
                      <p className="filters-description">
                        Select a queue to view service details and join
                      </p>
                    </div>
                    <div className="filters-grid">
                      <div className="filter-group">
                        <label className="filter-label" htmlFor="college-select">
                          College
                        </label>
                        <div className="filter-select-wrapper">
                          <select
                            id="college-select"
                            className="filter-select"
                            value={selectedCollege}
                            onChange={(e) => setSelectedCollege(e.target.value)}
                            aria-label="Filter by college"
                          >
                            <option value="all">All Colleges</option>
                            {collegeOptions.map((college) => (
                              <option key={college.name} value={college.name}>
                                {college.abbrev} — {college.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="filter-chevron" />
                        </div>
                      </div>
                      <div className="filter-group">
                        <label className="filter-label" htmlFor="service-select">
                          Service
                        </label>
                        <div className="filter-select-wrapper">
                          <select
                            id="service-select"
                            className="filter-select"
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            aria-label="Filter by service"
                          >
                            <option value="all">All Services</option>
                            {serviceOptions.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="filter-chevron" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredSlots.length > 0 ? (
                    <div className="available-queues-list">
                      {filteredSlots.map((slot) => {
                        const isJoining = joiningSlotId === slot.slotId;
                        const atCapacity = !slot.hasCapacity;

                        return (
                          <div
                            key={slot.slotId}
                            className="queue-card available-queue-card"
                            onClick={() => setSelectedSlot(slot)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="queue-card-content">
                              <div className="queue-left">
                                <div className="queue-logo-wrapper">
                                  <img
                                    src={getCollegeLogo(slot.departmentName)}
                                    alt={slot.departmentName}
                                    className="queue-college-logo-sm"
                                  />
                                </div>
                                <div className="queue-info">
                                  <div className="queue-header-row">
                                    <div>
                                      <h3 className="queue-service-name">{slot.serviceName}</h3>
                                      <p className="queue-college-name">{slot.departmentName}</p>
                                    </div>
                                    <span className="queue-status-badge">
                                      {atCapacity ? 'Full' : 'Open'}
                                    </span>
                                  </div>
                                  <div className="queue-details-grid">
                                    <div className="queue-detail-item">
                                      <div className="detail-icon waiting">
                                        <Users className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Waiting</p>
                                        <p className="detail-value">{slot.waitingCount}</p>
                                      </div>
                                    </div>
                                    <div className="queue-detail-item">
                                      <div className="detail-icon time">
                                        <Clock className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Avg Wait</p>
                                        <p className="detail-value">{slot.avgWaitTime}</p>
                                      </div>
                                    </div>
                                    <div className="queue-detail-item">
                                      <div className="detail-icon serving">
                                        <CheckCircle2 className="icon" />
                                      </div>
                                      <div>
                                        <p className="detail-label">Now Serving</p>
                                        <p className="detail-value">{slot.currentlyServing}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                className={`queue-join-btn ${(isJoining || atCapacity) ? 'disabled' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleJoinQueue(slot.slotId); }}
                                disabled={isJoining || atCapacity}
                                type="button"
                                aria-label={
                                  atCapacity
                                    ? `Queue for ${slot.serviceName} is full`
                                    : `Join queue for ${slot.serviceName}`
                                }
                              >
                                {isJoining ? (
                                  <>
                                    <Loader2
                                      style={{
                                        width: '1rem',
                                        height: '1rem',
                                        marginRight: '0.375rem',
                                        animation: 'spin 1s linear infinite',
                                        display: 'inline',
                                      }}
                                    />
                                    Joining…
                                  </>
                                ) : atCapacity ? (
                                  'Queue Full'
                                ) : (
                                  'Join Queue'
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-queues-card">
                      <AlertCircle className="no-queues-icon" />
                      <h3 className="no-queues-title">No queues found</h3>
                      <p className="no-queues-description">
                        {(selectedCollege !== 'all' || selectedService !== 'all')
                          ? 'Try adjusting your filters.'
                          : 'No queues are open today. Check back later.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message message-${message.type}`}>
                  <div className="message-content">{message.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="chat-send-btn" aria-label="Send message">
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`chat-fab ${chatOpen ? 'hidden' : ''}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>
      <ActionConfirmModal
        show={leaveConfirmQueue !== null}
        onCancel={() => setLeaveConfirmQueue(null)}
        onConfirm={async () => { await handleLeaveQueue(leaveConfirmQueue.queueId); setLeaveConfirmQueue(null); }}
        title="Leave Queue?"
        message={
          <>
            You are about to leave the <strong>{leaveConfirmQueue?.serviceName}</strong> queue.
            Leaving will permanently remove your spot — you will need to rejoin
            and wait from the back of the line if you change your mind.
          </>
        }
        icon={<XCircle width={22} height={22} />}
        cancelText="Stay in Queue"
        confirmText={leavingQueueId === leaveConfirmQueue?.queueId ? "Leaving…" : "Leave Queue"}
        confirmDisabled={leavingQueueId === leaveConfirmQueue?.queueId}
      />
    </div>
  );
}
