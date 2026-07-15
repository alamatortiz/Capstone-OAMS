import { useState } from 'react';
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
import { useRouter } from 'expo-router';

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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors stud-transactions.jsx) ───
const demoStudent = {
  name: 'Demo Student',
  role: 'Student',
  studentNumber: '2300001',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type TxType = 'queue' | 'appointment' | 'document';
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

const TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'queue', title: 'Queue at Registrar Office', college: 'College of Computing Studies', date: '2026-03-27', time: '10:30 AM', status: 'ongoing', details: 'Document request for Certificate of Enrollment' },
  { id: '2', type: 'appointment', title: 'Meeting with Prof. Santos', college: 'College of Computing Studies', date: '2026-03-26', time: '2:00 PM', status: 'completed', details: 'Academic consultation regarding thesis proposal' },
  { id: '3', type: 'document', title: 'Good Moral Certificate Request', college: 'College of Computing Studies', date: '2026-03-25', time: '9:15 AM', status: 'ongoing', details: 'Request submitted for job application' },
  { id: '4', type: 'queue', title: 'Queue at Cashier', college: 'College of Computing Studies', date: '2026-03-24', time: '11:00 AM', status: 'completed', details: 'Payment for tuition fees' },
  { id: '5', type: 'appointment', title: 'Guidance Counseling Session', college: 'College of Computing Studies', date: '2026-03-23', time: '3:00 PM', status: 'completed', details: 'Career guidance and academic planning' },
  { id: '6', type: 'document', title: 'Transcript of Records Request', college: 'College of Computing Studies', date: '2026-03-20', time: '10:00 AM', status: 'completed', details: 'TOR for graduate school application' },
  { id: '7', type: 'queue', title: 'Queue at Library', college: 'College of Computing Studies', date: '2026-03-19', time: '2:30 PM', status: 'cancelled', details: 'Book borrowing request' },
  { id: '8', type: 'appointment', title: 'Department Chair Meeting', college: 'College of Computing Studies', date: '2026-03-18', time: '1:00 PM', status: 'completed', details: 'Discussion about curriculum requirements' },
];

const TYPE_META: Record<TxType, { label: string; icon: IoniconName; bg: string; border: string; color: string }> = {
  queue: { label: 'queue', icon: 'time-outline', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  appointment: { label: 'appointment', icon: 'calendar-outline', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', color: '#a855f7' },
  document: { label: 'document', icon: 'document-text-outline', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
};

const STATUS_META: Record<TxStatus, { label: string; bg: string; border: string; color: string }> = {
  completed: { label: 'completed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  ongoing: { label: 'ongoing', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  cancelled: { label: 'cancelled', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
};

const formatDateShort = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid-outline' },
  { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'queue', label: 'Queue', icon: 'time-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
];

type TypeFilter = 'all' | TxType;
type StatusFilter = 'all' | TxStatus;
type SelectField = 'type' | 'status' | null;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'queue', label: 'Queue' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'document', label: 'Document' },
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
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

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
  const confirmLogout = () => { setLogoutModalVisible(false); router.replace('/login'); };

  const filteredTransactions = TRANSACTIONS.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.details.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const currentMonth = TRANSACTIONS[0]?.date.slice(0, 7);
  const stats: { key: string; label: string; value: number; icon: IoniconName; color: string; bg: string; border: string }[] = [
    { key: 'total', label: 'Total', value: TRANSACTIONS.length, icon: 'list-outline', color: theme.blue, bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
    { key: 'completed', label: 'Completed', value: TRANSACTIONS.filter((t) => t.status === 'completed').length, icon: 'checkmark-circle-outline', color: theme.success, bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
    { key: 'ongoing', label: 'Ongoing', value: TRANSACTIONS.filter((t) => t.status === 'ongoing').length, icon: 'time-outline', color: theme.orange, bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
    { key: 'month', label: 'This Month', value: TRANSACTIONS.filter((t) => t.date.slice(0, 7) === currentMonth).length, icon: 'calendar-outline', color: theme.purple, bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' },
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
              <Ionicons name="trending-up-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Transaction History</Text>
              <Text style={styles.pageSubtitle}>View all your activities and transactions</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Transaction Filter</Text>
            <Text style={styles.filtersDescription}>Search and filter your transactions</Text>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Search</Text>
              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={16} color={theme.tertiary} style={styles.searchIcon} />
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

          {/* Transaction List */}
          {filteredTransactions.length > 0 ? (
            <View style={styles.txList}>
              {filteredTransactions.map((t) => {
                const typeMeta = TYPE_META[t.type];
                const statusMeta = STATUS_META[t.status];
                return (
                  <View key={t.id} style={[styles.txCard, { borderColor: typeMeta.border }]}>
                    <View style={styles.txHeaderRow}>
                      <View style={[styles.txIconWrap, { backgroundColor: typeMeta.bg, borderColor: typeMeta.border }]}>
                        <Ionicons name={typeMeta.icon} size={18} color={typeMeta.color} />
                      </View>
                      <View style={styles.txTitleSection}>
                        <Text style={styles.txTitle}>{t.title}</Text>
                        <View style={styles.txBadgesRow}>
                          <View style={[styles.txBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.border }]}>
                            <Text style={[styles.txBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                          </View>
                          <View style={[styles.txBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                            <Text style={[styles.txBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.txCollege}>{t.college}</Text>
                    <Text style={styles.txDetails}>{t.details}</Text>

                    <View style={styles.txMetaRow}>
                      <View style={styles.txMetaItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.tertiary} />
                        <Text style={styles.txMetaText}>{formatDateShort(t.date)}</Text>
                      </View>
                      <View style={styles.txMetaItem}>
                        <Ionicons name="time-outline" size={13} color={theme.tertiary} />
                        <Text style={styles.txMetaText}>{t.time}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyDescription}>Try adjusting your search or filters</Text>
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
                <Text style={styles.drawerName}>{demoStudent.name}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>{demoStudent.role}</Text>
              </View>
              <Text style={styles.drawerCollege}>{demoStudent.departmentName}</Text>
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
            <Pressable style={styles.logoutCancelBtn} onPress={() => setSelectField(null)}>
              <Text style={styles.logoutCancelBtnText}>Close</Text>
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
    headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerPncLogo: { width: 30, height: 30 },
    headerOamsLogo: { height: 26, width: 76 },
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
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    txTitleSection: { flex: 1, gap: 6 },
    txTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    txBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    txBadge: {
      borderWidth: 1,
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
  });
}
