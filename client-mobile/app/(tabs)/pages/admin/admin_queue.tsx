import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';
import { useAdminQueueHosting } from '@/hooks/useAdminQueueHosting';
import QueueReasonModal from '@/components/QueueReasonModal';
import api from '@/utils/api';
import { exportRowsAsCsv } from '@/utils/csvExport';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');
const ccsLogo = require('@/assets/CCS.png');
const cbaaLogo = require('@/assets/CBAA.png');
const coedLogo = require('@/assets/COED.png');
const coeLogo = require('@/assets/COE.png');
const casLogo = require('@/assets/CAS.png');
const chasLogo = require('@/assets/CHAS.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const collegeLogos: Record<string, ImageSourcePropType> = {
  CCS: ccsLogo,
  CBAA: cbaaLogo,
  COED: coedLogo,
  COE: coeLogo,
  CAS: casLogo,
  CHAS: chasLogo,
};

function OamsLogo({
  style,
  outline,
}: {
  style: { height: number; width: number };
  outline: boolean;
}) {
  if (!outline) {
    return <Image source={oamsLogo} style={style} resizeMode="contain" />;
  }
  const layerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: style.width,
    height: style.height,
  };
  return (
    <View style={[style, { position: 'relative', overflow: 'hidden' }]}>
      {[
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([dx, dy]) => (
        <Image
          key={`${dx}-${dy}`}
          source={oamsLogo}
          resizeMode="contain"
          style={[
            layerStyle,
            { tintColor: '#ffffff', transform: [{ translateX: dx }, { translateY: dy }] },
          ]}
        />
      ))}
      <Image source={oamsLogo} resizeMode="contain" style={layerStyle} />
    </View>
  );
}

interface CollegeOverview {
  abbrev: string;
  name: string;
  activeQueues: number;
  waitingStudents: number;
  avgWaitTime: string;
  status: 'operational' | 'busy' | 'closed';
}

type QueueSlotStatus = 'open' | 'paused' | 'full' | 'expired' | 'closed';
type QueueEntryStatus = 'waiting' | 'serving' | 'completed' | 'no_show';

interface QueueEntry {
  queueNumber: string;
  studentName: string;
  studentId: string;
  concern: string;
  status: QueueEntryStatus;
  joinedAt: string;
  arrivedAt: string | null;
}

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'queue', label: 'Queue', icon: 'time-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
];

export const ACTIVE_STATUSES: QueueSlotStatus[] = ['open', 'paused', 'full', 'expired'];
const ENTRIES_PER_PAGE = 5;

