import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  History,
  Home as HomeIcon,
  Pause,
  Play,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import { useAdminQueueHosting } from '@/hooks/useAdminQueueHosting';
import QueueReasonModal from '@/components/QueueReasonModal';
import api from '@/utils/api';

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

// 'full' (capacity reached) and 'expired' (hours ended) both mean "closed to new
// joins, but still has unserved students" -- grouped as "Still Serving" on-screen.
// 'closed' means exclusively "an admin manually stopped this queue".
type QueueStatus = 'open' | 'paused' | 'full' | 'expired' | 'completed' | 'closed';

type LucideIconType = typeof Clock;

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'queue', label: 'Queue', icon: Clock },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: History },
];

const STATUS_TINTS: Record<QueueStatus, { bg: string; border: string; color: string }> = {
  open: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' },
  paused: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  full: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', color: '#f97316' },
  expired: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', color: '#f97316' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#10b981' },
  closed: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' },
};

const STAT_TINTS = {
  active: { border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6', icon: Play },
  paused: { border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b', icon: Pause },
  stillServing: { border: 'rgba(249, 115, 22, 0.35)', color: '#f97316', icon: Clock },
  completed: { border: 'rgba(16, 185, 129, 0.35)', color: '#10b981', icon: Check },
  closed: { border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444', icon: X },
} as const;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'full', label: 'Full' },
  { value: 'expired', label: 'Hours Ended' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function getNowHHMM() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

type SelectField = 'service' | 'status' | 'type' | null;

export default function AdminQueueHostingScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    queues,
    fetchQueues,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue,
    handleResumeQueue,
    handleReasonConfirm,
  } = useAdminQueueHosting();

  const [services, setServices] = useState<{ service_id: string; service_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/admin/queue-hosting/services');
      setServices(res.data.services ?? []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, []);

  useEffect(() => {
    if (user) fetchServices();
  }, [user, fetchServices]);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'queue') {
      router.push('/pages/admin/admin_queue');
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

  // ── Search & filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectField, setSelectField] = useState<SelectField>(null);

  // ── Open Queue Line modal state ──
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [serviceStart, setServiceStart] = useState('08:00');
  const [serviceEnd, setServiceEnd] = useState('17:00');
  const [noShowTimeout, setNoShowTimeout] = useState('15');
  const [serviceTime, setServiceTime] = useState('15');
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setServiceId('');
    setMaxCapacity('100');
    setServiceStart('08:00');
    setServiceEnd('17:00');
    setNoShowTimeout('15');
    setServiceTime('15');
    setFormError('');
  };
  const openModal = () => {
    resetForm();
    setShowOpenModal(true);
  };
  const closeModal = () => {
    setShowOpenModal(false);
    resetForm();
  };

  const handleOpenQueueSubmit = async () => {
    if (!serviceId) {
      setFormError('Please select a service to queue');
      return;
    }
    const capacityNum = parseInt(maxCapacity, 10);
    if (!capacityNum || capacityNum <= 0) {
      setFormError('Please enter a valid maximum queue capacity');
      return;
    }
    if (serviceStart >= serviceEnd) {
      setFormError('Start time must be before end time');
      return;
    }
    if (serviceEnd <= getNowHHMM()) {
      setFormError('End time has already passed — choose a window that ends later than the current time');
      return;
    }
    const noShowTimeoutNum = parseInt(noShowTimeout, 10);
    if (!noShowTimeoutNum || noShowTimeoutNum <= 0) {
      setFormError('Please enter a valid no-show timeout in minutes');
      return;
    }
    const serviceTimeNum = parseInt(serviceTime, 10);
    if (!serviceTimeNum || serviceTimeNum <= 0) {
      setFormError('Please enter a valid service time in minutes');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/queue-hosting', {
        serviceId,
        maxCapacity: capacityNum,
        startTime: `${serviceStart}:00`,
        endTime: `${serviceEnd}:00`,
        noShowTimeoutMinutes: noShowTimeoutNum,
        serviceTimeMinutes: serviceTimeNum,
      });
      Toast.show({ type: 'success', text1: 'Queue line opened successfully!' });
      closeModal();
      await fetchQueues();
    } catch (error: any) {
      setFormError(error?.response?.data?.error ?? 'Failed to open queue line');
    } finally {
      setSubmitting(false);
    }
  };

  const reasonTarget = queues.find((q: any) => q.id === reasonModal?.id) ?? null;
  const reasonCopy =
    reasonModal?.mode === 'pause'
      ? {
          title: 'Pause Queue',
          message: reasonTarget?.currentlyServingStudentNumber
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
  const [reasonText, setReasonText] = useState('');

  // ── Derived values ──
  // Unique service types currently hosted -- always computed from the full queue
  // list so the dropdown options don't shift as filters are applied.
  const serviceTypeOptions = [...new Set(queues.map((q: any) => q.queueType))].sort();

  const filteredQueues = queues.filter((q: any) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query || q.queueType.toLowerCase().includes(query) || (q.department || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesType = typeFilter === 'all' || q.queueType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeQueues = filteredQueues.filter((q) => q.status === 'open');
  const pausedQueues = filteredQueues.filter((q) => q.status === 'paused');
  const stillServingQueues = filteredQueues.filter((q) => q.status === 'full' || q.status === 'expired');
  const completedQueues = filteredQueues.filter((q) => q.status === 'completed');
  const closedQueues = filteredQueues.filter((q) => q.status === 'closed');
  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const typeFilterOptions = [{ value: 'all', label: 'All Service Types' }, ...serviceTypeOptions.map((t) => ({ value: t, label: t }))];
  const selectOptions =
    selectField === 'service'
      ? services.map((s) => ({ value: s.service_id, label: s.service_name }))
      : selectField === 'status'
        ? STATUS_FILTER_OPTIONS
        : typeFilterOptions;
  const selectTitle =
    selectField === 'service' ? 'Select a Service' : selectField === 'status' ? 'Filter by Status' : 'Filter by Service Type';
  const selectCurrentValue = selectField === 'service' ? serviceId : selectField === 'status' ? statusFilter : typeFilter;
  const chooseSelectOption = (value: string) => {
    if (selectField === 'service') setServiceId(value);
    else if (selectField === 'status') setStatusFilter(value);
    else if (selectField === 'type') setTypeFilter(value);
    setSelectField(null);
  };
  const selectedServiceName = services.find((s) => s.service_id === serviceId)?.service_name ?? '';

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
            <NotificationBell
              endpointBase="admin"
              theme={theme}
              typePaths={ADMIN_NOTIFICATION_PATHS}
              viewAllPath={ADMIN_NOTIFICATIONS_VIEW_ALL}
            />
            <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.titleIcon}>
              <Clock size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queue Hosting Management</Text>
              <Text style={styles.pageSubtitle}>
                {user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''}) — open, manage, and close your
                department&apos;s queue lines
              </Text>
            </View>
          </View>

          <Pressable onPress={openModal}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.openQueueBtn}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.openQueueBtnText}>Open Queue Line</Text>
            </LinearGradient>
          </Pressable>

          {/* Summary Stats */}
          <View style={styles.statsGrid}>
            {(
              [
                { key: 'active', label: 'Active Queues', value: activeQueues.length },
                { key: 'paused', label: 'Paused Queues', value: pausedQueues.length },
                { key: 'stillServing', label: 'Still Serving', value: stillServingQueues.length },
                { key: 'completed', label: 'Completed Queues', value: completedQueues.length },
                { key: 'closed', label: 'Manually Closed', value: closedQueues.length },
              ] as const
            ).map((stat) => {
              const tint = STAT_TINTS[stat.key];
              return (
                <View key={stat.key} style={[styles.statCard, { borderColor: tint.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statCardLabel}>{stat.label}</Text>
                    <Text style={[styles.statCardValue, { color: tint.color }]}>{stat.value}</Text>
                  </View>
                  <View style={[styles.statIconCircle, { backgroundColor: tint.color }]}>
                    <tint.icon size={20} color="#ffffff" />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Search & Filters */}
          <View style={styles.filtersCard}>
            <View style={styles.searchWrapper}>
              <Search size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by service or department..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.filterRow}>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('status')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All Statuses'}
                </Text>
                <ChevronDown size={14} color={theme.tertiary} />
              </Pressable>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('type')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {typeFilter === 'all' ? 'All Service Types' : typeFilter}
                </Text>
                <ChevronDown size={14} color={theme.tertiary} />
              </Pressable>
            </View>
            {hasActiveFilters && (
              <Pressable style={styles.clearFiltersBtn} onPress={clearFilters}>
                <Text style={styles.clearFiltersBtnText}>Clear filters</Text>
              </Pressable>
            )}
          </View>

          {/* Active Queue Lines */}
          {activeQueues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Queue Lines</Text>
              <View style={styles.queueList}>
                {activeQueues.map((queue) => (
                  <Pressable
                    key={queue.id}
                    style={[styles.queueCard, styles.queueCardActive]}
                    onPress={() => router.push({ pathname: '/pages/admin/admin_queue', params: { monitorQueueId: String(queue.id) } })}
                  >
                    <View style={styles.queueCardTopRow}>
                      <View style={styles.queueCardTitleRow}>
                        <Image
                          source={collegeLogos[queue.department] ?? ccsLogo}
                          style={styles.queueCardLogo}
                          resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.queueCardTitle}>{queue.queueType}</Text>
                          <Text style={styles.queueCardDept}>{queue.department}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_TINTS.open.bg, borderColor: STATUS_TINTS.open.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: STATUS_TINTS.open.color }]}>active</Text>
                      </View>
                    </View>

                    <View style={styles.queueStatsRow}>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Waiting / Max</Text>
                        <Text style={styles.queueStatValue}>
                          {queue.currentCount} / {queue.maxCapacity}
                        </Text>
                      </View>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Service Hours</Text>
                        <Text style={styles.queueStatValueSm}>
                          {queue.serviceHours.start} - {queue.serviceHours.end}
                        </Text>
                      </View>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Opened At</Text>
                        <Text style={styles.queueStatValueSm}>{queue.createdAt}</Text>
                      </View>
                      <View style={[styles.queueStat, { minWidth: '100%' }]}>
                        <Text style={styles.queueStatLabel}>Capacity</Text>
                        <View style={styles.capacityBarTrack}>
                          <View
                            style={[
                              styles.capacityBarFill,
                              { width: `${Math.min(100, (queue.currentCount / queue.maxCapacity) * 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.queueActionsRow}>
                      <Pressable
                        style={[styles.queueActionBtn, styles.queueActionBtnWarning]}
                        onPress={(e) => { e.stopPropagation(); handlePauseQueue(queue.id); }}
                      >
                        <Pause size={14} color="#f59e0b" />
                        <Text style={[styles.queueActionBtnText, { color: '#f59e0b' }]}>Pause</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.queueActionBtn, styles.queueActionBtnDanger]}
                        onPress={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                      >
                        <X size={14} color="#ef4444" />
                        <Text style={[styles.queueActionBtnText, { color: '#ef4444' }]}>Close</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Paused Queue Lines */}
          {pausedQueues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paused Queue Lines</Text>
              <View style={styles.queueList}>
                {pausedQueues.map((queue) => (
                  <Pressable
                    key={queue.id}
                    style={[styles.queueCard, styles.queueCardPaused]}
                    onPress={() => router.push({ pathname: '/pages/admin/admin_queue', params: { monitorQueueId: String(queue.id) } })}
                  >
                    <View style={styles.queueCardTopRow}>
                      <View style={styles.queueCardTitleRow}>
                        <Image
                          source={collegeLogos[queue.department] ?? ccsLogo}
                          style={styles.queueCardLogo}
                          resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.queueCardTitle}>{queue.queueType}</Text>
                          <Text style={styles.queueCardDept}>{queue.department}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_TINTS.paused.bg, borderColor: STATUS_TINTS.paused.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: STATUS_TINTS.paused.color }]}>paused</Text>
                      </View>
                    </View>

                    <View style={styles.queueStatsRow}>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Waiting / Max</Text>
                        <Text style={styles.queueStatValue}>
                          {queue.currentCount} / {queue.maxCapacity}
                        </Text>
                      </View>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Service Hours</Text>
                        <Text style={styles.queueStatValueSm}>
                          {queue.serviceHours.start} - {queue.serviceHours.end}
                        </Text>
                      </View>
                      <View style={styles.queueStat}>
                        <Text style={styles.queueStatLabel}>Served Today</Text>
                        <Text style={styles.queueStatValueSm}>{queue.servedCount}</Text>
                      </View>
                    </View>

                    <View style={styles.queueActionsRow}>
                      <Pressable
                        style={[styles.queueActionBtn, styles.queueActionBtnSuccess]}
                        onPress={(e) => { e.stopPropagation(); handleResumeQueue(queue.id); }}
                      >
                        <Play size={14} color="#3b82f6" />
                        <Text style={[styles.queueActionBtnText, { color: '#3b82f6' }]}>Resume</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.queueActionBtn, styles.queueActionBtnDanger]}
                        onPress={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                      >
                        <X size={14} color="#ef4444" />
                        <Text style={[styles.queueActionBtnText, { color: '#ef4444' }]}>Close</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Still Serving Queue Lines (full or hours ended, students remain) */}
          {stillServingQueues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Still Serving (Closed to New Joins)</Text>
              <View style={styles.queueList}>
                {stillServingQueues.map((queue: any) => {
                  const tint = STATUS_TINTS[queue.status as QueueStatus];
                  return (
                    <Pressable
                      key={queue.id}
                      style={[styles.queueCard, styles.queueCardStillServing]}
                      onPress={() => router.push({ pathname: '/pages/admin/admin_queue', params: { monitorQueueId: String(queue.id) } })}
                    >
                      <View style={styles.queueCardTopRow}>
                        <View style={styles.queueCardTitleRow}>
                          <Image
                            source={collegeLogos[queue.department] ?? ccsLogo}
                            style={styles.queueCardLogo}
                            resizeMode="contain"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.queueCardTitle}>{queue.queueType}</Text>
                            <Text style={styles.queueCardDept}>{queue.department}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                          <Text style={[styles.statusBadgeText, { color: tint.color }]}>
                            {queue.status === 'full' ? 'full' : 'hours ended'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.queueStatsRow}>
                        <View style={styles.queueStat}>
                          <Text style={styles.queueStatLabel}>Waiting / Max</Text>
                          <Text style={styles.queueStatValue}>
                            {queue.currentCount} / {queue.maxCapacity}
                          </Text>
                        </View>
                        <View style={styles.queueStat}>
                          <Text style={styles.queueStatLabel}>Service Hours</Text>
                          <Text style={styles.queueStatValueSm}>
                            {queue.serviceHours.start} - {queue.serviceHours.end}
                          </Text>
                        </View>
                        <View style={styles.queueStat}>
                          <Text style={styles.queueStatLabel}>Served Today</Text>
                          <Text style={styles.queueStatValueSm}>{queue.servedCount}</Text>
                        </View>
                      </View>

                      <View style={styles.queueActionsRow}>
                        <Pressable
                          style={[styles.queueActionBtn, styles.queueActionBtnDanger, { flex: 1 }]}
                          onPress={(e) => { e.stopPropagation(); handleCloseQueue(queue.id); }}
                        >
                          <X size={14} color="#ef4444" />
                          <Text style={[styles.queueActionBtnText, { color: '#ef4444' }]}>Stop Queue</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Completed Queue Lines */}
          {completedQueues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completed Queue Lines (Today)</Text>
              <View style={styles.queueList}>
                {completedQueues.map((queue) => (
                  <Pressable
                    key={queue.id}
                    style={[styles.queueCard, styles.queueCardCompleted]}
                    onPress={() => router.push({ pathname: '/pages/admin/admin_queue', params: { monitorQueueId: String(queue.id) } })}
                  >
                    <View style={styles.queueCardTopRow}>
                      <View style={styles.queueCardTitleRow}>
                        <Image
                          source={collegeLogos[queue.department] ?? ccsLogo}
                          style={styles.queueCardLogo}
                          resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.queueCardTitle}>{queue.queueType}</Text>
                          <Text style={styles.queueCardDept}>{queue.department}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_TINTS.completed.bg, borderColor: STATUS_TINTS.completed.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: STATUS_TINTS.completed.color }]}>
                          completed
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.closedMeta}>
                      Served {queue.servedCount} student(s), capacity {queue.maxCapacity}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Manually Closed Queue Lines */}
          {closedQueues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manually Closed Queue Lines (Today)</Text>
              <View style={styles.queueList}>
                {closedQueues.map((queue) => (
                  <Pressable
                    key={queue.id}
                    style={[styles.queueCard, styles.queueCardClosed]}
                    onPress={() => router.push({ pathname: '/pages/admin/admin_queue', params: { monitorQueueId: String(queue.id) } })}
                  >
                    <View style={styles.queueCardTopRow}>
                      <View style={styles.queueCardTitleRow}>
                        <Image
                          source={collegeLogos[queue.department] ?? ccsLogo}
                          style={styles.queueCardLogo}
                          resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.queueCardTitle}>{queue.queueType}</Text>
                          <Text style={styles.queueCardDept}>{queue.department}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_TINTS.closed.bg, borderColor: STATUS_TINTS.closed.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: STATUS_TINTS.closed.color }]}>closed</Text>
                      </View>
                    </View>
                    <Text style={styles.closedMeta}>
                      Served {queue.servedCount} student(s), capacity {queue.maxCapacity}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {queues.length === 0 && (
            <View style={styles.emptyState}>
              <Clock size={28} color={theme.tertiary} />
              <Text style={styles.emptyStateText}>
                No queue lines yet today for {user?.departmentAbbrev ?? 'your department'}. Open one to start serving students.
              </Text>
            </View>
          )}

          {queues.length > 0 && filteredQueues.length === 0 && (
            <View style={styles.emptyState}>
              <AlertCircle size={28} color={theme.tertiary} />
              <Text style={styles.emptyStateText}>No queue lines match your search or filters.</Text>
              {hasActiveFilters && (
                <Pressable style={styles.clearFiltersBtn} onPress={clearFilters}>
                  <Text style={styles.clearFiltersBtnText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          )}
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

      <OpenQueueModal
        visible={showOpenModal}
        selectedServiceName={selectedServiceName}
        maxCapacity={maxCapacity}
        serviceStart={serviceStart}
        serviceEnd={serviceEnd}
        noShowTimeout={noShowTimeout}
        serviceTime={serviceTime}
        formError={formError}
        onOpenServiceSelect={() => setSelectField('service')}
        onChangeCapacity={setMaxCapacity}
        onChangeStart={setServiceStart}
        onChangeEnd={setServiceEnd}
        onChangeNoShowTimeout={setNoShowTimeout}
        onChangeServiceTime={setServiceTime}
        onClose={closeModal}
        onSubmit={handleOpenQueueSubmit}
        theme={theme}
        styles={styles}
        adminDepartmentName={user?.departmentName ?? ''}
        adminDepartmentAbbrev={user?.departmentAbbrev ?? ''}
        submitting={submitting}
      />

      {/* Shared select modal: service picker + status/type filters */}
      <Modal visible={selectField !== null} animationType="fade" transparent onRequestClose={() => setSelectField(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.confirmTitle}>{selectTitle}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {selectOptions.map((opt) => {
                const selected = opt.value === selectCurrentValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => chooseSelectOption(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.blue} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setSelectField(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <QueueReasonModal
        visible={!!reasonModal}
        title={reasonCopy.title}
        message={reasonCopy.message}
        confirmText={reasonSubmitting ? 'Submitting...' : reasonCopy.confirmText}
        confirmColor={reasonCopy.confirmColor}
        reason={reasonText}
        onChangeReason={setReasonText}
        onCancel={() => setReasonModal(null)}
        onConfirm={() => {
          handleReasonConfirm(reasonText);
          setReasonText('');
        }}
        theme={theme}
        styles={styles}
        submitting={reasonSubmitting}
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
            {navItems.map((item) => (
              <Pressable key={item.key} style={styles.drawerNavItem} onPress={() => onNavPress(item.key)}>
                <item.icon size={18} color={theme.subtext} />
                <Text style={styles.drawerNavLabel}>{item.label}</Text>
              </Pressable>
            ))}
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

function OpenQueueModal({
  visible,
  selectedServiceName,
  maxCapacity,
  serviceStart,
  serviceEnd,
  noShowTimeout,
  serviceTime,
  formError,
  onOpenServiceSelect,
  onChangeCapacity,
  onChangeStart,
  onChangeEnd,
  onChangeNoShowTimeout,
  onChangeServiceTime,
  onClose,
  onSubmit,
  theme,
  styles,
  adminDepartmentName,
  adminDepartmentAbbrev,
  submitting,
}: {
  visible: boolean;
  selectedServiceName: string;
  maxCapacity: string;
  serviceStart: string;
  serviceEnd: string;
  noShowTimeout: string;
  serviceTime: string;
  formError: string;
  onOpenServiceSelect: () => void;
  onChangeCapacity: (v: string) => void;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onChangeNoShowTimeout: (v: string) => void;
  onChangeServiceTime: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminDepartmentName: string;
  adminDepartmentAbbrev: string;
  submitting: boolean;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formModalCard}>
          <View style={styles.formModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formModalTitle}>Open New Queue Line</Text>
              <Text style={styles.pageSubtitle}>
                For {adminDepartmentName} ({adminDepartmentAbbrev}) only
              </Text>
            </View>
            <Pressable style={styles.formModalCloseBtn} onPress={onClose} hitSlop={8}>
              <X size={18} color={theme.subtext} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ gap: 14 }}>
            {!!formError && (
              <View style={styles.formErrorBox}>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service *</Text>
              <Pressable style={styles.selectTrigger} onPress={onOpenServiceSelect}>
                <Text
                  style={[styles.selectTriggerText, !selectedServiceName && styles.selectPlaceholderText]}
                  numberOfLines={1}
                >
                  {selectedServiceName || 'Select a service'}
                </Text>
                <ChevronDown size={14} color={theme.tertiary} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Maximum Queue Capacity *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                placeholder="e.g., 100"
                placeholderTextColor={theme.tertiary}
                value={maxCapacity}
                onChangeText={onChangeCapacity}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Time (minutes) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                placeholder="e.g., 15"
                placeholderTextColor={theme.tertiary}
                value={serviceTime}
                onChangeText={onChangeServiceTime}
              />
              <Text style={styles.formHint}>
                Estimated time to serve one student in this queue — used to calculate students&apos; wait-time
                estimates.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>No-Show Timeout (minutes) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                placeholder="e.g., 15"
                placeholderTextColor={theme.tertiary}
                value={noShowTimeout}
                onChangeText={onChangeNoShowTimeout}
              />
              <Text style={styles.formHint}>
                A called student who doesn&apos;t show up within this many minutes is automatically voided so you can
                call the next one.
              </Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Text style={styles.formLabel}>Service Start Time *</Text>
                <View style={styles.searchWrapper}>
                  <Clock size={14} color={theme.tertiary} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.textInput, { paddingLeft: 36 }]}
                    placeholder="08:00"
                    placeholderTextColor={theme.tertiary}
                    value={serviceStart}
                    onChangeText={onChangeStart}
                  />
                </View>
              </View>
              <View style={styles.formRowItem}>
                <Text style={styles.formLabel}>Service End Time *</Text>
                <View style={styles.searchWrapper}>
                  <Clock size={14} color={theme.tertiary} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.textInput, { paddingLeft: 36 }]}
                    placeholder="17:00"
                    placeholderTextColor={theme.tertiary}
                    value={serviceEnd}
                    onChangeText={onChangeEnd}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.formFooter}>
            <Pressable style={styles.formCancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.formCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.formSubmitBtn, submitting && styles.formSubmitBtnDisabled]}
              onPress={onSubmit}
              disabled={submitting}
            >
              <Text style={styles.formSubmitBtnText}>{submitting ? 'Opening...' : 'Open Queue Line'}</Text>
            </Pressable>
          </View>
        </View>
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

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3, lineHeight: 17 },

    // Open Queue Line button
    openQueueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderRadius: 14,
    },
    openQueueBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

    // Summary stats (stacked full-width cards)
    statsGrid: { gap: 12 },
    statCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    },
    statCardLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 },
    statCardValue: { fontSize: 26, fontWeight: '800' },
    statIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

    // Search & filters
    filtersCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    searchWrapper: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
    searchInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingLeft: 36,
      paddingRight: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
    },
    filterRow: { flexDirection: 'row', gap: 10 },
    filterSelect: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    filterSelectText: { fontSize: 12, color: theme.text, flexShrink: 1 },
    clearFiltersBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    clearFiltersBtnText: { fontSize: 12, fontWeight: '700', color: theme.blue },

    // Sections
    section: { gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
    queueList: { gap: 12 },

    // Queue cards
    queueCard: { borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 12 },
    queueCardActive: { backgroundColor: 'rgba(59, 130, 246, 0.06)', borderColor: 'rgba(59, 130, 246, 0.3)' },
    queueCardPaused: { backgroundColor: 'rgba(245, 158, 11, 0.06)', borderColor: 'rgba(245, 158, 11, 0.3)' },
    queueCardStillServing: { backgroundColor: 'rgba(249, 115, 22, 0.06)', borderColor: 'rgba(249, 115, 22, 0.3)' },
    queueCardCompleted: { backgroundColor: theme.card, borderColor: 'rgba(16, 185, 129, 0.3)', opacity: 0.9 },
    queueCardClosed: { backgroundColor: theme.card, borderColor: theme.border, opacity: 0.85 },

    queueCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
    queueCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
    queueCardLogo: { width: 32, height: 32, flexShrink: 0 },
    queueCardTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    queueCardDept: { fontSize: 12, color: theme.subtext, marginTop: 2 },

    statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 0.5 },
    statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

    queueStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    queueStat: { minWidth: '28%', gap: 4 },
    queueStatLabel: { fontSize: 10, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    queueStatValue: { fontSize: 14, fontWeight: '700', color: theme.text },
    queueStatValueSm: { fontSize: 12, fontWeight: '700', color: theme.text },

    capacityBarTrack: { height: 6, borderRadius: 999, backgroundColor: theme.border, overflow: 'hidden', marginTop: 2 },
    capacityBarFill: { height: '100%', borderRadius: 999, backgroundColor: theme.blue },

    queueActionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
    queueActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    queueActionBtnWarning: { borderColor: 'rgba(245, 158, 11, 0.4)' },
    queueActionBtnDanger: { borderColor: 'rgba(239, 68, 68, 0.4)' },
    queueActionBtnSuccess: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' },
    queueActionBtnText: { fontSize: 12, fontWeight: '700' },

    closedMeta: { fontSize: 11, color: theme.tertiary, marginTop: -2 },

    emptyState: {
      padding: 32,
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
    },
    emptyStateText: { fontSize: 12, color: theme.tertiary, textAlign: 'center' },

    // Shared modal overlay
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },

    // Open Queue Line form modal
    formModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
    },
    formModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
    formModalTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
    formModalCloseBtn: { padding: 6, borderRadius: 8 },
    formScroll: { flexGrow: 0 },

    formErrorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      padding: 10,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    formErrorText: { fontSize: 12, color: '#ef4444', flex: 1, lineHeight: 16 },

    formGroup: { gap: 6 },
    formLabel: { fontSize: 12, fontWeight: '700', color: theme.text },
    formHint: { fontSize: 11, color: theme.tertiary, lineHeight: 15 },

    selectTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    selectTriggerText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    selectPlaceholderText: { color: theme.tertiary },

    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
    },
    formRow: { flexDirection: 'row', gap: 12 },
    formRowItem: { flex: 1, gap: 6 },

    formFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    formCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    formCancelBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },
    formSubmitBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.blue,
    },
    formSubmitBtnDisabled: { opacity: 0.6 },
    formSubmitBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

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
    drawerNavLabel: { fontSize: 14, fontWeight: '600', color: theme.subtext },
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

    // Shared confirm / select modal chrome
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
    confirmDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
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
    filterOptionRowActive: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.blue, fontWeight: '700' },
  });
}
