import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  History,
  Home as HomeIcon,
  RefreshCw,
  Users,
  UserX,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useDrawerSwipeOpen } from '@/hooks/useDrawerSwipeOpen';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { exportRowsAsCsv } from '@/utils/csvExport';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

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

// GET /api/admin/queue-analytics/summary (adminRoutes.js) is scoped strictly
// to the signed-in admin's own department -- it aggregates queues for that
// one department only, filtered by range/service, and returns
// totals/byService/serviceTypes pre-computed. Mirrors web's current
// adm-queue-analytics.jsx exactly (web replaced its older, richer
// performance/trends/insights view with this simpler operational-metrics
// one; the older /admin/queue-analytics endpoint this screen used to call
// still exists server-side for backward compat, but neither web nor this
// screen use it anymore).
interface Totals {
  accomplishedQueues: number;
  overtimeQueues: number;
  studentsServed: number;
  noShows: number;
  peakHour: string;
}

const DEFAULT_TOTALS: Totals = {
  accomplishedQueues: 0,
  overtimeQueues: 0,
  studentsServed: 0,
  noShows: 0,
  peakHour: 'N/A',
};

interface ByServiceRow {
  service: string;
  studentsServed: number;
  overtimeQueues: number;
  noShows: number;
  avgWaitMinutes: number;
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'all', label: 'All Time' },
] as const;
type RangeValue = (typeof RANGE_OPTIONS)[number]['value'];

type SelectField = 'range' | 'service' | null;

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

export default function AdminQueueAnalyticsScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  useDrawerSwipeOpen(() => setMenuOpen(true));
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [range, setRange] = useState<RangeValue>('today');
  const [serviceType, setServiceType] = useState('All Services');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [totals, setTotals] = useState<Totals>(DEFAULT_TOTALS);
  const [byService, setByService] = useState<ByServiceRow[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(['All Services']);
  // Starts true so the first load shows a loading state; later refreshes
  // (filter change / socket / reconnect) update silently -- mirrors web.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoadError(null);
      const res = await api.get('/admin/queue-analytics/summary', {
        params: { range, service: serviceType },
      });
      if (requestId !== requestIdRef.current) return;
      setTotals(res.data.totals ?? DEFAULT_TOTALS);
      setByService(res.data.byService ?? []);
      if (res.data.serviceTypes) setServiceTypes(res.data.serviceTypes);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to fetch queue analytics:', error);
      setLoadError('Could not load queue analytics.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [range, serviceType]);

  const handleExportReport = async () => {
    try {
      await exportRowsAsCsv(
        byService.map((r) => ({
          service: r.service,
          studentsServed: r.studentsServed,
          overtimeQueues: r.overtimeQueues,
          noShows: r.noShows,
          avgWaitMinutes: r.avgWaitMinutes,
        })),
        `queue-analytics-${range}.csv`,
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Could not export the report.');
    }
  };

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, fetchAnalytics]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchAnalytics();
    // A queue metric moves whenever a student is called / served / no-showed
    // or a slot's lifecycle changes -- mirrors web's ANALYTICS_LIVE_EVENTS.
    const events = [
      'queue:called',
      'queue:served',
      'queue:no-show',
      'queue:slot-status',
      'queue:student-joined',
      'queue:student-left',
    ];
    events.forEach((event) => socket.on(event, refetch));
    // Reconciles state after a dropped connection -- mirrors web's
    // useLiveRefetch, which refetches on socket "connect" for this reason.
    socket.on('connect', refetch);
    return () => {
      events.forEach((event) => socket.off(event, refetch));
      socket.off('connect', refetch);
    };
  }, [user, token, fetchAnalytics]);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

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

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? 'Today';

  const selectOptions: { value: string; label: string }[] =
    selectField === 'range' ? [...RANGE_OPTIONS] : serviceTypes.map((s) => ({ value: s, label: s }));
  const selectTitle = selectField === 'range' ? 'Select Time Range' : 'Select Service Type';
  const selectCurrentValue = selectField === 'range' ? range : serviceType;

  const chooseOption = (value: string) => {
    if (selectField === 'range') setRange(value as RangeValue);
    else if (selectField === 'service') setServiceType(value);
    setSelectField(null);
  };

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
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <BarChart3 size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queue Analytics</Text>
              <Text style={styles.pageSubtitle}>Queue performance for your department.</Text>
            </View>
          </View>

          {/* Stat cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <View style={styles.statCardTop}>
                <CheckCircle size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Accomplished Queues</Text>
              </View>
              <Text style={[styles.statCardValue, { color: '#3b82f6' }]}>
                {loading ? '—' : totals.accomplishedQueues}
              </Text>
              <Text style={styles.statCardSub}>{rangeLabel}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <View style={styles.statCardTop}>
                <AlertTriangle size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Overtime Queues</Text>
              </View>
              <Text style={[styles.statCardValue, { color: '#f59e0b' }]}>
                {loading ? '—' : totals.overtimeQueues}
              </Text>
              <Text style={styles.statCardSub}>{rangeLabel}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <View style={styles.statCardTop}>
                <Users size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Students Served</Text>
              </View>
              <Text style={[styles.statCardValue, { color: '#3b82f6' }]}>
                {loading ? '—' : totals.studentsServed}
              </Text>
              <Text style={styles.statCardSub}>{rangeLabel}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <View style={styles.statCardTop}>
                <UserX size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>No-Shows</Text>
              </View>
              <Text style={[styles.statCardValue, { color: '#ef4444' }]}>
                {loading ? '—' : totals.noShows}
              </Text>
              <Text style={styles.statCardSub}>{rangeLabel}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWide, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <View style={styles.statCardTop}>
                <Clock size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Peak Hour</Text>
              </View>
              <Text style={[styles.statCardValue, styles.statCardValueText, { color: '#3b82f6' }]}>
                {loading ? '—' : totals.peakHour}
              </Text>
              <Text style={styles.statCardSub}>{rangeLabel}</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.card}>
            <View style={styles.filtersHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>Analytics Filters</Text>
                <Text style={styles.cardSubtitleText}>
                  {user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''})
                </Text>
              </View>
            </View>
            <View style={styles.filtersActionsRow}>
              <Pressable
                style={[styles.outlineBtn, byService.length === 0 && styles.outlineBtnDisabled]}
                onPress={handleExportReport}
                disabled={byService.length === 0}
              >
                <Download size={14} color={theme.text} />
                <Text style={styles.outlineBtnText}>Export Report</Text>
              </Pressable>
              <Pressable style={styles.outlineBtn} onPress={fetchAnalytics}>
                <RefreshCw size={14} color={theme.text} />
                <Text style={styles.outlineBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Time Range</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('range')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{rangeLabel}</Text>
                <ChevronDown size={16} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Service Type</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('service')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{serviceType}</Text>
                <ChevronDown size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Service Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitleText}>Service Breakdown</Text>
            <Text style={styles.cardSubtitleText}>
              Per-service queue metrics — {rangeLabel.toLowerCase()}.
            </Text>
            {loading ? (
              <View style={styles.emptyCard}>
                <BarChart3 size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>Loading analytics…</Text>
              </View>
            ) : loadError ? (
              <View style={styles.emptyCard}>
                <BarChart3 size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>Could not load analytics</Text>
                <Text style={styles.emptyText}>{loadError}</Text>
              </View>
            ) : byService.length === 0 ? (
              <View style={styles.emptyCard}>
                <BarChart3 size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No services yet</Text>
                <Text style={styles.emptyText}>Your department has no queue services configured.</Text>
              </View>
            ) : (
              <View style={styles.perfList}>
                {byService.map((row) => (
                  <View key={row.service} style={styles.perfCard}>
                    <Text style={styles.perfService}>{row.service}</Text>
                    <View style={styles.perfMetricsGrid}>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>Students Served</Text>
                        <Text style={[styles.perfMetricValue, { color: '#3b82f6' }]}>{row.studentsServed}</Text>
                      </View>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>Overtime Queues</Text>
                        <Text style={[styles.perfMetricValue, { color: '#f59e0b' }]}>{row.overtimeQueues}</Text>
                      </View>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>No-Shows</Text>
                        <Text style={[styles.perfMetricValue, { color: '#ef4444' }]}>{row.noShows}</Text>
                      </View>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>Avg Wait</Text>
                        <Text style={styles.perfMetricValue}>
                          {row.avgWaitMinutes > 0 ? `${row.avgWaitMinutes} min` : '—'}
                        </Text>
                      </View>
                    </View>
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

      {/* Filter Options Modal (Time Range / Service Type) */}
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
                    onPress={() => chooseOption(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  success: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#22c55e',
  success: '#10b981',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  headerBg: 'rgba(255, 255, 255, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#1e293b',
  subtext: '#64748b',
  tertiary: '#64748b',
  primary: '#15803d',
  success: '#059669',
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

    scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Shared card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 18,
      gap: 12,
    },
    cardTitleText: { fontSize: 15, fontWeight: '800', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.tertiary, marginTop: 2 },

    // Filters
    filtersHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
    filtersActionsRow: { flexDirection: 'row', gap: 10 },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    outlineBtnText: { fontSize: 12, fontWeight: '600', color: theme.text },
    outlineBtnDisabled: { opacity: 0.5 },
    filterField: { gap: 6 },
    filterLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    filterSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    statCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1 },
    statCardValue: { fontSize: 22, fontWeight: '800' },
    statCardValueText: { fontSize: 16 },
    statCardSub: { fontSize: 11, color: theme.tertiary },
    // Peak Hour's value is text ("2:00 PM - 3:00 PM"), not a number, so it
    // gets the full row width instead of sharing the 47% two-up grid slot.
    statCardWide: { width: '100%' },

    // Service breakdown list (matches web's flat aqa-svc-list, replacing the
    // old Performance/Trends/Insights tabbed view)
    perfList: { gap: 12 },
    perfCard: {
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    perfService: { fontSize: 14, fontWeight: '700', color: theme.text },
    perfMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    perfMetric: { width: '45%', gap: 3 },
    perfMetricLabel: { fontSize: 10.5, color: theme.tertiary },
    perfMetricValue: { fontSize: 14, fontWeight: '700', color: theme.text },

    // Empty state
    emptyCard: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 32,
    },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    emptyText: { fontSize: 12, color: theme.subtext },

    // Nav drawer
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

    // Confirm / filter modals (shared card look)
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
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    confirmDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
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
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

    // Filter options modal
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
    },
    filterOptionRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.primary, fontWeight: '700' },
  });
}
