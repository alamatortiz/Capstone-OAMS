import { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, CheckCircle, ChevronRight, ClipboardList, Clock, FileText, Megaphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell from '@/components/NotificationBell';
import { PROFESSOR_NOTIFICATION_PATHS, PROFESSOR_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

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
// lucide-react-native icon component type -- matches web's actual icon
// choices (prof-dashboard.jsx's "custom SVG" icons are hand-copied lucide
// path data, so these map 1:1 onto real lucide components instead of the
// closest available Ionicons look-alike).
type LucideIconType = typeof Calendar;

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
  violet: { bg: 'rgba(124, 58, 237, 0.16)', border: 'rgba(124, 58, 237, 0.25)', color: '#7c3aed' },
  orange: { bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.25)', color: '#f97316' },
  green: { bg: 'rgba(34, 197, 94, 0.16)', border: 'rgba(34, 197, 94, 0.25)', color: '#22c55e' },
} as const;

interface StatItem {
  key: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIconType;
  tint: keyof typeof STAT_TINTS;
}

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: LucideIconType;
  badge?: string;
  gradient: readonly [string, string];
}

interface TodayAppointment {
  id: number;
  student: string;
  studentNumber?: string;
  purpose: string;
  appointmentType?: string;
  time: string;
  status: string;
}

const STATUS_META: Record<string, { bg: string; border: string; color: string }> = {
  approved: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.4)', color: '#22c55e' },
  pending: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
};

