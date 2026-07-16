import { useMemo, useState } from 'react';
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

// ─── Demo data (mobile has no auth/API wiring yet). The real server routes,
// GET /api/admin/document-processing and GET /api/admin/faculty-document-processing
// (adminRoutes.js), are both scoped strictly to the signed-in admin's own
// department (joined through document_services.department_id) — there is no
// cross-college listing, so unlike the design-mockup AdminDocumentsPage.tsx
// this mirrors the actual wired admin-document-processing.jsx: one
// department's requests only, split by a Students/Faculty source toggle.
// Field shapes match what those endpoints really return (trackingNumber,
// requesterIdLabel/Value, neededBy, releasedDate, claimedDate, etc.) —
// faculty requests have no "copies" column, so it isn't rendered for them. ───
const demoAdmin = {
  name: 'Demo Admin',
  role: 'Admin',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type RequestSource = 'student' | 'faculty';
type DocumentStatus = 'pending' | 'processing' | 'ready' | 'released' | 'claimed' | 'rejected';

interface DocumentRequest {
  id: string;
  source: RequestSource;
  trackingNumber: string;
  requesterName: string;
  requesterIdLabel: string;
  requesterIdValue: string;
  college: string;
  documentType: string;
  purpose: string;
  copies?: number;
  requestDate: string;
  neededBy: string | null;
  status: DocumentStatus;
  notes: string;
  releasedDate: string | null;
  claimedDate: string | null;
}

const initialDocuments: DocumentRequest[] = [
  {
    id: '1',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0145',
    requesterName: 'Bea Santos',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200765',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Certificate of Grades',
    purpose: 'Loan Application',
    copies: 1,
    requestDate: '2026-07-16',
    neededBy: '2026-07-24',
    status: 'pending',
    notes: '',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '2',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0142',
    requesterName: 'Juan Dela Cruz',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200123',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Transcript of Records',
    purpose: 'Job Application',
    copies: 2,
    requestDate: '2026-07-15',
    neededBy: '2026-07-20',
    status: 'pending',
    notes: '',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '3',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0139',
    requesterName: 'Maria Garcia',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200456',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Certificate of Grades',
    purpose: 'Scholarship Application',
    copies: 1,
    requestDate: '2026-07-14',
    neededBy: '2026-07-17',
    status: 'processing',
    notes: 'Verifying grades with the registrar',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '4',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0130',
    requesterName: 'Andrei Villanueva',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200432',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Honorable Dismissal',
    purpose: 'University Transfer',
    copies: 1,
    requestDate: '2026-07-11',
    neededBy: '2026-07-30',
    status: 'rejected',
    notes: 'Outstanding library clearance not yet settled',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '5',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0125',
    requesterName: 'Carlos Rodriguez',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200789',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Recommendation Letter',
    purpose: 'Graduate School Application',
    copies: 3,
    requestDate: '2026-07-10',
    neededBy: '2026-07-12',
    status: 'ready',
    notes: 'Letter signed and ready for pickup',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '6',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0118',
    requesterName: 'Lisa Fernandez',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200234',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Certificate of Enrollment',
    purpose: 'Student Visa Application',
    copies: 1,
    requestDate: '2026-07-08',
    neededBy: '2026-07-15',
    status: 'released',
    notes: 'Released to requester',
    releasedDate: '2026-07-16',
    claimedDate: null,
  },
  {
    id: '7',
    source: 'student',
    trackingNumber: 'CCS-DOC-2026-0102',
    requesterName: 'Marco Velasco',
    requesterIdLabel: 'Student ID',
    requesterIdValue: '2200567',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Good Moral Certificate',
    purpose: 'Transfer Credential',
    copies: 1,
    requestDate: '2026-07-05',
    neededBy: null,
    status: 'claimed',
    notes: 'Picked up by requester in person',
    releasedDate: '2026-07-09',
    claimedDate: '2026-07-10',
  },
  {
    id: '8',
    source: 'faculty',
    trackingNumber: 'CCS-FDR-2026-0022',
    requesterName: 'Asst. Prof. Maria Santos',
    requesterIdLabel: 'Employee ID',
    requesterIdValue: 'CCS-FAC-0091',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Service Record',
    purpose: 'Loan Requirement',
    requestDate: '2026-07-13',
    neededBy: '2026-07-18',
    status: 'processing',
    notes: 'Coordinating with HR for signature',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '9',
    source: 'faculty',
    trackingNumber: 'CCS-FDR-2026-0015',
    requesterName: 'Prof. Pedro Reyes',
    requesterIdLabel: 'Employee ID',
    requesterIdValue: 'CCS-FAC-0034',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Certificate of Employment',
    purpose: 'Visa Application',
    requestDate: '2026-07-09',
    neededBy: '2026-07-14',
    status: 'ready',
    notes: 'Certificate signed by the Dean',
    releasedDate: null,
    claimedDate: null,
  },
  {
    id: '10',
    source: 'faculty',
    trackingNumber: 'CCS-FDR-2026-0008',
    requesterName: 'Prof. Ana Mendoza',
    requesterIdLabel: 'Employee ID',
    requesterIdValue: 'CCS-FAC-0058',
    college: demoAdmin.departmentAbbrev,
    documentType: 'Clearance Certificate',
    purpose: 'Retirement Processing',
    requestDate: '2026-07-01',
    neededBy: null,
    status: 'claimed',
    notes: "Claimed at the Dean's Office",
    releasedDate: '2026-07-05',
    claimedDate: '2026-07-06',
  },
];

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

const SOURCES: { id: RequestSource; label: string }[] = [
  { id: 'student', label: 'Students' },
  { id: 'faculty', label: 'Faculty' },
];

const TABS = ['all', 'pending', 'processing', 'ready', 'released', 'claimed', 'rejected'] as const;
type TabKey = (typeof TABS)[number];

type WeekFilter = 'this-week' | 'next-week' | 'this-month' | 'all';
const WEEK_FILTER_OPTIONS: { value: WeekFilter; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

const STAT_TINTS = {
  total: { bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.25)', color: '#f97316' },
  pending: { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' },
  processing: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' },
  ready: { bg: 'rgba(34, 197, 94, 0.16)', border: 'rgba(34, 197, 94, 0.25)', color: '#22c55e' },
} as const;

const STATUS_TINTS: Record<DocumentStatus, { bg: string; border: string; color: string; icon: IoniconName }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b', icon: 'alert-circle-outline' },
  processing: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6', icon: 'time-outline' },
  ready: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e', icon: 'checkmark-circle-outline' },
  released: { bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.35)', color: '#94a3b8', icon: 'checkmark-circle-outline' },
  claimed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981', icon: 'checkmark-circle-outline' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444', icon: 'close-circle-outline' },
};

const DONE_STATUSES: DocumentStatus[] = ['claimed', 'rejected'];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

type ConfirmStatus = 'processing' | 'ready' | 'claimed' | 'rejected';

export default function AdminDocumentProcessingScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [documents, setDocuments] = useState<DocumentRequest[]>(initialDocuments);
  const [source, setSource] = useState<RequestSource>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('all');
  const [weekFilterModalVisible, setWeekFilterModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRequest | null>(null);
  const [processingNotes, setProcessingNotes] = useState('');
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus | null>(null);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'documents') return;
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
    comingSoon();
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    router.replace('/login');
  };

  const handleSourceChange = (id: RequestSource) => {
    setSource(id);
    setActiveTab('all');
    setSearchQuery('');
  };

  // Monday-anchored this-week/next-week windows plus a full current-month
  // window, applied to the requester-set "Needed By" deadline — same pattern
  // as admin-document-processing.jsx's weekDates.
  const weekDates = useMemo(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const buildWeek = (weekOffset: number) =>
      Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(monday);
        dt.setDate(dt.getDate() + weekOffset * 7 + i);
        return toDateStr(dt);
      });
    const y = today.getFullYear();
    const m = today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const thisMonth = Array.from({ length: daysInMonth }, (_, i) => toDateStr(new Date(y, m, i + 1)));
    return { thisWeek: buildWeek(0), nextWeek: buildWeek(1), thisMonth, todayStr: toDateStr(today) };
  }, []);

  const deadlineLabel = (dateString: string | null) => {
    if (!dateString) return null;
    if (weekDates.thisWeek.includes(dateString)) return 'This Week';
    if (weekDates.nextWeek.includes(dateString)) return 'Next Week';
    if (weekDates.thisMonth.includes(dateString)) return 'This Month';
    return null;
  };

  const sourceDocuments = documents.filter((d) => d.source === source);

  const searchFiltered = sourceDocuments.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.trackingNumber.toLowerCase().includes(q) ||
      doc.requesterName.toLowerCase().includes(q) ||
      doc.requesterIdValue.toLowerCase().includes(q)
    );
  });

  const baseFiltered = searchFiltered.filter((doc) => {
    if (weekFilter === 'all') return true;
    if (!doc.neededBy) return false;
    if (weekFilter === 'this-week') return weekDates.thisWeek.includes(doc.neededBy);
    if (weekFilter === 'next-week') return weekDates.nextWeek.includes(doc.neededBy);
    if (weekFilter === 'this-month') return weekDates.thisMonth.includes(doc.neededBy);
    return true;
  });

  const tabCounts: Record<TabKey, number> = {
    all: baseFiltered.length,
    pending: baseFiltered.filter((d) => d.status === 'pending').length,
    processing: baseFiltered.filter((d) => d.status === 'processing').length,
    ready: baseFiltered.filter((d) => d.status === 'ready').length,
    released: baseFiltered.filter((d) => d.status === 'released').length,
    claimed: baseFiltered.filter((d) => d.status === 'claimed').length,
    rejected: baseFiltered.filter((d) => d.status === 'rejected').length,
  };

  const visibleDocuments = activeTab === 'all' ? baseFiltered : baseFiltered.filter((d) => d.status === activeTab);

  const stats = {
    total: sourceDocuments.length,
    pending: sourceDocuments.filter((d) => d.status === 'pending').length,
    processing: sourceDocuments.filter((d) => d.status === 'processing').length,
    ready: sourceDocuments.filter((d) => d.status === 'ready').length,
  };

  const handleViewDetails = (doc: DocumentRequest) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes);
  };

  const handleCloseDetails = () => {
    setSelectedDocument(null);
    setProcessingNotes('');
  };

  const handleUpdateStatus = (newStatus: DocumentStatus) => {
    if (!selectedDocument) return;
    const todayStr = weekDates.todayStr;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === selectedDocument.id
          ? {
              ...d,
              status: newStatus,
              notes: processingNotes,
              releasedDate: newStatus === 'released' ? todayStr : d.releasedDate,
              claimedDate: newStatus === 'claimed' ? todayStr : d.claimedDate,
            }
          : d,
      ),
    );
    handleCloseDetails();
  };

  const runConfirmStatusChange = () => {
    if (!confirmStatus) return;
    handleUpdateStatus(confirmStatus);
    setConfirmStatus(null);
  };

  const confirmMeta: Record<ConfirmStatus, { title: string; description: string; confirmLabel: string; icon: IoniconName; color: string }> | null =
    selectedDocument && {
      processing: {
        title: 'Start Processing?',
        description: `Start processing the ${selectedDocument.documentType} request for ${selectedDocument.requesterName}?`,
        confirmLabel: 'Start Processing',
        icon: 'time-outline',
        color: '#3b82f6',
      },
      ready: {
        title: 'Mark as Ready?',
        description: `Mark the ${selectedDocument.documentType} request for ${selectedDocument.requesterName} as ready for pickup?`,
        confirmLabel: 'Mark as Ready',
        icon: 'checkmark-circle-outline',
        color: '#22c55e',
      },
      rejected: {
        title: 'Reject Request?',
        description: `Reject the ${selectedDocument.documentType} request from ${selectedDocument.requesterName}? This action cannot be undone.`,
        confirmLabel: 'Reject Request',
        icon: 'close-circle-outline',
        color: '#ef4444',
      },
      claimed: {
        title: 'Mark as Claimed?',
        description: `Confirm that the ${selectedDocument.documentType} request for ${selectedDocument.requesterName} has been handed to the correct recipient, per office procedure?`,
        confirmLabel: 'Mark as Claimed',
        icon: 'checkmark-circle-outline',
        color: '#10b981',
      },
    };

  const activeConfirmMeta = confirmStatus && confirmMeta ? confirmMeta[confirmStatus] : null;

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
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
              <Ionicons name="document-text-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Document Processing</Text>
              <Text style={styles.pageSubtitle}>Process and manage document requests for {demoAdmin.departmentName}</Text>
            </View>
          </View>

          {/* Source toggle */}
          <View style={styles.sourceToggle}>
            {SOURCES.map((s) => {
              const active = source === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.sourceBtn, active && styles.sourceBtnActive]}
                  onPress={() => handleSourceChange(s.id)}
                >
                  <Text style={[styles.sourceBtnText, active && styles.sourceBtnTextActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {(
              [
                { key: 'total', label: 'Total Requests', value: String(stats.total), icon: 'document-text-outline' as IoniconName },
                { key: 'pending', label: 'Pending', value: String(stats.pending), icon: 'alert-circle-outline' as IoniconName },
                { key: 'processing', label: 'Processing', value: String(stats.processing), icon: 'time-outline' as IoniconName },
                { key: 'ready', label: 'Ready', value: String(stats.ready), icon: 'checkmark-circle-outline' as IoniconName },
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

          {/* Search + Week filter */}
          <View style={styles.card}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tracking number, name, or ID..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable style={styles.filterSelect} onPress={() => setWeekFilterModalVisible(true)}>
              <Ionicons name="calendar-outline" size={14} color={theme.tertiary} />
              <Text style={styles.filterSelectText}>
                {WEEK_FILTER_OPTIONS.find((o) => o.value === weekFilter)?.label ?? 'All'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
            </Pressable>
          </View>

          {/* Documents */}
          <View style={styles.card}>
            <Text style={styles.cardTitleText}>Document Requests</Text>
            <Text style={styles.cardSubtitleText}>Tracking and workflow management for {demoAdmin.departmentAbbrev}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <View style={styles.tabsList}>
                {TABS.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.tabTrigger, active && styles.tabTriggerActive]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[styles.tabTriggerText, active && styles.tabTriggerTextActive]}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                      <View style={[styles.tabCount, active && styles.tabCountActive]}>
                        <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                          {tabCounts[tab]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {visibleDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No documents found</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {visibleDocuments.map((doc) => {
                  const statusTint = STATUS_TINTS[doc.status];
                  const isOverdue = !!doc.neededBy && !DONE_STATUSES.includes(doc.status) && doc.neededBy < weekDates.todayStr;
                  const label = deadlineLabel(doc.neededBy);
                  return (
                    <View key={doc.id} style={styles.docCard}>
                      <View style={styles.docCardHeaderRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.collegeBadge}>
                            <Ionicons name="business-outline" size={13} color="#f97316" />
                            <Text style={styles.collegeBadgeText}>{doc.college}</Text>
                            <Text style={styles.trackingText}>{doc.trackingNumber}</Text>
                          </View>
                          <View style={styles.requesterInfoRow}>
                            <Ionicons name="person-outline" size={15} color={theme.tertiary} />
                            <Text style={styles.requesterName}>{doc.requesterName}</Text>
                            <Text style={styles.requesterId}>({doc.requesterIdValue})</Text>
                          </View>
                          <Text style={styles.docTypeText}>{doc.documentType}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                          <Ionicons name={statusTint.icon} size={12} color={statusTint.color} />
                          <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.docDetailsGrid}>
                        <View style={styles.docDetailItem}>
                          <Text style={styles.docDetailLabel}>Purpose</Text>
                          <Text style={styles.docDetailValue}>{doc.purpose}</Text>
                        </View>
                        <View style={styles.docDetailItem}>
                          <Text style={styles.docDetailLabel}>Requested</Text>
                          <Text style={styles.docDetailValue}>{formatDisplayDate(doc.requestDate)}</Text>
                        </View>
                        {doc.neededBy && (
                          <View style={styles.docDetailItem}>
                            <Text style={styles.docDetailLabel}>{isOverdue ? 'Overdue' : 'Needed By'}</Text>
                            <Text style={[styles.docDetailValue, isOverdue && { color: '#ef4444' }]}>
                              {formatDisplayDate(doc.neededBy)}
                              {label ? ` (${label})` : ''}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.docCardFooter}>
                        <Pressable style={styles.viewProcessBtn} onPress={() => handleViewDetails(doc)}>
                          <Ionicons name="eye-outline" size={14} color="#ffffff" />
                          <Text style={styles.viewProcessBtnText}>View & Process</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
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
      />

      {/* Week filter modal */}
      <Modal visible={weekFilterModalVisible} animationType="fade" transparent onRequestClose={() => setWeekFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.confirmTitle}>Filter by Deadline</Text>
            {WEEK_FILTER_OPTIONS.map((opt) => {
              const selected = opt.value === weekFilter;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                  onPress={() => {
                    setWeekFilter(opt.value);
                    setWeekFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>{opt.label}</Text>
                  {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </Pressable>
              );
            })}
            <Pressable style={styles.cancelBtn} onPress={() => setWeekFilterModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Details / process modal */}
      <Modal visible={!!selectedDocument} animationType="fade" transparent onRequestClose={handleCloseDetails}>
        {selectedDocument && (
          <View style={styles.modalOverlay}>
            <View style={styles.detailsModalCard}>
              <View style={styles.detailsModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsModalTitle}>Document Request Details</Text>
                  <Text style={styles.detailsModalSubtitle}>Review and process this request</Text>
                </View>
                <Pressable onPress={handleCloseDetails} hitSlop={8}>
                  <Ionicons name="close-outline" size={22} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.detailsModalBody}>
                <View style={styles.detailsStatusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_TINTS[selectedDocument.status].bg, borderColor: STATUS_TINTS[selectedDocument.status].border },
                    ]}
                  >
                    <Ionicons name={STATUS_TINTS[selectedDocument.status].icon} size={12} color={STATUS_TINTS[selectedDocument.status].color} />
                    <Text style={[styles.statusBadgeText, { color: STATUS_TINTS[selectedDocument.status].color }]}>
                      {selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.detailsTracking}>{selectedDocument.trackingNumber}</Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsField}>
                    <Text style={styles.detailsLabel}>Name</Text>
                    <Text style={styles.detailsValue}>{selectedDocument.requesterName}</Text>
                  </View>
                  <View style={styles.detailsField}>
                    <Text style={styles.detailsLabel}>{selectedDocument.requesterIdLabel}</Text>
                    <Text style={styles.detailsValue}>{selectedDocument.requesterIdValue}</Text>
                  </View>
                  <View style={styles.detailsField}>
                    <Text style={styles.detailsLabel}>College</Text>
                    <Text style={styles.detailsValue}>{selectedDocument.college}</Text>
                  </View>
                  <View style={styles.detailsField}>
                    <Text style={styles.detailsLabel}>Document Type</Text>
                    <Text style={styles.detailsValue}>{selectedDocument.documentType}</Text>
                  </View>
                  {selectedDocument.copies != null && (
                    <View style={styles.detailsField}>
                      <Text style={styles.detailsLabel}>Copies</Text>
                      <Text style={styles.detailsValue}>{selectedDocument.copies}</Text>
                    </View>
                  )}
                  {selectedDocument.neededBy && (
                    <View style={styles.detailsField}>
                      <Text style={styles.detailsLabel}>Needed By</Text>
                      <Text style={styles.detailsValue}>{formatDisplayDate(selectedDocument.neededBy)}</Text>
                    </View>
                  )}
                  <View style={[styles.detailsField, styles.detailsFieldFull]}>
                    <Text style={styles.detailsLabel}>Purpose</Text>
                    <Text style={styles.detailsValue}>{selectedDocument.purpose}</Text>
                  </View>
                  <View style={styles.detailsField}>
                    <Text style={styles.detailsLabel}>Request Date</Text>
                    <Text style={styles.detailsValue}>{formatDisplayDate(selectedDocument.requestDate)}</Text>
                  </View>
                  {selectedDocument.releasedDate && (
                    <View style={styles.detailsField}>
                      <Text style={styles.detailsLabel}>Released Date</Text>
                      <Text style={styles.detailsValue}>{formatDisplayDate(selectedDocument.releasedDate)}</Text>
                    </View>
                  )}
                  {selectedDocument.claimedDate && (
                    <View style={styles.detailsField}>
                      <Text style={styles.detailsLabel}>Claimed Date</Text>
                      <Text style={styles.detailsValue}>{formatDisplayDate(selectedDocument.claimedDate)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.notesWrap}>
                  <Text style={styles.detailsLabel}>Processing Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes about the processing status..."
                    placeholderTextColor={theme.tertiary}
                    value={processingNotes}
                    onChangeText={setProcessingNotes}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.detailsActionsRow}>
                  {selectedDocument.status === 'pending' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnPrimary]} onPress={() => setConfirmStatus('processing')}>
                      <Text style={styles.detailsActionBtnTextPrimary}>Start Processing</Text>
                    </Pressable>
                  )}
                  {selectedDocument.status === 'processing' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnSuccess]} onPress={() => setConfirmStatus('ready')}>
                      <Text style={styles.detailsActionBtnTextPrimary}>Mark as Ready</Text>
                    </Pressable>
                  )}
                  {selectedDocument.status === 'ready' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnPrimary]} onPress={() => handleUpdateStatus('released')}>
                      <Text style={styles.detailsActionBtnTextPrimary}>Mark as Released</Text>
                    </Pressable>
                  )}
                  {selectedDocument.status === 'released' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnSuccess]} onPress={() => setConfirmStatus('claimed')}>
                      <Text style={styles.detailsActionBtnTextPrimary}>Mark as Claimed</Text>
                    </Pressable>
                  )}
                  {(selectedDocument.status === 'pending' || selectedDocument.status === 'processing') && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnDanger]} onPress={() => setConfirmStatus('rejected')}>
                      <Text style={styles.detailsActionBtnTextDanger}>Reject Request</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>

              <View style={styles.detailsModalFooter}>
                <Pressable style={styles.detailsCloseBtn} onPress={handleCloseDetails}>
                  <Text style={styles.detailsCloseBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Status-change confirmation */}
      <Modal visible={!!confirmStatus} animationType="fade" transparent onRequestClose={() => setConfirmStatus(null)}>
        <View style={styles.modalOverlay}>
          {activeConfirmMeta && (
            <View style={styles.confirmModalCard}>
              <View style={[styles.confirmIconCircle, { backgroundColor: `${activeConfirmMeta.color}26` }]}>
                <Ionicons name={activeConfirmMeta.icon} size={26} color={activeConfirmMeta.color} />
              </View>
              <Text style={styles.confirmTitle}>{activeConfirmMeta.title}</Text>
              <Text style={styles.confirmDescription}>{activeConfirmMeta.description}</Text>
              <View style={styles.confirmActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmStatus(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, { backgroundColor: activeConfirmMeta.color }]} onPress={runConfirmStatusChange}>
                  <Text style={styles.confirmBtnText}>{activeConfirmMeta.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          )}
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
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
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
              <Text style={styles.drawerName}>{demoAdmin.name}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>{demoAdmin.role}</Text>
            </View>
            <Text style={styles.drawerCollege}>{demoAdmin.departmentName}</Text>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => {
              const active = item.key === 'documents';
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
  primary: '#22c55e',
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
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Source toggle
    sourceToggle: {
      flexDirection: 'row',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 4,
    },
    sourceBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9 },
    sourceBtnActive: { backgroundColor: '#f97316' },
    sourceBtnText: { fontSize: 13, fontWeight: '700', color: theme.subtext },
    sourceBtnTextActive: { color: '#ffffff' },

    // Stats
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
    cardTitleText: { fontSize: 15, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, marginTop: -8 },

    // Search + filter
    searchWrapper: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
    searchInput: {
      paddingVertical: 12,
      paddingLeft: 36,
      paddingRight: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterSelectText: { fontSize: 12.5, fontWeight: '600', color: theme.text },

    // Tabs
    tabsScroll: { flexGrow: 0 },
    tabsList: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingBottom: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: '#f97316' },
    tabTriggerText: { fontSize: 13, fontWeight: '600', color: theme.subtext },
    tabTriggerTextActive: { color: '#f97316' },
    tabCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
    },
    tabCountActive: { backgroundColor: 'rgba(249, 115, 22, 0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: '#f97316' },
    tabCountTextActive: { color: '#f97316' },

    // Document cards
    cardsList: { gap: 12 },
    emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle: { fontSize: 13, color: theme.tertiary },
    docCard: {
      backgroundColor: 'rgba(249, 115, 22, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(249, 115, 22, 0.3)',
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    docCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    collegeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    collegeBadgeText: { fontSize: 11.5, fontWeight: '700', color: '#f97316' },
    trackingText: { fontSize: 10.5, fontWeight: '700', color: theme.tertiary },
    requesterInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    requesterName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    requesterId: { fontSize: 12, color: theme.tertiary },
    docTypeText: { fontSize: 12.5, fontWeight: '500', color: theme.subtext },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 0.5,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    docDetailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 10,
      backgroundColor: 'rgba(249, 115, 22, 0.06)',
      borderRadius: 10,
    },
    docDetailItem: { width: '46%', gap: 2 },
    docDetailLabel: { fontSize: 9.5, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    docDetailValue: { fontSize: 12.5, fontWeight: '600', color: theme.text },

    docCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(249, 115, 22, 0.2)',
    },
    viewProcessBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#f97316',
    },
    viewProcessBtnText: { fontSize: 12.5, fontWeight: '700', color: '#ffffff' },

    // Details modal
    detailsModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '88%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 16,
    },
    detailsModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    detailsModalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    detailsModalSubtitle: { fontSize: 11.5, color: theme.subtext, marginTop: 3 },
    detailsModalBody: { padding: 18 },
    detailsStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    detailsTracking: { fontSize: 12, color: theme.subtext },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    detailsField: { width: '46%', gap: 3 },
    detailsFieldFull: { width: '100%' },
    detailsLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailsValue: { fontSize: 13, color: theme.text },

    notesWrap: { marginTop: 18, gap: 8 },
    notesInput: {
      minHeight: 90,
      textAlignVertical: 'top',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },

    detailsActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    detailsActionBtn: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      minWidth: 140,
    },
    detailsActionBtnPrimary: { backgroundColor: '#f97316' },
    detailsActionBtnSuccess: { backgroundColor: '#059669' },
    detailsActionBtnDanger: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
    detailsActionBtnTextPrimary: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    detailsActionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

    detailsModalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    detailsCloseBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: theme.iconBtnBg,
      borderWidth: 1,
      borderColor: theme.iconBtnBorder,
    },
    detailsCloseBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },

    // Filter modal
    filterModalCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
      gap: 4,
    },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    filterOptionText: { fontSize: 14, fontWeight: '600', color: theme.text },
    filterOptionTextActive: { color: theme.primary },

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

    // Shared confirm modal chrome
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
    confirmBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
    },
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
  });
}
