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
import { initialDocuments } from './admin_document_processing';
import { initialQueueDetails, ACTIVE_STATUSES } from './admin_queue';

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
const editIcon = require('@/assets/edit_icon.png');
const deleteIcon = require('@/assets/delete_icon.png');

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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors AdminDashboard/admin-dashboard.jsx) ───
const demoAdmin = {
  name: 'Demo Admin',
  role: 'Admin',
  employeeId: 'ADM-2021-999',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

const STAT_TINTS = {
  blue: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' },
  orange: { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' },
  emerald: { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.25)', color: '#10b981' },
  purple: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.25)', color: '#a855f7' },
} as const;

interface StatItem {
  key: string;
  title: string;
  value: string;
  description: string;
  icon: IoniconName;
  tint: keyof typeof STAT_TINTS;
}

// Mirrors the same demo dataset admin_document_processing.tsx renders, so this count doesn't drift from what the Documents screen actually shows.
const pendingDocumentsCount = initialDocuments.filter((d) => d.status === 'pending').length;

// Mirrors the same demo dataset admin_queue.tsx renders (GET /admin/queue-hosting is scoped
// to the admin's own department server-side, so this is never a cross-college count).
const activeQueuesCount = initialQueueDetails.filter((q) => ACTIVE_STATUSES.includes(q.status)).length;

const stats: StatItem[] = [
  { key: 'queues', title: 'Active Queues', value: String(activeQueuesCount), description: `In ${demoAdmin.departmentName}`, icon: 'time-outline', tint: 'blue' },
  { key: 'documents', title: 'Pending Documents', value: String(pendingDocumentsCount), description: 'Awaiting processing', icon: 'document-text-outline', tint: 'orange' },
  { key: 'faculty', title: 'Faculty Available', value: '45', description: 'Today', icon: 'people-outline', tint: 'emerald' },
  { key: 'announcements', title: 'Announcements', value: '2', description: 'Published', icon: 'notifications-outline', tint: 'purple' },
];

interface ToolItem {
  key: string;
  title: string;
  description: string;
  icon: IoniconName;
  gradient: readonly [string, string];
}

// Icon backgrounds mirror admin-dashboard.css: bg-user-mgmt, bg-data-mgmt, bg-blue-600, bg-cyan-500
const adminTools: ToolItem[] = [
  { key: 'user-management', title: 'User Management', description: 'Manage user accounts', icon: 'people-outline', gradient: ['#94a3b8', '#64748b'] },
  { key: 'data-management', title: 'Data Management', description: 'Configure settings', icon: 'server-outline', gradient: ['#475569', '#334155'] },
  { key: 'queue-analytics', title: 'Queue Analytics', description: 'Performance metrics', icon: 'bar-chart-outline', gradient: ['#3b82f6', '#2563eb'] },
  { key: 'pinnacle-sync', title: 'Pinnacle Sync', description: 'Data synchronization', icon: 'sync-outline', gradient: ['#06b6d4', '#0891b2'] },
];

// Icon backgrounds mirror admin-dashboard.css: bg-scan-doc, bg-blue-500
const quickActions: ToolItem[] = [
  { key: 'scan-document', title: 'Scan Document', description: 'Verify QR codes and view document details', icon: 'qr-code-outline', gradient: ['#34d399', '#10b981'] },
  { key: 'host-queue', title: 'Host Queue', description: 'Manage and host student queues', icon: 'people-circle-outline', gradient: ['#3b82f6', '#2563eb'] },
];

const ANNOUNCEMENT_TAG_TINTS = {
  important: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' },
  reminder: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
} as const;

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  tag: keyof typeof ANNOUNCEMENT_TAG_TINTS;
  date: string;
  isPinned?: boolean;
}

const announcements: AnnouncementItem[] = [
  {
    id: '1',
    title: 'System Maintenance Notice',
    description: 'The OAMS system will undergo scheduled maintenance this weekend.',
    tag: 'important',
    date: '3/26/2026',
    isPinned: true,
  },
  {
    id: '2',
    title: 'Enrollment Period Reminder',
    description: 'Second Semester enrollment period: April 1 - April 15.',
    tag: 'reminder',
    date: '3/25/2026',
  },
];

