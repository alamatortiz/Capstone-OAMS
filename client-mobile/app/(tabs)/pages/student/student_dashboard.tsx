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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors StudentDashboard.tsx) ───
const demoStudent = {
  name: 'Demo Student',
  role: 'Student',
  studentNumber: '2300001',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

const STAT_TINTS = {
  blue: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' },
  purple: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.25)', color: '#a855f7' },
  orange: { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' },
  green: { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.25)', color: '#10b981' },
} as const;

interface StatItem {
  key: string;
  title: string;
  value: string;
  description: string;
  icon: IoniconName;
  tint: keyof typeof STAT_TINTS;
}

const stats: StatItem[] = [
  { key: 'queue', title: 'Queue Position', value: '0', description: 'No active queues', icon: 'time-outline', tint: 'blue' },
  { key: 'appointments', title: 'Appointments', value: '2', description: 'Upcoming this week', icon: 'calendar-outline', tint: 'purple' },
  { key: 'documents', title: 'Documents', value: '5', description: '2 pending approval', icon: 'document-text-outline', tint: 'orange' },
  { key: 'completed', title: 'Completed', value: '12', description: 'Total transactions', icon: 'checkmark-circle-outline', tint: 'green' },
];

const BADGE_TINTS = {
  green: { bg: 'rgba(22, 163, 74, 0.15)', border: 'rgba(22, 163, 74, 0.25)', color: '#4ade80' },
  violet: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe' },
} as const;

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: IoniconName;
  badge?: string;
  badgeTint: keyof typeof BADGE_TINTS;
  gradient: readonly [string, string];
}

const quickActions: QuickAction[] = [
  { key: 'announcements', title: 'Announcements', description: 'Stay updated with the latest notices from all colleges.', icon: 'megaphone-outline', badge: '2 Pinned', badgeTint: 'green', gradient: ['#22c55e', '#16a34a'] },
  { key: 'appointment-booking', title: 'Appointment Booking', description: 'Schedule appointments with professors and view available slots.', icon: 'calendar-outline', badgeTint: 'violet', gradient: ['#a855f7', '#9333ea'] },
  { key: 'queue-tracking', title: 'Queue Tracking', description: 'View detailed analytics and history of all your queue activities.', icon: 'pulse-outline', badgeTint: 'violet', gradient: ['#3b82f6', '#6366f1'] },
  { key: 'professor-schedules', title: 'Professor Schedules', description: 'Check faculty consultation hours and room availability.', icon: 'school-outline', badge: '13 Faculty', badgeTint: 'violet', gradient: ['#a855f7', '#9333ea'] },
];