// Mirrors prof-dashboard.jsx's formatActivityStatus: title-cases the raw
// status and special-cases the same two words, so Recent Activity's badge
// text reads the same way on both dashboards ("No Show" not "no_show").
function formatActivityStatus(status: string, type: string) {
  if (status === 'no_show') return 'No Show';
  if (type === 'document' && status === 'generated') return 'Ready';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const ACTIVITY_STATUS_META: Record<string, { bg: string; border: string; color: string }> = {
  approved: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  completed: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  ready: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  generated: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  claimed: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
  processing: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#9ca3af' },
  no_show: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};
const DEFAULT_ACTIVITY_STATUS_META = { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#9ca3af' };

interface ActivityEntry {
  id: number;
  type: string;
  title: string;
  status: string;
  time: string;
}

interface DashboardAnnouncement {
  id: string;
  title: string;
  description: string;
  college: string;
  date: string;
  isPinned: boolean;
}

// Compact date used in the dashboard's pinned-announcement preview card --
// no "Posted:"/"Reposted:" prefix, unlike professor_announcement.tsx's own
// full detail formatter, matching web's plain formatManilaDateTime(ann.date).
function formatAnnouncementPreviewDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface OfficeHoursData {
  departmentName: string;
  departmentAbbrev: string;
  schedule: { day: string; time: string }[];
  location: string;
}

// Splits only on a comma followed by a weekday name -- mirrors both the web
// parser (dateTime.js's parseOfficeHoursSchedule) and student_dashboard.tsx's
// own local copy, so free-text office hours strings render the same way
// everywhere.
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
  { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
  { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'time-outline' },
];

export default function ProfessorDashboardScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);

  const [officeHours, setOfficeHours] = useState<OfficeHoursData | null>(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true);
  const [officeHoursError, setOfficeHoursError] = useState<string | null>(null);

  // Mirrors `dashData` for the catch block below, without making fetchStats
  // depend on (and change identity with) the state itself.
  const dashDataRef = useRef(dashData);
  useEffect(() => { dashDataRef.current = dashData; }, [dashData]);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/professor/dashboard-stats');
      setDashData(data);
      setIsAvailable((data.availabilityStatus ?? 'available') === 'available');
    } catch (err) {
      console.error('Fetch dashboard stats error:', err);
      if (!dashDataRef.current) {
        setError('Could not load dashboard data.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh dashboard data.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetches the live pinned-count for the Announcements quick-action tile.
  // Kept separate from fetchStats/dashData since it's an unrelated resource
  // (mirrors student_dashboard.tsx's own separate announcements fetch).
  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/professor/announcements');
      setAnnouncements(data?.announcements ?? []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  }, []);

  const fetchOfficeHours = useCallback(async () => {
    setOfficeHoursLoading(true);
    try {
      const { data } = await api.get('/professor/office-hours');
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

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchStats();
    const events = ['appointment:slot-updated', 'appointment:status-updated', 'document:status-updated'];
    events.forEach((event) => socket.on(event, refetch));
    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [user, token, fetchStats]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on('announcement:changed', fetchAnnouncements);
    return () => {
      socket.off('announcement:changed', fetchAnnouncements);
    };
  }, [user, token, fetchAnnouncements]);

  const s = dashData?.stats;

  // Same conditional-list-building pattern as prof-dashboard.jsx's own stat
  // card descriptions, over stats.appointments.{pending,approved} and
  // stats.documents.{pendingOnly,processing,ready,released}.
  const appointmentsDescription = loading
    ? 'Loading...'
    : (() => {
        const parts: string[] = [];
        const pending = s?.appointments?.pending ?? 0;
        const approved = s?.appointments?.approved ?? 0;
        if (pending > 0) parts.push(`${pending} pending`);
        if (approved > 0) parts.push(`${approved} approved`);
        return parts.length ? parts.join(', ') : 'No pending appointments';
      })();

  const documentsDescription = loading
    ? 'Loading...'
    : (() => {
        const parts: string[] = [];
        const docs = s?.documents ?? {};
        if (docs.pendingOnly > 0) parts.push(`${docs.pendingOnly} pending`);
        if (docs.processing > 0) parts.push(`${docs.processing} processing`);
        if (docs.ready > 0) parts.push(`${docs.ready} ready`);
        if (docs.released > 0) parts.push(`${docs.released} released`);
        return parts.length ? parts.join(', ') : 'No pending documents';
      })();

  const stats: StatItem[] = [
    { key: 'appointments', title: 'Appointments', value: loading ? '—' : String(s?.pendingAppointments ?? 0), description: appointmentsDescription, icon: Calendar, tint: 'violet' },
    { key: 'documents', title: 'Documents', value: loading ? '—' : String(s?.documentsToReview ?? 0), description: documentsDescription, icon: FileText, tint: 'orange' },
    { key: 'completed', title: 'Completed', value: loading ? '—' : String(s?.completed ?? 0), description: 'Total transactions', icon: CheckCircle, tint: 'green' },
  ];

  const todaysAppointments: TodayAppointment[] = dashData?.todayAppointments ?? [];
  const recentActivity: ActivityEntry[] = dashData?.recentActivity ?? [];

  // Mirrors prof-dashboard.jsx's allPinnedAnnouncements/pinnedPreview/morePinnedCount.
  const pinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const pinnedPreview = pinnedAnnouncements.slice(0, 2);
  const morePinnedCount = pinnedAnnouncements.length - pinnedPreview.length;

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const toggleAvailability = async (value: boolean) => {
    const prev = isAvailable;
    setIsAvailable(value);
    try {
      await api.patch('/professor/availability-status', {
        status: value ? 'available' : 'unavailable',
      });
    } catch (err) {
      console.error('Update availability error:', err);
      setIsAvailable(prev);
      Alert.alert('Error', 'Could not update availability status.');
    }
  };

  const handleStatPress = (key: string) => {
    if (key === 'appointments') {
      router.push('/pages/professor/professor_appointment');
      return;
    }
    if (key === 'documents') {
      // Stat tile opens the tracking/status screen (professor_documents_status.tsx) —
      // distinct from the sidebar's "Documents" destination, which is the
      // request-list screen (professor_documents.tsx) via handleNavPress.
      router.push('/pages/professor/professor_documents_status');
      return;
    }
    if (key === 'completed') {
      router.push('/pages/professor/professor_transactions');
      return;
    }
    comingSoon();
  };

  // Mirrors prof-dashboard.jsx's own quickActions array exactly (order,
  // copy, and which tiles carry a live badge vs none).
  const quickActions: QuickAction[] = [
    { key: 'announcements', title: 'Announcements', description: 'Stay updated with the latest notices from your department.', icon: Megaphone, badge: `${pinnedAnnouncements.length} Pinned`, gradient: ['#22c55e', '#16a34a'] },
    { key: 'schedule-manager', title: 'Schedule Manager', description: 'Set your weekly recurring availability by day. It repeats every week until you edit or remove it.', icon: Calendar, gradient: ['#a855f7', '#9333ea'] },
    { key: 'appointments', title: 'Appointments', description: 'Review and manage student appointment requests.', icon: Calendar, badge: `${s?.pendingAppointments ?? 0} Active`, gradient: ['#a855f7', '#9333ea'] },
    { key: 'document-request', title: 'Document Requests', description: 'Request documents and track their status.', icon: FileText, badge: `${s?.documentsToReview ?? 0} Pending`, gradient: ['#f97316', '#ea580c'] },
    { key: 'transactions', title: 'Transactions', description: 'View all your activities and transactions.', icon: ClipboardList, gradient: ['#22c55e', '#16a34a'] },
  ];

  // Badge color follows each tile's own gradient family, mirroring
  // prof-dashboard.css's .action-badge overrides per action-gradient-N.
  const ACTION_BADGE_META: Record<string, { bg: string; color: string }> = {
    announcements: { bg: 'rgba(22, 163, 74, 0.15)', color: isDarkMode ? '#22c55e' : '#15803d' },
    'schedule-manager': { bg: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe' },
    appointments: { bg: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe' },
    'document-request': { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' },
    transactions: { bg: 'rgba(22, 163, 74, 0.15)', color: theme.primary },
  };

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') return;
    if (key === 'announcements') {
      router.push('/pages/professor/professor_announcement');
      return;
    }
    if (key === 'appointments') {
      router.push('/pages/professor/professor_appointment');
      return;
    }
    if (key === 'documents') {
      router.push('/pages/professor/professor_documents');
      return;
    }
    if (key === 'transactions') {
      router.push('/pages/professor/professor_transactions');
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

  const collegeLogo = collegeLogos[user?.departmentAbbrev ?? 'CCS'] ?? ccsLogo;

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
              endpointBase="professor"
              theme={theme}
              typePaths={PROFESSOR_NOTIFICATION_PATHS}
              viewAllPath={PROFESSOR_NOTIFICATIONS_VIEW_ALL}
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
              <Text style={styles.bannerTitle}>Prof. {user?.name ?? 'Faculty'}</Text>
            </View>
            <View style={styles.bannerBadges}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>Professor Portal</Text>
              </View>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{user?.employeeId ?? ''}</Text>
              </View>
            </View>
          </LinearGradient>

          {error && (
            <View style={styles.card}>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable onPress={fetchStats}>
                <Text style={styles.viewAllText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => {
              const tint = STAT_TINTS[stat.tint];
              return (
                <Pressable key={stat.key} style={styles.statCard} onPress={() => handleStatPress(stat.key)}>
                  <View style={[styles.statIcon, { backgroundColor: tint.bg, borderColor: tint.border }]}>
                    <stat.icon size={20} color={tint.color} />
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
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                style={styles.actionCard}
                onPress={() => {
                  if (action.key === 'document-request') {
                    router.push('/pages/professor/professor_documents');
                    return;
                  }
                  if (action.key === 'schedule-manager') {
                    router.push('/pages/professor/professor_schedule_manager');
                    return;
                  }
                  if (action.key === 'announcements') {
                    router.push('/pages/professor/professor_announcement');
                    return;
                  }
                  if (action.key === 'appointments') {
                    router.push('/pages/professor/professor_appointment');
                    return;
                  }
                  if (action.key === 'transactions') {
                    router.push('/pages/professor/professor_transactions');
                    return;
                  }
                  comingSoon();
                }}
              >
                <View style={styles.actionMain}>
                  <LinearGradient colors={action.gradient} style={styles.actionIcon}>
                    <action.icon size={22} color="#ffffff" />
                  </LinearGradient>
                  <View style={styles.actionBody}>
                    {action.badge && (() => {
                      const badgeMeta = ACTION_BADGE_META[action.key] ?? ACTION_BADGE_META.announcements;
                      return (
                        <View style={[styles.actionBadge, { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.bg }]}>
                          <Text style={[styles.actionBadgeText, { color: badgeMeta.color }]}>{action.badge}</Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDescription}>{action.description}</Text>
                    <View style={styles.actionCta}>
                      <Text style={styles.actionCtaText}>Open</Text>
                      <ChevronRight size={14} color={theme.primary} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Today's Appointments */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Calendar size={16} color={theme.text} />
              <Text style={styles.sectionTitle}>Today&apos;s Appointments</Text>
            </View>
            <Pressable style={styles.viewAllRow} onPress={() => router.push('/pages/professor/professor_appointment')} hitSlop={8}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={13} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.card}>
            {loading ? (
              <Text style={styles.emptyText}>Loading appointments...</Text>
            ) : todaysAppointments.length === 0 ? (
              <View style={styles.emptyContent}>
                <View style={styles.emptyIcon}>
                  <Calendar size={18} color={theme.subtext} />
                </View>
                <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
              </View>
            ) : (
              <>
                {todaysAppointments.slice(0, 3).map((apt, index, arr) => {
                  const status = STATUS_META[apt.status] ?? STATUS_META.pending;
                  return (
                    <View
                      key={apt.id}
                      style={[
                        styles.appointmentItem,
                        index === arr.length - 1 && styles.appointmentItemLast,
                      ]}
                    >
                      <View style={styles.appointmentIcon}>
                        <Calendar size={20} color={theme.primary} />
                      </View>
                      <View style={styles.appointmentBody}>
                        <View style={styles.appointmentStudentRow}>
                          <Text style={styles.appointmentStudent}>{apt.student}</Text>
                          {apt.studentNumber && (
                            <View style={styles.studentIdBadge}>
                              <Text style={styles.studentIdBadgeText}>{apt.studentNumber}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.appointmentPurpose}>{apt.appointmentType || apt.purpose}</Text>
                      </View>
                      <View style={styles.appointmentTimeStatus}>
                        <Text style={styles.appointmentTime}>{apt.time}</Text>
                        <View
                          style={[
                            styles.appointmentBadge,
                            { backgroundColor: status.bg, borderColor: status.border },
                          ]}
                        >
                          <Text style={[styles.appointmentBadgeText, { color: status.color }]}>
                            {apt.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {todaysAppointments.length > 3 && (
                  <Pressable onPress={() => router.push('/pages/professor/professor_appointment')} hitSlop={8}>
                    <Text style={styles.moreLink}>+ {todaysAppointments.length - 3} more today</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Pinned Announcements */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Megaphone size={16} color={theme.text} />
              <Text style={styles.sectionTitle}>Pinned Announcements</Text>
            </View>
            <Pressable style={styles.viewAllRow} onPress={() => router.push('/pages/professor/professor_announcement')} hitSlop={8}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={13} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.card}>
            {loading ? (
              <Text style={styles.emptyText}>Loading announcements...</Text>
            ) : pinnedAnnouncements.length === 0 ? (
              <View style={styles.emptyContent}>
                <View style={styles.emptyIcon}>
                  <Megaphone size={18} color={theme.subtext} />
                </View>
                <Text style={styles.emptyText}>No pinned announcements</Text>
              </View>
            ) : (
              <>
                {pinnedPreview.map((ann, index) => (
                  <View
                    key={ann.id}
                    style={[
                      styles.announcementItem,
                      index === pinnedPreview.length - 1 && styles.announcementItemLast,
                    ]}
                  >
                    <View style={styles.announcementItemHeader}>
                      <Text style={styles.announcementTitle}>{ann.title}</Text>
                      <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedBadgeText}>Pinned</Text>
                      </View>
                    </View>
                    <Text style={styles.appointmentPurpose}>
                      {ann.college} · {formatAnnouncementPreviewDate(ann.date)}
                    </Text>
                    {ann.description ? (
                      <Text style={styles.announcementDescription} numberOfLines={2}>
                        {ann.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
                {morePinnedCount > 0 && (
                  <Pressable onPress={() => router.push('/pages/professor/professor_announcement')} hitSlop={8}>
                    <Text style={styles.moreLink}>+ {morePinnedCount} more pinned</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable style={styles.viewAllRow} onPress={() => router.push('/pages/professor/professor_transactions')} hitSlop={8}>
              <Text style={styles.viewAllText}>See All</Text>
              <ChevronRight size={13} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.card}>
            {loading ? (
              <Text style={styles.emptyText}>Loading...</Text>
            ) : recentActivity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activity.</Text>
            ) : (
              recentActivity.map((activity, index) => {
                const isDocument = activity.type === 'document';
                const statusMeta = ACTIVITY_STATUS_META[activity.status] ?? DEFAULT_ACTIVITY_STATUS_META;
                return (
                  <View
                    key={activity.id}
                    style={[
                      styles.activityItem,
                      index === recentActivity.length - 1 && styles.activityItemLast,
                    ]}
                  >
                    <View style={[styles.activityIconWrap, isDocument ? styles.activityIconDocument : styles.activityIconAppointment]}>
                      {isDocument ? (
                        <FileText size={15} color="#f59e0b" />
                      ) : (
                        <Calendar size={15} color={theme.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText}>{activity.title}</Text>
                      <Text style={styles.appointmentPurpose}>{activity.time}</Text>
                    </View>
                    <View style={[styles.activityStatusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                      <Text style={[styles.activityStatusBadgeText, { color: statusMeta.color }]}>
                        {formatActivityStatus(activity.status, activity.type)}
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
                <Clock size={18} color="#ffffff" />
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
                <Text style={styles.drawerName}>{user?.name ?? 'Faculty'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Professor</Text>
              </View>
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''}</Text>
            </View>

            <View style={styles.availabilityRow}>
              <Text style={styles.availabilityLabel}>{isAvailable ? 'Available' : 'Unavailable'}</Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#3f3f46', true: '#22c55e' }}
                thumbColor="#ffffff"
              />
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
    bannerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bannerLogo: { width: 32, height: 32 },
    bannerTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: '#ffffff',
      flexShrink: 1,
    },
    bannerGreeting: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 14,
      marginBottom: 8,
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    moreLink: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      textAlign: 'center',
      marginTop: 4,
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
      width: 52,
      height: 52,
      borderRadius: 16,
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
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(22, 163, 74, 0.22)',
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    actionBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
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
    emptyText: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      paddingVertical: 12,
    },
    emptyContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    emptyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Today's appointments
    appointmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 1.5,
      borderColor: 'rgba(34, 197, 94, 0.4)',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderRadius: 14,
      marginBottom: 12,
    },
    appointmentItemLast: {
      marginBottom: 0,
    },
    appointmentIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.18)',
      borderWidth: 1.5,
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    appointmentBody: {
      flex: 1,
      gap: 3,
    },
    appointmentStudentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    appointmentStudent: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    studentIdBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    studentIdBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
    },
    appointmentPurpose: {
      fontSize: 12,
      color: theme.subtext,
    },
    appointmentTimeStatus: {
      alignItems: 'flex-end',
      gap: 6,
    },
    appointmentTime: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    appointmentBadge: {
      borderWidth: 0.5,
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    appointmentBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },

    // Pinned announcements
    announcementItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 4,
    },
    announcementItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    announcementItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    announcementTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    pinnedBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    pinnedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
    },
    announcementDescription: {
      fontSize: 12,
      color: theme.subtext,
      lineHeight: 17,
      marginTop: 2,
    },

    // Recent activity
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    activityItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    activityIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      flexShrink: 0,
    },
    activityIconAppointment: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    activityIconDocument: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    activityStatusBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
    },
    activityStatusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    activityText: {
      flex: 1,
      fontSize: 13,
      color: theme.subtext,
      lineHeight: 19,
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
    availabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    availabilityLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    drawerNav: {
      flex: 1,
      marginTop: 16,
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
