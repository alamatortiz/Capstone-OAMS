import { useState } from 'react';
import type { ComponentProps } from 'react';
import {
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
import { useRouter } from 'expo-router';

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

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors stud-document-status.jsx) ───
const demoStudent = {
  name: 'Demo Student',
  role: 'Student',
  studentNumber: '2300001',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type DocStatus = 'pending' | 'processing' | 'ready' | 'released' | 'claimed' | 'rejected';

interface DocumentRecord {
  id: string;
  type: string;
  college: string;
  collegeAbbrev: string;
  requestDate: string;
  purpose: string;
  copies: number;
  status: DocStatus;
  trackingNumber: string;
  notes?: string;
  estimatedCompletion?: string;
  claimedDate?: string;
  releasedDate?: string;
}

const initialDocuments: DocumentRecord[] = [
  {
    id: 'd1', type: 'Good Moral Certificate', college: 'College of Computing Studies', collegeAbbrev: 'CCS',
    requestDate: '2026-03-25', purpose: 'Job application requirement', copies: 2,
    status: 'processing', trackingNumber: 'DOC-2026-001234', estimatedCompletion: '2026-03-30',
  },
  {
    id: 'd2', type: 'Transcript of Records', college: 'College of Computing Studies', collegeAbbrev: 'CCS',
    requestDate: '2026-03-20', purpose: 'Graduate school application', copies: 1,
    status: 'ready', trackingNumber: 'DOC-2026-001189', notes: 'Ready for pickup at Registrar Office',
  },
  {
    id: 'd3', type: 'Certificate of Enrollment', college: 'College of Computing Studies', collegeAbbrev: 'CCS',
    requestDate: '2026-02-10', purpose: 'Scholarship application', copies: 1,
    status: 'claimed', trackingNumber: 'DOC-2026-000871', claimedDate: '2026-02-14',
  },
  {
    id: 'd4', type: 'Certificate of Grades', college: 'College of Computing Studies', collegeAbbrev: 'CCS',
    requestDate: '2026-01-18', purpose: 'Transfer credit evaluation', copies: 1,
    status: 'rejected', trackingNumber: 'DOC-2026-000602', notes: 'Incomplete requirements submitted. Please resubmit with your latest grade slip.',
  },
];

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

const STATUS_META: Record<DocStatus, { label: string; bg: string; border: string; color: string }> = {
  pending: { label: 'Pending', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)', color: '#f59e0b' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  ready: { label: 'Ready for Pickup', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { label: 'Released', bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.35)', color: '#9ca3af' },
  claimed: { label: 'Claimed', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const formatDateLong = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type TabKey = 'active' | 'completed';

export default function StudentDocumentStatusScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

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
  const confirmLogout = () => { setLogoutModalVisible(false); router.replace('/login'); };

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) ?? null : null;
  const collegeLogoFor = (abbrev: string) => collegeLogos[abbrev] ?? ccsLogo;

  const activeDocuments = documents.filter((d) => d.status !== 'claimed' && d.status !== 'rejected');
  const completedDocuments = documents.filter((d) => d.status === 'claimed' || d.status === 'rejected');

  const confirmCancelRequest = () => {
    if (!selectedDoc) return;
    setDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id));
    setShowCancelDialog(false);
    setSelectedDocId(null);
    Alert.alert('Request cancelled', 'Your document request has been cancelled.');
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
          {selectedDoc ? (
            <DocumentDetail
              theme={theme}
              styles={styles}
              doc={selectedDoc}
              collegeLogoFor={collegeLogoFor}
              onBack={() => setSelectedDocId(null)}
              onCancel={() => setShowCancelDialog(true)}
            />
          ) : (
            <>
              {/* Breadcrumb */}
              <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>Dashboard</Text>
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
              <View style={styles.tabsRow}>
                <Pressable style={[styles.tab, activeTab === 'active' && styles.tabActive]} onPress={() => setActiveTab('active')}>
                  <Ionicons name="alert-circle-outline" size={15} color={activeTab === 'active' ? theme.orange : theme.subtext} />
                  <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active Requests</Text>
                  <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{activeDocuments.length}</Text></View>
                </Pressable>
                <Pressable style={[styles.tab, activeTab === 'completed' && styles.tabActive]} onPress={() => setActiveTab('completed')}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={activeTab === 'completed' ? theme.orange : theme.subtext} />
                  <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Completed</Text>
                  <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{completedDocuments.length}</Text></View>
                </Pressable>
              </View>

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
                        completed={false}
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="document-text-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Active Requests</Text>
                    <Text style={styles.emptyDescription}>You have no active document requests.</Text>
                    <Pressable style={styles.emptyRequestBtn} onPress={() => router.push('/pages/student/student_documents')}>
                      <Text style={styles.emptyRequestBtnText}>Request a Document</Text>
                    </Pressable>
                  </View>
                )
              )}

              {/* Completed Tab */}
              {activeTab === 'completed' && (
                completedDocuments.length > 0 ? (
                  <View style={styles.docsList}>
                    {completedDocuments.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        theme={theme}
                        styles={styles}
                        doc={doc}
                        completed
                        onPress={() => setSelectedDocId(doc.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No Completed Requests</Text>
                    <Text style={styles.emptyDescription}>Your completed and rejected requests will appear here.</Text>
                  </View>
                )
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
                <Text style={styles.drawerName}>{demoStudent.name}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>{demoStudent.role}</Text>
              </View>
              <Text style={styles.drawerCollege}>{demoStudent.departmentName}</Text>
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
              You are about to cancel your request for {selectedDoc?.type}. This will permanently remove your
              request — you will need to submit a new one if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setShowCancelDialog(false)}>
                <Text style={styles.logoutCancelBtnText}>Keep Request</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={confirmCancelRequest}>
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutConfirmBtnText}>Cancel Request</Text>
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
  onPress,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  completed: boolean;
  onPress: () => void;
}) {
  const meta = STATUS_META[doc.status];
  return (
    <Pressable style={[styles.listCard, completed && styles.listCardCompleted]} onPress={onPress}>
      <View style={styles.listCardHeader}>
        <View style={[styles.listIconWrap, completed && styles.listIconWrapCompleted]}>
          <Ionicons name="document-text-outline" size={20} color={completed ? theme.tertiary : theme.orange} />
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
        <View style={styles.listField}>
          <Text style={styles.listFieldLabel}>{completed ? 'Date Requested' : 'Request Date'}</Text>
          <Text style={styles.listFieldValue}>{formatDateShort(doc.requestDate)}</Text>
        </View>
        {!completed && doc.estimatedCompletion && (
          <View style={styles.listField}>
            <Text style={styles.listFieldLabel}>Est. Completion</Text>
            <Text style={styles.listFieldValue}>{formatDateShort(doc.estimatedCompletion)}</Text>
          </View>
        )}
        {completed && doc.claimedDate && (
          <View style={styles.listField}>
            <Text style={styles.listFieldLabel}>Date Acquired</Text>
            <Text style={styles.listFieldValue}>{formatDateShort(doc.claimedDate)}</Text>
          </View>
        )}
        <View style={styles.listFieldFull}>
          <Text style={styles.listFieldLabel}>Purpose</Text>
          <Text style={styles.listFieldValueMuted} numberOfLines={2}>{doc.purpose}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail view — hero + request details + notes + tracking + cancel ───
function DocumentDetail({
  theme,
  styles,
  doc,
  collegeLogoFor,
  onBack,
  onCancel,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  doc: DocumentRecord;
  collegeLogoFor: (abbrev: string) => ImageSourcePropType;
  onBack: () => void;
  onCancel: () => void;
}) {
  const meta = STATUS_META[doc.status];
  const canCancel = doc.status === 'pending' || doc.status === 'processing';

  return (
    <>
      {/* Breadcrumb */}
      <Pressable style={styles.breadcrumb} onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={theme.subtext} />
        <Text style={styles.breadcrumbText}>All Documents</Text>
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
        <View style={styles.readyBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document is ready for pickup — please visit the registrar&apos;s office!
          </Text>
        </View>
      )}

      {/* Released alert */}
      {doc.status === 'released' && (
        <View style={styles.releasedBanner}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.readyBannerText}>
            Your document has been released to the registrar&apos;s office — visit to complete pickup.
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
          <Text style={styles.detailLabel}>Request Date</Text>
          <Text style={styles.detailValue}>{formatDateLong(doc.requestDate)}</Text>
        </View>
        {doc.status === 'claimed' && doc.claimedDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Acquired</Text>
            <Text style={styles.detailValue}>{formatDateLong(doc.claimedDate)}</Text>
          </View>
        ) : doc.status === 'released' && doc.releasedDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Released</Text>
            <Text style={styles.detailValue}>{formatDateLong(doc.releasedDate)}</Text>
          </View>
        ) : doc.estimatedCompletion ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Completion</Text>
            <Text style={styles.detailValue}>{formatDateLong(doc.estimatedCompletion)}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Number of Copies</Text>
          <Text style={styles.detailValue}>{doc.copies}</Text>
        </View>
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text style={styles.detailLabel}>Purpose</Text>
          <Text style={styles.detailValue}>{doc.purpose}</Text>
        </View>
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
            Cancelling will permanently remove this request. You&apos;ll need to resubmit if you change your mind.
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
      backgroundColor: '#16a34a', borderRadius: 16, padding: 14,
    },
    releasedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#4b5563', borderRadius: 16, padding: 14,
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
