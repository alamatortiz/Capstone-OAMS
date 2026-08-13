import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
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
import { useAuth } from '@/context/AuthContext';
import { useQueue } from '@/context/QueueContext';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { notify } from '@/utils/notifications';

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

const BADGE_TINTS = {
  green: { bg: 'rgba(22, 163, 74, 0.15)', border: 'rgba(22, 163, 74, 0.25)', color: '#4ade80' },
  violet: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe' },
  blue: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.25)', color: '#93c5fd' },
  orange: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.25)', color: '#fcd34d' },
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

// This widget only ever shows pinned announcements (see pinnedPreview below),
// so every entry gets the green "pinned" treatment -- only the icon shape and
// label still vary by category.
const ANNOUNCEMENT_META = {
  important: { icon: 'alert-circle-outline' as IoniconName, iconBg: ['#22c55e', '#16a34a'] as const, badgeBg: 'rgba(34, 197, 94, 0.15)', badgeBorder: 'rgba(34, 197, 94, 0.3)', badgeColor: '#22c55e', label: 'Important' },
  event: { icon: 'calendar-outline' as IoniconName, iconBg: ['#22c55e', '#16a34a'] as const, badgeBg: 'rgba(34, 197, 94, 0.15)', badgeBorder: 'rgba(34, 197, 94, 0.3)', badgeColor: '#22c55e', label: 'Event' },
  reminder: { icon: 'notifications-outline' as IoniconName, iconBg: ['#22c55e', '#16a34a'] as const, badgeBg: 'rgba(34, 197, 94, 0.15)', badgeBorder: 'rgba(34, 197, 94, 0.3)', badgeColor: '#22c55e', label: 'Reminder' },
  general: { icon: 'alert-circle-outline' as IoniconName, iconBg: ['#22c55e', '#16a34a'] as const, badgeBg: 'rgba(34, 197, 94, 0.15)', badgeBorder: 'rgba(34, 197, 94, 0.3)', badgeColor: '#22c55e', label: 'Notice' },
} as const;

interface Announcement {
  id: string;
  title: string;
  description?: string;
  college: string;
  date: string;
  isPinned: boolean;
  category: keyof typeof ANNOUNCEMENT_META;
}

