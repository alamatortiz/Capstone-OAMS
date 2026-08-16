import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Image,
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
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  History,
  Home as HomeIcon,
  Search,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';

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

// ─── Field shapes documented here mirror what The real server route,
// GET /api/admin/transactions (adminRoutes.js), is scoped strictly to the
// signed-in admin's own department — it UNIONs queue/appointment/document
// history for that one department only, with no cross-college listing. So
// unlike the design-mockup AdminTransactionsPage.tsx (a "Comprehensive /
// system-wide" view across all six colleges), this mirrors the actual wired
// admin-transactions.jsx: one department's transaction log only. ───
type TxType = 'queue' | 'appointment' | 'document' | 'submission';
type TxStatus = string;

interface Transaction {
  id: string;
  type: TxType;
  action: string;
  studentName: string;
  studentId: string;
  requesterType?: 'student' | 'faculty';
  processor: string;
  details: string;
  status: TxStatus;
  timestamp: string;
}

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

const TYPE_META: Record<TxType, { label: string; icon: LucideIconType; bg: string; border: string; color: string }> = {
  queue: { label: 'Queue', icon: Clock, bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  appointment: { label: 'Appointment', icon: Calendar, bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' },
  document: { label: 'Document', icon: FileText, bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316' },
  // Shares document's visual family -- opposite direction, already
  // disambiguated by the "Sent Document" label and action text.
  submission: { label: 'Sent Document', icon: FileText, bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316' },
};

const STATUS_META: Record<string, { label: string; bg: string; border: string; color: string }> = {
  completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  approved: { label: 'Approved', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  generated: { label: 'Ready', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  released: { label: 'Released', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  claimed: { label: 'Claimed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  no_show: { label: 'No Show', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
};
const DEFAULT_STATUS_META = { label: 'Unknown', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)', color: '#6b7280' };

type TypeFilter = 'all' | TxType;
type StatusFilter = 'all' | TxStatus;
type DateFilter = 'today' | 'week' | 'month' | 'all';
type SelectField = 'type' | 'status' | 'date' | null;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'queue', label: 'Queue' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'document', label: 'Document' },
  { value: 'submission', label: 'Sent Document' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const PAGE_SIZE = 20;

export default function AdminTransactionsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const [page, setPage] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ total: 0, queue: 0, appointments: 0, documents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';
  const adminDepartmentAbbrev = user?.departmentAbbrev ?? '';

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/transactions', {
        params: { type: filterType, status: filterStatus, range: dateRange },
      });
      setTransactions(
        (data.transactions ?? []).map((t: any) => ({
          id: t.id,
          type: t.type,
          action: t.action,
          studentName: t.studentName,
          studentId: t.studentId,
          requesterType: t.requesterType,
          processor: t.processor,
          details: t.details,
          status: t.status,
          timestamp: t.timestamp,
        })),
      );
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchTransactions();
    const events = [
      'queue:called',
      'queue:served',
      'queue:no-show',
      'queue:student-joined',
      'queue:student-left',
      'appointment:status-updated',
      'document:status-updated',
      'document:cancelled',
    ];
    events.forEach((event) => socket.on(event, refetch));
    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [user, token, fetchTransactions]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'transactions') return;
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

  const filteredTransactions = transactions.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.studentName.toLowerCase().includes(q) ||
      t.studentId.toLowerCase().includes(q) ||
      t.processor.toLowerCase().includes(q) ||
      t.details.toLowerCase().includes(q);
    return matchesSearch;
  });

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterType, filterStatus, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedTransactions = filteredTransactions.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const STAT_TINTS = {
    total: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: theme.primary },
    queue: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
    appointments: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' },
    documents: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316' },
  } as const;

  const statCards: { key: keyof typeof stats; label: string; icon: LucideIconType }[] = [
    { key: 'total', label: 'Total Transactions', icon: Activity },
    { key: 'queue', label: 'Queue Services', icon: Users },
    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'documents', label: 'Documents', icon: FileText },
  ];

  const selectOptions =
    selectField === 'type' ? TYPE_OPTIONS : selectField === 'status' ? STATUS_OPTIONS : DATE_OPTIONS;
  const selectTitle =
    selectField === 'type' ? 'Select Type' : selectField === 'status' ? 'Select Status' : 'Select Date Range';
  const selectCurrentValue =
    selectField === 'type' ? filterType : selectField === 'status' ? filterStatus : dateRange;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? 'All Types';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label ?? 'All Status';
  const dateLabel = DATE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'All Time';

  const chooseOption = (value: string) => {
    if (selectField === 'type') setFilterType(value as TypeFilter);
    else if (selectField === 'status') setFilterStatus(value as StatusFilter);
    else if (selectField === 'date') setDateRange(value as DateFilter);
    setSelectField(null);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
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
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Activity size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Transaction Logs</Text>
              <Text style={styles.pageSubtitle}>
                View transaction logs for {adminDepartmentName}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {statCards.map((stat) => {
              const tint = STAT_TINTS[stat.key];
              return (
                <View key={stat.key} style={[styles.statCard, { borderColor: tint.border }]}>
                  <View style={styles.statCardTop}>
                    <Text style={styles.statCardLabel}>{stat.label}</Text>
                    <stat.icon size={18} color={tint.color} />
                  </View>
                  <Text style={[styles.statCardValue, { color: tint.color }]}>{stats[stat.key]}</Text>
                </View>
              );
            })}
          </View>

          {/* Filters */}
          <View style={styles.card}>
            <Text style={styles.cardTitleText}>Transaction Log</Text>
            <Text style={styles.cardSubtitleText}>
              Complete history of activity in {adminDepartmentAbbrev}
            </Text>

            <View style={styles.filterField}>
              <View style={styles.searchWrapper}>
                <Search size={16} color={theme.tertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by student, processor, or details..."
                  placeholderTextColor={theme.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <Pressable style={[styles.filterSelect, styles.filterSelectHalf]} onPress={() => setSelectField('type')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{typeLabel}</Text>
                <ChevronDown size={16} color={theme.primary} />
              </Pressable>
              <Pressable style={[styles.filterSelect, styles.filterSelectHalf]} onPress={() => setSelectField('status')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{statusLabel}</Text>
                <ChevronDown size={16} color={theme.primary} />
              </Pressable>
            </View>

            <Pressable style={styles.filterSelect} onPress={() => setSelectField('date')}>
              <Text style={styles.filterSelectText} numberOfLines={1}>{dateLabel}</Text>
              <ChevronDown size={16} color={theme.primary} />
            </Pressable>
          </View>

          {/* Transaction List */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.emptyTitle}>Loading transactions…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Activity size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable style={styles.filterSelect} onPress={fetchTransactions}>
                <Text style={styles.filterSelectText}>Retry</Text>
              </Pressable>
            </View>
          ) : filteredTransactions.length > 0 ? (
            <View style={styles.txList}>
              {pagedTransactions.map((t) => {
                const typeMeta = TYPE_META[t.type];
                const statusMeta = STATUS_META[t.status] ?? DEFAULT_STATUS_META;
                return (
                  <View key={t.id} style={styles.txCard}>
                    <View style={styles.txBadgesRow}>
                      <View style={[styles.txBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.border }]}>
                        <Text style={[styles.txBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                      </View>
                      <View style={[styles.txBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                        <Text style={[styles.txBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                      </View>
                    </View>

                    <Text style={styles.txAction}>{t.action}</Text>

                    <View style={styles.txStudentRow}>
                      <Users size={14} color={theme.tertiary} />
                      <Text style={styles.txStudentName}>{t.studentName}</Text>
                      <Text style={styles.txStudentId}>({t.studentId})</Text>
                      {t.requesterType === 'faculty' && (
                        <View style={styles.facultyBadge}>
                          <Text style={styles.facultyBadgeText}>Faculty</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.txDetails}>{t.details}</Text>
                    <Text style={styles.txProcessor}>Processed by: {t.processor}</Text>

                    <View style={styles.txMetaRow}>
                      <Calendar size={13} color={theme.tertiary} />
                      <Text style={styles.txMetaText}>{t.timestamp}</Text>
                    </View>
                  </View>
                );
              })}

              {totalPages > 1 && (
                <View style={styles.pagerRow}>
                  <Pressable
                    style={[styles.pagerBtn, safePage === 0 && styles.pagerBtnDisabled]}
                    onPress={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft size={16} color={safePage === 0 ? theme.tertiary : theme.text} />
                    <Text style={[styles.pagerBtnText, safePage === 0 && styles.pagerBtnTextDisabled]}>Prev</Text>
                  </Pressable>
                  <Text style={styles.pagerLabel}>
                    Page {safePage + 1} of {totalPages}
                  </Text>
                  <Pressable
                    style={[styles.pagerBtn, safePage >= totalPages - 1 && styles.pagerBtnDisabled]}
                    onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                  >
                    <Text style={[styles.pagerBtnText, safePage >= totalPages - 1 && styles.pagerBtnTextDisabled]}>Next</Text>
                    <ChevronRight
                      size={16}
                      color={safePage >= totalPages - 1 ? theme.tertiary : theme.text}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Activity size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyDescription}>Try adjusting your search or filters</Text>
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
        adminName={adminName}
        adminRole={adminRole}
        adminDepartmentName={adminDepartmentName}
      />

      {/* Filter Options Modal (Type / Status / Date) */}
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

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  adminName,
  adminRole,
  adminDepartmentName,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
  adminRole: string;
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
              <Text style={styles.drawerRoleBadgeText}>{adminRole}</Text>
            </View>
            <Text style={styles.drawerCollege}>{adminDepartmentName}</Text>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => {
              const active = item.key === 'transactions';
              return (
                <Pressable
                  key={item.key}
                  style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                  onPress={() => onNavPress(item.key)}
                >
                  <item.icon size={18} color={active ? '#ffffff' : theme.subtext} />
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  blue: string;
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
  blue: '#3b82f6',
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

    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

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
    statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1, marginRight: 6 },
    statCardValue: { fontSize: 24, fontWeight: '800' },

    // Shared card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 18,
      gap: 14,
    },
    cardTitleText: { fontSize: 17, fontWeight: '800', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.tertiary, marginTop: -8 },

    // Filters
    filterField: { gap: 6 },
    searchWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
    searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingLeft: 40,
      paddingRight: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },
    filterRow: { flexDirection: 'row', gap: 10 },
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
    filterSelectHalf: { flex: 1 },
    filterSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },

    // Transaction list
    txList: { gap: 12 },
    txCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    txBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    txBadge: { borderWidth: 1, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    txBadgeText: { fontSize: 10, fontWeight: '700' },
    txAction: { fontSize: 15, fontWeight: '700', color: theme.text },
    txStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    txStudentName: { fontSize: 13, fontWeight: '600', color: theme.text },
    txStudentId: { fontSize: 12, color: theme.tertiary },
    facultyBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.35)',
    },
    facultyBadgeText: { fontSize: 10, fontWeight: '700', color: '#8b5cf6' },
    txDetails: { fontSize: 13, color: theme.subtext, lineHeight: 18 },
    txProcessor: { fontSize: 11, color: theme.tertiary },
    txMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    txMetaText: { fontSize: 11, color: theme.tertiary, fontWeight: '600' },

    // Pagination
    pagerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    pagerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    pagerBtnDisabled: { opacity: 0.5 },
    pagerBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },
    pagerBtnTextDisabled: { color: theme.tertiary },
    pagerLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },

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
    drawerRoleBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    drawerRoleBadgeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
    drawerCollege: { fontSize: 12, fontWeight: '500', color: theme.subtext },
    drawerNav: { flex: 1, marginTop: 28, gap: 4 },
    drawerNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
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
    confirmIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    confirmDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
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
      marginBottom: 2,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.primary, fontWeight: '700' },
  });
}