const STAT_TINTS = {
  activeQueues: { bg: 'rgba(34, 197, 94, 0.16)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
  totalWaiting: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  avgWaitTime: { bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316' },
  operational: { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
} as const;

const COLLEGE_STATUS_TINTS = {
  operational: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981' },
  busy: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
  closed: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
} as const;

const QUEUE_STATUS_TINTS: Record<QueueSlotStatus, { bg: string; border: string; color: string }> = {
  open: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  paused: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
  full: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
  expired: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
  closed: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const ENTRY_STATUS_TINTS: Record<QueueEntryStatus, { bg: string; border: string; color: string }> = {
  waiting: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  serving: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981' },
  no_show: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
};

function formatAvgService(minutes: number | null) {
  return minutes != null ? `${minutes} mins` : 'No data yet';
}

function getQueueStatusLabel(status: QueueSlotStatus) {
  switch (status) {
    case 'open':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'full':
      return 'Full';
    case 'expired':
      return 'Hours Ended';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

function getEntryStatusLabel(status: QueueEntryStatus, arrivedAt?: string | null) {
  if (status === 'no_show') return 'No-Show';
  if (status === 'serving') return arrivedAt ? 'Being Served' : 'Called';
  return status;
}

type FilterKind = 'collegeOverview' | 'serviceType' | null;

export default function AdminQueueScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [monitoringQueueId, setMonitoringQueueId] = useState<number | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [entriesPage, setEntriesPage] = useState(0);
  const [collegeOverviewFilter, setCollegeOverviewFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterKind>(null);
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    queues: queueDetails,
    error: queueHostingError,
    fetchQueues,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue,
    handleReasonConfirm: handleReasonConfirmBase,
  } = useAdminQueueHosting();
  const [reasonText, setReasonText] = useState('');

  // Skip requires a reason too (kept consistent with pause/close) -- reuses
  // the same QueueReasonModal, keyed by a distinct 'skip' mode, mirroring
  // web's adm-queue.jsx.
  const [skipReasonModal, setSkipReasonModal] = useState(false);
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  const [skipReasonText, setSkipReasonText] = useState('');

  const fetchEntries = useCallback(async (slotId: number) => {
    try {
      const res = await api.get(`/admin/queue-hosting/${slotId}/entries`);
      setQueueEntries(res.data.entries ?? []);
    } catch (error) {
      console.error('Failed to fetch queue entries:', error);
    }
  }, []);

  useEffect(() => {
    if (monitoringQueueId != null) fetchEntries(monitoringQueueId);
  }, [monitoringQueueId, fetchEntries]);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const handleExportData = async () => {
    if (!monitoringQueue) return;
    try {
      await exportRowsAsCsv(
        queueEntries.map((entry: any) => ({
          queueNumber: entry.queueNumber,
          studentName: entry.studentName,
          studentId: entry.studentId,
          concern: entry.concern,
          status: entry.status,
          joinedAt: entry.joinedAt,
        })),
        `${monitoringQueue.queueType.replace(/\s+/g, '-').toLowerCase()}-queue-export.csv`,
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Could not export the queue data.');
    }
  };

  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'queue') return;
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'appointments') {
      router.push('/pages/admin/admin_appointment');
      return;
    }
    if (key === 'documents') {
      router.push('/pages/admin/admin_document_processing');
      return;
    }
    if (key === 'transactions') {
      router.push('/pages/admin/admin_transactions');
      return;
    }
    comingSoon();
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout();
    router.replace('/login');
  };

  const activeQueueDetails = queueDetails.filter((q: any) => ACTIVE_STATUSES.includes(q.status));
  const serviceTypes = [...new Set(activeQueueDetails.map((q: any) => q.queueType))].sort();
  const filteredQueueDetails =
    serviceTypeFilter === 'all'
      ? activeQueueDetails
      : activeQueueDetails.filter((q: any) => q.queueType === serviceTypeFilter);

  const systemStats = {
    totalQueues: activeQueueDetails.length,
    totalWaiting: activeQueueDetails.reduce((sum: number, q: any) => sum + q.currentCount, 0),
    avgWaitTime: (() => {
      const withAvg = activeQueueDetails.filter((q: any) => q.avgServiceMinutes != null);
      if (withAvg.length === 0) return 'N/A';
      const avg = withAvg.reduce((sum: number, q: any) => sum + (q.avgServiceMinutes ?? 0), 0) / withAvg.length;
      return `${Math.round(avg)} mins`;
    })(),
    operational: activeQueueDetails.filter((q: any) => q.status === 'open').length,
  };

  // No cross-college live endpoint exists yet — the overview grid shows only
  // the signed-in admin's own department, derived from real queue-hosting data.
  const collegeOverviewData: CollegeOverview[] = user
    ? [
        {
          abbrev: user.departmentAbbrev ?? '',
          name: user.departmentName ?? '',
          activeQueues: systemStats.totalQueues,
          waitingStudents: systemStats.totalWaiting,
          avgWaitTime: systemStats.avgWaitTime,
          status: systemStats.totalQueues > 0 ? 'operational' : 'closed',
        },
      ]
    : [];

  const filteredCollegeOverview =
    collegeOverviewFilter === 'all'
      ? collegeOverviewData
      : collegeOverviewData.filter((c) => c.abbrev === collegeOverviewFilter);

  const monitoringQueue = queueDetails.find((q: any) => q.id === monitoringQueueId) ?? null;
  const totalEntryPages = Math.max(1, Math.ceil(queueEntries.length / ENTRIES_PER_PAGE));
  const currentEntriesPage = Math.min(entriesPage, totalEntryPages - 1);
  const entriesStartIndex = currentEntriesPage * ENTRIES_PER_PAGE;
  const paginatedEntries = queueEntries.slice(entriesStartIndex, entriesStartIndex + ENTRIES_PER_PAGE);

  const openMonitor = (id: number) => {
    setMonitoringQueueId(id);
    setEntriesPage(0);
  };

  // ── Queue actions — real API calls against the admin's own department ──
  const handleCallNext = async (id: number) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/call-next`);
      await fetchQueues();
      await fetchEntries(id);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.error ?? 'Failed to call next student' });
    }
  };

  const handleMarkArrived = async (id: number) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/mark-arrived`);
      await fetchQueues();
      await fetchEntries(id);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.error ?? 'Failed to mark student as arrived' });
    }
  };

  const handleMarkAsServed = async (id: number) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/serve`);
      await fetchQueues();
      await fetchEntries(id);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.error ?? 'Failed to mark as served' });
    }
  };

  const handleSkipStudent = async (id: number, reason: string) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/skip`, { reason });
      await fetchQueues();
      await fetchEntries(id);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.error ?? 'Failed to skip student' });
    }
  };

  const handleResumeQueue = async (id: number) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/resume`);
      Toast.show({ type: 'success', text1: 'Queue resumed' });
      await fetchQueues();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.error ?? 'Failed to resume queue' });
    }
  };

  // Pause/close + the reason-modal flow live in the shared hook above; this
  // page only needs to additionally exit the monitor view once a close
  // actually goes through (the queue it was showing no longer has an
  // active/paused state to monitor).
  const handleReasonConfirm = async () => {
    const result = await handleReasonConfirmBase(reasonText);
    setReasonText('');
    if (result?.mode === 'close') setMonitoringQueueId(null);
  };

  const handleSkipConfirm = async (reason: string) => {
    if (!monitoringQueue) return;
    setSkipSubmitting(true);
    try {
      await handleSkipStudent(monitoringQueue.id, reason);
      setSkipReasonModal(false);
    } finally {
      setSkipSubmitting(false);
    }
  };

  const collegeFilterOptions = [
    { value: 'all', label: 'All Colleges' },
    ...collegeOverviewData.map((c) => ({ value: c.abbrev, label: c.abbrev })),
  ];
  const serviceFilterOptions = [
    { value: 'all', label: 'All Service Types' },
    ...serviceTypes.map((t) => ({ value: t, label: t })),
  ];
  const filterOptions = activeFilter === 'collegeOverview' ? collegeFilterOptions : serviceFilterOptions;
  const filterTitle = activeFilter === 'collegeOverview' ? 'Filter by College' : 'Filter by Service Type';
  const filterCurrentValue = activeFilter === 'collegeOverview' ? collegeOverviewFilter : serviceTypeFilter;

  const selectFilterOption = (value: string) => {
    if (activeFilter === 'collegeOverview') setCollegeOverviewFilter(value);
    else if (activeFilter === 'serviceType') setServiceTypeFilter(value);
    setActiveFilter(null);
  };

  const reasonCopy =
    reasonModal?.mode === 'pause'
      ? {
          title: 'Pause Queue',
          message: monitoringQueue?.currentlyServingStudentNumber
            ? "Students in this queue will see this reason while it's paused. A student is currently being served — pausing will return them to waiting instead of leaving their call in progress."
            : "Students in this queue will see this reason while it's paused.",
          confirmText: 'Pause',
          confirmColor: '#f59e0b',
        }
      : {
          title: 'Stop Queue',
          message:
            'All students still waiting or being served will be removed from this queue and will see this reason. This cannot be undone.',
          confirmText: 'Stop Queue',
          confirmColor: '#ef4444',
        };

  // ─────────────────────────── Monitor detail view ───────────────────────────
  if (monitoringQueue) {
    const estimatedWaitMinutes =
      monitoringQueue.avgServiceMinutes != null
        ? monitoringQueue.avgServiceMinutes * monitoringQueue.currentCount
        : null;
    const statusTint = QUEUE_STATUS_TINTS[monitoringQueue.status as QueueSlotStatus];

    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <Image source={pncLogo} style={styles.headerPncLogo} resizeMode="contain" />
              <OamsLogo style={styles.headerOamsLogo} outline={isDarkMode} />
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconBtn} onPress={toggleTheme} hitSlop={8}>
                <Image
                  source={isDarkMode ? sunIcon : darkModeIcon}
                  style={styles.iconBtnImg}
                  resizeMode="contain"
                />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
                <Ionicons name="menu-outline" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.monitorTopbar}>
              <Pressable style={styles.backBtn} onPress={() => setMonitoringQueueId(null)}>
                <Ionicons name="chevron-back" size={16} color={theme.text} />
                <Text style={styles.backBtnText}>Back to Queue List</Text>
              </Pressable>
              <Pressable
                style={styles.refreshBtn}
                onPress={() => {
                  fetchQueues();
                  if (monitoringQueueId != null) fetchEntries(monitoringQueueId);
                }}
                hitSlop={8}
              >
                <Ionicons name="refresh-outline" size={18} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.titleRow}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.titleIcon}>
                <Ionicons name="time-outline" size={22} color="#ffffff" />
              </LinearGradient>
              <View style={styles.titleTextWrap}>
                <Text style={styles.pageTitle}>{monitoringQueue.queueType}</Text>
                <Text style={styles.pageSubtitle}>{user?.departmentName ?? ''}</Text>
              </View>
            </View>

            {(monitoringQueue.status === 'full' || monitoringQueue.status === 'expired') && (
              <View style={styles.statusNote}>
                <Text style={styles.statusNoteText}>
                  {monitoringQueue.status === 'full'
                    ? 'This queue is full — closed to new joins, but you can still call and serve everyone already in line.'
                    : "This queue's hours have ended — closed to new joins, but you can still call and serve everyone already in line."}
                </Text>
              </View>
            )}

            <View style={styles.statsGrid3}>
              <View style={styles.statCard3}>
                <Text style={styles.statCard3Label}>
                  Currently Serving
                  {monitoringQueue.currentlyServingStudentNumber
                    ? ` (${monitoringQueue.currentlyServingArrivedAt ? 'Being Served' : 'Called'})`
                    : ''}
                </Text>
                <Text style={styles.statCard3Value}>
                  {monitoringQueue.currentlyServingStudentNumber || '—'}
                </Text>
              </View>
              <View style={styles.statCard3}>
                <Text style={styles.statCard3Label}>Students Waiting</Text>
                <Text style={[styles.statCard3Value, { color: theme.blue }]}>
                  {monitoringQueue.currentCount}
                </Text>
              </View>
              <View style={styles.statCard3}>
                <Text style={styles.statCard3Label}>Avg Service Time</Text>
                <Text style={[styles.statCard3Value, { color: '#f97316' }]}>
                  {formatAvgService(monitoringQueue.avgServiceMinutes)}
                </Text>
              </View>
            </View>

            {/* Queue Progress */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="pulse-outline" size={17} color={theme.blue} />
                <Text style={styles.cardTitleText}>Queue Progress</Text>
              </View>
              <View style={styles.progressCard}>
                <View style={styles.progressWrap}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Occupied Slots</Text>
                    <Text style={styles.progressValue}>
                      {monitoringQueue.totalInQueue}/{monitoringQueue.maxCapacity} ({monitoringQueue.queueOccupancyPercent}%)
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${monitoringQueue.queueOccupancyPercent}%`, backgroundColor: theme.blue }]}
                    />
                  </View>
                </View>
                <View style={styles.progressWrap}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Serviced People</Text>
                    <Text style={styles.progressValue}>
                      {monitoringQueue.servedCount}/{monitoringQueue.totalInQueue} ({monitoringQueue.servicedPercent}%)
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${monitoringQueue.servicedPercent}%`, backgroundColor: theme.primary }]}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.progressStatsRow}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Total Served Today</Text>
                  <Text style={styles.progressStatValue}>{monitoringQueue.servedCount}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Est. Wait Time</Text>
                  <Text style={[styles.progressStatValue, { color: '#f97316' }]}>
                    {estimatedWaitMinutes != null ? `${estimatedWaitMinutes} mins` : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Queue Actions */}
            <View style={styles.card}>
              <Text style={styles.cardTitleText}>Queue Actions</Text>
              {monitoringQueue.status === 'paused' && (
                <View style={styles.statusNote}>
                  <Text style={styles.statusNoteText}>
                    Queue is paused — resume it before calling students.
                  </Text>
                </View>
              )}
              <View style={styles.actionsGrid}>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => handleCallNext(monitoringQueue.id)}
                  disabled={
                    !!monitoringQueue.currentlyServingStudentNumber ||
                    monitoringQueue.currentCount === 0 ||
                    monitoringQueue.status === 'paused'
                  }
                >
                  <Ionicons name="people-outline" size={16} color={theme.blue} />
                  <Text style={[styles.actionBtnText, { color: theme.blue }]}>Call Next</Text>
                </Pressable>
                {monitoringQueue.status === 'paused' ? (
                  <Pressable style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => handleResumeQueue(monitoringQueue.id)}>
                    <Ionicons name="alert-circle-outline" size={16} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>Resume Queue</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnWarning]}
                    onPress={() => handlePauseQueue(monitoringQueue.id)}
                    disabled={monitoringQueue.status !== 'open'}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Pause Queue</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => handleCloseQueue(monitoringQueue.id)}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Stop Queue</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.actionBtnNeutral]} onPress={handleExportData}>
                  <Ionicons name="trending-up-outline" size={16} color={theme.subtext} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Export Data</Text>
                </Pressable>
              </View>
            </View>

            {/* Currently Serving */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="time-outline" size={17} color={theme.blue} />
                <Text style={styles.cardTitleText}>Currently Serving</Text>
              </View>
              <Text style={styles.servingName}>
                {monitoringQueue.currentlyServingStudentNumber || 'No student is currently being served'}
              </Text>
              <Text style={styles.servingLabel}>
                {monitoringQueue.queueType}
                {monitoringQueue.currentlyServingStudentNumber
                  ? ` • ${monitoringQueue.currentlyServingArrivedAt ? 'Being Served' : 'Called — awaiting arrival'}`
                  : ''}
              </Text>
              {monitoringQueue.currentlyServingStudentNumber && !monitoringQueue.currentlyServingArrivedAt && (
                <Pressable
                  style={[styles.wideBtn, styles.wideBtnPrimary]}
                  onPress={() => handleMarkArrived(monitoringQueue.id)}
                >
                  <Ionicons name="alert-circle-outline" size={16} color="#ffffff" />
                  <Text style={styles.wideBtnText}>Mark Arrived</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.wideBtn, styles.wideBtnSuccess]}
                onPress={() => handleMarkAsServed(monitoringQueue.id)}
                disabled={!monitoringQueue.currentlyServingStudentNumber}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.wideBtnText}>Mark as Served</Text>
              </Pressable>
              <Pressable
                style={[styles.wideBtn, styles.wideBtnDanger]}
                onPress={() => setSkipReasonModal(true)}
                disabled={!monitoringQueue.currentlyServingStudentNumber}
              >
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.wideBtnText}>Skip / No-Show</Text>
              </Pressable>
            </View>

            {/* Queue Entries */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="people-outline" size={17} color={theme.blue} />
                <Text style={styles.cardTitleText}>Queue Entries ({queueEntries.length})</Text>
              </View>
              {queueEntries.length === 0 ? (
                <Text style={styles.emptyInlineText}>No students in queue.</Text>
              ) : (
                <View style={styles.entriesList}>
                  {paginatedEntries.map((entry, index) => {
                    const tint = ENTRY_STATUS_TINTS[entry.status];
                    const entryStatusLabel = getEntryStatusLabel(entry.status, entry.arrivedAt);
                    return (
                      <View
                        key={entry.queueNumber}
                        style={[styles.entryItem, entry.status === 'serving' && styles.entryItemServing]}
                      >
                        <View style={styles.entryTopRow}>
                          <View style={styles.entryNumberCircle}>
                            <Text style={styles.entryNumberText}>{entriesStartIndex + index + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.entryName}>{entry.studentName}</Text>
                            <Text style={styles.entryId}>ID: {entry.studentId}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[styles.entryStatusPill, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                              <Text style={[styles.entryStatusText, { color: tint.color }]}>
                                {entryStatusLabel}
                              </Text>
                            </View>
                            <Text style={styles.entryQueueNumber}>{entry.queueNumber}</Text>
                          </View>
                        </View>
                        <Text style={styles.entryConcern}>
                          <Text style={{ fontWeight: '700' }}>Concern: </Text>
                          {entry.concern}
                        </Text>
                        <View style={styles.entryTimeRow}>
                          <Ionicons name="time-outline" size={12} color={theme.tertiary} />
                          <Text style={styles.entryTimeText}>Joined at {entry.joinedAt}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {queueEntries.length > ENTRIES_PER_PAGE && (
                <View style={styles.paginationRow}>
                  <Pressable
                    style={styles.pageBtn}
                    onPress={() => setEntriesPage((p) => Math.max(0, p - 1))}
                    disabled={currentEntriesPage === 0}
                  >
                    <Ionicons name="chevron-back" size={16} color={theme.text} />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    {entriesStartIndex + 1}–{Math.min(queueEntries.length, entriesStartIndex + ENTRIES_PER_PAGE)} of {queueEntries.length}
                  </Text>
                  <Pressable
                    style={styles.pageBtn}
                    onPress={() => setEntriesPage((p) => Math.min(totalEntryPages - 1, p + 1))}
                    disabled={currentEntriesPage >= totalEntryPages - 1}
                  >
                    <Ionicons name="chevron-forward" size={16} color={theme.text} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="location-outline" size={17} color={theme.primary} />
                <Text style={styles.cardTitleText}>Location</Text>
              </View>
              <Text style={styles.plainText}>{monitoringQueue.location || 'Not specified'}</Text>
            </View>

            {/* Service Hours */}
            {monitoringQueue.serviceHours && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="time-outline" size={17} color={theme.primary} />
                  <Text style={styles.cardTitleText}>Service Hours</Text>
                </View>
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>Opens</Text>
                  <Text style={styles.hoursValue}>{monitoringQueue.serviceHours.start}</Text>
                </View>
                <View style={[styles.hoursRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.hoursLabel}>Closes</Text>
                  <Text style={styles.hoursValue}>{monitoringQueue.serviceHours.end}</Text>
                </View>
              </View>
            )}

            {/* Status */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="pulse-outline" size={17} color={theme.blue} />
                <Text style={styles.cardTitleText}>Status</Text>
              </View>
              <View style={[styles.wideStatusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                <Text style={[styles.wideStatusBadgeText, { color: statusTint.color }]}>
                  {getQueueStatusLabel(monitoringQueue.status)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

        <NavDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavPress={handleNavPress}
          onLogout={handleLogout}
          theme={theme}
          styles={styles}
          adminName={user?.name ?? 'Admin'}
          adminDepartmentName={user?.departmentName ?? ''}
        />

        <QueueReasonModal
          visible={!!reasonModal}
          title={reasonCopy.title}
          message={reasonCopy.message}
          confirmText={reasonSubmitting ? 'Submitting...' : reasonCopy.confirmText}
          confirmColor={reasonCopy.confirmColor}
          reason={reasonText}
          onChangeReason={setReasonText}
          onCancel={() => setReasonModal(null)}
          onConfirm={handleReasonConfirm}
          theme={theme}
          styles={styles}
          submitting={reasonSubmitting}
        />

        <QueueReasonModal
          visible={skipReasonModal}
          title="Skip Student"
          message="This voids the currently-served student's ticket as a no-show. They'll see this reason. This cannot be undone."
          confirmText={skipSubmitting ? 'Submitting...' : 'Skip Student'}
          confirmColor="#ef4444"
          reason={skipReasonText}
          onChangeReason={setSkipReasonText}
          onCancel={() => setSkipReasonModal(false)}
          onConfirm={() => {
            handleSkipConfirm(skipReasonText);
            setSkipReasonText('');
          }}
          theme={theme}
          styles={styles}
          submitting={skipSubmitting}
        />

        <LogoutModal
          visible={logoutModalVisible}
          onCancel={() => setLogoutModalVisible(false)}
          onConfirm={confirmLogout}
          styles={styles}
        />
      </View>
    );
  }

  // ─────────────────────────── Main queue list view ───────────────────────────
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={pncLogo} style={styles.headerPncLogo} resizeMode="contain" />
            <OamsLogo style={styles.headerOamsLogo} outline={isDarkMode} />
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconBtn} onPress={toggleTheme} hitSlop={8}>
              <Image
                source={isDarkMode ? sunIcon : darkModeIcon}
                style={styles.iconBtnImg}
                resizeMode="contain"
              />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.titleIcon}>
              <Ionicons name="time-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Centralized Queue Management</Text>
              <Text style={styles.pageSubtitle}>Monitor and control queues for {user?.departmentName ?? ''}</Text>
            </View>
          </View>

          <Pressable style={styles.hostQueueBtn} onPress={() => router.push('/pages/admin/admin_queue_hosting')}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.hostQueueIconBox}>
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostQueueTitle}>Host Queue</Text>
              <Text style={styles.hostQueueSubtitle}>Open a new queue line and manage service slots</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.blue} />
          </Pressable>

          {/* System Stats */}
          <View style={styles.statsGrid}>
            {(
              [
                { key: 'activeQueues', label: 'Active Queues', value: String(systemStats.totalQueues), icon: 'pulse-outline' as IoniconName },
                { key: 'totalWaiting', label: 'Total Waiting', value: String(systemStats.totalWaiting), icon: 'people-outline' as IoniconName },
                { key: 'avgWaitTime', label: 'Avg Wait Time', value: systemStats.avgWaitTime, icon: 'time-outline' as IoniconName },
                { key: 'operational', label: 'Operational', value: `${systemStats.operational}/${systemStats.totalQueues}`, icon: 'trending-up-outline' as IoniconName },
              ] as const
            ).map((stat) => {
              const tint = STAT_TINTS[stat.key];
              return (
                <View key={stat.key} style={[styles.statCard, { borderColor: tint.border }]}>
                  <View style={styles.statCardTop}>
                    <Text style={styles.statCardLabel}>{stat.label}</Text>
                    <Ionicons name={stat.icon} size={18} color={tint.color} />
                  </View>
                  <Text style={[styles.statCardValue, { color: tint.color }]}>{stat.value}</Text>
                </View>
              );
            })}
          </View>

          {/* College Queue Overview */}
          <View style={styles.card}>
            <View style={styles.overviewHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>College Queue Overview</Text>
                <Text style={styles.cardSubtitleText}>Real-time queue status across all colleges</Text>
              </View>
              <View style={styles.overviewControls}>
                <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('collegeOverview')}>
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {collegeOverviewFilter === 'all' ? 'All Colleges' : collegeOverviewFilter}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
                </Pressable>
                <Pressable style={styles.refreshBtnSm} onPress={fetchQueues} hitSlop={8}>
                  <Ionicons name="refresh-outline" size={16} color={theme.text} />
                </Pressable>
              </View>
            </View>
            <View style={styles.collegeGrid}>
              {filteredCollegeOverview.map((c) => {
                const tint = COLLEGE_STATUS_TINTS[c.status];
                const isOwnCollege = c.abbrev === user?.departmentAbbrev;
                return (
                  <View key={c.abbrev} style={styles.collegeCard}>
                    <View style={styles.collegeCardHeaderRow}>
                      <Image
                        source={collegeLogos[c.abbrev] ?? ccsLogo}
                        style={styles.collegeCardLogo}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.collegeCardName}>{c.name}</Text>
                        {isOwnCollege && <Text style={styles.collegeCardOwnTag}>Your College</Text>}
                      </View>
                      <View style={[styles.collegeStatusPill, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                        <Text style={[styles.collegeStatusText, { color: tint.color }]}>{c.status}</Text>
                      </View>
                    </View>
                    <View style={styles.collegeStatsRow}>
                      <View style={styles.collegeStatItem}>
                        <Text style={styles.collegeStatLabel}>Queues</Text>
                        <Text style={styles.collegeStatValue}>{c.activeQueues}</Text>
                      </View>
                      <View style={styles.collegeStatItem}>
                        <Text style={styles.collegeStatLabel}>Waiting</Text>
                        <Text style={styles.collegeStatValue}>{c.waitingStudents}</Text>
                      </View>
                      <View style={styles.collegeStatItem}>
                        <Text style={styles.collegeStatLabel}>Avg Time</Text>
                        <Text style={styles.collegeStatValue}>{c.avgWaitTime}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {queueHostingError && (
            <View style={[styles.statusNote, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <Text style={[styles.statusNoteText, { color: '#ef4444' }]}>{queueHostingError}</Text>
            </View>
          )}

          {/* Active Queue Details */}
          <View style={styles.card}>
            <View style={styles.overviewHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>Active Queue Details</Text>
                <Text style={styles.cardSubtitleText}>Queue information for {user?.departmentName ?? ''}</Text>
              </View>
              {serviceTypes.length > 0 && (
                <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('serviceType')}>
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {serviceTypeFilter === 'all' ? 'All Types' : serviceTypeFilter}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
                </Pressable>
              )}
            </View>

            {activeQueueDetails.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No active queues found</Text>
              </View>
            ) : filteredQueueDetails.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No queues match this service type</Text>
              </View>
            ) : (
              <View style={styles.queueDetailsList}>
                {filteredQueueDetails.map((detail) => (
                  <View key={detail.id} style={styles.queueDetailRow}>
                    <View style={styles.queueDetailHeaderRow}>
                      <Image
                        source={collegeLogos[user?.departmentAbbrev ?? ''] ?? ccsLogo}
                        style={styles.queueDetailLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.queueDetailAbbrev}>{user?.departmentAbbrev ?? ''}</Text>
                      <View style={styles.queueDetailServicePill}>
                        <Text style={styles.queueDetailServiceText}>{detail.queueType}</Text>
                      </View>
                    </View>

                    <View style={styles.queueDetailGrid}>
                      <View style={styles.queueDetailItem}>
                        <Text style={styles.queueDetailItemLabel}>Currently Serving</Text>
                        <Text style={styles.queueDetailItemValue}>
                          {detail.currentlyServingStudentNumber || '—'}
                        </Text>
                      </View>
                      <View style={styles.queueDetailItem}>
                        <Text style={styles.queueDetailItemLabel}>Waiting</Text>
                        <Text style={styles.queueDetailItemValue}>{detail.currentCount} students</Text>
                      </View>
                      <View style={styles.queueDetailItem}>
                        <Text style={styles.queueDetailItemLabel}>Avg Service</Text>
                        <Text style={styles.queueDetailItemValue}>{formatAvgService(detail.avgServiceMinutes)}</Text>
                      </View>
                      {detail.location && (
                        <View style={styles.queueDetailItem}>
                          <Text style={styles.queueDetailItemLabel}>Location</Text>
                          <Text style={styles.queueDetailItemValue}>{detail.location}</Text>
                        </View>
                      )}
                      {detail.serviceHours && (
                        <View style={styles.queueDetailItem}>
                          <Text style={styles.queueDetailItemLabel}>Service Hours</Text>
                          <Text style={styles.queueDetailItemValue}>
                            {detail.serviceHours.start} - {detail.serviceHours.end}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Pressable style={styles.monitorBtn} onPress={() => openMonitor(detail.id)}>
                      <Ionicons name="alert-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.monitorBtnText}>Monitor</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
        adminName={user?.name ?? 'Admin'}
        adminDepartmentName={user?.departmentName ?? ''}
      />

      {/* Filter Options Modal (shared by college + service type filters) */}
      <Modal visible={activeFilter !== null} animationType="fade" transparent onRequestClose={() => setActiveFilter(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.confirmTitle}>{filterTitle}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {filterOptions.map((opt) => {
                const selected = opt.value === filterCurrentValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => selectFilterOption(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setActiveFilter(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LogoutModal visible={logoutModalVisible} onCancel={() => setLogoutModalVisible(false)} onConfirm={confirmLogout} styles={styles} />
    </View>
  );
}

// ─────────────────────────── Shared sub-components ───────────────────────────

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  adminName,
  adminDepartmentName,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
  adminDepartmentName: string;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <SafeAreaView style={styles.drawerPanel} edges={['top', 'bottom']}>
          <View style={styles.drawerProfile}>
            <View style={styles.drawerProfileHeader}>
              <View style={styles.drawerAvatar}>
                <Ionicons name="person-outline" size={15} color={theme.primary} />
              </View>
              <Text style={styles.drawerName}>{adminName}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>Admin</Text>
            </View>
            <Text style={styles.drawerCollege}>{adminDepartmentName}</Text>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => {
              const active = item.key === 'queue';
              return (
                <Pressable
                  key={item.key}
                  style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                  onPress={() => onNavPress(item.key)}
                >
                  <Ionicons name={item.icon} size={18} color={active ? '#ffffff' : theme.subtext} />
                  <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.drawerLogout} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.drawerLogoutText}>Logout</Text>
          </Pressable>
        </SafeAreaView>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

function LogoutModal({
  visible,
  onCancel,
  onConfirm,
  styles,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalCard}>
          <View style={[styles.confirmIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="log-out-outline" size={26} color="#ef4444" />
          </View>
          <Text style={styles.confirmTitle}>Confirm Logout</Text>
          <Text style={styles.confirmDescription}>
            Are you sure you want to log out? Any unsaved changes will be lost.
          </Text>
          <View style={styles.confirmActionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.logoutConfirmBtn} onPress={onConfirm}>
              <Ionicons name="log-out-outline" size={16} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────── Theme ───────────────────────────

type ThemePalette = {
  background: string;
  card: string;
  cardAlt: string;
  cardAltBorder: string;
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  success: string;
  blue: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(59, 130, 246, 0.2)',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#22c55e',
  success: '#10b981',
  blue: '#3b82f6',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: 'rgba(248, 250, 252, 0.9)',
  cardAltBorder: '#e2e8f0',
  border: '#e2e8f0',
  headerBg: 'rgba(255, 255, 255, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#1e293b',
  subtext: '#64748b',
  tertiary: '#64748b',
  primary: '#15803d',
  success: '#059669',
  blue: '#2563eb',
  iconBtnBg: 'rgba(34, 197, 94, 0.08)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.15)',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.headerBorder,
    },
    headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    headerPncLogo: { width: 40, height: 40 },
    headerOamsLogo: { height: 34, width: 96 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: theme.iconBtnBg,
      borderWidth: 1,
      borderColor: theme.iconBtnBorder,
    },
    iconBtnImg: { width: 18, height: 18 },

    scrollContent: { padding: 16, gap: 18, paddingBottom: 40 },

    // Breadcrumb / monitor topbar
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },
    monitorTopbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    backBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },
    refreshBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshBtnSm: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    statusNote: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    statusNoteText: { fontSize: 12, color: theme.subtext, lineHeight: 17 },

    // Host queue link
    hostQueueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    hostQueueIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    hostQueueTitle: { fontSize: 14, fontWeight: '700', color: theme.blue },
    hostQueueSubtitle: { fontSize: 11, color: theme.subtext, marginTop: 2 },

    // System stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47.5%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1 },
    statCardValue: { fontSize: 22, fontWeight: '800' },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitleText: { fontSize: 15, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, marginTop: 2 },

    // College overview
    overviewHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
    overviewControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      maxWidth: 150,
    },
    filterSelectText: { fontSize: 12, color: theme.text, flexShrink: 1 },

    collegeGrid: { gap: 12 },
    collegeCard: {
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(59, 130, 246, 0.25)',
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    collegeCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    collegeCardLogo: { width: 32, height: 32, flexShrink: 0 },
    collegeCardName: { fontSize: 12.5, fontWeight: '700', color: theme.text, lineHeight: 17 },
    collegeCardOwnTag: { fontSize: 10, fontWeight: '700', color: theme.primary, marginTop: 3 },
    collegeStatusPill: { borderWidth: 0.5, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 },
    collegeStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    collegeStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(59, 130, 246, 0.2)',
    },
    collegeStatItem: { alignItems: 'center', gap: 3 },
    collegeStatLabel: { fontSize: 9, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    collegeStatValue: { fontSize: 15, fontWeight: '800', color: theme.text },

    // Active queue details
    queueDetailsList: { gap: 12 },
    emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle: { fontSize: 13, color: theme.tertiary },
    queueDetailRow: {
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(59, 130, 246, 0.25)',
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    queueDetailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    queueDetailLogo: { width: 24, height: 24 },
    queueDetailAbbrev: { fontSize: 13, fontWeight: '700', color: theme.text },
    queueDetailServicePill: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
    queueDetailServiceText: { fontSize: 11, fontWeight: '700', color: theme.blue },
    queueDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    queueDetailItem: { width: '46%', gap: 2 },
    queueDetailItemLabel: { fontSize: 10, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    queueDetailItemValue: { fontSize: 13, fontWeight: '700', color: theme.text },
    monitorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#3b82f6',
    },
    monitorBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // Monitor: 3-stat grid
    statsGrid3: { flexDirection: 'row', gap: 10 },
    statCard3: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: 'rgba(59, 130, 246, 0.25)',
      borderRadius: 14,
      padding: 12,
      gap: 6,
    },
    statCard3Label: { fontSize: 10, color: theme.subtext, fontWeight: '600' },
    statCard3Value: { fontSize: 16, fontWeight: '800', color: theme.text },

    // Progress
    progressCard: { gap: 10 },
    progressWrap: { gap: 6 },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontSize: 11, color: theme.subtext, fontWeight: '600' },
    progressValue: { fontSize: 11, color: theme.text, fontWeight: '700' },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: theme.border, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    progressStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    progressStat: { alignItems: 'center', gap: 4 },
    progressStatLabel: { fontSize: 10, color: theme.subtext },
    progressStatValue: { fontSize: 18, fontWeight: '800', color: theme.text },

    // Actions grid
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: {
      width: '47%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionBtnText: { fontSize: 12, fontWeight: '700' },
    actionBtnPrimary: { borderColor: 'rgba(59, 130, 246, 0.4)' },
    actionBtnSuccess: { borderColor: 'rgba(34, 197, 94, 0.4)' },
    actionBtnWarning: { borderColor: 'rgba(245, 158, 11, 0.4)' },
    actionBtnDanger: { borderColor: 'rgba(239, 68, 68, 0.4)' },
    actionBtnNeutral: { borderColor: theme.border },

    // Currently serving
    servingName: { fontSize: 15, fontWeight: '700', color: theme.text },
    servingLabel: { fontSize: 12, color: theme.subtext, marginTop: -8 },
    wideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 12,
    },
    wideBtnPrimary: { backgroundColor: '#3b82f6' },
    wideBtnSuccess: { backgroundColor: '#22c55e' },
    wideBtnDanger: { backgroundColor: '#ef4444' },
    wideBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // Queue entries
    emptyInlineText: { fontSize: 12, color: theme.tertiary, textAlign: 'center', paddingVertical: 12 },
    entriesList: { gap: 10 },
    entryItem: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      backgroundColor: theme.cardAlt,
    },
    entryItemServing: { borderColor: theme.blue, backgroundColor: 'rgba(59, 130, 246, 0.08)' },
    entryTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    entryNumberCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#3b82f6',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    entryNumberText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
    entryName: { fontSize: 13, fontWeight: '700', color: theme.text },
    entryId: { fontSize: 11, color: theme.tertiary, marginTop: 1 },
    entryStatusPill: { borderWidth: 0.5, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    entryStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    entryQueueNumber: { fontSize: 10, fontWeight: '600', color: theme.tertiary, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
    entryConcern: { fontSize: 12, color: theme.text, lineHeight: 17 },
    entryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    entryTimeText: { fontSize: 10.5, color: theme.tertiary },

    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    pageBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext },

    // Location / hours / status
    plainText: { fontSize: 13, color: theme.text, lineHeight: 18 },
    hoursRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    hoursLabel: { fontSize: 12, color: theme.subtext },
    hoursValue: { fontSize: 13, fontWeight: '700', color: theme.text },
    wideStatusBadge: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
    wideStatusBadgeText: { fontSize: 13, fontWeight: '700' },

    // Nav drawer (shared visual language with admin_dashboard.tsx)
    drawerOverlay: { flex: 1, flexDirection: 'row' },
    drawerPanel: {
      width: 270,
      backgroundColor: theme.card,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      padding: 20,
      justifyContent: 'space-between',
    },
    drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerProfile: {
      width: '100%',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.25)',
      borderRadius: 14,
      padding: 14,
    },
    drawerProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    drawerAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerName: { fontSize: 15, fontWeight: '700', color: theme.text },
    drawerRoleBadge: { backgroundColor: 'rgba(22, 163, 74, 0.18)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
    drawerRoleBadgeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
    drawerCollege: { fontSize: 12, fontWeight: '500', color: theme.subtext },
    drawerNav: { flex: 1, marginTop: 28, gap: 4 },
    drawerNavItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
    drawerNavItemActive: { backgroundColor: theme.primary },
    drawerNavLabel: { fontSize: 14, fontWeight: '600', color: theme.subtext },
    drawerNavLabelActive: { color: '#ffffff' },
    drawerLogout: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    drawerLogoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    // Shared confirm / filter modal chrome
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },
    confirmModalCard: {
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 24,
    },
    confirmIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' },
    confirmDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    reasonInput: {
      width: '100%',
      minHeight: 64,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    formSubmitBtnDisabled: { opacity: 0.6 },
    confirmActionsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
    confirmBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
    logoutConfirmBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#ef4444',
    },

    filterModalCard: {
      width: '100%',
      maxWidth: 340,
      maxHeight: '70%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
      alignItems: 'stretch',
      gap: 12,
    },
    filterOptionsList: { maxHeight: 320 },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 2,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.primary, fontWeight: '700' },
  });
}