const DOCUMENT_STATUS_TINTS = {
  pending: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  processing: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' },
} as const;

const COLLEGE_TEXT_COLORS: Record<string, string> = {
  CCS: '#f97316',
  CBAA: '#facc15',
  COED: '#2563eb',
  COE: '#ef4444',
  CAS: '#7f1d1d',
  CHAS: '#22c55e',
};

interface PendingDocument {
  id: string;
  name: string;
  document: string;
  college: string;
  date: string;
  status: keyof typeof DOCUMENT_STATUS_TINTS;
}

const pendingDocuments: PendingDocument[] = [
  { id: '1', name: 'Juan Dela Cruz', document: 'Certificate of Grades', college: 'CCS', date: '3/25/2026', status: 'pending' },
  { id: '2', name: 'Maria Santos', document: 'Good Moral Certificate', college: 'CBAA', date: '3/25/2026', status: 'processing' },
  { id: '3', name: 'Pedro Garcia', document: 'Certificate of Enrollment', college: 'COE', date: '3/24/2026', status: 'pending' },
];

interface HostedQueue {
  id: string;
  name: string;
  code: string;
  status: string;
  count: string;
}

const hostedQueues: HostedQueue[] = [
  { id: '1', name: 'Subject Enrollment', code: 'CCS-REG-044', status: 'Active', count: '15 waiting' },
  { id: '2', name: 'Payment Processing', code: 'CBAA-CSH-025', status: 'Active', count: '8 waiting' },
  { id: '3', name: 'Document Request', code: 'COE-DOC-017', status: 'Active', count: '5 waiting' },
];

interface FacultyMember {
  id: string;
  name: string;
  college: string;
  status: 'available' | 'busy';
  time: string;
}

