import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  AlertCircle, Calendar, CheckCircle, ChevronLeft, FileText, Home as HomeIcon, Loader2,
  Megaphone, MessageSquare, Users, XCircle, ClipboardList,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { notify } from '@/utils/notifications';
import { DocStatus, getDetailStatusMeta } from '@/utils/documentStatus';

// Mirrors web's CSS `spin 1s linear infinite` on Loader2 for loading states.
function SpinningLoader({ size, color }: { size: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

const formatDateTimeLong = (dateString?: string) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

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

interface DocumentAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface DocumentRecord {
  id: string;
  kind?: 'request' | 'submission';
  type: string;
  college: string;
  collegeAbbrev?: string;
  requestDate: string;
  purpose: string;
  copies?: number;
  status: DocStatus;
  trackingNumber: string;
  notes?: string;
  estimatedCompletion?: string;
  neededBy?: string;
  claimedDate?: string;
  releasedDate?: string;
  studentFiles?: DocumentAttachment[];
  adminFiles?: DocumentAttachment[];
}

interface DocumentRequirement {
  name: string;
  description?: string;
  isMandatory: boolean;
}

interface DocumentTypeOption {
  name: string;
  processingTime?: string;
  requirements: DocumentRequirement[];
}

type LucideIconType = typeof FileText;

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

const formatDateLong = (dateString?: string) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (dateString?: string) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TABS = ['active', 'claimed', 'rejected', 'cancelled'] as const;
type TabKey = (typeof TABS)[number];
const TAB_META: Record<TabKey, { label: string; icon: LucideIconType }> = {
  active: { label: 'Active Requests', icon: AlertCircle },
  claimed: { label: 'Claimed', icon: CheckCircle },
  rejected: { label: 'Rejected', icon: XCircle },
  cancelled: { label: 'Cancelled', icon: XCircle },
};

export default function StudentDocumentStatusScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ docId?: string; from?: string }>();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(params.docId ?? null);
  const [fromDocumentsPage] = useState(params.from === 'documents');
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [servicesByDepartmentId, setServicesByDepartmentId] = useState<Record<number, DocumentTypeOption[]>>({});
  const [reqLoading, setReqLoading] = useState(true);
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/student/documents');
      setDocuments(data.documents ?? []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Could not load your documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Requirements for the selected document's type, looked up by name against
  // the same service-types catalog student_documents.tsx uses (no stable
  // service id is exposed on either payload, so name is the shared key).
  useEffect(() => {
    const fetchServiceTypes = async () => {
      setReqLoading(true);
      try {
        const { data } = await api.get('/student/documents/service-types');
        setServicesByDepartmentId(data.servicesByDepartmentId ?? {});
      } catch (err) {
        console.error('Failed to fetch document service types:', err);
      } finally {
        setReqLoading(false);
      }
    };
    fetchServiceTypes();
  }, []);

  // ── Live updates: refetch + notify when a document's status changes
  // (mirrors stud-document-status.jsx's "document:status-updated"). This is
  // the tracking/detail screen, so it owns the notification; the plain list
  // screen (student_documents.tsx) refetches silently to avoid duplicates. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const onDocumentStatusUpdated = () => {
      fetchDocuments();
      notify('Document status updated', 'One of your document requests has a new status.');
    };
    socket.on('document:status-updated', onDocumentStatusUpdated);

    return () => {
      socket.off('document:status-updated', onDocumentStatusUpdated);
    };
  }, [user, token, fetchDocuments]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDocuments();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const comingSoon = () => Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'appointments') { router.push('/pages/student/student_appointments'); return; }
    if (key === 'documents') { router.push('/pages/student/student_documents'); return; }
    if (key === 'transactions') { router.push('/pages/student/student_transactions'); return; }
    comingSoon();
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) ?? null : null;
  const collegeLogoFor = (abbrev?: string) => (abbrev ? collegeLogos[abbrev] : undefined) ?? ccsLogo;
  const selectedDocRequirements: DocumentRequirement[] = selectedDoc
    ? (Object.values(servicesByDepartmentId).flat().find((t) => t.name === selectedDoc.type)?.requirements ?? [])
    : [];

  const activeDocuments = documents.filter(
    (d) => d.status !== 'claimed' && d.status !== 'rejected' && d.status !== 'cancelled',
  );
  const claimedDocuments = documents.filter((d) => d.status === 'claimed');
  const rejectedDocuments = documents.filter((d) => d.status === 'rejected');
  const cancelledDocuments = documents.filter((d) => d.status === 'cancelled');
  const tabCounts: Record<TabKey, number> = {
    active: activeDocuments.length,
    claimed: claimedDocuments.length,
    rejected: rejectedDocuments.length,
    cancelled: cancelledDocuments.length,
  };

  const confirmCancelRequest = async () => {
    if (!selectedDoc) return;
    setCancelling(true);
    try {
      await api.delete(`/student/documents/${selectedDoc.id}`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === selectedDoc.id ? { ...d, status: 'cancelled' } : d)),
      );
      setShowCancelDialog(false);
      setSelectedDocId(null);
      Alert.alert('Request cancelled', 'Your document request has been cancelled.');
    } catch (err: any) {
      console.error('Failed to cancel document request:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to cancel document request');
    } finally {
      setCancelling(false);
    }
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
          {selectedDoc ? (
            <DocumentDetail
              theme={theme}
              styles={styles}
              doc={selectedDoc}
              isDarkMode={isDarkMode}
              collegeLogoFor={collegeLogoFor}
              backLabel={fromDocumentsPage ? 'Document Requests' : 'All Documents'}
              onBack={() => (fromDocumentsPage ? router.push('/pages/student/student_documents') : setSelectedDocId(null))}
              onCancel={() => setShowCancelDialog(true)}
              requirements={selectedDocRequirements}
              reqLoading={reqLoading}
            />
          ) : (
            <>
              {/* Breadcrumb */}
              <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
                <ChevronLeft size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>Home</Text>
              </Pressable>

              {/* Title */}
              <View style={styles.titleRow}>
                <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
                  <FileText size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.pageTitle}>My Document Requests</Text>
                  <Text style={styles.pageSubtitle}>Track all of your document requests.</Text>
                </View>
              </View>

              {error && (
                <View style={styles.emptyCard}>
                  <AlertCircle size={32} color="#ef4444" />
                  <Text style={styles.emptyDescription}>{error}</Text>
                </View>
              )}

              {loading && (
                <View style={styles.emptyCard}>
                  <SpinningLoader size={28} color={theme.tertiary} />
                  <Text style={styles.emptyDescription}>Loading your documents…</Text>
                </View>
              )}

              {!loading && !error && (
              <>
              {/* Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsRow}
                contentContainerStyle={{ gap: 8 }}
              >
                {TABS.map((tab) => {
                  const active = activeTab === tab;
                  const TabIcon = TAB_META[tab].icon;
                  return (
                    <Pressable key={tab} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                      <TabIcon size={15} color={active ? theme.orange : theme.subtext} />
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_META[tab].label}</Text>
                      <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{tabCounts[tab]}</Text></View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Active Tab */}
              {activeTab === 'active' && (
                activeDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {activeDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        isDarkMode={isDarkMode}
                        completed={false}
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <FileText size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Active Requests</Text>
                    <Text style={styles.emptyDescription}>You have no active document requests.</Text>
                    <Pressable style={styles.emptyRequestBtn} onPress={() => router.push('/pages/student/student_documents')}>
                      <Text style={styles.emptyRequestBtnText}>Request a Document</Text>
                    </Pressable>
                  </View>
                )
              )}

              {/* Claimed Tab */}
              {activeTab === 'claimed' && (
                claimedDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {claimedDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        isDarkMode={isDarkMode}
                        completed
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <CheckCircle size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Completed Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of claimed documents.</Text>
                  </View>
                )
              )}

              {/* Rejected Tab */}
              {activeTab === 'rejected' && (
                rejectedDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {rejectedDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        isDarkMode={isDarkMode}
                        completed
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <XCircle size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Rejected Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of rejected document requests.</Text>
                  </View>
                )
              )}

              {/* Cancelled Tab */}
              {activeTab === 'cancelled' && (
                cancelledDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {cancelledDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        isDarkMode={isDarkMode}
                        completed
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <XCircle size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Cancelled Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of cancelled document requests.</Text>
                  </View>
                )
              )}
              </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Nav Drawer — no item highlighted; this screen isn't a primary sidebar destination */}
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
                const active = false;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                    onPress={() => handleNavPress(item.key)}
                  >
                    <item.icon size={18} color={active ? '#ffffff' : theme.subtext} />
                    <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>{item.label}</Text>
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

      {/* Cancel Request Confirm Modal */}
      <Modal visible={showCancelDialog} animationType="fade" transparent onRequestClose={() => setShowCancelDialog(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <XCircle size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Cancel Request?</Text>
            <Text style={styles.logoutModalDescription}>
              You are about to cancel your request for {selectedDoc?.type}. It will move to your Cancelled
              requests — you&apos;re welcome to submit a new one if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setShowCancelDialog(false)}>
                <Text style={styles.logoutCancelBtnText}>Keep Request</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={confirmCancelRequest} disabled={cancelling}>
                <Text style={styles.logoutConfirmBtnText}>{cancelling ? 'Cancelling…' : 'Cancel Request'}</Text>
              </Pressable>
            </View>
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

// ─── List item card — mirrors dss-list-item ───
function DocumentListItem({
  theme,
  styles,
  doc,
  completed,
  isDarkMode,
  onPress,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  completed: boolean;
  isDarkMode: boolean;
  onPress: () => void;
}) {
  const meta = getDetailStatusMeta(doc.status, isDarkMode);
  return (
    <Pressable style={[styles.listCard, completed && styles.listCardCompleted]} onPress={onPress}>
      <View style={styles.listCardHeader}>
        <View style={[styles.listIconWrap, completed && styles.listIconWrapCompleted]}>
          <FileText size={20} color={completed ? theme.tertiary : theme.orange} />
        </View>
        <View style={styles.listTitleSection}>
          <Text style={styles.listTitle}>{doc.type}</Text>
          <Text style={styles.listCollege}>{doc.college}</Text>
          <Text style={styles.listTracking}>
            Tracking: <Text style={styles.listTrackingValue}>{doc.trackingNumber}</Text>
          </Text>
        </View>
        <View style={[styles.statusBadgePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Text style={[styles.statusBadgeTextPill, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.listFieldsGrid}>
        {doc.status === 'claimed' ? (
          doc.claimedDate && (
            <View style={styles.listField}>
              <Text style={styles.listFieldLabel}>Date Acquired</Text>
              <Text style={styles.listFieldValue}>{formatDateShort(doc.claimedDate)}</Text>
            </View>
          )
        ) : (
          <>
            <View style={styles.listField}>
              <Text style={styles.listFieldLabel}>{completed ? 'Date Requested' : 'Request Date'}</Text>
              <Text style={styles.listFieldValue}>{formatDateShort(doc.requestDate)}</Text>
            </View>
            {!completed && (
              <View style={styles.listFieldFull}>
                <Text style={styles.listFieldLabel}>Purpose</Text>
                <Text style={styles.listFieldValueMuted} numberOfLines={2}>{doc.purpose}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

// ─── Detail view — hero + request details + notes + tracking + cancel ───
function DocumentDetail({
  theme,
  styles,
  doc,
  isDarkMode,
  collegeLogoFor,
  backLabel,
  onBack,
  onCancel,
  requirements,
  reqLoading,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  isDarkMode: boolean;
  collegeLogoFor: (abbrev?: string) => ImageSourcePropType;
  backLabel: string;
  onBack: () => void;
  onCancel: () => void;
  requirements: DocumentRequirement[];
  reqLoading: boolean;
}) {
  const meta = getDetailStatusMeta(doc.status, isDarkMode);
  const canCancel = doc.status === 'pending' || doc.status === 'processing';
  const { token } = useAuth();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Mirrors student_announcement.tsx's viewAttachment() -- download to cache
  // then hand off to the OS share sheet, since RN has no direct "open file".
  const viewSubmissionFile = async (file: DocumentAttachment) => {
    if (downloadingFileId) return;
    setDownloadingFileId(file.id);
    try {
      const submissionId = doc.id.replace(/^sub-/, '');
      const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uri = `${FileSystem.cacheDirectory}submission-${submissionId}-${file.id}-${safeName}`;
      const result = await FileSystem.downloadAsync(
        `${api.defaults.baseURL}/student/document-submissions/${submissionId}/files/${file.id}`,
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

  return (
    <>
      {/* Breadcrumb */}
      <Pressable style={styles.breadcrumb} onPress={onBack} hitSlop={8}>
        <ChevronLeft size={18} color={theme.subtext} />
        <Text style={styles.breadcrumbText}>{backLabel}</Text>
      </Pressable>

      {/* Title */}
      <View style={styles.titleRow}>
        <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
          <FileText size={22} color="#ffffff" />
        </LinearGradient>
        <View style={styles.titleTextWrap}>
          <Text style={styles.pageTitle}>Document Details</Text>
          <Text style={styles.pageSubtitle}>Your document request details and status.</Text>
        </View>
      </View>

      {/* Hero */}
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLogoBox}>
            <Image source={collegeLogoFor(doc.collegeAbbrev)} style={styles.heroLogoImg} resizeMode="contain" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroDocName}>{doc.type}</Text>
            <Text style={styles.heroCollegeName}>{doc.college}</Text>
          </View>
        </View>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{doc.trackingNumber}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Ready alert */}
      {doc.status === 'ready' && (
        <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.readyBanner}>
          <CheckCircle size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document is ready for pickup — please proceed to the designated location.
          </Text>
        </LinearGradient>
      )}

      {/* Released alert */}
      {doc.status === 'released' && (
        <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.readyBanner}>
          <CheckCircle size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document has been released to the designated location — visit to complete pickup.
          </Text>
        </LinearGradient>
      )}

      {/* Request details */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <FileText size={18} color={theme.orange} />
            <Text style={styles.cardTitleText}>Request Details</Text>
          </View>
          <View style={[styles.statusBadgePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Text style={[styles.statusBadgeTextPill, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Request Date</Text>
          <Text style={styles.detailValue}>{formatDateLong(doc.requestDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date Needed</Text>
          <Text style={styles.detailValue}>
            {doc.neededBy ? formatDateLong(doc.neededBy) : 'No date requested for the document to be claimable.'}
          </Text>
        </View>
        {doc.status === 'claimed' && doc.claimedDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date and Time Claimed</Text>
            <Text style={styles.detailValue}>{formatDateTimeLong(doc.claimedDate)}</Text>
          </View>
        ) : doc.status === 'released' && doc.releasedDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Released</Text>
            <Text style={styles.detailValue}>{formatDateLong(doc.releasedDate)}</Text>
          </View>
        ) : null}
        {doc.copies != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Number of Copies</Text>
            <Text style={styles.detailValue}>{doc.copies}</Text>
          </View>
        )}
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text style={styles.detailLabel}>Purpose</Text>
          <Text style={styles.detailValue}>{doc.purpose}</Text>
        </View>
      </View>

      {/* Requirements -- N/A for a sent document: doc.type there is the
          student's free-text Title, which could coincidentally match a real
          service name and pull in unrelated requirements, so this is hidden
          outright rather than just visually de-emphasized. */}
      {doc.kind !== 'submission' && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <CheckCircle size={18} color={theme.orange} />
              <Text style={styles.cardTitleText}>Requirements</Text>
            </View>
          </View>
          {reqLoading ? (
            <View style={styles.reqLoadingRow}>
              <ActivityIndicator size="small" color={theme.orange} />
              <Text style={styles.reqSubtext}>Loading requirements…</Text>
            </View>
          ) : requirements.length > 0 ? (
            <View style={{ gap: 10 }}>
              {requirements.map((req) => (
                <View key={req.name} style={styles.reqItemRow}>
                  <CheckCircle size={16} color={theme.orange} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.hintRequirementNameRow}>
                      <Text style={styles.bodyText}>{req.name}</Text>
                      <View style={req.isMandatory ? styles.reqTagRequired : styles.reqTagOptional}>
                        <Text style={req.isMandatory ? styles.reqTagRequiredText : styles.reqTagOptionalText}>
                          {req.isMandatory ? 'Required' : 'Optional'}
                        </Text>
                      </View>
                    </View>
                    {req.description && <Text style={styles.reqDescText}>{req.description}</Text>}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.reqSubtext}>
              No specific requirements have been defined for this service yet. Contact the office for details.
            </Text>
          )}
        </View>
      )}

      {/* Attachments -- only for a sent document */}
      {doc.kind === 'submission' && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <FileText size={18} color={theme.orange} />
              <Text style={styles.cardTitleText}>Attachments</Text>
            </View>
          </View>
          <Text style={styles.reqSubtext}>Your Files</Text>
          {doc.studentFiles && doc.studentFiles.length > 0 ? (
            <View style={{ gap: 8, marginTop: 6, marginBottom: 10 }}>
              {doc.studentFiles.map((f) => (
                <Pressable key={f.id} style={styles.attachChip} onPress={() => viewSubmissionFile(f)} disabled={!!downloadingFileId}>
                  <FileText size={14} color={theme.orange} />
                  <Text style={styles.attachChipText} numberOfLines={1}>{f.filename}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.reqSubtext, { marginTop: 4, marginBottom: 10 }]}>No files attached.</Text>
          )}
          <Text style={styles.reqSubtext}>Office Return Files</Text>
          {doc.adminFiles && doc.adminFiles.length > 0 ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              {doc.adminFiles.map((f) => (
                <Pressable key={f.id} style={styles.attachChip} onPress={() => viewSubmissionFile(f)} disabled={!!downloadingFileId}>
                  <FileText size={14} color={theme.orange} />
                  <Text style={styles.attachChipText} numberOfLines={1}>{f.filename}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.reqSubtext, { marginTop: 4 }]}>Nothing returned yet.</Text>
          )}
        </View>
      )}

      {/* Notes */}
      {doc.notes && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <MessageSquare size={18} color={theme.orange} />
              <Text style={styles.cardTitleText}>Notes</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{doc.notes}</Text>
        </View>
      )}

      {/* Cancel request */}
      {canCancel && (
        <View style={[styles.card, styles.cancelCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <XCircle size={18} color="#ef4444" />
              <Text style={[styles.cardTitleText, { color: '#ef4444' }]}>Cancel Request</Text>
            </View>
          </View>
          <Text style={styles.cancelDescription}>
            Cancelling will move this request to your Cancelled requests. You&apos;re welcome to submit a new one if you change your mind.
          </Text>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          </Pressable>
        </View>
      )}
    </>
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
  orange: string;
  orangeDark: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(249, 115, 22, 0.2)',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#16a34a',
  primaryDark: '#15803d',
  success: '#10b981',
  orange: '#f97316',
  orangeDark: '#ea580c',
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
  orange: '#ea580c',
  orangeDark: '#c2410c',
  iconBtnBg: 'rgba(34, 197, 94, 0.08)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.15)',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: theme.headerBg, borderBottomWidth: 1, borderBottomColor: theme.headerBorder,
    },
    headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    headerPncLogo: { width: 40, height: 40 },
    headerOamsLogo: { height: 34, width: 96 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { padding: 8, borderRadius: 10, backgroundColor: theme.iconBtnBg, borderWidth: 1, borderColor: theme.iconBtnBorder },
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

    // Tabs
    tabsRow: { flexDirection: 'row', gap: 8, borderBottomWidth: 2, borderBottomColor: theme.border },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2,
    },
    tabActive: { borderBottomColor: theme.orange },
    tabText: { fontSize: 12, fontWeight: '700', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },
    tabTextActive: { color: theme.orange },
    tabCountPill: {
      minWidth: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5, backgroundColor: 'rgba(249, 115, 22, 0.15)',
    },
    tabCountText: { fontSize: 10, fontWeight: '700', color: theme.orange },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.25)', borderRadius: 18,
      paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },
    emptyRequestBtn: {
      marginTop: 6, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12,
      backgroundColor: theme.orange,
    },
    emptyRequestBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // List items
    docsList: { gap: 14 },
    listCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 18, padding: 16, gap: 12,
    },
    listCardCompleted: { opacity: 0.75, borderColor: 'rgba(107, 114, 128, 0.25)' },
    listCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    listIconWrap: {
      width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(249, 115, 22, 0.1)', flexShrink: 0,
    },
    listIconWrapCompleted: { backgroundColor: 'rgba(107, 114, 128, 0.1)' },
    listTitleSection: { flex: 1, gap: 2 },
    listTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    listCollege: { fontSize: 12, color: theme.tertiary },
    listTracking: { fontSize: 11, color: theme.tertiary, marginTop: 2 },
    listTrackingValue: { fontFamily: 'monospace', fontWeight: '700', color: theme.orange, letterSpacing: 0.3 },

    statusBadgePill: {
      borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, flexShrink: 0,
    },
    statusBadgeTextPill: { fontSize: 11, fontWeight: '700' },

    listFieldsGrid: { gap: 10 },
    listField: { gap: 2 },
    listFieldFull: { gap: 2 },
    listFieldLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    listFieldValue: { fontSize: 13, fontWeight: '600', color: theme.orange },
    listFieldValueMuted: { fontSize: 13, fontWeight: '500', color: theme.subtext, lineHeight: 18 },

    // Hero (detail view)
    heroCard: { borderRadius: 20, padding: 18, gap: 14 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroLogoBox: {
      width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
      padding: 8, flexShrink: 0,
    },
    heroLogoImg: { width: '100%', height: '100%' },
    heroTextWrap: { flex: 1, gap: 3 },
    heroDocName: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
    heroCollegeName: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    heroBadgeRow: { flexDirection: 'row' },
    heroBadge: { backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    heroBadgeText: { fontSize: 12, fontWeight: '800', color: '#ea580c', letterSpacing: 0.3 },

    // Banners
    readyBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderRadius: 16, padding: 14,
    },
    readyBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // Generic card
    card: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
      borderRadius: 18, padding: 16, gap: 12,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitleText: { fontSize: 14, fontWeight: '700', color: theme.text },

    detailRow: {
      gap: 3, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(249, 115, 22, 0.1)',
    },
    detailRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    detailLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailValue: { fontSize: 14, color: theme.text, lineHeight: 20 },

    bodyText: { fontSize: 13, color: theme.subtext, lineHeight: 20 },

    reqSubtext: { fontSize: 12, color: theme.tertiary, marginTop: 4, marginBottom: 4 },
    reqLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    attachChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background,
    },
    attachChipText: { flex: 1, fontSize: 12.5, color: theme.text },
    reqDescText: { fontSize: 11.5, color: theme.tertiary, opacity: 0.85 },
    hintRequirementNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reqTagRequired: {
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    reqTagRequiredText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
    reqTagOptional: {
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
      backgroundColor: 'rgba(107, 114, 128, 0.15)', borderWidth: 1, borderColor: 'rgba(107, 114, 128, 0.35)',
    },
    reqTagOptionalText: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },

    trackingBig: { fontSize: 22, fontWeight: '800', color: theme.orange, fontFamily: 'monospace', letterSpacing: 1 },
    trackingCaption: { fontSize: 11, color: theme.tertiary, marginTop: 4 },

    // Cancel card
    cancelCard: { borderColor: 'rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
    cancelDescription: { fontSize: 12, color: theme.tertiary, marginTop: -6 },
    cancelBtn: {
      alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
      borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

    // Nav drawer
    drawerOverlay: { flex: 1, flexDirection: 'row' },
    drawerPanel: {
      width: 270, backgroundColor: theme.card, borderRightWidth: 1, borderRightColor: theme.border,
      padding: 20, justifyContent: 'space-between',
    },
    drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerProfile: {
      width: '100%', alignItems: 'flex-start', gap: 8,
      backgroundColor: 'rgba(22, 163, 74, 0.12)', borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.25)',
      borderRadius: 14, padding: 14,
    },
    drawerProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    drawerAvatar: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)', alignItems: 'center', justifyContent: 'center',
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
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    drawerLogoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    // Shared modal look
    logoutOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
    logoutModalCard: {
      width: '100%', maxWidth: 340, alignItems: 'center', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 24,
    },
    logoutIconCircle: {
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)', marginBottom: 16,
    },
    logoutModalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    logoutModalDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    logoutModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    logoutCancelBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
      borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    },
    logoutCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
    logoutConfirmBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444',
    },
    logoutConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  });
}
