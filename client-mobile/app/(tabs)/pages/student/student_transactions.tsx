import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import type { ComponentProps } from 'react';
import {
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
  AlertCircle, Calendar, CheckCircle, ChevronDown, ChevronLeft, Clock, FileText, Home as HomeIcon,
  Megaphone, Search, Users, ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

type LucideIconType = typeof ClipboardList;

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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

type TxType = 'queue' | 'appointment' | 'document' | 'submission';
type TxStatus = 'completed' | 'ongoing' | 'cancelled';

interface Transaction {
  id: string;
  type: TxType;
  title: string;
  college: string;
  date: string;
  time: string;
  status: TxStatus;
  details: string;
}

const TYPE_META: Record<TxType, { label: string; icon: LucideIconType; bg: string; border: string; color: string }> = {
  queue: { label: 'queue', icon: Users, bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  appointment: { label: 'appointment', icon: Calendar, bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', color: '#a855f7' },
  document: { label: 'document', icon: FileText, bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
  // Shares document's visual family -- opposite direction, already
  // disambiguated by the "Sent: ..." title text from the server.
  submission: { label: 'sent document', icon: FileText, bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
};

const STATUS_META_DARK: Record<TxStatus, { label: string; bg: string; border: string; color: string }> = {
  completed: { label: 'completed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  ongoing: { label: 'ongoing', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  cancelled: { label: 'cancelled', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
};
const STATUS_META_LIGHT: Record<TxStatus, { label: string; bg: string; border: string; color: string }> = {
  completed: { label: 'completed', bg: 'rgba(5, 150, 105, 0.15)', border: 'rgba(5, 150, 105, 0.3)', color: '#059669' },
  ongoing: { label: 'ongoing', bg: 'rgba(37, 99, 235, 0.15)', border: 'rgba(37, 99, 235, 0.3)', color: '#2563eb' },
  cancelled: { label: 'cancelled', bg: 'rgba(220, 38, 38, 0.15)', border: 'rgba(220, 38, 38, 0.3)', color: '#dc2626' },
};

const formatDateShort = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: HomeIcon },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'queue', label: 'Queue', icon: Users },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: ClipboardList },
];

type TypeFilter = 'all' | TxType;
type StatusFilter = 'all' | TxStatus;
type SelectField = 'type' | 'status' | null;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'queue', label: 'Queue' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'document', label: 'Document' },
  { value: 'submission', label: 'Sent Document' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function StudentTransactionsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [txStats, setTxStats] = useState({ total: 0, completed: 0, ongoing: 0, thisMonth: 0 });
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  // Debounce the search box so every keystroke doesn't trigger a refetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Mirrors `transactions` for the catch block below, without making
  // fetchTransactions depend on (and change identity with) the state itself.
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  // Guards against out-of-order responses: e.g. tapping "Load More" and then
  // changing a filter before that request resolves would otherwise let the
  // stale "Load More" page land after the fresh filtered list and get
  // appended onto it. Each call captures the current token; a response is
  // only applied if its token is still the latest by the time it resolves.
  const requestIdRef = useRef(0);

  // Search/type/status filtering happens server-side (so it considers the
  // student's whole history, not just whatever page is currently loaded).
  // Any change to those filters — including the ones baked into this
  // callback's identity below — resets back to the first page (mirrors
  // student_notifications.tsx: pageNum is always an explicit argument, never
  // read from `page` state, so a filter change re-fires the mount effect
  // below with pageNum=1 with no extra reset logic needed).
  const fetchTransactions = useCallback(async (pageNum = 1) => {
    const requestId = ++requestIdRef.current;
    try {
      if (pageNum > 1) setLoadingMore(true);
      const { data } = await api.get('/student/transactions', {
        params: {
          search: debouncedSearch || undefined,
          type: filterType !== 'all' ? filterType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          limit: 20,
          page: pageNum,
        },
      });
      if (requestId !== requestIdRef.current) return;
      const newTransactions: Transaction[] = data.transactions ?? [];
      setTransactions((prev) => (pageNum > 1 ? [...prev, ...newTransactions] : newTransactions));
      setPage(data.page ?? pageNum);
      setTotalPages(data.totalPages ?? 1);
      if (data.stats) setTxStats(data.stats);
      setTxError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to fetch transactions:', err);
      if (transactionsRef.current.length === 0) {
        setTxError('Could not load your transaction history.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh your transaction history.' });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setTxLoading(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, filterType, filterStatus]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchTransactions(page + 1);
  };

  // Queue events (and document:cancelled) are broadcast department-wide, not
  // just to the affected student, so they're checked against this student's
  // own ID before refetching — otherwise this page would refetch every time
  // ANY student in the department got called/served/etc.
  const handleOwnQueueEvent = useCallback(
    (payload: { studentId?: number | string }) => {
      if (Number(payload?.studentId) === Number(user?.userId)) {
        fetchTransactions(1);
      }
    },
    [fetchTransactions, user?.userId],
  );

  // ── Live updates: refetch when a document/appointment status changes, or
  // one of this student's own queue events fires (mirrors stud-transactions.jsx).
  // Transactions are a historical log, not worth interrupting the user for --
  // refetch silently, no notification. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const refetchFirstPage = () => fetchTransactions(1);
    const ownEvents = ['document:status-updated', 'appointment:status-updated'];
    const deptWideEvents = [
      'queue:called',
      'queue:served',
      'queue:no-show',
      'queue:student-joined',
      'queue:student-left',
      'document:cancelled',
    ];

    ownEvents.forEach((event) => socket.on(event, refetchFirstPage));
    deptWideEvents.forEach((event) => socket.on(event, handleOwnQueueEvent));

    return () => {
      ownEvents.forEach((event) => socket.off(event, refetchFirstPage));
      deptWideEvents.forEach((event) => socket.off(event, handleOwnQueueEvent));
    };
  }, [user, token, fetchTransactions, handleOwnQueueEvent]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(1);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'transactions') return;
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'appointments') { router.push('/pages/student/student_appointments'); return; }
    if (key === 'documents') { router.push('/pages/student/student_documents'); return; }
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  // Search/type/status filtering already happened server-side, so `transactions`
  // is the page to render as-is.
  const stats: { key: string; label: string; value: number; icon: LucideIconType; color: string; bg: string; border: string }[] = [
    { key: 'total', label: 'Total', value: txStats.total, icon: ClipboardList, color: theme.blue, bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.2)' },
    { key: 'completed', label: 'Completed', value: txStats.completed, icon: CheckCircle, color: theme.success, bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.2)' },
    { key: 'ongoing', label: 'Ongoing', value: txStats.ongoing, icon: Clock, color: theme.orange, bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.2)' },
    { key: 'month', label: 'This Month', value: txStats.thisMonth, icon: Calendar, color: theme.success, bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.2)' },
  ];

  const selectOptions = selectField === 'type' ? TYPE_OPTIONS : STATUS_OPTIONS;
  const selectTitle = selectField === 'type' ? 'Select Type' : 'Select Status';
  const selectCurrentValue = selectField === 'type' ? filterType : filterStatus;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? 'All Types';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label ?? 'All Statuses';

  const chooseOption = (value: string) => {
    if (selectField === 'type') setFilterType(value as TypeFilter);
    else if (selectField === 'status') setFilterStatus(value as StatusFilter);
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
              <Image source={isDarkMode ? sunIcon : darkModeIcon} style={styles.iconBtnImg} resizeMode="contain" />
            </Pressable>
            <NotificationBell
              endpointBase="student"
              theme={theme}
              typePaths={STUDENT_NOTIFICATION_PATHS}
              viewAllPath={STUDENT_NOTIFICATIONS_VIEW_ALL}
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
              <ClipboardList size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Transaction History</Text>
              <Text style={styles.pageSubtitle}>View all your activities and transactions.</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                  <stat.icon size={18} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Transaction Filter</Text>
            <Text style={styles.filtersDescription}>Search and filter your transactions.</Text>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Search</Text>
              <View style={styles.searchWrapper}>
                <Search size={16} color={theme.tertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search transactions..."
                  placeholderTextColor={theme.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Type</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('type')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{typeLabel}</Text>
                <ChevronDown size={16} color={theme.primary} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Status</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('status')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{statusLabel}</Text>
                <ChevronDown size={16} color={theme.primary} />
              </Pressable>
            </View>
          </View>

          {/* Transaction List */}
          {txLoading ? (
            <View style={styles.emptyCard}>
              <Search size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Loading transactions…</Text>
            </View>
          ) : txError ? (
            <View style={styles.emptyCard}>
              <AlertCircle size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Could not load transactions</Text>
              <Text style={styles.emptyDescription}>{txError}</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.txList}>
              {transactions.map((t) => {
                const typeMeta = TYPE_META[t.type];
                const statusMeta = isDarkMode ? STATUS_META_DARK[t.status] : STATUS_META_LIGHT[t.status];
                return (
                  <View key={t.id} style={[styles.txCard, { borderColor: typeMeta.border }]}>
                    <View style={styles.txHeaderRow}>
                      <View style={[styles.txIconWrap, { backgroundColor: typeMeta.color }]}>
                        <typeMeta.icon size={18} color="#ffffff" />
                      </View>
                      <View style={styles.txTitleSection}>
                        <Text style={styles.txTitle}>{t.title}</Text>
                        <View style={styles.txBadgesRow}>
                          <View style={[styles.txBadge, { backgroundColor: typeMeta.bg }]}>
                            <Text style={[styles.txBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                          </View>
                          <View style={[styles.txBadge, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.txBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.txCollege}>{t.college}</Text>
                    <Text style={styles.txDetails}>{t.details}</Text>

                    <View style={styles.txMetaRow}>
                      <View style={styles.txMetaItem}>
                        <Calendar size={13} color={theme.tertiary} />
                        <Text style={styles.txMetaText}>{formatDateShort(t.date)}</Text>
                      </View>
                      <View style={styles.txMetaItem}>
                        <Clock size={13} color={theme.tertiary} />
                        <Text style={styles.txMetaText}>{t.time}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <ClipboardList size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptyDescription}>You have no transaction records yet.</Text>
            </View>
          )}

          {!txLoading && !txError && page < totalPages && (
            <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
              <Text style={styles.loadMoreBtnText}>{loadingMore ? 'Loading…' : 'Load More'}</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Nav Drawer */}
      <Modal visible={menuOpen} animationType="fade" transparent onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerOverlay}>
          <SafeAreaView style={styles.drawerPanel} edges={['top', 'bottom']}>
            <View style={styles.drawerProfile}>
              <View style={styles.drawerProfileHeader}>
                <View style={styles.drawerAvatar}>
                  <Ionicons name="person-outline" size={15} color={theme.primary} />
                </View>
                <Text style={styles.drawerName}>{user?.name ?? 'Student'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Student</Text>
              </View>
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''})</Text>
            </View>

            <View style={styles.drawerNav}>
              {navItems.map((item) => {
                const active = item.key === 'transactions';
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                    onPress={() => handleNavPress(item.key)}
                  >
                    <item.icon size={18} color={active ? '#ffffff' : theme.subtext} />
                    <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.drawerLogout} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.drawerLogoutText}>Logout</Text>
            </Pressable>
          </SafeAreaView>
          <Pressable style={styles.drawerBackdrop} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {/* Filter Options Modal (Type / Status) */}
      <Modal visible={selectField !== null} animationType="fade" transparent onRequestClose={() => setSelectField(null)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.logoutModalTitle}>{selectTitle}</Text>
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
            <Pressable style={styles.filterModalClose} onPress={() => setSelectField(null)}>
              <Text style={styles.filterModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Confirm Logout Modal */}
      <Modal visible={logoutModalVisible} animationType="fade" transparent onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            <Text style={styles.logoutModalDescription}>
              Are you sure you want to log out? Any unsaved changes will be lost.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.logoutCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutConfirmBtnText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  primaryDark: string;
  success: string;
  blue: string;
  purple: string;
  orange: string;
  amber: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(34, 197, 94, 0.2)',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#16a34a',
  primaryDark: '#15803d',
  success: '#10b981',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
  amber: '#f59e0b',
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
  primary: '#166534',
  primaryDark: '#14532d',
  success: '#059669',
  blue: '#2563eb',
  purple: '#9333ea',
  orange: '#ea580c',
  amber: '#d97706',
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
      alignItems: 'flex-start',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.2)',
      borderRadius: 16,
      padding: 14,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.tertiary,
      marginTop: 2,
    },

    // Filters card
    filtersCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.15)',
      borderRadius: 18,
      padding: 18,
      gap: 14,
    },
    filtersTitle: { fontSize: 17, fontWeight: '800', color: theme.text, textAlign: 'center' },
    filtersDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', marginTop: -8 },
    filterField: { gap: 6 },
    filterLabel: { fontSize: 12, fontWeight: '700', color: theme.text },
    searchWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
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

    loadMoreBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    loadMoreBtnText: { fontSize: 13, fontWeight: '700', color: theme.primary },

    // Transaction list
    txList: { gap: 12 },
    txCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    txHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    txIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    txTitleSection: { flex: 1, gap: 6 },
    txTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    txBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    txBadge: {
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    txBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    txCollege: { fontSize: 12, color: theme.tertiary },
    txDetails: { fontSize: 13, color: theme.subtext, lineHeight: 18 },
    txMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    txMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    txMetaText: { fontSize: 11, color: theme.tertiary, fontWeight: '600' },

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
    logoutOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },
    logoutModalCard: {
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 24,
    },
    logoutIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      marginBottom: 16,
    },
    logoutModalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    logoutModalDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    logoutModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    logoutCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    logoutCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
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
    logoutConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

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
    filterModalClose: {
      paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4,
    },
    filterModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },
  });
}
