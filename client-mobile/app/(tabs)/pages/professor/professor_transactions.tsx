import { useState, useEffect, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import type { ComponentProps } from 'react';
import {
  Alert,
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
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell from '@/components/NotificationBell';
import { PROFESSOR_NOTIFICATION_PATHS, PROFESSOR_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

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

// ─── Field shapes documented here mirror what GET /professor/transactions
// really returns (type, status, studentName/studentId for appointment rows,
// trackingNumber for document rows, description, date) — this screen ports
// the actual wired prof-transactions.jsx/.css 1:1: stat tiles now come from
// the separate, unfiltered GET /professor/transactions/stats endpoint
// (matching web's post-370fb32 behavior), search + type/status filters, and
// per-item type+status badges. Queue was dropped from the type union
// entirely -- the backend's /professor/transactions handler only ever
// queries appointments + faculty_document_requests, it never returns a
// queue-type row for this role. On mobile the two <select> dropdowns become
// modal pickers, same pattern as the other professor screens. ───
type TxnType = 'appointment' | 'document' | 'submission';
type TxnStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'generated'
  | 'released'
  | 'claimed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'no_show';

interface TransactionRecord {
  id: string;
  type: TxnType;
  status: TxnStatus;
  studentName?: string;
  studentId?: string;
  trackingNumber?: string;
  details: string;
  date: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
  { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'time-outline' },
];

const TYPE_META: Record<TxnType, { label: string; icon: IoniconName; bg: string; border: string; color: string }> = {
  appointment: { label: 'Appointment', icon: 'calendar-outline', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' },
  document: { label: 'Document', icon: 'document-text-outline', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', color: '#fb923c' },
  // Shares document's visual family -- opposite direction, disambiguated by
  // the "Document Submission: ..." title text from the server.
  submission: { label: 'Document Submission', icon: 'document-text-outline', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', color: '#fb923c' },
};

const STATUS_META: Record<TxnStatus, { label: string; bg: string; border: string; color: string }> = {
  completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  approved: { label: 'Approved', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
  no_show: { label: 'No Show', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  generated: { label: 'Ready for Pickup', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  released: { label: 'Released', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' },
  claimed: { label: 'Claimed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
};

type TypeFilter = 'all' | TxnType;
type StatusFilter = 'all' | Exclude<TxnStatus, 'no_show'>;
type SelectField = 'type' | 'status' | null;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'document', label: 'Document' },
  { value: 'submission', label: 'Document Submission' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'generated', label: 'Ready for Pickup' },
  { value: 'released', label: 'Released' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Split into two labels (mirrors prof-transactions.jsx's dateLabel/timeLabel
// fields, rendered as two separate meta rows instead of one combined string).
const formatDateOnly = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const formatTimeOnly = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function ProfessorTransactionsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [txStats, setTxStats] = useState({ total: 0, completed: 0, ongoing: 0, thisMonth: 0 });
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/professor/professor_dashboard');

  // Debounced 400ms, mirroring prof-transactions.jsx's own search debounce,
  // so typing doesn't fire a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Guards against out-of-order responses: this fetch's params genuinely
  // change between calls (search/type/status), and it's triggered from four
  // independent sources (filter change, search debounce, and two socket
  // events), so a slower-but-earlier request landing after a newer one could
  // otherwise overwrite the list with results for a filter that's no longer
  // selected (mirrors student_transactions.tsx's own requestIdRef).
  const requestIdRef = useRef(0);

  const fetchTransactions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterType !== 'all') params.filterType = filterType;
      if (filterStatus !== 'all') params.filterStatus = filterStatus;
      const { data } = await api.get('/professor/transactions', { params });
      if (requestId !== requestIdRef.current) return;
      setTransactions(
        (data ?? []).map((t: any) => ({
          id: String(t.id),
          type: t.type,
          status: t.status,
          studentName: t.studentName,
          studentId: t.studentId,
          trackingNumber: t.trackingNumber,
          details: t.description ?? '',
          date: t.date,
        })),
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Fetch transactions error:', err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, filterType, filterStatus]);

  // Stats come from the professor's FULL unfiltered history, computed
  // server-side, so the stat cards never reflect whatever search/type/status
  // filter happens to be active (mirrors prof-transactions.jsx's own split).
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/professor/transactions/stats');
      setTxStats(data);
    } catch (err) {
      console.error('Fetch transaction stats error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetchAll = () => { fetchTransactions(); fetchStats(); };
    const events = [
      'appointment:status-updated',
      'document:status-updated',
      'document:cancelled',
      'queue:called',
      'queue:served',
      'queue:no-show',
    ];
    events.forEach((event) => socket.on(event, refetchAll));
    return () => {
      events.forEach((event) => socket.off(event, refetchAll));
    };
  }, [user, token, fetchTransactions, fetchStats]);

  const handleExport = async () => {
    if (filtered.length === 0 || exporting) return;
    setExporting(true);
    try {
      const header = ['Type', 'Status', 'Details', 'Student/Tracking', 'Date', 'Time'];
      const rows = filtered.map((t) => [
        TYPE_META[t.type].label,
        STATUS_META[t.status].label,
        t.details,
        t.type === 'document' || t.type === 'submission' ? t.trackingNumber ?? '' : `${t.studentName ?? ''} (${t.studentId ?? ''})`,
        formatDateOnly(t.date),
        formatTimeOnly(t.date),
      ]);
      const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
      const fileName = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, csv);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (err) {
      console.error('Export transactions error:', err);
      Toast.show({ type: 'error', text1: 'Could not export transactions.' });
    } finally {
      setExporting(false);
    }
  };

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'transactions') return;
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'announcements') { router.push('/pages/professor/professor_announcement'); return; }
    if (key === 'appointments') { router.push('/pages/professor/professor_appointment'); return; }
    if (key === 'documents') { router.push('/pages/professor/professor_documents'); return; }
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  // Server already applies search/type/status filtering.
  const filtered = transactions;

  const selectOptions = selectField === 'type' ? TYPE_OPTIONS : STATUS_OPTIONS;
  const selectTitle = selectField === 'type' ? 'Filter by Type' : 'Filter by Status';
  const selectCurrentValue = selectField === 'type' ? filterType : filterStatus;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? 'All Types';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label ?? 'All Status';

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
              endpointBase="professor"
              theme={theme}
              typePaths={PROFESSOR_NOTIFICATION_PATHS}
              viewAllPath={PROFESSOR_NOTIFICATIONS_VIEW_ALL}
            />
            <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Ionicons name="pulse-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Transaction History</Text>
              <Text style={styles.pageSubtitle}>View all your activities and transactions</Text>
            </View>
          </View>

          {/* Stats Grid -- unfiltered, server-computed via /transactions/stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <Ionicons name="pulse-outline" size={18} color="#3b82f6" />
              </View>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>{txStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
              </View>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{txStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
                <Ionicons name="time-outline" size={18} color="#f97316" />
              </View>
              <Text style={[styles.statValue, { color: '#f97316' }]}>{txStats.ongoing}</Text>
              <Text style={styles.statLabel}>Ongoing</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                <Ionicons name="calendar-outline" size={18} color="#22c55e" />
              </View>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{txStats.thisMonth}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersCard}>
            <View style={styles.filtersHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filtersTitle}>Transaction Filter</Text>
                <Text style={styles.filtersDescription}>Search and filter transactions</Text>
              </View>
              <Pressable
                style={[styles.exportBtn, filtered.length === 0 && styles.exportBtnDisabled]}
                onPress={handleExport}
                disabled={filtered.length === 0 || exporting}
              >
                <Ionicons name="download-outline" size={14} color={theme.text} />
                <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export'}</Text>
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Search</Text>
              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={16} color={theme.tertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by student name, ID, or details..."
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
                <Ionicons name="chevron-down" size={16} color={theme.primary} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Status</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('status')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{statusLabel}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.primary} />
              </Pressable>
            </View>
          </View>

          {/* Transaction list */}
          {loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyDescription}>Loading transactions...</Text>
            </View>
          ) : filtered.length > 0 ? (
            <View style={styles.txnList}>
              {filtered.map((txn) => {
                const typeMeta = TYPE_META[txn.type];
                const statusMeta = STATUS_META[txn.status];
                const action = `${statusMeta.label} ${typeMeta.label}`;
                return (
                  <View key={txn.id} style={[styles.txnCard, { borderColor: typeMeta.border }]}>
                    <View style={styles.txnHeaderRow}>
                      <View style={[styles.txnIconWrap, { backgroundColor: typeMeta.bg, borderColor: typeMeta.border }]}>
                        <Ionicons name={typeMeta.icon} size={18} color={typeMeta.color} />
                      </View>
                      <View style={styles.txnTitleSection}>
                        <Text style={styles.txnTitle}>{action}</Text>
                        <View style={styles.txnBadgesRow}>
                          <View style={[styles.txnBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.border }]}>
                            <Text style={[styles.txnBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                          </View>
                          <View style={[styles.txnBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                            <Text style={[styles.txnBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {txn.type === 'document' || txn.type === 'submission' ? (
                      txn.trackingNumber && (
                        <View style={styles.txnSubRow}>
                          <Ionicons name="pricetag-outline" size={13} color={theme.tertiary} />
                          <Text style={[styles.txnSubValue, { color: typeMeta.color }]}>{txn.trackingNumber}</Text>
                        </View>
                      )
                    ) : (
                      txn.studentName && (
                        <View style={styles.txnSubRow}>
                          <Ionicons name="person-outline" size={13} color={theme.tertiary} />
                          <Text style={styles.txnSubValue}>{txn.studentName}</Text>
                          <Text style={styles.txnSubMuted}>({txn.studentId})</Text>
                        </View>
                      )
                    )}

                    {txn.details && <Text style={styles.txnDetails}>{txn.details}</Text>}

                    <View style={styles.txnMetaRow}>
                      <View style={styles.txnMetaItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.tertiary} />
                        <Text style={styles.txnMetaText}>{formatDateOnly(txn.date)}</Text>
                      </View>
                      <View style={styles.txnMetaItem}>
                        <Ionicons name="time-outline" size={13} color={theme.tertiary} />
                        <Text style={styles.txnMetaText}>{formatTimeOnly(txn.date)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="pulse-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptyDescription}>You have no transaction records yet.</Text>
            </View>
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
                <Text style={styles.drawerName}>{user?.name ?? 'Faculty'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Professor</Text>
              </View>
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''}</Text>
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
                    <Ionicons name={item.icon} size={18} color={active ? '#ffffff' : theme.subtext} />
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
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
  primary: '#16a34a',
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
  primary: '#166534',
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
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47.5%',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.2)',
      borderRadius: 16,
      padding: 16,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statValue: { fontSize: 26, fontWeight: '800' },
    statLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 6,
      textAlign: 'center',
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
    filtersHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    filtersTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
    filtersDescription: { fontSize: 12, color: theme.tertiary, marginTop: 3 },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      flexShrink: 0,
    },
    exportBtnText: { fontSize: 12, fontWeight: '700', color: theme.text },
    exportBtnDisabled: { opacity: 0.5 },
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

    // Transaction list
    txnList: { gap: 12 },
    txnCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    txnHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    txnIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    txnTitleSection: { flex: 1, gap: 6 },
    txnTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    txnBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    txnBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    txnBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    txnSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txnSubValue: { fontSize: 12.5, fontWeight: '700', color: theme.text },
    txnSubMuted: { fontSize: 12.5, color: theme.tertiary },
    txnDetails: { fontSize: 13, color: theme.subtext, lineHeight: 18 },
    txnMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    txnMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txnMetaText: { fontSize: 11.5, color: theme.tertiary, fontWeight: '600' },

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
