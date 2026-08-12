import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import DateTimePicker from '@react-native-community/datetimepicker';
import { connectSocket } from '@/utils/socket';
import { DocStatus, getHubStatusMeta } from '@/utils/documentStatus';

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

interface DocumentRequest {
  id: string;
  type: string;
  college: string;
  requestDate: string;
  purpose: string;
  copies?: number;
  status: DocStatus;
  trackingNumber: string;
  notes?: string;
  estimatedCompletion?: string;
  neededBy?: string;
  releasedDate?: string;
  claimedDate?: string;
}

interface CollegeOption {
  id: number;
  name: string;
  abbrev: string;
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

const formatDateLong = (dateString?: string) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (dateString?: string) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const TABS = ['active', 'claimed', 'rejected', 'cancelled'] as const;
type TabKey = (typeof TABS)[number];
const TAB_META: Record<TabKey, { label: string; icon: IoniconName }> = {
  active: { label: 'Active Requests', icon: 'alert-circle-outline' },
  claimed: { label: 'Claimed', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline' },
};
type SelectField = 'college' | 'type' | null;

export default function StudentDocumentsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const [collegesFromDB, setCollegesFromDB] = useState<CollegeOption[]>([]);
  const [servicesByDepartmentId, setServicesByDepartmentId] = useState<Record<number, DocumentTypeOption[]>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: '', college: '', copies: '1', purpose: '', neededBy: '' });
  const [selectField, setSelectField] = useState<SelectField>(null);
  const [cancelTarget, setCancelTarget] = useState<DocumentRequest | null>(null);
  const [showNeededByPicker, setShowNeededByPicker] = useState(false);
  const tomorrowDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  })();

  // Mirrors `documents` for the catch block below, without making
  // fetchDocuments depend on (and change identity with) the state itself.
  const documentsRef = useRef(documents);
  useEffect(() => { documentsRef.current = documents; }, [documents]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get('/student/documents');
      setDocuments(data.documents ?? []);
      setDocsError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      if (documentsRef.current.length === 0) {
        setDocsError('Could not load your documents.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh your documents.' });
      }
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Live updates: refetch when a document's status changes (mirrors
  // stud-document-status.jsx's "document:status-updated"). This is the plain
  // list/request screen — it refetches silently; student_document_status.tsx
  // (the tracking/detail screen) owns the local notification for this event
  // so a student never gets duplicate notifications from both screens. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    socket.on('document:status-updated', fetchDocuments);

    return () => {
      socket.off('document:status-updated', fetchDocuments);
    };
  }, [user, token, fetchDocuments]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDocuments();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const { data } = await api.get('/student/documents/service-types');
        setCollegesFromDB(data.departments ?? []);
        setServicesByDepartmentId(data.servicesByDepartmentId ?? {});
      } catch (err) {
        console.error('Failed to fetch document service types:', err);
      }
    };
    fetchServiceTypes();
  }, []);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const comingSoon = () => Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'documents') return;
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'appointments') { router.push('/pages/student/student_appointments'); return; }
    if (key === 'transactions') { router.push('/pages/student/student_transactions'); return; }
    comingSoon();
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const activeDocuments = documents.filter(
    (doc) => doc.status !== 'claimed' && doc.status !== 'rejected' && doc.status !== 'cancelled',
  );
  const claimedDocuments = documents.filter((doc) => doc.status === 'claimed');
  const rejectedDocuments = documents.filter((doc) => doc.status === 'rejected');
  const cancelledDocuments = documents.filter((doc) => doc.status === 'cancelled');
  const tabCounts: Record<TabKey, number> = {
    active: activeDocuments.length,
    claimed: claimedDocuments.length,
    rejected: rejectedDocuments.length,
    cancelled: cancelledDocuments.length,
  };

  const openDialog = () => {
    setFormData({ type: '', college: '', copies: '1', purpose: '', neededBy: '' });
    setDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (submitting) return;
    if (!formData.type || !formData.college || !formData.purpose.trim()) {
      Alert.alert('Missing information', 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/student/documents', formData);
      if (data?.document) {
        setDocuments((prev) => [data.document, ...prev]);
      } else {
        await fetchDocuments();
      }
      setDialogOpen(false);
      setFormData({ type: '', college: '', copies: '1', purpose: '', neededBy: '' });
      Alert.alert('Success', 'Document request submitted successfully!');
    } catch (err: any) {
      console.error('Failed to submit document request:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to submit document request');
    } finally {
      setSubmitting(false);
    }
  };

  const doCancelRequest = async () => {
    const target = cancelTarget;
    if (!target) return;
    setCancellingId(target.id);
    try {
      await api.delete(`/student/documents/${target.id}`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === target.id ? { ...d, status: 'cancelled' } : d)),
      );
      setCancelTarget(null);
      Alert.alert('Cancelled', 'Document request cancelled.');
    } catch (err: any) {
      console.error('Failed to cancel document request:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to cancel document request');
    } finally {
      setCancellingId(null);
    }
  };

  const selectedCollegeId = collegesFromDB.find((c) => c.name === formData.college)?.id;
  const availableTypes = selectedCollegeId != null ? servicesByDepartmentId[selectedCollegeId] ?? [] : [];
  const selectOptions = selectField === 'college'
    ? collegesFromDB.map((c) => ({ value: c.name, label: `${c.name} (${c.abbrev})` }))
    : availableTypes.map((type) => ({ value: type.name, label: type.name }));
  const selectTitle = selectField === 'college' ? 'Select College' : 'Select Document Type';
  const selectCurrentValue = selectField === 'college' ? formData.college : formData.type;
  const selectedTypeDetails = availableTypes.find((t) => t.name === formData.type);

  const chooseOption = (value: string) => {
    if (selectField === 'college') setFormData((f) => ({ ...f, college: value, type: '' }));
    else if (selectField === 'type') setFormData((f) => ({ ...f, type: value }));
    setSelectField(null);
  };

  const goToDocumentStatus = (doc: DocumentRequest) => {
    router.push({
      pathname: '/pages/student/student_document_status',
      params: { docId: doc.id },
    });
  };

  const renderDocumentCard = (doc: DocumentRequest, completed: boolean) => {
    const meta = getHubStatusMeta(doc.status);
    return (
      <Pressable key={doc.id} onPress={() => goToDocumentStatus(doc)} style={[styles.docCard, completed && styles.docCardCompleted]}>
        <View style={styles.docCardHeader}>
          <View style={[styles.docIconWrap, completed && styles.docIconWrapCompleted]}>
            <Ionicons name="document-text-outline" size={22} color={completed ? theme.tertiary : theme.orange} />
          </View>
          <View style={styles.docTitleSection}>
            <Text style={styles.docTitle}>{doc.type}</Text>
            <Text style={styles.docCollege}>{doc.college}</Text>
            {completed ? (
              <Text style={styles.docTracking}>
                {formatDateShort(doc.requestDate)} • {doc.trackingNumber}
              </Text>
            ) : (
              <Text style={styles.docTracking}>
                Tracking: <Text style={styles.docTrackingValue}>{doc.trackingNumber}</Text>
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {!completed && (
          <>
            <View style={styles.docFieldsGrid}>
              <View style={styles.docField}>
                <Text style={styles.docFieldLabel}>Request Date</Text>
                <Text style={styles.docFieldValue}>{formatDateLong(doc.requestDate)}</Text>
              </View>
              <View style={styles.docFieldFull}>
                <Text style={styles.docFieldLabel}>Purpose</Text>
                <Text style={styles.docFieldValue}>{doc.purpose}</Text>
              </View>
            </View>

            {doc.notes && (
              <View style={styles.updateBox}>
                <Text style={styles.updateTitle}>Update</Text>
                <Text style={styles.updateText}>{doc.notes}</Text>
              </View>
            )}

            {(doc.status === 'ready' || doc.status === 'released') && (
              <Pressable style={styles.claimBtn} onPress={(e: any) => { e.stopPropagation?.(); goToDocumentStatus(doc); }}>
                <Ionicons name="download-outline" size={16} color="#ffffff" />
                <Text style={styles.claimBtnText}>View Pickup Details</Text>
              </Pressable>
            )}

            {(doc.status === 'pending' || doc.status === 'processing') && (
              <Pressable
                style={styles.cancelBtn}
                onPress={(e: any) => { e.stopPropagation?.(); setCancelTarget(doc); }}
                disabled={cancellingId === doc.id}
              >
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.cancelBtnText}>{cancellingId === doc.id ? 'Cancelling…' : 'Cancel Request'}</Text>
              </Pressable>
            )}
          </>
        )}
      </Pressable>
    );
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
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
              <Ionicons name="document-text-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Document Requests</Text>
              <Text style={styles.pageSubtitle}>Request and track your documents</Text>
            </View>
          </View>

          {/* Request Document button */}
          <Pressable style={styles.requestBtn} onPress={openDialog}>
            <Ionicons name="add-outline" size={18} color="#ffffff" />
            <Text style={styles.requestBtnText}>Request Document</Text>
          </Pressable>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsRow}
            contentContainerStyle={{ gap: 8 }}
          >
            {TABS.map((tab) => {
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

          {docsError && (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Something went wrong</Text>
              <Text style={styles.emptyDescription}>{docsError}</Text>
              <Pressable style={styles.requestBtn} onPress={fetchDocuments}>
                <Text style={styles.requestBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {docsLoading && !docsError && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyDescription}>Loading documents…</Text>
            </View>
          )}

          {/* Active Tab */}
          {!docsLoading && !docsError && activeTab === 'active' && (
            <View style={styles.tabPanel}>
              {activeDocuments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No active requests</Text>
                  <Text style={styles.emptyDescription}>Start by requesting a document</Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {activeDocuments.map((doc) => renderDocumentCard(doc, false))}
                </View>
              )}
            </View>
          )}

          {/* Claimed Tab */}
          {!docsLoading && !docsError && activeTab === 'claimed' && (
            <View style={styles.tabPanel}>
              {claimedDocuments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Completed Requests</Text>
                  <Text style={styles.emptyDescription}>You have no records of claimed documents.</Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {claimedDocuments.map((doc) => renderDocumentCard(doc, true))}
                </View>
              )}
            </View>
          )}

          {/* Rejected Tab */}
          {!docsLoading && !docsError && activeTab === 'rejected' && (
            <View style={styles.tabPanel}>
              {rejectedDocuments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="close-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Rejected Requests</Text>
                  <Text style={styles.emptyDescription}>You have no records of rejected document requests.</Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {rejectedDocuments.map((doc) => renderDocumentCard(doc, true))}
                </View>
              )}
            </View>
          )}

          {/* Cancelled Tab */}
          {!docsLoading && !docsError && activeTab === 'cancelled' && (
            <View style={styles.tabPanel}>
              {cancelledDocuments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="close-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Cancelled Requests</Text>
                  <Text style={styles.emptyDescription}>You have no records of cancelled document requests.</Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {cancelledDocuments.map((doc) => renderDocumentCard(doc, true))}
                </View>
              )}
            </View>
          )}

          {/* Processing Times info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeaderRow}>
              <Ionicons name="information-circle-outline" size={18} color={theme.orange} />
              <Text style={styles.infoTitle}>Processing Times</Text>
            </View>
            <Text style={styles.infoSubtitle}>Estimated completion times for documents</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Regular Processing</Text>
              <Text style={styles.infoBullet}>• Certificates: 3-5 business days</Text>
              <Text style={styles.infoBullet}>• Transcript of Records: 5-7 business days</Text>
              <Text style={styles.infoBullet}>• Diploma: 7-10 business days</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Rush Processing</Text>
              <Text style={styles.infoBullet}>• Additional fee applies</Text>
              <Text style={styles.infoBullet}>• 1-2 business days</Text>
              <Text style={styles.infoBullet}>• Subject to availability</Text>
            </View>
          </View>
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
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''}</Text>
            </View>

            <View style={styles.drawerNav}>
              {navItems.map((item) => {
                const active = item.key === 'documents';
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

      {/* New Document Request Dialog */}
      <Modal visible={dialogOpen} animationType="fade" transparent onRequestClose={() => setDialogOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeaderRow}>
              <View>
                <Text style={styles.dialogHeaderTitle}>New Document Request</Text>
                <Text style={styles.dialogHeaderSubtitle}>Submit a request for official documents</Text>
              </View>
              <Pressable onPress={() => setDialogOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.subtext} />
              </Pressable>
            </View>
            <ScrollView style={styles.dialogBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>College</Text>
                <Pressable style={styles.formSelect} onPress={() => setSelectField('college')}>
                  <Text style={styles.formSelectText} numberOfLines={1}>
                    {formData.college || 'Select college'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.orange} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Document Type</Text>
                <Pressable style={styles.formSelect} onPress={() => setSelectField('type')}>
                  <Text style={styles.formSelectText} numberOfLines={1}>
                    {formData.type || 'Select document type'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.orange} />
                </Pressable>
              </View>

              {selectedTypeDetails && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>
                    <Text style={styles.hintBold}>Processing Time: </Text>
                    {selectedTypeDetails.processingTime || 'TBD'}
                  </Text>
                  {selectedTypeDetails.requirements.length > 0 && (
                    <View style={styles.hintRequirements}>
                      <Text style={[styles.hintText, styles.hintBold]}>Requirements:</Text>
                      {selectedTypeDetails.requirements.map((req) => (
                        <View key={req.name} style={styles.hintRequirementRow}>
                          <View style={styles.hintRequirementNameRow}>
                            <Text style={styles.hintText}>{req.name}</Text>
                            <View style={req.isMandatory ? styles.reqTagRequired : styles.reqTagOptional}>
                              <Text style={req.isMandatory ? styles.reqTagRequiredText : styles.reqTagOptionalText}>
                                {req.isMandatory ? 'Required' : 'Optional'}
                              </Text>
                            </View>
                          </View>
                          {req.description && <Text style={styles.hintRequirementDesc}>{req.description}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Number of Copies</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="number-pad"
                  value={formData.copies}
                  onChangeText={(v) => setFormData((f) => ({ ...f, copies: v }))}
                  placeholderTextColor={theme.tertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Purpose</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Specify the purpose of your request"
                  placeholderTextColor={theme.tertiary}
                  value={formData.purpose}
                  onChangeText={(v) => setFormData((f) => ({ ...f, purpose: v }))}
                  multiline
                  numberOfLines={3}
                  maxLength={255}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Needed By (optional)</Text>
                <Pressable style={styles.formSelect} onPress={() => setShowNeededByPicker(true)}>
                  <Text style={formData.neededBy ? styles.formSelectText : styles.formSelectPlaceholder}>
                    {formData.neededBy || 'Select a date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.orange} />
                </Pressable>
                {showNeededByPicker && (
                  <DateTimePicker
                    value={formData.neededBy ? new Date(formData.neededBy) : tomorrowDate}
                    mode="date"
                    minimumDate={tomorrowDate}
                    onChange={(event, selectedDate) => {
                      setShowNeededByPicker(false);
                      if (event.type === 'set' && selectedDate) {
                        setFormData((f) => ({ ...f, neededBy: selectedDate.toISOString().slice(0, 10) }));
                      }
                    }}
                  />
                )}
              </View>
            </ScrollView>
            <View style={styles.dialogActions}>
              <Pressable style={styles.btnSecondary} onPress={() => setDialogOpen(false)} disabled={submitting}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={handleSubmitRequest} disabled={submitting}>
                <Text style={styles.btnPrimaryText}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* College / Document Type Select Modal */}
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
                    {selected && <Ionicons name="checkmark" size={16} color={theme.orange} />}
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

      {/* Cancel Request Confirm Modal */}
      <Modal visible={cancelTarget !== null} animationType="fade" transparent onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="document-text-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Cancel Request?</Text>
            <Text style={styles.logoutModalDescription}>
              You are about to cancel your request for {cancelTarget?.type}. It will move to your Cancelled
              requests — you&apos;re welcome to submit a new one if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setCancelTarget(null)}>
                <Text style={styles.logoutCancelBtnText}>Keep Request</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={doCancelRequest} disabled={cancellingId === cancelTarget?.id}>
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutConfirmBtnText}>
                  {cancellingId === cancelTarget?.id ? 'Cancelling…' : 'Cancel Request'}
                </Text>
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

type ThemePalette = {
  background: string;
  card: string;
  cardAlt: string;
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
  orange: string;
  orangeDark: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
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
  orange: '#f97316',
  orangeDark: '#ea580c',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: 'rgba(248, 250, 252, 0.9)',
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

    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Request button
    requestBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.orange, paddingVertical: 14, borderRadius: 14, alignSelf: 'flex-start', paddingHorizontal: 20,
    },
    requestBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

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

    tabPanel: { gap: 16 },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.25)', borderRadius: 18,
      paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },

    // Document cards
    docsList: { gap: 12 },
    docCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 16, padding: 14, gap: 12,
    },
    docCardCompleted: { opacity: 0.85 },
    docCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    docIconWrap: {
      width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(249, 115, 22, 0.1)', flexShrink: 0,
    },
    docIconWrapCompleted: { backgroundColor: 'rgba(107, 114, 128, 0.1)' },
    docTitleSection: { flex: 1, gap: 2 },
    docTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    docCollege: { fontSize: 12, color: theme.subtext },
    docTracking: { fontSize: 11, color: theme.tertiary },
    docTrackingValue: { fontWeight: '700', color: theme.success },

    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, flexShrink: 0,
    },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },

    docFieldsGrid: { gap: 10 },
    docField: { gap: 3 },
    docFieldFull: { gap: 3 },
    docFieldLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    docFieldValue: { fontSize: 13, fontWeight: '600', color: theme.text, lineHeight: 18 },

    updateBox: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)',
      borderRadius: 12, padding: 10, gap: 4,
    },
    updateTitle: { fontSize: 12, fontWeight: '700', color: theme.success },
    updateText: { fontSize: 12, color: theme.text, lineHeight: 17 },

    claimBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 12, borderRadius: 12, backgroundColor: theme.primary,
    },
    claimBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

    // Processing times info card
    infoCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 18, padding: 18, gap: 14,
    },
    infoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoTitle: { fontSize: 15, fontWeight: '800', color: theme.text },
    infoSubtitle: { fontSize: 12, color: theme.tertiary, marginTop: -8 },
    infoSection: { gap: 4 },
    infoSectionTitle: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 2 },
    infoBullet: { fontSize: 12, color: theme.subtext, lineHeight: 18 },

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

    hintBox: {
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
      padding: 12, gap: 6, marginBottom: 16,
    },
    hintText: { fontSize: 12.5, color: theme.subtext, lineHeight: 18 },
    hintBold: { fontWeight: '700', color: theme.text },
    hintRequirements: { gap: 6, marginTop: 2 },
    hintRequirementRow: { gap: 2 },
    hintRequirementNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    hintRequirementDesc: { fontSize: 11.5, color: theme.tertiary, opacity: 0.85 },
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

    // Request dialog
    dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    dialogCard: {
      width: '100%', maxWidth: 400, maxHeight: '85%', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, overflow: 'hidden',
    },
    dialogHeaderRow: {
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: 18, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    dialogHeaderTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    dialogHeaderSubtitle: { fontSize: 12, color: theme.tertiary, marginTop: 4 },
    dialogBody: { padding: 18 },
    formGroup: { gap: 8, marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    formSelect: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background,
    },
    formSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },
    formSelectPlaceholder: { fontSize: 13, color: theme.tertiary, flex: 1, marginRight: 8 },
    formInput: {
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
      padding: 12, color: theme.text, fontSize: 13,
    },
    textarea: {
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
      padding: 12, color: theme.text, fontSize: 13, minHeight: 80, textAlignVertical: 'top',
    },
    dialogActions: {
      flexDirection: 'row', gap: 10, justifyContent: 'flex-end',
      padding: 18, borderTopWidth: 1, borderTopColor: theme.border,
    },
    btnPrimary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.orange },
    btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    btnSecondary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    btnSecondaryText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

    // Confirm / select modals (shared card look)
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

    // College / document type select modal
    filterModalCard: {
      width: '100%', maxWidth: 340, maxHeight: '70%', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 20, alignItems: 'stretch', gap: 12,
    },
    filterOptionsList: { maxHeight: 320 },
    filterOptionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(249, 115, 22, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.orange, fontWeight: '700' },
    filterModalClose: {
      paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4,
    },
    filterModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },
  });
}
