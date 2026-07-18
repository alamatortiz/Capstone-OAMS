import { useState } from 'react';
import type { ComponentProps } from 'react';
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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors ScanDocumentPage.tsx's
// mock document set, merged with the real admin-scan-document.jsx's generated/
// released/claimed document-status + claim workflow, whose real endpoints are
// GET /admin/scan-document/verify/:code, GET /admin/scan-document/recent and
// PATCH /admin/document-processing/:id/status) ───
const demoAdmin = {
  name: 'Demo Admin',
  role: 'Admin',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type DocStatus = 'valid' | 'expired';
type DocumentStatus = 'generated' | 'released' | 'claimed';

interface ScannedDocument {
  trackingNumber: string;
  documentType: string;
  studentName: string;
  studentId: string;
  college: string;
  issueDate: string;
  validUntil: string;
  status: DocStatus;
  documentStatus: DocumentStatus;
  content: string;
  issuedBy: string;
  authorizedSignatory: string;
}

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  generated: 'Ready for Pickup',
  released: 'Released — awaiting claim',
  claimed: 'Claimed',
};

const INITIAL_DOCUMENTS: Record<string, ScannedDocument> = {
  'DOC-2026-0327-001-QR': {
    trackingNumber: 'DOC-2026-0327-001',
    documentType: 'Certificate of Grades',
    studentName: 'Juan Dela Cruz',
    studentId: '2100001',
    college: 'College of Computing Studies (CCS)',
    issueDate: '2026-03-27',
    validUntil: '2026-12-31',
    status: 'valid',
    documentStatus: 'released',
    content: `UNIVERSITY OF CABUYAO
College of Computing Studies

CERTIFICATE OF GRADES

This is to certify that JUAN DELA CRUZ, with Student ID: 2100001,
has completed the following courses:

First Semester, AY 2025-2026:
- CS 101 Introduction to Programming - 1.50
- CS 102 Data Structures - 1.75
- MATH 101 Calculus I - 2.00
- ENG 101 Technical Writing - 1.75

General Weighted Average: 1.81

This certificate is valid until December 31, 2026.`,
    issuedBy: 'Office of the University Registrar',
    authorizedSignatory: 'Maria T. Santos, University Registrar',
  },
  'DOC-2026-0326-012-QR': {
    trackingNumber: 'DOC-2026-0326-012',
    documentType: 'Good Moral Certificate',
    studentName: 'Ana Lopez',
    studentId: '2100045',
    college: 'College of Education (COED)',
    issueDate: '2026-03-26',
    validUntil: '2026-09-26',
    status: 'valid',
    documentStatus: 'claimed',
    content: `UNIVERSITY OF CABUYAO
Office of Student Affairs

CERTIFICATE OF GOOD MORAL CHARACTER

TO WHOM IT MAY CONCERN:

This is to certify that ANA LOPEZ, with Student ID: 2100045,
currently enrolled in the College of Education (COED), has demonstrated
good moral character during their stay in the university.

Valid for six (6) months from the date of issue.`,
    issuedBy: 'Office of Student Affairs',
    authorizedSignatory: 'Roberto D. Cruz, Director of Student Affairs',
  },
  'DOC-2026-0320-008-QR': {
    trackingNumber: 'DOC-2026-0320-008',
    documentType: 'Certificate of Enrollment',
    studentName: 'Sofia Martinez',
    studentId: '2100078',
    college: 'College of Health and Allied Sciences (CHAS)',
    issueDate: '2026-03-20',
    validUntil: '2026-03-19',
    status: 'expired',
    documentStatus: 'generated',
    content: `UNIVERSITY OF CABUYAO
Office of the University Registrar

CERTIFICATE OF ENROLLMENT

This is to certify that SOFIA MARTINEZ, with Student ID: 2100078,
is currently enrolled in the College of Health and Allied Sciences (CHAS)
for the Second Semester, Academic Year 2025-2026.

Course: Bachelor of Science in Nursing
Year Level: 4th Year
Status: Regular Student

Valid until March 19, 2026 (Expired)`,
    issuedBy: 'Office of the University Registrar',
    authorizedSignatory: 'Maria T. Santos, University Registrar',
  },
};

