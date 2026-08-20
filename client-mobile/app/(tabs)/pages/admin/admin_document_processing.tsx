import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  History,
  Home as HomeIcon,
  Search,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { notify } from '@/utils/notifications';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import { getHubStatusMeta, normalizeDocStatus, type DocStatus } from '@/utils/documentStatus';

// Mirrors the server's limits (server/middleware/upload.js).
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip',
];

type LucideIconType = typeof Clock;

// Mirrors adm-document-processing.jsx's getStatusMeta() icon choices exactly
// (kept local rather than added to the shared documentStatus.ts util, since
// that util's icon field is still Ionicons-typed and consumed by student/
// professor screens not yet converted to lucide).
const STATUS_ICON: Record<ReturnType<typeof normalizeDocStatus>, LucideIconType> = {
  pending: AlertCircle,
  processing: Clock,
  ready: CheckCircle,
  released: CheckCircle,
  claimed: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle,
};

function getStatusIcon(status: DocStatus): LucideIconType {
  return STATUS_ICON[normalizeDocStatus(status)];
}

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

// ─── Field shapes documented here mirror what The real server routes,
// GET /api/admin/document-processing and GET /api/admin/faculty-document-processing
// (adminRoutes.js), are both scoped strictly to the signed-in admin's own
// department (joined through document_services.department_id) — there is no
// cross-college listing, so unlike the design-mockup AdminDocumentsPage.tsx
// this mirrors the actual wired admin-document-processing.jsx: one
// department's requests only, split by a Students/Faculty source toggle.
// Field shapes match what those endpoints really return (trackingNumber,
// requesterIdLabel/Value, neededBy, releasedDate, claimedDate, etc.) —
// faculty requests have no "copies" column, so it isn't rendered for them. ───
type RequestSource = 'student' | 'faculty' | 'submission';
type DocumentStatus = 'pending' | 'processing' | 'ready' | 'released' | 'claimed' | 'rejected' | 'cancelled';

interface DocumentAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

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
  requiresCoding?: boolean;
  officialCode?: string | null;
  studentFiles?: DocumentAttachment[];
  adminFiles?: DocumentAttachment[];
}

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

const SOURCES: { id: RequestSource; label: string }[] = [
  { id: 'student', label: 'Students' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'submission', label: 'Submissions' },
];

const TABS = ['all', 'pending', 'processing', 'ready', 'released', 'claimed', 'rejected', 'cancelled'] as const;
// Submissions skip 'ready'/'released' -- nothing is physically generated or
// picked up in that direction, so claimed is reached directly from processing.
const SUBMISSION_TABS = ['all', 'pending', 'processing', 'claimed', 'rejected', 'cancelled'] as const;
type TabKey = (typeof TABS)[number];

