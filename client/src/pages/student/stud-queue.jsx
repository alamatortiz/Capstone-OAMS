import { useState, useCallback, useMemo, useEffect } from 'react';

import { Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Loader2, ChevronDown, HelpCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import ActionConfirmModal from "../../components/ActionConfirmModal";
import StudentPageShell from "../../components/StudentPageShell";
import QueueProgressBars from "../../components/QueueProgressBars";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import { useQueue } from '../../contexts/QueueContext';
import { getCollegeLogo } from '../../data/collegeLogo';
import { formatCollegeLabel } from '../../utils/formatCollege';
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
  const location = useLocation();

  // Track which slot/queue buttons are in-flight to prevent double-clicks
  const [joiningSlotId, setJoiningSlotId] = useState(null);
  const [leavingQueueId, setLeavingQueueId] = useState(null);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab === 'active' ? 'active' : 'available',
  );

  // Detail view state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [servicesData, setServicesData] = useState([]);


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

  // ── Fetch services data for requirements lookup ───────────────────────────
  // Refetched every time a queue's detail view is opened (not just on mount)
  // so newly created services/requirements show up immediately instead of
  // relying on a stale mount-time snapshot.
  const [servicesLoading, setServicesLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const { data } = await api.get('/student/services/by-department');
      setServicesData(data.departments ?? []);
    } catch {
      // silent — requirements fall back to generic defaults
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const isServiceKnown = (serviceName) =>
    servicesData.some((dept) =>
      dept.services?.some(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      ),
    );

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
    <StudentPageShell
      outerClassName="qpage-with-sidebar"
      mainClassName="qpage-main"
      overlay={
        <>
          <ChatWidget
            initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you with your queue today?"
            getBotResponse={generateBotResponse}
            shrinkIconOnMobile={false}
            customScrollbar={false}
          />
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
        </>
      }
    >
        <div className="queue-page">

          {/* Header */}
          <PageHeader
            breadcrumb={
              selectedSlot ? (
                <button className="breadcrumb-link" onClick={() => setSelectedSlot(null)}>
                  <ChevronLeft className="breadcrumb-icon" />
                  Queues
                </button>
              ) : (
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Home
                </Link>
              )
            }
            icon={<Users className="icon" />}
            title={selectedSlot ? 'Queue Details' : 'Queues'}
            subtitle="Join queues and track your position in real-time"
          />

          {!selectedSlot && (
            <Link
              to="/student/queue-tracking"
              state={{ from: 'queue' }}
              className="qp-tracking-link-btn"
            >
              <div className="qp-tracking-link-btn-icon-box">
                <Activity />
              </div>
              <div className="qp-tracking-link-btn-text">
                <span className="qp-tracking-link-btn-title">Queue Tracking</span>
                <span className="qp-tracking-link-btn-subtitle">Monitor your active queue positions in real-time</span>
              </div>
              <svg className="qp-tracking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      {selectedSlot.voidTimeoutMinutes != null && (
                        <div className="avail-services-service-hero-meta">
                          <AlertCircle className="avail-services-service-hero-icon" />
                          <span>Void after {selectedSlot.voidTimeoutMinutes} min if you don't show up when called</span>
                        </div>
                      )}
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
                      if (reqs.length === 0 && servicesLoading && !isServiceKnown(selectedSlot.serviceName)) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            <Loader2 style={{ width: '1.125rem', height: '1.125rem', animation: 'spin 1s linear infinite' }} />
                            Loading requirements…
                          </div>
                        );
                      }
                      return reqs.length > 0 ? (
                        <ul className="avail-services-requirements-list">
                          {reqs.map((req) => (
                            <li key={req.id} className="avail-services-requirement-item">
                              <CheckCircle2 className="avail-services-requirement-icon" />
                              <div>
                                <div className="avail-services-requirement-name-row">
                                  <span>{req.name}</span>
                                  <span className={`avail-services-requirement-badge ${req.isMandatory ? 'is-mandatory' : 'is-optional'}`}>
                                    {req.isMandatory ? 'Required' : 'Optional'}
                                  </span>
                                </div>
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
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
                          No specific requirements have been defined for this service yet. Contact the office for details.
                        </p>
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
                      if (steps.length === 0 && servicesLoading && !isServiceKnown(selectedSlot.serviceName)) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            <Loader2 style={{ width: '1.125rem', height: '1.125rem', animation: 'spin 1s linear infinite' }} />
                            Loading procedure…
                          </div>
                        );
                      }
                      return steps.length > 0 ? (
                        <ol className="avail-services-procedure-list">
                          {steps.map((step) => (
                            <li key={step.id} className="avail-services-procedure-item">
                              <span className="avail-services-procedure-number">{step.stepNumber}</span>
                              <div>
                                <span className="avail-services-procedure-title">{step.title}</span>
                                {step.description && (
                                  <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>
                                    {step.description}
                                  </p>
                                )}
                              </div>
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

              {/* Tabs */}
              {!isLoading && !error && (
                <div className="qp-tabs-navigation">
                  <div className="qp-tabs-list">
                    <button
                      type="button"
                      className={`qp-tab ${activeTab === 'available' ? 'active' : ''}`}
                      onClick={() => setActiveTab('available')}
                    >
                      <Users className="qp-tab-icon" /> Available Queues
                      <span className="qp-tab-count">{filteredSlots.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`qp-tab ${activeTab === 'active' ? 'active' : ''}`}
                      onClick={() => setActiveTab('active')}
                    >
                      <Clock className="qp-tab-icon" /> My Active Queues
                      <span className="qp-tab-count">{queues.length}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* My Active Queues */}
              {!isLoading && !error && activeTab === 'active' && (
                <>
                  {queues.length > 0 ? (
                    <div className="queues-list">
                      {queues.map((queue) => (
                      <div
                        key={queue.queueId}
                        className="queue-card active-queue-card"
                        onClick={() => navigate('/student/queue-status', { state: { queueId: queue.queueId, fromQueue: true } })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="qp-card-content">
                          <div className="qp-left">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                              className="qp-college-logo"
                            />
                            <div className="qp-info">
                              <div className="qp-header-row">
                                <div>
                                  <h3 className="qp-service-name">{queue.serviceName}</h3>
                                  <p className="qp-college-name">{queue.departmentName}</p>
                                </div>
                                <span className="qp-number-badge">{queue.queueNumberBadge}</span>
                              </div>
                              <div className="qp-stats-grid">
                                <div className="qp-stat">
                                  <p className="qp-stat-label">Your Position</p>
                                  <p className="qp-stat-value">{queue.position}</p>
                                </div>
                                <div className="qp-stat">
                                  <p className="qp-stat-label">Total Waiting</p>
                                  <p className="qp-stat-value">{queue.totalWaiting}</p>
                                </div>
                                <div className="qp-stat">
                                  <p className="qp-stat-label">Est. Wait Time</p>
                                  <p className="qp-stat-value-sm">{queue.estimatedWait}</p>
                                </div>
                                <div className="qp-stat">
                                  <p className="qp-stat-label">Joined At</p>
                                  <p className="qp-stat-value-sm">{queue.joinedAt}</p>
                                </div>
                              </div>
                              <QueueProgressBars
                                occupancyCurrent={queue.totalInQueue ?? 0}
                                occupancyTotal={queue.maxCapacity ?? 0}
                                occupancyPercent={queue.queueOccupancyPercent ?? 0}
                                servicedCurrent={queue.servicedCount ?? 0}
                                servicedTotal={queue.totalInQueue ?? 0}
                                servicedPercent={queue.servicedPercent ?? 0}
                              />
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
                              {queue.voidTimeoutMinutes != null && (
                                <div className="qp-void-warning">
                                  <AlertCircle className="qp-void-warning-icon" />
                                  <span>If called, arrive within {queue.voidTimeoutMinutes} min or your ticket will be voided</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  ) : (
                    <div className="no-queues-card">
                      <AlertCircle className="no-queues-icon" />
                      <h3 className="no-queues-title">No Active Queues</h3>
                      <p className="no-queues-description">
                        You're not currently in any queues. Browse available queues to join one.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Filters + Available Queues */}
              {!isLoading && !error && activeTab === 'available' && (
                <>
                  <div className="filters-card">
                    <div className="filters-header">
                      <h3 className="filters-title">Queues Filter</h3>
                      <p className="filters-description">
                        Select a queue to view service details and join
                      </p>
                    </div>
                    <div className="filters-grid">
                      <FilterSelect
                        id="college-select"
                        label="College"
                        value={selectedCollege}
                        onChange={(e) => setSelectedCollege(e.target.value)}
                        ariaLabel="Filter by college"
                        options={[{ value: "all", label: "All Colleges" }, ...collegeOptions.map((college) => ({
                          value: college.name,
                          // "ALL" is the synthetic cross-college services bucket, not a real
                          // college -- give it a distinct label so it doesn't read like a
                          // second "show everything" option next to "All Colleges" above.
                          label: college.abbrev === "ALL"
                            ? "ALL - Cross-College Services"
                            : formatCollegeLabel(college.abbrev, college.name),
                        }))]}
                        chevronIcon={<ChevronDown className="filter-chevron" />}
                      />
                      <FilterSelect
                        id="service-select"
                        label="Service"
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        ariaLabel="Filter by service"
                        options={[{ value: "all", label: "All Services" }, ...serviceOptions.map((service) => ({ value: service, label: service }))]}
                        chevronIcon={<ChevronDown className="filter-chevron" />}
                      />
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
                            onClick={() => { setSelectedSlot(slot); fetchServices(); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="qp-card-content">
                              <div className="qp-left">
                                <div className="qp-logo-wrapper">
                                  <img
                                    src={getCollegeLogo(slot.departmentName)}
                                    alt={slot.departmentName}
                                    className="qp-college-logo-sm"
                                  />
                                </div>
                                <div className="qp-info">
                                  <div className="qp-header-row">
                                    <div>
                                      <h3 className="qp-service-name">{slot.serviceName}</h3>
                                      <p className="qp-college-name">{slot.departmentName}</p>
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
    </StudentPageShell>
  );
}
