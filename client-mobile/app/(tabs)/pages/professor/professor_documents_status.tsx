import { useState, useEffect, useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { notify } from '@/utils/notifications';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/coams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');
const ccsLogo = require('@/assets/CCS.png');
const cbaaLogo = require('@/assets/CBAA.png');
const coedLogo = require('@/assets/COED.png');
const coeLogo = require('@/assets/COE.png');
const casLogo = require('@/assets/CAS.png');
const chasLogo = require('@/assets/CHAS.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Matches web's getCollegeLogo() -- resolves by full department name (the
// only college field this endpoint returns), falling back to a substring
// match against the college's abbreviation embedded in the name, and to the
// PNC logo for anything unrecognized.
function collegeLogoForName(collegeName?: string): ImageSourcePropType {
  const name = (collegeName ?? '').toUpperCase();
  if (name.includes('COMPUTING')) return ccsLogo;
  if (name.includes('BUSINESS')) return cbaaLogo;
  if (name.includes('EDUCATION')) return coedLogo;
  if (name.includes('ENGINEERING')) return coeLogo;
  if (name.includes('HEALTH')) return chasLogo;
  if (name.includes('ARTS')) return casLogo;
  if (name.includes('CCS')) return ccsLogo;
  if (name.includes('CBAA')) return cbaaLogo;
  if (name.includes('COED')) return coedLogo;
  if (name.includes('COE')) return coeLogo;
  if (name.includes('CHAS')) return chasLogo;
  if (name.includes('CAS')) return casLogo;
  return pncLogo;
}

function CoamsLogo({
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

// ─── Field shapes documented here mirror what Field shapes mirror what
// GET /faculty/my-document-requests really returns (service_name, college,
// purpose, created_at, status, tracking_number, notes, estimated_completion,
// released_at, claimed_at) — this screen ports the actual wired
// prof-document-status.jsx/.css 1:1: Active/Completed tabs, tap-through to a
// full detail view (hero, request details, notes, tracking number, cancel),
// and the "opened from the request page" back-navigation behavior. IDs match
// the demo set in professor_documents.tsx so a tap-through from there resolves. ───
type DocStatus = 'pending' | 'processing' | 'generated' | 'released' | 'claimed' | 'rejected' | 'cancelled';

interface DocumentRecord {
  id: string;
  type: string;
  college: string;
  purpose: string;
  copies?: number;
  requestDate: string;
  status: DocStatus;
  trackingNumber: string;
  notes?: string;
  estimatedCompletion?: string;
  neededBy?: string;
  releasedDate?: string;
  claimedDate?: string;
}

interface DocumentRequirement {
  name: string;
  description?: string;
  isMandatory: boolean;
}

interface DocumentTypeOption {
  name: string;
  requirements: DocumentRequirement[];
}

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'time-outline' },
];

const STATUS_META: Record<DocStatus, { label: string; bg: string; border: string; color: string }> = {
  pending: { label: 'Pending', bg: 'rgba(251, 191, 36, 0.18)', border: 'rgba(251, 191, 36, 0.35)', color: '#fbbf24' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)', color: '#60a5fa' },
  generated: { label: 'Ready for Pickup', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#5eead4' },
  released: { label: 'Released', bg: 'rgba(107, 114, 128, 0.18)', border: 'rgba(107, 114, 128, 0.35)', color: '#d1d5db' },
  claimed: { label: 'Claimed', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' },
  cancelled: { label: 'Cancelled', bg: 'rgba(107, 114, 128, 0.18)', border: 'rgba(107, 114, 128, 0.35)', color: '#9ca3af' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

const formatTimeOnly = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

type TabKey = 'active' | 'claimed' | 'rejected' | 'cancelled';
const TAB_META: Record<TabKey, { label: string; icon: IoniconName }> = {
  active: { label: 'Active Requests', icon: 'alert-circle-outline' },
  claimed: { label: 'Claimed', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline' },
};

export default function ProfessorDocumentsStatusScreen() {
  const params = useLocalSearchParams<{ docId?: string; from?: string }>();
  const router = useRouter();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(params.docId ?? null);
  const [detailOpenedFromExternal, setDetailOpenedFromExternal] = useState(
    params.from === 'document-request' && !!params.docId,
  );
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const { user, logout, token } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const comingSoon = () => Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  const goToDashboard = () => router.push('/pages/professor/professor_dashboard');
  const goToRequestPage = () => router.push('/pages/professor/professor_documents');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty/my-document-requests');
      setDocuments(
        (data ?? []).map((r: any) => ({
          id: String(r.request_id),
          type: r.service_name,
          college: r.college,
          purpose: r.purpose,
          copies: r.copies,
          requestDate: r.created_at,
          status: r.status,
          trackingNumber: r.tracking_number,
          notes: r.notes || undefined,
          estimatedCompletion: r.estimated_completion || undefined,
          neededBy: r.needed_by || undefined,
          releasedDate: r.released_at || undefined,
          claimedDate: r.claimed_at || undefined,
        })),
      );
    } catch (err) {
      console.error('Fetch document requests error:', err);
      Alert.alert('Error', 'Could not load your document requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Requirements for the selected document's type, looked up by name against
  // the same document-services catalog professor_documents.tsx uses (no
  // stable service id is exposed on either payload, so name is the shared key).
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      setReqLoading(true);
      try {
        const { data } = await api.get('/faculty/document-services');
        setDocumentTypes(
          (data ?? []).map((s: any) => ({
            name: s.service_name,
            requirements: s.requirements ?? [],
          })),
        );
      } catch (err) {
        console.error('Fetch document service types error:', err);
      } finally {
        setReqLoading(false);
      }
    };
    fetchDocumentTypes();
  }, []);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDocuments();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchDocuments();
    const onStatusUpdated = () => {
      notify('Document update', 'A document request status has changed.');
    };
    socket.on('document:status-updated', refetch);
    socket.on('document:status-updated', onStatusUpdated);
    return () => {
      socket.off('document:status-updated', refetch);
      socket.off('document:status-updated', onStatusUpdated);
    };
  }, [user, token, fetchDocuments]);

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'appointments') { router.push('/pages/professor/professor_appointment'); return; }
    if (key === 'documents') { goToRequestPage(); return; }
    if (key === 'transactions') { router.push('/pages/professor/professor_transactions'); return; }
    comingSoon();
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) ?? null : null;

  const getDocRequirements = useCallback(
    (typeName: string) => documentTypes.find((t) => t.name === typeName)?.requirements ?? [],
    [documentTypes],
  );
  const selectedDocRequirements = selectedDoc ? getDocRequirements(selectedDoc.type) : [];

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

  const openDocument = (id: string) => {
    setDetailOpenedFromExternal(false);
    setSelectedDocId(id);
  };

  const backFromDetail = () => {
    if (detailOpenedFromExternal) { goToRequestPage(); return; }
    setSelectedDocId(null);
  };

  const confirmCancelRequest = async () => {
    if (!selectedDoc) return;
    setCancelling(true);
    try {
      await api.delete(`/faculty/my-document-requests/${selectedDoc.id}`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === selectedDoc.id ? { ...d, status: 'cancelled' } : d)),
      );
      setShowCancelDialog(false);
      setSelectedDocId(null);
      Alert.alert('Request cancelled', 'Your document request has been cancelled.');
    } catch (err: any) {
      console.error('Cancel document request error:', err);
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel document request.');
    } finally {
      setCancelling(false);
    }
  };

  const breadcrumbFromRequestPage = params.from === 'document-request';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={pncLogo} style={styles.headerPncLogo} resizeMode="contain" />
            <CoamsLogo style={styles.headerOamsLogo} outline={isDarkMode} />
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
          {selectedDoc ? (
            <DocumentDetail
              theme={theme}
              styles={styles}
              doc={selectedDoc}
              backLabel={detailOpenedFromExternal ? 'Document Requests' : 'All Requests'}
              onBack={backFromDetail}
              onCancel={() => setShowCancelDialog(true)}
              requirements={selectedDocRequirements}
              reqLoading={reqLoading}
            />
          ) : (
            <>
              {/* Breadcrumb */}
              <Pressable
                style={styles.breadcrumb}
                onPress={breadcrumbFromRequestPage ? goToRequestPage : goToDashboard}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>
                  {breadcrumbFromRequestPage ? 'Document Requests' : 'Home'}
                </Text>
              </Pressable>

              {/* Title */}
              <View style={styles.titleRow}>
                <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
                  <Ionicons name="document-text-outline" size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.pageTitle}>My Document Requests</Text>
                  <Text style={styles.pageSubtitle}>Track and manage all your document requests</Text>
                </View>
              </View>

              {/* Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ gap: 8 }}>
                {(Object.keys(TAB_META) as TabKey[]).map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <Pressable key={tab} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                      <Ionicons name={TAB_META[tab].icon} size={15} color={active ? theme.orange : theme.subtext} />
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_META[tab].label}</Text>
                      <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{tabCounts[tab]}</Text></View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Active Tab */}
              {activeTab === 'active' && (
                loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyDescription}>Loading requests…</Text>
                  </View>
                ) : activeDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {activeDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        variant="active"
                        onPress={() => openDocument(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="document-text-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Active Requests</Text>
                    <Text style={styles.emptyDescription}>You have no active document requests.</Text>
                    <Pressable style={styles.emptyRequestBtn} onPress={goToRequestPage}>
                      <Text style={styles.emptyRequestBtnText}>Request a Document</Text>
                    </Pressable>
                  </View>
                )
              )}

              {/* Claimed Tab */}
              {activeTab === 'claimed' && (
                loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyDescription}>Loading requests…</Text>
                  </View>
                ) : claimedDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {claimedDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        variant="claimed"
                        onPress={() => openDocument(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Completed Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of claimed documents.</Text>
                  </View>
                )
              )}

              {/* Rejected Tab */}
              {activeTab === 'rejected' && (
                loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyDescription}>Loading requests…</Text>
                  </View>
                ) : rejectedDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {rejectedDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        variant="rejected"
                        onPress={() => openDocument(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="close-circle-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Rejected Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of rejected document requests.</Text>
                  </View>
                )
              )}

              {/* Cancelled Tab */}
              {activeTab === 'cancelled' && (
                loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyDescription}>Loading requests…</Text>
                  </View>
                ) : cancelledDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {cancelledDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        variant="cancelled"
                        onPress={() => openDocument(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="close-circle-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Cancelled Requests</Text>
                    <Text style={styles.emptyDescription}>You have no records of cancelled document requests.</Text>
                  </View>
                )
              )}
            </>
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
                // Not highlighted here — the sidebar's "Documents" destination is
                // professor_documents.tsx; this tracking/status screen is reached
                // from the dashboard's Documents stat tile instead.
                const active = false;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                    onPress={() => handleNavPress(item.key)}
                  >
                    <Ionicons name={item.icon} size={18} color={active ? '#ffffff' : theme.subtext} />
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
              <Ionicons name="document-text-outline" size={26} color="#ef4444" />
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
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
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
  variant,
  onPress,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  variant: TabKey;
  onPress: () => void;
}) {
  const meta = STATUS_META[doc.status];
  const completed = variant !== 'active';
  return (
    <Pressable style={[styles.listCard, completed && styles.listCardCompleted]} onPress={onPress}>
      <View style={styles.listCardHeader}>
        <View style={[styles.listIconWrap, completed && styles.listIconWrapCompleted]}>
          <Ionicons name="document-text-outline" size={20} color={completed ? theme.tertiary : theme.orange} />
        </View>
        <View style={styles.listTitleSection}>
          <Text style={styles.listTitle}>{doc.type}</Text>
          {variant === 'claimed' ? (
            <>
              <Text style={styles.listCollege}>{doc.college}</Text>
              {doc.claimedDate && (
                <>
                  <Text style={styles.listClaimedDate}>{formatDate(doc.claimedDate)}</Text>
                  <Text style={styles.listClaimedTime}>{formatTimeOnly(doc.claimedDate)}</Text>
                </>
              )}
            </>
          ) : variant === 'rejected' || variant === 'cancelled' ? (
            <Text style={styles.listCollege}>
              {doc.college} • {formatDateShort(doc.requestDate)}
            </Text>
          ) : (
            <Text style={styles.listCollege}>{doc.college}</Text>
          )}
          <Text style={styles.listTracking}>
            Tracking: <Text style={styles.listTrackingValue}>{doc.trackingNumber}</Text>
          </Text>
        </View>
        <View style={[styles.statusBadgePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Text style={[styles.statusBadgeTextPill, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {variant === 'active' && (
        <View style={styles.listFieldsGrid}>
          <View style={styles.listField}>
            <Text style={styles.listFieldLabel}>Request Date</Text>
            <Text style={styles.listFieldValue}>{formatDateShort(doc.requestDate)}</Text>
          </View>
          {doc.estimatedCompletion && (
            <View style={styles.listField}>
              <Text style={styles.listFieldLabel}>Est. Completion</Text>
              <Text style={styles.listFieldValue}>{formatDateShort(doc.estimatedCompletion)}</Text>
            </View>
          )}
          <View style={styles.listFieldFull}>
            <Text style={styles.listFieldLabel}>Purpose</Text>
            <Text style={styles.listFieldValueMuted} numberOfLines={2}>{doc.purpose}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── Detail view — hero + request details + notes + tracking + cancel ───
function DocumentDetail({
  theme,
  styles,
  doc,
  backLabel,
  onBack,
  onCancel,
  requirements,
  reqLoading,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  backLabel: string;
  onBack: () => void;
  onCancel: () => void;
  requirements: DocumentRequirement[];
  reqLoading: boolean;
}) {
  const meta = STATUS_META[doc.status];
  const canCancel = doc.status === 'pending' || doc.status === 'processing';

  return (
    <>
      {/* Breadcrumb */}
      <Pressable style={styles.breadcrumb} onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={theme.subtext} />
        <Text style={styles.breadcrumbText}>{backLabel}</Text>
      </Pressable>

      {/* Title */}
      <View style={styles.titleRow}>
        <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
          <Ionicons name="document-text-outline" size={22} color="#ffffff" />
        </LinearGradient>
        <View style={styles.titleTextWrap}>
          <Text style={styles.pageTitle}>Document Details</Text>
          <Text style={styles.pageSubtitle}>Track your document request status</Text>
        </View>
      </View>

      {/* Hero */}
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLogoBox}>
            <Image source={collegeLogoForName(doc.college)} style={styles.heroLogoImg} resizeMode="contain" />
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
      {doc.status === 'generated' && (
        <View style={styles.readyBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document is ready for pickup — please visit the HR/Records office!
          </Text>
        </View>
      )}

      {/* Released alert */}
      {doc.status === 'released' && (
        <View style={styles.readyBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document has been released to the HR/Records office — visit to complete pickup.
          </Text>
        </View>
      )}

      {/* Request details */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text-outline" size={18} color={theme.orange} />
            <Text style={styles.cardTitleText}>Request Details</Text>
          </View>
          <View style={[styles.statusBadgePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Text style={[styles.statusBadgeTextPill, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date Requested</Text>
          <Text style={styles.detailValue}>{formatDate(doc.requestDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date Needed</Text>
          <Text style={styles.detailValue}>
            {doc.neededBy ? formatDate(doc.neededBy) : 'No date requested for the document to be claimable.'}
          </Text>
        </View>
        {doc.status === 'released' && doc.releasedDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Released</Text>
            <Text style={styles.detailValue}>{formatDate(doc.releasedDate)}</Text>
          </View>
        )}
        {doc.status === 'claimed' && doc.claimedDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date and Time Claimed</Text>
            <Text style={styles.detailValue}>{formatDateTime(doc.claimedDate)}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Number of Copies</Text>
          <Text style={styles.detailValue}>{doc.copies ?? 1}</Text>
        </View>
        {doc.estimatedCompletion ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Completion</Text>
            <Text style={styles.detailValue}>{formatDate(doc.estimatedCompletion)}</Text>
          </View>
        ) : null}
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text style={styles.detailLabel}>Purpose</Text>
          <Text style={styles.detailValue}>{doc.purpose}</Text>
        </View>
      </View>

      {/* Requirements */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.orange} />
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
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.orange} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.reqNameRow}>
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

      {/* Notes */}
      {doc.notes && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="chatbox-outline" size={18} color={theme.orange} />
              <Text style={styles.cardTitleText}>Notes</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{doc.notes}</Text>
        </View>
      )}

      {/* Tracking number */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag-outline" size={18} color={theme.orange} />
            <Text style={styles.cardTitleText}>Tracking Number</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.trackingBig}>{doc.trackingNumber}</Text>
          <Text style={styles.trackingCaption}>{doc.college}</Text>
        </View>
      </View>

      {/* Cancel request */}
      {canCancel && (
        <View style={[styles.card, styles.cancelCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  orange: string;
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
  orange: '#f97316',
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
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
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
    listClaimedDate: { fontSize: 12, color: theme.tertiary, marginTop: 2 },
    listClaimedTime: { fontSize: 11, color: theme.tertiary },
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
      flexShrink: 0,
    },
    heroLogoImg: { width: 34, height: 34 },
    heroTextWrap: { flex: 1, gap: 3 },
    heroDocName: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
    heroCollegeName: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    heroBadgeRow: { flexDirection: 'row' },
    heroBadge: { backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    heroBadgeText: { fontSize: 12, fontWeight: '800', color: '#ea580c', letterSpacing: 0.3 },

    // Banner
    readyBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#16a34a', borderRadius: 16, padding: 14,
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

    reqSubtext: { fontSize: 12, color: theme.tertiary, marginTop: 4 },
    reqLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    reqNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reqDescText: { fontSize: 11.5, color: theme.tertiary, opacity: 0.85 },
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