interface RecentScan {
  trackingNumber: string;
  documentType: string;
  studentName: string;
  scannedAt: string;
  status: DocStatus;
}

const INITIAL_RECENT_SCANS: RecentScan[] = [
  { trackingNumber: 'DOC-2026-0327-001', documentType: 'Certificate of Grades', studentName: 'Juan Dela Cruz', scannedAt: '2 minutes ago', status: 'valid' },
  { trackingNumber: 'DOC-2026-0326-012', documentType: 'Good Moral Certificate', studentName: 'Ana Lopez', scannedAt: '15 minutes ago', status: 'valid' },
  { trackingNumber: 'DOC-2026-0320-008', documentType: 'Certificate of Enrollment', studentName: 'Sofia Martinez', scannedAt: '1 hour ago', status: 'expired' },
];

const STATUS_TINTS: Record<DocStatus, { bg: string; border: string; color: string }> = {
  valid: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  expired: { bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.35)', color: '#f87171' },
};

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

function formatDisplayDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminScanDocumentScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();

  const [documents, setDocuments] = useState<Record<string, ScannedDocument>>(INITIAL_DOCUMENTS);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScan[]>(INITIAL_RECENT_SCANS);
  const [scanToast, setScanToast] = useState(false);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
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
    router.replace('/login');
  };

  const flashToast = () => {
    setScanToast(true);
    setTimeout(() => setScanToast(false), 3000);
  };

  const applyScan = (code: string, doc: ScannedDocument) => {
    setScannedCode(code);
    setErrorMsg('');
    flashToast();
    setRecentScans((prev) =>
      [
        {
          trackingNumber: doc.trackingNumber,
          documentType: doc.documentType,
          studentName: doc.studentName,
          scannedAt: 'Just now',
          status: doc.status,
        },
        ...prev,
      ].slice(0, 5),
    );
  };

  const handleStartScanning = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      applyScan('DOC-2026-0327-001-QR', documents['DOC-2026-0327-001-QR']);
    }, 2000);
  };

  const processCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const doc = documents[trimmed];
    if (!doc) {
      setErrorMsg('No document found for this QR code. Please check and try again.');
      return;
    }
    applyScan(trimmed, doc);
    setManualCode('');
  };

  const handleVerify = () => processCode(manualCode);

  const handleQuickCode = (code: string) => {
    setManualCode(code);
    processCode(code);
  };

  const handleCloseModal = () => setScannedCode(null);

  const handleMarkClaimed = () => {
    if (!scannedCode) return;
    setDocuments((prev) => ({
      ...prev,
      [scannedCode]: { ...prev[scannedCode], documentStatus: 'claimed' },
    }));
  };

  const scannedDocument = scannedCode ? documents[scannedCode] : null;

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
              <Image source={isDarkMode ? sunIcon : darkModeIcon} style={styles.iconBtnImg} resizeMode="contain" />
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
              <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Document Scanner</Text>
              <Text style={styles.pageSubtitle}>Scan QR codes to verify and view document details</Text>
            </View>
          </View>

          {/* QR Code Scanner */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="qr-code-outline" size={19} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>QR Code Scanner</Text>
                <Text style={styles.cardSubtitleText}>Position the QR code within the scanner area</Text>
              </View>
            </View>

            <View style={styles.scannerViewport}>
              {scanning ? (
                <View style={styles.scannerCenter}>
                  <View style={[styles.scannerFrame, styles.scannerFrameActive]}>
                    <ActivityIndicator size="large" color="#22c55e" />
                  </View>
                  <Text style={styles.scannerHint}>Scanning…</Text>
                </View>
              ) : (
                <View style={styles.scannerCenter}>
                  <View style={styles.scannerFrame}>
                    <Ionicons name="qr-code-outline" size={64} color={theme.tertiary} style={{ opacity: 0.5 }} />
                  </View>
                  <Text style={styles.scannerHint}>Click the button below to start scanning</Text>
                  <Text style={styles.scannerHintSmall}>Or enter the QR code manually</Text>
                </View>
              )}
            </View>

            <Pressable style={[styles.scanBtn, scanning && styles.scanBtnDisabled]} onPress={handleStartScanning} disabled={scanning}>
              <Text style={styles.scanBtnText}>{scanning ? 'Scanning…' : 'Start Scanning'}</Text>
            </Pressable>
          </View>

          {/* Manual QR Code Entry */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="document-text-outline" size={19} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>Manual QR Code Entry</Text>
                <Text style={styles.cardSubtitleText}>Enter the QR code manually if scanner is unavailable</Text>
              </View>
            </View>

            <View style={styles.manualEntryRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter QR code"
                placeholderTextColor={theme.tertiary}
                value={manualCode}
                onChangeText={(t) => {
                  setManualCode(t);
                  setErrorMsg('');
                }}
                autoCapitalize="characters"
                onSubmitEditing={handleVerify}
              />
              <Pressable style={styles.verifyBtn} onPress={handleVerify}>
                <Text style={styles.verifyBtnText}>Verify</Text>
              </Pressable>
            </View>
            {!!errorMsg && <Text style={styles.errorMsg}>{errorMsg}</Text>}

            <Text style={styles.quickLabel}>Quick test codes:</Text>
            <View style={styles.quickCodesRow}>
              {Object.keys(documents).map((code) => (
                <Pressable key={code} style={styles.quickCodeBtn} onPress={() => handleQuickCode(code)}>
                  <Text style={styles.quickCodeBtnText}>{code}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Scans */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="time-outline" size={19} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>Recent Scans</Text>
                <Text style={styles.cardSubtitleText}>Recently scanned documents</Text>
              </View>
            </View>
            <View style={styles.recentList}>
              {recentScans.map((scan, i) => {
                const tint = STATUS_TINTS[scan.status];
                return (
                  <View key={`${scan.trackingNumber}-${i}`} style={styles.recentItem}>
                    <View style={styles.recentTopRow}>
                      <Text style={styles.recentName} numberOfLines={1}>{scan.studentName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                        <Text style={[styles.statusBadgeText, { color: tint.color }]}>{scan.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.recentDocType}>{scan.documentType}</Text>
                    <View style={styles.recentBottomRow}>
                      <Text style={styles.recentTracking}>{scan.trackingNumber}</Text>
                      <Text style={styles.recentTime}>{scan.scannedAt}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Scanning Tips */}
          <View style={[styles.card, styles.tipsCard]}>
            <Text style={styles.tipsTitle}>Scanning Tips</Text>
            <View style={styles.tipsList}>
              {[
                'Ensure good lighting for optimal scanning',
                'Hold the QR code steady within the frame',
                'Keep the document flat and unwrinkled',
                'Use manual entry if QR code is damaged',
              ].map((tip) => (
                <View key={tip} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Document Verification Modal */}
      <Modal visible={!!scannedDocument} animationType="fade" transparent onRequestClose={handleCloseModal}>
        {scannedDocument && (
          <View style={styles.modalOverlay}>
            <View style={styles.docModalCard}>
              <View style={styles.docModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docModalTitle}>Document Verification</Text>
                  <Text style={styles.docModalSubtitle}>Scanned document details and softcopy content</Text>
                </View>
                <Pressable onPress={handleCloseModal} hitSlop={8}>
                  <Ionicons name="close-outline" size={22} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.docModalBody}>
                <View
                  style={[
                    styles.verifiedBanner,
                    scannedDocument.status === 'valid' ? styles.verifiedBannerValid : styles.verifiedBannerExpired,
                  ]}
                >
                  <Ionicons
                    name={scannedDocument.status === 'valid' ? 'checkmark-circle' : 'alert-circle'}
                    size={26}
                    color={scannedDocument.status === 'valid' ? '#22c55e' : '#f87171'}
                  />
                  <Text
                    style={[
                      styles.verifiedTitle,
                      { color: scannedDocument.status === 'valid' ? '#22c55e' : '#f87171' },
                    ]}
                  >
                    {scannedDocument.status === 'valid' ? 'Document Verified ✓' : 'Document Expired'}
                  </Text>
                  <Text
                    style={[
                      styles.verifiedDesc,
                      { color: scannedDocument.status === 'valid' ? '#22c55e' : '#f87171' },
                    ]}
                  >
                    {scannedDocument.status === 'valid'
                      ? 'This document has been authenticated against university records'
                      : 'This document has passed its validity date'}
                  </Text>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Tracking Number</Text>
                    <Text style={styles.metaValue}>{scannedDocument.trackingNumber}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Document Type</Text>
                    <Text style={styles.metaValue}>{scannedDocument.documentType}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Student Name</Text>
                    <Text style={styles.metaValue}>{scannedDocument.studentName}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Student ID</Text>
                    <Text style={styles.metaValue}>{scannedDocument.studentId}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>College</Text>
                    <Text style={styles.metaValue}>{scannedDocument.college}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <Text style={[styles.metaValue, { color: STATUS_TINTS[scannedDocument.status].color }]}>
                      {scannedDocument.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Document Status</Text>
                    <Text style={styles.metaValue}>{DOCUMENT_STATUS_LABELS[scannedDocument.documentStatus]}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Issue Date</Text>
                    <Text style={styles.metaValue}>{formatDisplayDate(scannedDocument.issueDate)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Valid Until</Text>
                    <Text style={styles.metaValue}>{formatDisplayDate(scannedDocument.validUntil)}</Text>
                  </View>
                </View>

                <View style={styles.docContentSection}>
                  <Text style={styles.docContentTitle}>Document Content</Text>
                  <ScrollView style={styles.docContentPreBox} nestedScrollEnabled>
                    <Text style={styles.docContentPreText}>{scannedDocument.content}</Text>
                  </ScrollView>
                </View>

                <View style={styles.footerInfo}>
                  <Text style={styles.footerInfoText}>
                    <Text style={styles.footerInfoStrong}>Issued by: </Text>
                    {scannedDocument.issuedBy}
                  </Text>
                  <Text style={styles.footerInfoText}>
                    <Text style={styles.footerInfoStrong}>Authorized Signatory: </Text>
                    {scannedDocument.authorizedSignatory}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.docModalActions}>
                {scannedDocument.documentStatus === 'released' && (
                  <Pressable style={styles.claimBtn} onPress={handleMarkClaimed}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
                    <Text style={styles.claimBtnText}>Mark as Claimed</Text>
                  </Pressable>
                )}
                <Pressable style={styles.printBtn} onPress={comingSoon}>
                  <Ionicons name="print-outline" size={15} color={theme.text} />
                  <Text style={styles.printBtnText}>Print</Text>
                </Pressable>
                <Pressable style={styles.printBtn} onPress={comingSoon}>
                  <Ionicons name="download-outline" size={15} color={theme.text} />
                  <Text style={styles.printBtnText}>Download</Text>
                </Pressable>
                <Pressable style={styles.closeModalBtn} onPress={handleCloseModal}>
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Toast */}
      {scanToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
          <Text style={styles.toastText}>QR Code scanned successfully!</Text>
        </View>
      )}

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
      />

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
            {navItems.map((item) => (
              <Pressable key={item.key} style={styles.drawerNavItem} onPress={() => onNavPress(item.key)}>
                <Ionicons name={item.icon} size={18} color={theme.subtext} />
                <Text style={styles.drawerNavLabel}>{item.label}</Text>
              </Pressable>
            ))}
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
  success: string;
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
  success: '#10b981',
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
  success: '#059669',
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

    scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title — mirrors admin-scan-document.css's .asd-title-icon orange gradient
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardTitleText: { fontSize: 15, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, marginTop: 2 },

    // Scanner viewport
    scannerViewport: {
      backgroundColor: theme.background,
      borderRadius: 10,
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scannerCenter: { alignItems: 'center', gap: 10 },
    scannerFrame: {
      width: 140,
      height: 140,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'rgba(107, 114, 128, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scannerFrameActive: { borderColor: '#22c55e' },
    scannerHint: { fontSize: 13, color: theme.subtext, textAlign: 'center' },
    scannerHintSmall: { fontSize: 11.5, color: theme.tertiary, textAlign: 'center' },

    scanBtn: { paddingVertical: 13, borderRadius: 10, backgroundColor: '#22c55e', alignItems: 'center' },
    scanBtnDisabled: { opacity: 0.7 },
    scanBtnText: { fontSize: 14, fontWeight: '700', color: '#000000' },

    // Manual entry
    manualEntryRow: { flexDirection: 'row', gap: 8 },
    manualInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 11,
      paddingHorizontal: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
    },
    verifyBtn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
    verifyBtnText: { fontSize: 13.5, fontWeight: '700', color: '#000000' },
    errorMsg: { fontSize: 12, color: '#f87171' },
    quickLabel: { fontSize: 11.5, color: theme.tertiary, marginTop: 2 },
    quickCodesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickCodeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    quickCodeBtnText: { fontSize: 11, color: theme.subtext, fontWeight: '600' },

    // Recent scans
    recentList: { gap: 10 },
    recentItem: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      gap: 3,
    },
    recentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    recentName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.text },
    recentDocType: { fontSize: 12, color: theme.subtext },
    recentBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    recentTracking: { fontSize: 11, color: theme.tertiary },
    recentTime: { fontSize: 11, color: theme.tertiary },
    statusBadge: { borderRadius: 999, borderWidth: 0.5, paddingVertical: 3, paddingHorizontal: 9 },
    statusBadgeText: { fontSize: 10.5, fontWeight: '700', textTransform: 'lowercase' },

    // Scanning tips
    tipsCard: { borderColor: 'rgba(29, 78, 216, 0.4)' },
    tipsTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    tipsList: { gap: 7 },
    tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    tipBullet: { fontSize: 12, color: theme.subtext, lineHeight: 17 },
    tipText: { flex: 1, fontSize: 12.5, color: theme.subtext, lineHeight: 17 },

    // Toast
    toast: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignSelf: 'center',
    },
    toastText: { fontSize: 13, fontWeight: '700', color: theme.primary },

    // Document verification modal
    docModalCard: {
      width: '100%',
      maxWidth: 460,
      maxHeight: '90%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
    },
    docModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    docModalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    docModalSubtitle: { fontSize: 11.5, color: theme.subtext, marginTop: 3 },
    docModalBody: { padding: 18 },

    verifiedBanner: {
      alignItems: 'center',
      gap: 5,
      padding: 16,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    verifiedBannerValid: { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22c55e' },
    verifiedBannerExpired: { backgroundColor: 'rgba(248, 113, 113, 0.08)', borderColor: '#f87171' },
    verifiedTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    verifiedDesc: { fontSize: 12, textAlign: 'center', opacity: 0.85 },

    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    metaItem: { width: '46%', gap: 3 },
    metaLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    metaValue: { fontSize: 13.5, fontWeight: '600', color: theme.text },

    docContentSection: { marginTop: 18, gap: 8 },
    docContentTitle: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    docContentPreBox: {
      maxHeight: 200,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
    },
    docContentPreText: { fontSize: 11.5, color: theme.subtext, lineHeight: 18, fontFamily: 'Courier New' },

    footerInfo: { marginTop: 16, gap: 4 },
    footerInfoText: { fontSize: 12.5, color: theme.subtext },
    footerInfoStrong: { fontWeight: '700', color: theme.text },

    docModalActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    claimBtnText: { fontSize: 12.5, fontWeight: '700', color: '#10b981' },
    printBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    printBtnText: { fontSize: 12.5, fontWeight: '700', color: theme.text },
    closeModalBtn: {
      marginLeft: 'auto',
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: '#22c55e',
    },
    closeModalBtnText: { fontSize: 12.5, fontWeight: '700', color: '#000000' },

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