const facultyAvailability: FacultyMember[] = [
  { id: '1', name: 'Prof. Maria Santos', college: 'CCS', status: 'available', time: 'Next: 10:00 AM - 11:00 AM' },
  { id: '2', name: 'Dr. Roberto Cruz', college: 'CBAA', status: 'busy', time: 'Next: 2:00 PM - 3:00 PM' },
  { id: '3', name: 'Dr. Carmen Ramos', college: 'COED', status: 'busy', time: 'Next: 3:00 PM - 4:00 PM' },
  { id: '4', name: 'Engr. Pedro Villanueva', college: 'COE', status: 'available', time: 'Next: 1:00 PM - 2:00 PM' },
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

export default function AdminDashboardScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const handleStatPress = (key: string) => {
    if (key === 'queues') {
      router.push('/pages/admin/admin_queue');
      return;
    }
    if (key === 'announcements') {
      router.push('/pages/admin/admin_announcement');
      return;
    }
    if (key === 'faculty') {
      router.push('/pages/admin/admin_professor_availability');
      return;
    }
    if (key === 'documents') {
      router.push('/pages/admin/admin_document_processing');
      return;
    }
    comingSoon();
  };

  const handleToolPress = (key: string) => {
    if (key === 'user-management') {
      router.push('/pages/admin/admin_user_management');
      return;
    }
    comingSoon();
  };

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') return;
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

  const collegeLogo = collegeLogos[demoAdmin.departmentAbbrev] ?? ccsLogo;

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
          {/* Welcome Banner */}
          <LinearGradient
            colors={[theme.primary, theme.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerBackdrop1} />
            <View style={styles.bannerBackdrop2} />
            <Text style={styles.bannerTitle}>Admin Dashboard</Text>
            <Text style={styles.bannerSubtitle}>{demoAdmin.departmentName}</Text>
            <View style={styles.bannerBadges}>
              <View style={styles.welcomeAdminBadge}>
                <Image source={collegeLogo} style={styles.bannerLogo} resizeMode="contain" />
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerBadgeText}>Administrator</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => {
              const tint = STAT_TINTS[stat.tint];
              return (
                <Pressable key={stat.key} style={styles.statCard} onPress={() => handleStatPress(stat.key)}>
                  <View style={[styles.statIcon, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                    <Ionicons name={stat.icon} size={20} color={tint.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statDescription}>{stat.description}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Admin Management */}
          <View style={[styles.tintedSection, styles.adminMgmtSection]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.primary} />
              <View style={styles.sectionTitleText}>
                <Text style={styles.sectionTitle}>Admin Management</Text>
                <Text style={styles.sectionSubtitle}>System administration and configuration tools</Text>
              </View>
            </View>
            <View style={styles.toolsGrid}>
              {adminTools.map((tool) => (
                <Pressable key={tool.key} style={styles.adminToolCard} onPress={() => handleToolPress(tool.key)}>
                  <LinearGradient colors={tool.gradient} style={styles.toolIcon}>
                    <Ionicons name={tool.icon} size={24} color="#ffffff" />
                  </LinearGradient>
                  <View style={styles.toolText}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolDescription}>{tool.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={[styles.tintedSection, styles.quickActionsSection]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
              <View style={styles.sectionTitleText}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Text style={styles.sectionSubtitle}>Access frequently used admin tools</Text>
              </View>
            </View>
            <View style={styles.toolsGrid}>
              {quickActions.map((action) => (
                <Pressable key={action.key} style={styles.quickActionCard} onPress={comingSoon}>
                  <LinearGradient colors={action.gradient} style={styles.toolIcon}>
                    <Ionicons name={action.icon} size={24} color="#ffffff" />
                  </LinearGradient>
                  <View style={styles.toolText}>
                    <Text style={styles.toolTitle}>{action.title}</Text>
                    <Text style={styles.toolDescription}>{action.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Announcement Management */}
          <View style={[styles.tintedSection, styles.announcementSection]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
                <Text style={styles.sectionTitle}>Announcement Management</Text>
              </View>
              <Pressable onPress={comingSoon}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.newAnnouncementBtn}
                >
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={styles.newAnnouncementBtnText}>New</Text>
                </LinearGradient>
              </Pressable>
            </View>
            <View style={styles.announcementsList}>
              {announcements.map((ann) => {
                const tint = ANNOUNCEMENT_TAG_TINTS[ann.tag];
                return (
                  <View key={ann.id} style={styles.announcementItem}>
                    <View style={styles.announcementBody}>
                      <Text style={styles.announcementTitle}>
                        {ann.isPinned ? '📌 ' : ''}
                        {ann.title}
                      </Text>
                      <Text style={styles.announcementDescription}>{ann.description}</Text>
                      <View style={styles.announcementMetaRow}>
                        <View style={[styles.tagPill, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                          <Text style={[styles.tagPillText, { color: tint.color }]}>{ann.tag}</Text>
                        </View>
                        <Text style={styles.announcementDate}>{ann.date}</Text>
                      </View>
                    </View>
                    <View style={styles.announcementActions}>
                      <Pressable
                        style={[styles.iconActionBtn, styles.iconActionBtnEdit]}
                        onPress={comingSoon}
                        hitSlop={6}
                      >
                        <Image source={editIcon} style={styles.iconActionImg} />
                      </Pressable>
                      <Pressable
                        style={[styles.iconActionBtn, styles.iconActionBtnDelete]}
                        onPress={comingSoon}
                        hitSlop={6}
                      >
                        <Image source={deleteIcon} style={styles.iconActionImg} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pending Requested Documents */}
          <View style={[styles.card, styles.pendingDocsCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitleText}>Pending Requested Documents</Text>
              <Pressable onPress={comingSoon} hitSlop={8}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <View style={styles.listGap}>
              {pendingDocuments.map((doc) => {
                const tint = DOCUMENT_STATUS_TINTS[doc.status];
                return (
                  <View key={doc.id} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName}>{doc.name}</Text>
                      <Text style={styles.documentType}>{doc.document}</Text>
                      <View style={styles.documentMetaRow}>
                        <Text style={[styles.documentCollege, { color: COLLEGE_TEXT_COLORS[doc.college] }]}>
                          {doc.college}
                        </Text>
                        <Text style={styles.documentDate}>{doc.date}</Text>
                      </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                      <Text style={[styles.badgePillText, { color: tint.color }]}>{doc.status}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Current Hosted Queues */}
          <View style={[styles.card, styles.hostedQueuesCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitleText}>Current Hosted Queues</Text>
              <Pressable onPress={comingSoon} hitSlop={8}>
                <Text style={styles.viewAllText}>Manage</Text>
              </Pressable>
            </View>
            <View style={styles.listGap}>
              {hostedQueues.map((queue) => (
                <View key={queue.id} style={styles.queueItem}>
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueName}>{queue.name}</Text>
                    <Text style={styles.queueCode}>{queue.code}</Text>
                  </View>
                  <View style={styles.queueStatusInfo}>
                    <View style={styles.queueActiveBadge}>
                      <Text style={styles.queueActiveBadgeText}>{queue.status}</Text>
                    </View>
                    <Text style={styles.queueCount}>{queue.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Faculty Availability */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitleText}>Faculty Availability Today</Text>
              <Pressable onPress={() => router.push('/pages/admin/admin_professor_availability')} hitSlop={8}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <View style={styles.facultyGrid}>
              {facultyAvailability.map((f) => (
                <View key={f.id} style={styles.facultyCard}>
                  <View
                    style={[
                      styles.facultyIndicator,
                      { backgroundColor: f.status === 'available' ? '#10b981' : '#ef4444' },
                    ]}
                  />
                  <Text style={styles.facultyName}>{f.name}</Text>
                  <Text style={styles.facultyCollege}>{f.college}</Text>
                  <Text style={styles.facultyTime}>{f.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Nav Drawer */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuOpen(false)}
      >
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
                const active = item.key === 'dashboard';
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

      {/* Confirm Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLogoutModalVisible(false)}
      >
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
              <Pressable
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
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
  textSecondary: string;
  subtext: string;
  tertiary: string;
  primary: string;
  success: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

// primary here mirrors admin-dashboard.css's --primary-color (the only green
// token that stylesheet references — it never uses --primary-dark).
const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  textSecondary: '#f0fdf4',
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
  textSecondary: '#334155',
  subtext: '#64748b',
  tertiary: '#64748b',
  primary: '#15803d',
  success: '#059669',
  iconBtnBg: 'rgba(34, 197, 94, 0.08)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.15)',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },

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
    headerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
    },
    headerPncLogo: { width: 40, height: 40 },
    headerOamsLogo: { height: 34, width: 96 },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: theme.iconBtnBg,
      borderWidth: 1,
      borderColor: theme.iconBtnBorder,
    },
    iconBtnImg: { width: 18, height: 18 },

    scrollContent: {
      padding: 16,
      gap: 20,
      paddingBottom: 40,
    },

    // Welcome banner — mirrors .welcome-banner.admin-banner (2rem pad, 1.5rem radius)
    banner: {
      borderRadius: 24,
      padding: 24,
      overflow: 'hidden',
      position: 'relative',
    },
    bannerBackdrop1: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: 'rgba(255,255,255,0.1)',
      top: -30,
      right: -30,
    },
    bannerBackdrop2: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.1)',
      opacity: 0.5,
      bottom: -38,
      right: 60,
    },
    bannerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 8,
    },
    bannerSubtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 16,
    },
    bannerBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    // .welcome-admin-badge: logo sits standalone next to the pill, not inside it
    welcomeAdminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bannerBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    bannerLogo: {
      width: 32,
      height: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    bannerBadgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '500',
    },

    // Stats
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    // .stat-card border is a flat rgba(34,197,94,0.2) regardless of theme
    statCard: {
      width: '47.5%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.2)',
      borderRadius: 18,
      padding: 16,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    statValue: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
    },
    // .stat-title uses var(--text-secondary), not the muted/tertiary tone
    statTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 8,
    },
    statDescription: {
      fontSize: 12,
      color: theme.tertiary,
      marginTop: 6,
    },

    // Tinted sections (Admin Management / Quick Actions / Announcements)
    tintedSection: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    // .admin-management-section background is maroon-tinted rgba(127,29,29,...),
    // only the border/icon accents use bright red
    adminMgmtSection: {
      backgroundColor: 'rgba(127, 29, 29, 0.065)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    quickActionsSection: {
      backgroundColor: 'rgba(34, 197, 94, 0.06)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    announcementSection: {
      backgroundColor: 'rgba(59, 130, 246, 0.06)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      flexShrink: 1,
    },
    sectionTitleText: {
      flexShrink: 1,
      gap: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.subtext,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    // Tool / action cards (grid inside tinted sections)
    toolsGrid: {
      gap: 12,
    },
    // .admin-tool-card: 1.5px green-tinted border, icon top-aligned, 1.25rem pad
    adminToolCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: 'rgba(34, 197, 94, 0.25)',
      borderRadius: 16,
      padding: 20,
    },
    // .quick-action-card: 1px plain card border, icon vertically centered, 1.5rem pad
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 24,
    },
    toolIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    toolText: {
      flex: 1,
      gap: 3,
    },
    toolTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    toolDescription: {
      fontSize: 12,
      color: theme.subtext,
      lineHeight: 17,
    },

    // Announcements
    newAnnouncementBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    newAnnouncementBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    announcementsList: {
      gap: 12,
    },
    announcementItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.18)',
      borderRadius: 14,
      padding: 14,
    },
    announcementBody: {
      flex: 1,
      gap: 6,
    },
    announcementTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    announcementDescription: {
      fontSize: 12,
      color: theme.subtext,
      lineHeight: 18,
    },
    announcementMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    announcementDate: {
      fontSize: 11,
      color: theme.tertiary,
    },
    announcementActions: {
      gap: 8,
      alignItems: 'flex-end',
    },
    iconActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActionBtnEdit: {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: 'rgba(59, 130, 246, 0.35)',
    },
    iconActionBtnDelete: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.45)',
    },
    iconActionImg: {
      width: 15,
      height: 15,
    },
    tagPill: {
      borderWidth: 0.5,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    tagPillText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    // Generic card (pending documents / hosted queues / faculty)
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    pendingDocsCard: {
      borderColor: 'rgba(249, 115, 22, 0.2)',
    },
    hostedQueuesCard: {
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitleText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    listGap: {
      gap: 12,
    },

    // Pending documents
    documentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: 'rgba(249, 115, 22, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 12,
      padding: 12,
    },
    documentInfo: {
      flex: 1,
      gap: 3,
    },
    documentName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    documentType: {
      fontSize: 12,
      color: theme.subtext,
    },
    documentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    documentCollege: {
      fontSize: 11,
      fontWeight: '700',
    },
    documentDate: {
      fontSize: 11,
      color: theme.tertiary,
    },
    badgePill: {
      borderWidth: 0.5,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    badgePillText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    // Hosted queues
    queueItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(59, 130, 246, 0.25)',
      borderRadius: 12,
      padding: 12,
    },
    queueInfo: {
      flex: 1,
      gap: 3,
    },
    queueName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    queueCode: {
      fontSize: 12,
      color: theme.subtext,
    },
    queueStatusInfo: {
      alignItems: 'flex-end',
      gap: 5,
    },
    queueActiveBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderWidth: 0.5,
      borderColor: 'rgba(34, 197, 94, 0.4)',
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    queueActiveBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
    },
    queueCount: {
      fontSize: 11,
      color: theme.tertiary,
    },

    // Faculty availability
    facultyGrid: {
      gap: 12,
    },
    facultyCard: {
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: 14,
      padding: 14,
      gap: 5,
      position: 'relative',
    },
    facultyIndicator: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    facultyName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      paddingRight: 20,
    },
    facultyCollege: {
      fontSize: 12,
      color: theme.tertiary,
    },
    facultyTime: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.subtext,
    },

    // Nav drawer
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
    },
    drawerPanel: {
      width: 270,
      backgroundColor: theme.card,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      padding: 20,
      justifyContent: 'space-between',
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
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
    drawerProfileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
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
    drawerName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    drawerRoleBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    drawerRoleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    drawerCollege: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.subtext,
    },
    drawerNav: {
      flex: 1,
      marginTop: 28,
      gap: 4,
    },
    drawerNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    drawerNavItemActive: {
      backgroundColor: theme.primary,
    },
    drawerNavLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.subtext,
    },
    drawerNavLabelActive: {
      color: '#ffffff',
    },
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
    drawerLogoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ef4444',
    },

    // Confirm logout modal
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
    logoutModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 8,
    },
    logoutModalDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    logoutModalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    logoutCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    logoutCancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
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
    logoutConfirmBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}