const ANNOUNCEMENT_META = {
  important: { icon: 'alert-circle-outline' as IoniconName, iconBg: ['#ef4444', '#dc2626'] as const, badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', badgeColor: '#ef4444', label: 'Important' },
  event: { icon: 'calendar-outline' as IoniconName, iconBg: ['#3b82f6', '#2563eb'] as const, badgeBg: 'rgba(59, 130, 246, 0.15)', badgeBorder: 'rgba(59, 130, 246, 0.3)', badgeColor: '#3b82f6', label: 'Event' },
  reminder: { icon: 'notifications-outline' as IoniconName, iconBg: ['#f59e0b', '#d97706'] as const, badgeBg: 'rgba(245, 158, 11, 0.15)', badgeBorder: 'rgba(245, 158, 11, 0.3)', badgeColor: '#f59e0b', label: 'Reminder' },
  general: { icon: 'alert-circle-outline' as IoniconName, iconBg: ['#8b5cf6', '#7c3aed'] as const, badgeBg: 'rgba(139, 92, 246, 0.15)', badgeBorder: 'rgba(139, 92, 246, 0.3)', badgeColor: '#8b5cf6', label: 'Notice' },
} as const;

interface Announcement {
  id: string;
  title: string;
  college: string;
  date: string;
  category: keyof typeof ANNOUNCEMENT_META;
}

const pinnedAnnouncements: Announcement[] = [
  { id: '1', title: 'Enrollment Period for Second Semester', college: 'College of Computing Studies (CCS)', date: 'Mar 25, 2026', category: 'important' },
  { id: '2', title: 'System Maintenance Notice', college: 'All Departments', date: 'Mar 26, 2026', category: 'important' },
];

const ACTIVITY_META = {
  queue: { icon: 'time-outline' as IoniconName, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  appointment: { icon: 'calendar-outline' as IoniconName, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  document: { icon: 'document-text-outline' as IoniconName, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
} as const;

const STATUS_META = {
  active: { label: 'Active', bg: 'rgba(22, 163, 74, 0.15)', color: '#16a34a' },
  confirmed: { label: 'Confirmed', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  processing: { label: 'Processing', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
} as const;

interface ActivityEntry {
  id: string;
  type: keyof typeof ACTIVITY_META;
  title: string;
  college: string;
  time: string;
  status: keyof typeof STATUS_META;
}

const recentActivity: ActivityEntry[] = [
  { id: '1', type: 'queue', title: 'Joined Queue at Registrar', college: 'College of Computing Studies', time: '10 minutes ago', status: 'active' },
  { id: '2', type: 'appointment', title: 'Appointment with Prof. Santos', college: 'College of Computing Studies', time: 'Tomorrow, 2:00 PM', status: 'confirmed' },
  { id: '3', type: 'document', title: 'Good Moral Certificate', college: 'College of Computing Studies', time: '2 days ago', status: 'processing' },
];

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const officeHours = {
  departmentName: 'College of Computing Studies',
  departmentAbbrev: 'CCS',
  schedule: [
    { day: 'Monday - Friday', time: '8:00 AM - 5:00 PM' },
    { day: 'Saturday', time: '8:00 AM - 12:00 PM' },
  ],
  location: 'CCS Building, Room 101',
};

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid-outline' },
  { key: 'queue', label: 'Queue', icon: 'time-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
];

export default function StudentDashboardScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') return;
    comingSoon();
  };

  const handleLogout = () => {
    setMenuOpen(false);
    router.replace('/login');
  };

  const collegeLogo = collegeLogos[demoStudent.departmentAbbrev] ?? ccsLogo;

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
            <Text style={styles.bannerGreeting}>Good day!</Text>
            <View style={styles.bannerTitleRow}>
              <Image source={collegeLogo} style={styles.bannerLogo} resizeMode="contain" />
              <Text style={styles.bannerTitle}>{demoStudent.name}</Text>
            </View>
            <View style={styles.bannerBadges}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>Student Portal</Text>
              </View>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{demoStudent.studentNumber}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => {
              const tint = STAT_TINTS[stat.tint];
              return (
                <Pressable key={stat.key} style={styles.statCard} onPress={comingSoon}>
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

          {/* Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{quickActions.length} features available</Text>
            </View>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => {
              const badgeTint = BADGE_TINTS[action.badgeTint];
              return (
                <Pressable key={action.key} style={styles.actionCard} onPress={comingSoon}>
                  <View style={styles.actionMain}>
                    <LinearGradient colors={action.gradient} style={styles.actionIcon}>
                      <Ionicons name={action.icon} size={24} color="#ffffff" />
                    </LinearGradient>
                    <View style={styles.actionBody}>
                      {action.badge && (
                        <View
                          style={[
                            styles.actionBadge,
                            { backgroundColor: badgeTint.bg, borderColor: badgeTint.border },
                          ]}
                        >
                          <Text style={[styles.actionBadgeText, { color: badgeTint.color }]}>
                            {action.badge}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                      <View style={styles.actionCta}>
                        <Text style={styles.actionCtaText}>Open</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Active Queue Preview */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="timer-outline" size={18} color={theme.blue} />
                <Text style={styles.cardTitleText}>Active Queue</Text>
              </View>
            </View>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={22} color={theme.blue} />
              </View>
              <Text style={styles.emptyText}>No Active Queues</Text>
            </View>
          </View>

          {/* Pinned Announcements */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="megaphone-outline" size={18} color={theme.primary} />
                <Text style={styles.cardTitleText}>Pinned Announcements</Text>
              </View>
              <Pressable onPress={comingSoon} hitSlop={8}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <View style={styles.announcementsList}>
              {pinnedAnnouncements.map((ann) => {
                const meta = ANNOUNCEMENT_META[ann.category];
                return (
                  <Pressable key={ann.id} style={styles.announcementCard} onPress={comingSoon}>
                    <LinearGradient colors={meta.iconBg} style={styles.announcementIcon}>
                      <Ionicons name={meta.icon} size={18} color="#ffffff" />
                    </LinearGradient>
                    <View style={styles.announcementBody}>
                      <Text style={styles.announcementTitle} numberOfLines={2}>
                        {ann.title}
                      </Text>
                      <View style={styles.announcementMeta}>
                        <Text style={styles.announcementMetaText}>{ann.college}</Text>
                        <Text style={styles.announcementMetaText}>{ann.date}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.announcementBadge,
                        { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder },
                      ]}
                    >
                      <Text style={[styles.announcementBadgeText, { color: meta.badgeColor }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={comingSoon} hitSlop={8}>
              <Text style={styles.viewAllText}>See All</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {recentActivity.map((activity, index) => {
              const meta = ACTIVITY_META[activity.type];
              const status = STATUS_META[activity.status];
              return (
                <View
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index === recentActivity.length - 1 && styles.activityItemLast,
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityMeta}>{activity.college}</Text>
                    <Text style={styles.activityMeta}>{activity.time}</Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.activityBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Office Hours */}
          <LinearGradient
            colors={[theme.primary, theme.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hoursCard}
          >
            <View style={styles.hoursHeaderRow}>
              <View style={styles.hoursTitleRow}>
                <Ionicons name="time-outline" size={18} color="#ffffff" />
                <Text style={styles.hoursTitle}>Office Hours</Text>
              </View>
              <View style={styles.hoursDeptPill}>
                <Text style={styles.hoursDeptText}>
                  {officeHours.departmentName} ({officeHours.departmentAbbrev})
                </Text>
              </View>
            </View>
            <View style={styles.hoursSchedule}>
              {officeHours.schedule.map((entry, i) => (
                <View key={i} style={styles.hoursItem}>
                  <Text style={styles.hoursDay}>{entry.day}</Text>
                  <Text style={styles.hoursTime}>{entry.time}</Text>
                </View>
              ))}
            </View>
            {officeHours.location && (
              <View style={styles.hoursLocationRow}>
                <Text style={styles.hoursLocationLabel}>Location:</Text>
                <Text style={styles.hoursLocationValue}>{officeHours.location}</Text>
              </View>
            )}
          </LinearGradient>
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
                <Text style={styles.drawerName}>{demoStudent.name}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>{demoStudent.role}</Text>
              </View>
              <Text style={styles.drawerCollege}>{demoStudent.departmentName}</Text>
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
  primaryDark: string;
  success: string;
  blue: string;
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
  primaryDark: '#15803d',
  success: '#10b981',
  blue: '#3b82f6',
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
  primaryDark: '#14532d',
  success: '#059669',
  blue: '#2563eb',
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
      gap: 4,
    },
    headerPncLogo: { width: 30, height: 30 },
    headerOamsLogo: { height: 26, width: 76 },
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

    // Welcome banner
    banner: {
      borderRadius: 22,
      padding: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    bannerBackdrop1: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.1)',
      top: -30,
      right: -30,
    },
    bannerBackdrop2: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.08)',
      bottom: -35,
      right: 50,
    },
    bannerGreeting: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 16,
      marginBottom: 4,
    },
    bannerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bannerLogo: { width: 40, height: 40 },
    bannerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#ffffff',
      flexShrink: 1,
    },
    bannerBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    bannerBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    bannerBadgeText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '600',
    },

    // Stats
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      width: '47.5%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
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
    statTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 8,
    },
    statDescription: {
      fontSize: 12,
      color: theme.tertiary,
      marginTop: 6,
    },

    // Section header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },
    sectionCountPill: {
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    sectionCountText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.subtext,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },

    // Quick actions
    actionsGrid: {
      gap: 14,
    },
    actionCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 18,
    },
    actionMain: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionBody: {
      flex: 1,
      minWidth: 0,
    },
    actionBadge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginBottom: 10,
    },
    actionBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
    },
    actionDescription: {
      fontSize: 13,
      color: theme.subtext,
      lineHeight: 19,
    },
    actionCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 14,
    },
    actionCtaText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitleText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },

    // Empty state (active queue)
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 12,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: theme.subtext,
    },

    // Announcements
    announcementsList: {
      gap: 12,
    },
    announcementCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
    },
    announcementIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    announcementBody: {
      flex: 1,
      gap: 6,
    },
    announcementTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 18,
    },
    announcementMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    announcementMetaText: {
      fontSize: 11,
      color: theme.tertiary,
    },
    announcementBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    announcementBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },

    // Recent activity
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    activityItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityBody: {
      flex: 1,
      gap: 3,
    },
    activityTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    activityMeta: {
      fontSize: 11,
      color: theme.tertiary,
    },
    activityBadge: {
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
    },
    activityBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    // Office hours
    hoursCard: {
      borderRadius: 18,
      padding: 20,
    },
    hoursHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 18,
    },
    hoursTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hoursTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    hoursDeptPill: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 12,
      flexShrink: 1,
    },
    hoursDeptText: {
      fontSize: 11,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.85)',
    },
    hoursSchedule: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 14,
    },
    hoursItem: {
      flexGrow: 1,
      minWidth: 140,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    hoursDay: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.65)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    hoursTime: {
      fontSize: 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    hoursLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    hoursLocationLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.65)',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    hoursLocationValue: {
      fontSize: 13,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.9)',
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
  });
}