const ACTIVITY_META = {
  queue: { icon: 'time-outline' as IoniconName, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  appointment: { icon: 'calendar-outline' as IoniconName, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  document: { icon: 'document-text-outline' as IoniconName, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
} as const;

const STATUS_TINT_FALLBACK = { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' };
const STATUS_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  waiting: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  serving: { bg: 'rgba(22, 163, 74, 0.15)', color: '#16a34a' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  processing: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  claimed: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  released: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  generated: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  no_show: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
};

interface ActivityEntry {
  id: string;
  type: keyof typeof ACTIVITY_META;
  title: string;
  college: string;
  time: string;
  status: string;
}

interface OfficeHoursData {
  departmentName: string;
  departmentAbbrev: string;
  schedule: { day: string; time: string }[];
  location: string;
}

// Splits only on a comma followed by a weekday name -- mirrors the web
// parser in stud-dashboard.jsx so free-text office hours strings render
// the same way on mobile.
function parseSchedule(hoursStr?: string): { day: string; time: string }[] {
  if (!hoursStr) return [];
  const weekdayNames = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
  return hoursStr.split(new RegExp(`,\\s*(?=(?:${weekdayNames})\\b)`)).map((entry) => {
    const colonIdx = entry.indexOf(': ');
    if (colonIdx === -1) return { day: entry.trim(), time: '' };
    return { day: entry.substring(0, colonIdx).trim(), time: entry.substring(colonIdx + 2).trim() };
  });
}

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

export default function StudentDashboardScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { getActiveQueues } = useQueue();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const [dashStats, setDashStats] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const [officeHours, setOfficeHours] = useState<OfficeHoursData | null>(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true);
  const [officeHoursError, setOfficeHoursError] = useState<string | null>(null);

  // Mirror the latest data for the catch blocks below, without making the
  // fetch callbacks depend on (and change identity with) the state itself.
  const dashStatsRef = useRef(dashStats);
  useEffect(() => { dashStatsRef.current = dashStats; }, [dashStats]);
  const announcementsRef = useRef(announcements);
  useEffect(() => { announcementsRef.current = announcements; }, [announcements]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/student/dashboard-stats');
      setDashStats(data);
      setDashError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      if (!dashStatsRef.current) {
        setDashError('Could not load dashboard data.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh dashboard data.' });
      }
    } finally {
      setDashLoading(false);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/student/announcements');
      setAnnouncements(data?.announcements ?? []);
      setAnnouncementsError(null);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      if (announcementsRef.current.length === 0) {
        setAnnouncementsError('Could not load announcements.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh announcements.' });
      }
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const fetchOfficeHours = useCallback(async () => {
    setOfficeHoursLoading(true);
    try {
      const { data } = await api.get('/student/office-hours');
      setOfficeHours({
        departmentName: data.departmentName,
        departmentAbbrev: data.departmentAbbrev,
        schedule: parseSchedule(data.officeHours),
        location: data.officeLocation ?? '',
      });
      setOfficeHoursError(null);
    } catch (err) {
      console.error('Failed to fetch office hours:', err);
      setOfficeHoursError('Could not load office hours.');
    } finally {
      setOfficeHoursLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAnnouncements();
    fetchOfficeHours();
  }, [fetchStats, fetchAnnouncements, fetchOfficeHours]);

  // ── Live updates: refetch dashboard data when relevant socket events fire
  // (mirrors stud-dashboard.jsx's statsEvents array + separate announcement
  // listener). Only announcement:changed triggers a notification here —
  // notifying on every stat-refresh event would be spammy. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const statsEvents = [
      'document:status-updated',
      'appointment:status-updated',
      'queue:called',
      'queue:served',
      'queue:no-show',
    ];
    statsEvents.forEach((event) => socket.on(event, fetchStats));

    const onAnnouncementChanged = (payload: any) => {
      fetchAnnouncements();
      notify('New announcement', payload?.title ? String(payload.title) : 'An announcement was posted or updated.');
    };
    socket.on('announcement:changed', onAnnouncementChanged);

    return () => {
      statsEvents.forEach((event) => socket.off(event, fetchStats));
      socket.off('announcement:changed', onAnnouncementChanged);
    };
  }, [user, token, fetchStats, fetchAnnouncements]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') return;
    if (key === 'queue') {
      router.push('/pages/student/student_queue');
      return;
    }
    if (key === 'announcements') {
      router.push('/pages/student/student_announcement');
      return;
    }
    if (key === 'appointments') {
      router.push('/pages/student/student_appointments');
      return;
    }
    if (key === 'documents') {
      router.push('/pages/student/student_documents');
      return;
    }
    if (key === 'transactions') {
      router.push('/pages/student/student_transactions');
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

  const collegeLogo = collegeLogos[user?.departmentAbbrev ?? ''] ?? ccsLogo;

  // Active Queue preview reads from QueueContext (same live source as
  // student_queue_status.tsx) instead of dashStats.activeQueue, so it can
  // show slotStatus/pauseReason and stays live via QueueContext's sockets
  // instead of only refreshing on the dashboard's own poll.
  const contextQueues: any[] = getActiveQueues();
  const closestQueue = contextQueues.length > 0
    ? [...contextQueues].sort((a: any, b: any) => {
        if (a.status === 'serving' && b.status !== 'serving') return -1;
        if (b.status === 'serving' && a.status !== 'serving') return 1;
        return (a.position ?? Infinity) - (b.position ?? Infinity);
      })[0]
    : null;

  // Sourced from the same live contextQueues/closestQueue above (not
  // dashStats) so this tile can't disagree with the Active Queue Preview
  // card below or the Queues quick-action badge -- mirrors stud-dashboard.jsx's
  // identical migration away from the poll-based dashStats.activeQueue fields.
  const activeQueueCount = contextQueues.length;
  const queuePositionValue = dashLoading
    ? '—'
    : closestQueue
      ? closestQueue.status === 'serving'
        ? (closestQueue.arrivedAt ? 'Being Served' : 'Called')
        : String(closestQueue.position ?? 0)
      : '0';

  const stats: StatItem[] = [
    {
      key: 'queue', title: 'Queue Position', value: queuePositionValue,
      description: dashLoading ? 'Loading...' : activeQueueCount > 0 ? `Waiting in ${activeQueueCount} queue${activeQueueCount > 1 ? 's' : ''}` : 'No active queues',
      icon: 'time-outline', tint: 'blue',
    },
    {
      key: 'appointments', title: 'Appointments',
      value: dashLoading ? '—' : String(dashStats?.stats?.appointments?.upcoming ?? 0),
      description: (() => {
        if (dashLoading) return 'Loading...';
        const parts: string[] = [];
        const pending = dashStats?.stats?.appointments?.pending ?? 0;
        const approved = dashStats?.stats?.appointments?.approved ?? 0;
        if (pending > 0) parts.push(`${pending} pending`);
        if (approved > 0) parts.push(`${approved} approved`);
        return parts.length ? parts.join(', ') : 'No pending appointments';
      })(),
      icon: 'calendar-outline', tint: 'purple',
    },
    {
      key: 'documents', title: 'Documents',
      value: dashLoading ? '—' : String(dashStats?.stats?.documents?.total ?? 0),
      description: (() => {
        if (dashLoading) return 'Loading...';
        const parts: string[] = [];
        const docs = dashStats?.stats?.documents ?? {};
        if (docs.pendingOnly > 0) parts.push(`${docs.pendingOnly} pending`);
        if (docs.processing > 0) parts.push(`${docs.processing} processing`);
        if (docs.ready > 0) parts.push(`${docs.ready} ready`);
        if (docs.released > 0) parts.push(`${docs.released} released`);
        return parts.length ? parts.join(', ') : 'No pending documents';
      })(),
      icon: 'document-text-outline', tint: 'orange',
    },
    {
      key: 'completed', title: 'Completed',
      value: dashLoading ? '—' : String(dashStats?.stats?.completed ?? 0),
      description: 'Total transactions', icon: 'checkmark-circle-outline', tint: 'green',
    },
  ];

  const allPinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const pinnedPreview = allPinnedAnnouncements.slice(0, 2);
  const morePinnedCount = allPinnedAnnouncements.length - pinnedPreview.length;

  const quickActions: QuickAction[] = [
    { key: 'announcements', title: 'Announcements', description: 'Stay updated with the latest notices from your department.', icon: 'megaphone-outline', badge: `${allPinnedAnnouncements.length} Pinned`, badgeTint: 'green', gradient: ['#22c55e', '#16a34a'] },
    { key: 'professor-schedules', title: 'Professor Schedules', description: 'Check professor consultation hours and availability across all departments.', icon: 'school-outline', badge: `${dashStats?.stats?.totalFacultyCount ?? 0} Faculty`, badgeTint: 'violet', gradient: ['#a855f7', '#9333ea'] },
    { key: 'queues', title: 'Queues', description: 'Join queues and track your position in real-time.', icon: 'time-outline', badge: `${activeQueueCount} Participating Queues`, badgeTint: 'blue', gradient: ['#3b82f6', '#6366f1'] },
    { key: 'appointments', title: 'Appointments', description: 'Schedule appointments with professors and view available slots.', icon: 'calendar-outline', badge: `${dashStats?.stats?.appointments?.active ?? 0} Active Bookings`, badgeTint: 'violet', gradient: ['#a855f7', '#9333ea'] },
    { key: 'document-requests', title: 'Document Requests', description: 'Request documents and track their status.', icon: 'document-text-outline', badge: `${dashStats?.stats?.documents?.total ?? 0} Active Requests`, badgeTint: 'orange', gradient: ['#f59e0b', '#d97706'] },
    { key: 'transactions', title: 'Transactions', description: 'View all your activities and transactions.', icon: 'swap-horizontal-outline', badgeTint: 'green', gradient: ['#22c55e', '#16a34a'] },
  ];

  const recentActivity: ActivityEntry[] = dashStats?.recentActivity ?? [];

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
              <Text style={styles.bannerTitle}>{user?.name ?? 'Student'}</Text>
            </View>
            <View style={styles.bannerBadges}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>Student Portal</Text>
              </View>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{user?.studentNumber ?? 'Student Number'}</Text>
              </View>
            </View>
          </LinearGradient>

          {dashError && (
            <View style={styles.card}>
              <Text style={styles.emptyText}>{dashError}</Text>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => {
              const tint = STAT_TINTS[stat.tint];
              return (
                <Pressable
                  key={stat.key}
                  style={styles.statCard}
                  onPress={stat.key === 'queue'
                    ? () => router.push('/pages/student/student_queue_status')
                    : stat.key === 'appointments'
                    ? () => router.push('/pages/student/student_appointment_status')
                    : stat.key === 'documents'
                    ? () => router.push('/pages/student/student_document_status')
                    : stat.key === 'completed'
                    ? () => router.push('/pages/student/student_transactions')
                    : comingSoon}
                >
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
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => {
              const badgeTint = BADGE_TINTS[action.badgeTint];
              const onPress =
                action.key === 'announcements'
                  ? () => router.push('/pages/student/student_announcement')
                  : action.key === 'appointments'
                  ? () => router.push('/pages/student/student_appointments')
                  : action.key === 'professor-schedules'
                  ? () => router.push('/pages/student/student_professor_schedules')
                  : action.key === 'queues'
                  ? () => router.push('/pages/student/student_queue')
                  : action.key === 'document-requests'
                  ? () => router.push('/pages/student/student_documents')
                  : action.key === 'transactions'
                  ? () => router.push('/pages/student/student_transactions')
                  : comingSoon;
              return (
                <Pressable key={action.key} style={styles.actionCard} onPress={onPress}>
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
          <Pressable style={styles.card} onPress={() => router.push('/pages/student/student_queue_status')}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="timer-outline" size={18} color={theme.blue} />
                <Text style={styles.cardTitleText}>Active Queue</Text>
              </View>
            </View>
            {closestQueue ? (
              <View style={styles.emptyState}>
                <Text style={styles.statValue}>
                  {closestQueue.status === 'serving'
                    ? (closestQueue.arrivedAt ? 'Being Served' : 'Called')
                    : String(closestQueue.position ?? 0)}
                </Text>
                <Text style={styles.emptyText}>
                  {closestQueue.serviceName} — {closestQueue.departmentName}
                </Text>
                {closestQueue.slotStatus === 'paused' && (
                  <View style={styles.pausedBadge}>
                    <Ionicons name="alert-circle-outline" size={13} color="#f59e0b" />
                    <Text style={styles.pausedBadgeText}>
                      Paused{closestQueue.slotPauseReason ? `: ${closestQueue.slotPauseReason}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="time-outline" size={22} color={theme.blue} />
                </View>
                <Text style={styles.emptyText}>No Active Queues.</Text>
              </View>
            )}
          </Pressable>

          {/* Pinned Announcements */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="megaphone-outline" size={18} color={theme.primary} />
                <Text style={styles.cardTitleText}>Pinned Announcements</Text>
              </View>
              <Pressable
                onPress={() => router.push('/pages/student/student_announcement')}
                hitSlop={8}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <View style={styles.announcementsList}>
              {announcementsLoading ? (
                <Text style={styles.emptyText}>Loading announcements...</Text>
              ) : announcementsError ? (
                <Text style={styles.emptyText}>{announcementsError}</Text>
              ) : allPinnedAnnouncements.length === 0 ? (
                <Text style={styles.emptyText}>No pinned announcements.</Text>
              ) : (
                <>
                  {pinnedPreview.map((ann) => {
                    const meta = ANNOUNCEMENT_META[ann.category] ?? ANNOUNCEMENT_META.general;
                    return (
                      <Pressable
                        key={ann.id}
                        style={styles.announcementCard}
                        onPress={() => router.push('/pages/student/student_announcement')}
                      >
                        <LinearGradient colors={meta.iconBg} style={styles.announcementIcon}>
                          <Ionicons name={meta.icon} size={18} color="#ffffff" />
                        </LinearGradient>
                        <View style={styles.announcementBody}>
                          <Text style={styles.announcementTitle} numberOfLines={2}>
                            {ann.title}
                          </Text>
                          {ann.description && (
                            <Text style={styles.announcementDescription} numberOfLines={2}>
                              {ann.description}
                            </Text>
                          )}
                          <View style={styles.announcementMeta}>
                            <Text style={styles.announcementMetaText}>{ann.college}</Text>
                            <Text style={styles.announcementMetaText}>
                              {new Date(ann.date).toLocaleString('en-US', {
                                timeZone: 'Asia/Manila',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
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
                  {morePinnedCount > 0 && (
                    <Pressable onPress={() => router.push('/pages/student/student_announcement')}>
                      <Text style={styles.viewAllText}>+ {morePinnedCount} more pinned</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/pages/student/student_transactions')} hitSlop={8}>
              <Text style={styles.viewAllText}>See All</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {dashLoading ? (
              <Text style={styles.emptyText}>Loading activity...</Text>
            ) : recentActivity.length === 0 ? (
              <Text style={styles.activityEmptyText}>No recent activity yet.</Text>
            ) : (
              recentActivity.map((activity, index) => {
                const meta = ACTIVITY_META[activity.type] ?? ACTIVITY_META.queue;
                const status = STATUS_COLOR_MAP[activity.status] ?? STATUS_TINT_FALLBACK;
                const statusLabel = activity.status === 'no_show'
                  ? 'No Show'
                  : activity.status.charAt(0).toUpperCase() + activity.status.slice(1);
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
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
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
              {!officeHoursLoading && officeHours && (
                <View style={styles.hoursDeptPill}>
                  <Text style={styles.hoursDeptText}>
                    {officeHours.departmentName} ({officeHours.departmentAbbrev})
                  </Text>
                </View>
              )}
            </View>
            {officeHoursLoading ? (
              <Text style={styles.hoursTime}>Loading office hours...</Text>
            ) : officeHoursError ? (
              <View>
                <Text style={styles.hoursTime}>{officeHoursError}</Text>
                <Pressable onPress={fetchOfficeHours} hitSlop={8}>
                  <Text style={styles.viewAllText}>Retry</Text>
                </Pressable>
              </View>
            ) : !officeHours ? (
              <Text style={styles.hoursTime}>No office hours available.</Text>
            ) : (
              <>
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
              </>
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
                <Text style={styles.drawerName}>{user?.name ?? 'Student'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Student</Text>
              </View>
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''})</Text>
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
    activityEmptyText: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
    },
    pausedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 4,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    pausedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#f59e0b',
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
    announcementDescription: {
      fontSize: 12,
      color: theme.tertiary,
      marginTop: 2,
      marginBottom: 2,
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