type WeekFilter = 'this-week' | 'next-week' | 'this-month' | 'all';
const WEEK_FILTER_OPTIONS: { value: WeekFilter; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

const DONE_STATUSES: DocumentStatus[] = ['claimed', 'rejected', 'cancelled'];

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
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<RequestSource>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('all');
  const [weekFilterModalVisible, setWeekFilterModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRequest | null>(null);
  const [processingNotes, setProcessingNotes] = useState('');
  const [officialCode, setOfficialCode] = useState('');
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [returnFiles, setReturnFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';
  const adminDepartmentAbbrev = user?.departmentAbbrev ?? '';

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchDocuments = useCallback(async () => {
    setError(null);
    try {
      const [studentRes, facultyRes, submissionRes] = await Promise.all([
        api.get('/admin/document-processing'),
        api.get('/admin/faculty-document-processing'),
        api.get('/admin/document-submissions'),
      ]);
      const studentDocs: DocumentRequest[] = (studentRes.data.documents ?? []).map((d: any) => ({
        ...d,
        source: 'student' as RequestSource,
      }));
      const facultyDocs: DocumentRequest[] = (facultyRes.data.documents ?? []).map((d: any) => ({
        ...d,
        source: 'faculty' as RequestSource,
      }));
      // The server already prefixes these ids ("sub-42") so they stay
      // collision-safe alongside student/faculty ids if ever merged into one
      // list elsewhere -- handleUpdateStatus/file downloads strip it back
      // off before hitting an endpoint that expects the raw submission_id.
      const submissionDocs: DocumentRequest[] = (submissionRes.data.documents ?? []).map((d: any) => ({
        ...d,
        source: 'submission' as RequestSource,
      }));
      setDocuments([...studentDocs, ...facultyDocs, ...submissionDocs]);
    } catch (err) {
      console.error('Failed to load document requests:', err);
      setError('Failed to load document requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchDocuments();
    const events = ['document:new-request', 'document:cancelled'];
    events.forEach((event) => socket.on(event, refetch));
    const onNewRequest = () => notify('New document request', 'A new document request has come in.');
    socket.on('document:new-request', onNewRequest);
    return () => {
      events.forEach((event) => socket.off(event, refetch));
      socket.off('document:new-request', onNewRequest);
    };
  }, [user, token, fetchDocuments]);

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
    cancelled: baseFiltered.filter((d) => d.status === 'cancelled').length,
  };

  const visibleDocuments = activeTab === 'all' ? baseFiltered : baseFiltered.filter((d) => d.status === activeTab);

  const handleViewDetails = (doc: DocumentRequest) => {
    setSelectedDocument(doc);
    setProcessingNotes(doc.notes);
    setOfficialCode(doc.officialCode || '');
    setReturnFiles([]);
  };

  const handleCloseDetails = () => {
    setSelectedDocument(null);
    setProcessingNotes('');
    setOfficialCode('');
    setReturnFiles([]);
  };

  const pickReturnFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_TYPES, multiple: true });
    if (result.canceled || !result.assets?.length) return;
    let count = returnFiles.length;
    let tooLarge = 0;
    let overBudget = 0;
    const accepted: DocumentPicker.DocumentPickerAsset[] = [];
    for (const asset of result.assets) {
      if (asset.size != null && asset.size > MAX_FILE_BYTES) {
        tooLarge += 1;
        continue;
      }
      if (count + 1 > MAX_FILES) {
        overBudget += 1;
        continue;
      }
      accepted.push(asset);
      count += 1;
    }
    if (accepted.length > 0) setReturnFiles((prev) => [...prev, ...accepted]);
    if (tooLarge > 0) Alert.alert('File too large', `${tooLarge} file(s) skipped — each file must be 10MB or smaller.`);
    if (overBudget > 0) Alert.alert('Attachment limit reached', `You can attach up to ${MAX_FILES} files.`);
  };
  const removeReturnFile = (uri: string) => setReturnFiles((prev) => prev.filter((f) => f.uri !== uri));

  // Mirrors student_document_status.tsx's viewSubmissionFile() -- download to
  // cache then hand off to the OS share sheet.
  const viewSubmissionFile = async (submissionRawId: string, file: DocumentAttachment) => {
    if (downloadingFileId) return;
    setDownloadingFileId(file.id);
    try {
      const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uri = `${FileSystem.cacheDirectory}submission-${submissionRawId}-${file.id}-${safeName}`;
      const result = await FileSystem.downloadAsync(
        `${api.defaults.baseURL}/admin/document-submissions/${submissionRawId}/files/${file.id}`,
        uri,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (result.status < 200 || result.status >= 300) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        Alert.alert('Error', 'Could not open the file.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: file.mimeType ?? undefined });
    } catch (err) {
      console.error('Failed to download file:', err);
      Alert.alert('Error', 'Could not open the file.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleUpdateStatus = async (newStatus: DocumentStatus) => {
    if (!selectedDocument) return;
    const todayStr = weekDates.todayStr;
    const isSubmission = selectedDocument.source === 'submission';
    // GET /admin/document-submissions prefixes ids ("sub-42") so the list
    // stays merge-safe alongside other sources elsewhere -- but the PATCH
    // route itself expects the raw numeric submission_id.
    const rawId = isSubmission ? selectedDocument.id.replace(/^sub-/, '') : selectedDocument.id;
    const endpoint = isSubmission
      ? `/admin/document-submissions/${rawId}/status`
      : selectedDocument.source === 'faculty'
        ? `/admin/faculty-document-processing/${rawId}/status`
        : `/admin/document-processing/${rawId}/status`;
    const needsCode = newStatus === 'ready' && selectedDocument.requiresCoding;
    setUpdating(true);
    try {
      if (isSubmission) {
        const body = new FormData();
        body.append('status', newStatus);
        body.append('notes', processingNotes);
        returnFiles.forEach((asset) => {
          body.append('returnFiles', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType ?? 'application/octet-stream',
          } as any);
        });
        await api.patch(endpoint, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.patch(endpoint, {
          status: newStatus,
          notes: processingNotes,
          ...(needsCode ? { officialCode } : {}),
        });
      }
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDocument.id
            ? {
                ...d,
                status: newStatus,
                notes: processingNotes,
                releasedDate: newStatus === 'released' ? todayStr : d.releasedDate,
                claimedDate: newStatus === 'claimed' ? todayStr : d.claimedDate,
                officialCode: needsCode ? officialCode : d.officialCode,
              }
            : d,
        ),
      );
      handleCloseDetails();
      // Local patch above doesn't know about newly-attached return files --
      // refetch so studentFiles/adminFiles stay accurate for this source.
      if (isSubmission) await fetchDocuments();
    } catch {
      Alert.alert('Error', 'Failed to update document status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAttachReturnFiles = () => {
    if (!selectedDocument || returnFiles.length === 0) return;
    handleUpdateStatus(selectedDocument.status);
  };

  const runConfirmStatusChange = () => {
    if (!confirmStatus) return;
    handleUpdateStatus(confirmStatus);
    setConfirmStatus(null);
  };

  // "Mark as Ready" needs a non-blank official code first when the document
  // type requires coding — caught here before opening the generic confirm
  // dialog, which has no room for inline field validation.
  const handleMarkReadyClick = () => {
    if (selectedDocument?.requiresCoding && !officialCode.trim()) {
      Alert.alert('Missing information', 'Enter the official code before marking this document ready.');
      return;
    }
    setConfirmStatus('ready');
  };

  const confirmMeta: Record<ConfirmStatus, { title: string; description: string; confirmLabel: string; icon: LucideIconType; color: string }> | null =
    selectedDocument && {
      processing: {
        title: 'Start Processing?',
        description: `Start processing the ${selectedDocument.documentType} request for ${selectedDocument.requesterName}?`,
        confirmLabel: 'Start Processing',
        icon: Clock,
        color: '#3b82f6',
      },
      ready: {
        title: 'Mark as Ready?',
        description: `Mark the ${selectedDocument.documentType} request for ${selectedDocument.requesterName} as ready for pickup?`,
        confirmLabel: 'Mark as Ready',
        icon: CheckCircle,
        color: '#22c55e',
      },
      rejected: {
        title: 'Reject Request?',
        description: `Reject the ${selectedDocument.documentType} request from ${selectedDocument.requesterName}? This action cannot be undone.`,
        confirmLabel: 'Reject Request',
        icon: XCircle,
        color: '#ef4444',
      },
      claimed:
        selectedDocument.source === 'submission'
          ? {
              title: 'Mark as Received?',
              description: `Confirm that ${selectedDocument.documentType} from ${selectedDocument.requesterName} has been received and processed by the office?`,
              confirmLabel: 'Mark as Received',
              icon: CheckCircle,
              color: '#10b981',
            }
          : {
              title: 'Mark as Claimed?',
              description: `Confirm that the ${selectedDocument.documentType} request for ${selectedDocument.requesterName} has been handed to the correct recipient, per office procedure?`,
              confirmLabel: 'Mark as Claimed',
              icon: CheckCircle,
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
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
              <FileText size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Document Processing</Text>
              <Text style={styles.pageSubtitle}>Process and manage document requests for {adminDepartmentName}</Text>
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

          {/* Search + Week filter */}
          <View style={styles.card}>
            <View style={styles.searchWrapper}>
              <Search size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tracking number, name, or ID..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable style={styles.filterSelect} onPress={() => setWeekFilterModalVisible(true)}>
              <Calendar size={14} color={theme.tertiary} />
              <Text style={styles.filterSelectText}>
                {WEEK_FILTER_OPTIONS.find((o) => o.value === weekFilter)?.label ?? 'All'}
              </Text>
              <ChevronDown size={14} color={theme.tertiary} />
            </Pressable>
          </View>

          {/* Documents */}
          <View style={styles.card}>
            <Text style={styles.cardTitleText}>Document Requests</Text>
            <Text style={styles.cardSubtitleText}>Tracking and workflow management for {adminDepartmentAbbrev}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <View style={styles.tabsList}>
                {(source === 'submission' ? SUBMISSION_TABS : TABS).map((tab) => {
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

            {loading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color={theme.primary} />
                <Text style={styles.emptyTitle}>Loading document requests…</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyCard}>
                <AlertCircle size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>{error}</Text>
                <Pressable style={styles.viewProcessBtn} onPress={fetchDocuments}>
                  <Text style={styles.viewProcessBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : visibleDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileText size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No documents found</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {visibleDocuments.map((doc) => {
                  const statusTint = getHubStatusMeta(doc.status, isDarkMode);
                  const StatusIcon = getStatusIcon(doc.status);
                  const isOverdue = !!doc.neededBy && !DONE_STATUSES.includes(doc.status) && doc.neededBy < weekDates.todayStr;
                  const label = deadlineLabel(doc.neededBy);
                  return (
                    <View key={doc.id} style={styles.docCard}>
                      <View style={styles.docCardHeaderRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.collegeBadge}>
                            <HomeIcon size={13} color="#f97316" />
                            <Text style={styles.collegeBadgeText}>{doc.college}</Text>
                            <Text style={styles.trackingText}>{doc.trackingNumber}</Text>
                          </View>
                          <View style={styles.requesterInfoRow}>
                            <User size={15} color={theme.tertiary} />
                            <Text style={styles.requesterName}>{doc.requesterName}</Text>
                            <Text style={styles.requesterId}>({doc.requesterIdValue})</Text>
                          </View>
                          <Text style={styles.docTypeText}>{doc.documentType}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                          <StatusIcon size={12} color={statusTint.color} />
                          <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>
                            {statusTint.label}
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
                          <Eye size={14} color="#ffffff" />
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
        adminName={adminName}
        adminRole={adminRole}
        adminDepartmentName={adminDepartmentName}
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
                  <X size={22} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.detailsModalBody}>
                <View style={styles.detailsStatusRow}>
                  {(() => {
                    const meta = getHubStatusMeta(selectedDocument.status, isDarkMode);
                    const StatusIcon = getStatusIcon(selectedDocument.status);
                    return (
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                        <StatusIcon size={12} color={meta.color} />
                        <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    );
                  })()}
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
                    <Text style={styles.detailsLabel}>{selectedDocument.source === 'submission' ? 'Title' : 'Document Type'}</Text>
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
                  {selectedDocument.officialCode && (
                    <View style={styles.detailsField}>
                      <Text style={styles.detailsLabel}>Official Code</Text>
                      <Text style={styles.detailsValue}>{selectedDocument.officialCode}</Text>
                    </View>
                  )}
                </View>

                {selectedDocument.source === 'submission' && (
                  <View style={styles.notesWrap}>
                    <Text style={styles.detailsLabel}>Files from Student</Text>
                    {selectedDocument.studentFiles && selectedDocument.studentFiles.length > 0 ? (
                      <View style={{ gap: 8, marginTop: 6 }}>
                        {selectedDocument.studentFiles.map((f) => (
                          <Pressable
                            key={f.id}
                            style={styles.attachChip}
                            onPress={() => viewSubmissionFile(selectedDocument.id.replace(/^sub-/, ''), f)}
                            disabled={!!downloadingFileId}
                          >
                            <FileText size={14} color="#f97316" />
                            <Text style={styles.attachChipText} numberOfLines={1}>{f.filename}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.detailsValue}>No files attached.</Text>
                    )}

                    <Text style={[styles.detailsLabel, { marginTop: 12 }]}>
                      Return Files ({returnFiles.length}/{MAX_FILES})
                    </Text>
                    {selectedDocument.adminFiles && selectedDocument.adminFiles.length > 0 && (
                      <View style={{ gap: 8, marginTop: 6 }}>
                        {selectedDocument.adminFiles.map((f) => (
                          <Pressable
                            key={f.id}
                            style={styles.attachChip}
                            onPress={() => viewSubmissionFile(selectedDocument.id.replace(/^sub-/, ''), f)}
                            disabled={!!downloadingFileId}
                          >
                            <FileText size={14} color="#f97316" />
                            <Text style={styles.attachChipText} numberOfLines={1}>{f.filename}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {returnFiles.length > 0 && (
                      <View style={{ gap: 8, marginTop: 6 }}>
                        {returnFiles.map((f) => (
                          <View key={f.uri} style={[styles.attachChip, { justifyContent: 'space-between' }]}>
                            <Text style={styles.attachChipText} numberOfLines={1}>{f.name}</Text>
                            <Pressable onPress={() => removeReturnFile(f.uri)} hitSlop={8}>
                              <X size={14} color={theme.tertiary} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                    {(selectedDocument.status === 'pending' || selectedDocument.status === 'processing') && (
                      <Pressable
                        style={[styles.filterSelect, { marginTop: 8 }]}
                        onPress={pickReturnFiles}
                        disabled={returnFiles.length >= MAX_FILES}
                      >
                        <FileText size={14} color="#f97316" />
                        <Text style={styles.filterSelectText}>
                          {returnFiles.length >= MAX_FILES ? 'Attachment limit reached' : 'Add return files'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {selectedDocument.status === 'processing' && selectedDocument.requiresCoding && (
                  <View style={styles.notesWrap}>
                    <Text style={styles.detailsLabel}>Official Code *</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Enter the dean-sanctioned official code for this document"
                      placeholderTextColor={theme.tertiary}
                      value={officialCode}
                      onChangeText={setOfficialCode}
                    />
                  </View>
                )}

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
                  {selectedDocument.status === 'processing' && selectedDocument.source === 'submission' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnSuccess]} onPress={() => setConfirmStatus('claimed')}>
                      <Text style={styles.detailsActionBtnTextPrimary}>Mark as Received</Text>
                    </Pressable>
                  )}
                  {selectedDocument.status === 'processing' && selectedDocument.source !== 'submission' && (
                    <Pressable style={[styles.detailsActionBtn, styles.detailsActionBtnSuccess]} onPress={handleMarkReadyClick}>
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
                  {selectedDocument.source === 'submission' &&
                    (selectedDocument.status === 'pending' || selectedDocument.status === 'processing') && (
                      <Pressable
                        style={[styles.detailsActionBtn, styles.detailsActionBtnPrimary]}
                        onPress={handleAttachReturnFiles}
                        disabled={returnFiles.length === 0}
                      >
                        <Text style={styles.detailsActionBtnTextPrimary}>Attach Files</Text>
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
                <activeConfirmMeta.icon size={26} color={activeConfirmMeta.color} />
              </View>
              <Text style={styles.confirmTitle}>{activeConfirmMeta.title}</Text>
              <Text style={styles.confirmDescription}>{activeConfirmMeta.description}</Text>
              <View style={styles.confirmActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmStatus(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, { backgroundColor: activeConfirmMeta.color }, updating && { opacity: 0.6 }]}
                  onPress={runConfirmStatusChange}
                  disabled={updating}
                >
                  <Text style={styles.confirmBtnText}>{updating ? 'Updating…' : activeConfirmMeta.confirmLabel}</Text>
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
              const active = item.key === 'documents';
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

    attachChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background,
    },
    attachChipText: { flex: 1, fontSize: 12.5, color: theme.text },

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
