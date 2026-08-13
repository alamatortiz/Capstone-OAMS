import { useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
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

type BookingStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';

interface Appointment {
  id: string;
  person: string;
  college: string;
  collegeAbbrev?: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  location: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  appointmentType?: string;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending', approved: 'Approved', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled',
};

type StatusStyle = { bg: string; border: string; color: string };

const STATUS_STYLES_DARK: Record<BookingStatus, StatusStyle> = {
  pending: { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.4)', color: '#fcd34d' },
  approved: { bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#86efac' },
  completed: { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.35)', color: '#e5e7eb' },
  rejected: { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#d1d5db' },
};

const STATUS_STYLES_LIGHT: Record<BookingStatus, StatusStyle> = {
  pending: { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)', color: '#92400e' },
  approved: { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  completed: { bg: 'rgba(75, 85, 99, 0.1)', border: 'rgba(75, 85, 99, 0.25)', color: '#1f2937' },
  rejected: { bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.08)', border: 'rgba(107, 114, 128, 0.2)', color: '#374151' },
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

type TabKey = 'all' | BookingStatus;
type RangeKey = 'week' | 'month' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = { week: 'This Week', month: 'This Month', all: 'All Time' };

// Mirrors client/src/utils/dateRange.js — week starts on Sunday, matching
// the appointment booking calendar elsewhere in the app.
function filterByRange<T extends { date: string }>(items: T[], rangeKey: RangeKey): T[] {
  if (rangeKey === 'all') return items;
  const now = new Date();
  let start: Date;
  let end: Date;
  if (rangeKey === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  }
  return items.filter((item) => {
    const d = new Date(`${item.date}T00:00:00`);
    return d >= start && d <= end;
  });
}

const TABS: { key: TabKey; label: string; icon: IoniconName }[] = [
  { key: 'all', label: 'All', icon: 'list-outline' },
  { key: 'pending', label: 'Pending', icon: 'time-outline' },
  { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

const formatDate = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const formatDateShort = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function StudentAppointmentStatusScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ appointmentId?: string; fromBookings?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.appointmentId ?? null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [allRange, setAllRange] = useState<RangeKey>('week');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const statusStyles = isDarkMode ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  const styles = createStyles(theme);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/student/appointments');
      setAppointments(
        (data.appointments ?? []).map((a: any) => ({
          id: String(a.id),
          person: a.person,
          college: a.collegeAbbrev || a.college,
          collegeAbbrev: a.collegeAbbrev,
          date: a.date,
          windowStart: a.windowStart ?? '',
          windowEnd: a.windowEnd ?? '',
          location: a.location,
          purpose: a.purpose ?? '',
          status: a.status,
          createdAt: a.createdAt,
          appointmentType: a.appointmentType ?? undefined,
        })),
      );
      setError(null);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setError('Could not load your appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Live updates: refetch + notify when an appointment's status changes
  // (mirrors stud-appointment-status.jsx's "appointment:status-updated").
  // This is the tracking/detail screen, so it owns the notification; the
  // browse/book screen (student_appointments.tsx) refetches silently. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const onAppointmentStatusUpdated = () => {
      fetchAppointments();
      notify('Appointment status updated', 'One of your appointments has a new status.');
    };
    socket.on('appointment:status-updated', onAppointmentStatusUpdated);

    return () => {
      socket.off('appointment:status-updated', onAppointmentStatusUpdated);
    };
  }, [user, token, fetchAppointments]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const comingSoon = () => Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  const goToDashboard = () => router.push('/pages/student/student_dashboard');
  const goToBooking = () => router.push('/pages/student/student_appointments');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'appointments') { router.push('/pages/student/student_appointments'); return; }
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'documents') { router.push('/pages/student/student_documents'); return; }
    if (key === 'transactions') { router.push('/pages/student/student_transactions'); return; }
    comingSoon();
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  // Defaults to "This Week" across every tab — the range control lets a
  // student switch to "This Month"/"All Time" to see everything else.
  const rangeFilteredAppointments = filterByRange(appointments, allRange);
  const byStatus = (status: BookingStatus) => rangeFilteredAppointments.filter((a) => a.status === status);
  const tabLists: Record<TabKey, Appointment[]> = {
    all: rangeFilteredAppointments,
    pending: byStatus('pending'),
    approved: byStatus('approved'),
    completed: byStatus('completed'),
    rejected: byStatus('rejected'),
    cancelled: byStatus('cancelled'),
  };

  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? null;

  const doCancel = async () => {
    const id = cancelConfirmId;
    setCancelConfirmId(null);
    if (!id || cancelling) return;
    setCancelling(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      setSelectedId(null);
      await fetchAppointments();
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to cancel the appointment.');
    } finally {
      setCancelling(null);
    }
  };

  const collegeLogoFor = (abbrev: string) => collegeLogos[abbrev] ?? ccsLogo;

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
          {selectedAppt ? (
            // ─── Detail View ───
            <>
              <Pressable
                style={styles.breadcrumb}
                onPress={() =>
                  params.fromBookings === 'true'
                    ? router.push({ pathname: '/pages/student/student_appointments', params: { activeTab: 'bookings' } })
                    : setSelectedId(null)
                }
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>My Appointments</Text>
              </Pressable>

              <View style={styles.titleRow}>
                <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
                  <Ionicons name="calendar-outline" size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.pageTitle}>Appointment Details</Text>
                  <Text style={styles.pageSubtitle}>Your appointment details and status.</Text>
                </View>
              </View>

              {/* Hero */}
              <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.heroCard}>
                <View style={styles.heroContent}>
                  <View style={styles.heroLogoWrap}>
                    <Image source={collegeLogoFor(selectedAppt.college)} style={styles.heroLogoImg} resizeMode="contain" />
                  </View>
                  <View style={styles.heroTextWrap}>
                    <Text style={styles.heroServiceName}>{selectedAppt.person}</Text>
                    <Text style={styles.heroCollegeText}>{selectedAppt.college}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Appointment Information */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="calendar-outline" size={18} color={theme.purple} />
                  <Text style={styles.infoCardTitle}>Appointment Information</Text>
                </View>
                <View style={styles.infoCardBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Professor</Text>
                    <Text style={styles.detailValue}>{selectedAppt.person}</Text>
                  </View>
                  {selectedAppt.appointmentType ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Appointment Type</Text>
                      <Text style={styles.detailValue}>{selectedAppt.appointmentType}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>College / Department</Text>
                    <Text style={styles.detailValue}>{selectedAppt.college}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedAppt.date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time Slot</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppt.windowStart && selectedAppt.windowEnd
                        ? `${formatTime(selectedAppt.windowStart)} – ${formatTime(selectedAppt.windowEnd)}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedAppt.location}</Text>
                  </View>
                  {selectedAppt.purpose ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purpose</Text>
                      <Text style={styles.detailValue}>{selectedAppt.purpose}</Text>
                    </View>
                  ) : null}
                  {selectedAppt.createdAt ? (
                    <View style={[styles.detailRow, styles.detailRowLast]}>
                      <Text style={styles.detailLabel}>Booked On</Text>
                      <Text style={styles.detailValue}>{formatDateShort(selectedAppt.createdAt)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Status */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.purple} />
                  <Text style={styles.infoCardTitle}>Status</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.statusBadge, {
                    backgroundColor: statusStyles[selectedAppt.status].bg,
                    borderColor: statusStyles[selectedAppt.status].border,
                  }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyles[selectedAppt.status].color }]}>
                      {STATUS_LABELS[selectedAppt.status]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Cancel */}
              {(selectedAppt.status === 'pending' || selectedAppt.status === 'approved') && (
                <View style={[styles.infoCard, styles.cancelCard]}>
                  <View style={[styles.infoCardHeader, styles.cancelCardHeader]}>
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                    <Text style={[styles.infoCardTitle, { color: '#ef4444' }]}>Cancel Appointment</Text>
                  </View>
                  <View style={styles.infoCardBody}>
                    <Text style={styles.cancelDesc}>
                      Cancelling will permanently remove this appointment. You will need to book a new one if you change your mind.
                    </Text>
                    <Pressable style={styles.cancelBtn} onPress={() => setCancelConfirmId(selectedAppt.id)}>
                      <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                      <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          ) : (
            // ─── List View ───
            <>
              <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>Home</Text>
              </Pressable>

              <View style={styles.titleRow}>
                <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
                  <Ionicons name="calendar-outline" size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.pageTitle}>My Appointments</Text>
                  <Text style={styles.pageSubtitle}>Track all of your appointments.</Text>
                </View>
              </View>

              {/* Professor Schedules quick link */}
              <Pressable
                style={styles.profSchedCard}
                onPress={() =>
                  router.push({
                    pathname: '/pages/student/student_professor_schedules',
                    params: { from: 'appointment-status' },
                  })
                }
              >
                <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.profSchedIcon}>
                  <Ionicons name="school-outline" size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.profSchedText}>
                  <Text style={styles.profSchedTitle}>Professor Schedules</Text>
                  <Text style={styles.profSchedSubtitle}>Check professor consultation hours and availability across all departments.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.purple} />
              </Pressable>

              {error && (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Something went wrong</Text>
                  <Text style={styles.emptyDescription}>{error}</Text>
                  <Pressable style={styles.bookCtaBtn} onPress={fetchAppointments}>
                    <Text style={styles.bookCtaBtnText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {loading && !error && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyDescription}>Loading your appointments…</Text>
                </View>
              )}

              {!loading && !error && (
              <>
              {/* Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                <View style={styles.tabsRow}>
                  {TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                        <Ionicons name={tab.icon} size={14} color={active ? theme.purple : theme.subtext} />
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                        <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{tabLists[tab.key].length}</Text></View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Date range — governs every tab, defaults to This Week */}
              <View style={styles.rangeRow}>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => {
                  const active = allRange === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.rangeChip, active && styles.rangeChipActive]}
                      onPress={() => setAllRange(key)}
                    >
                      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                        {RANGE_LABELS[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* List */}
              {tabLists[activeTab].length > 0 ? (
                <View style={styles.listContainer}>
                  {tabLists[activeTab].map((appt) => {
                    const isDim = appt.status === 'completed' || appt.status === 'rejected' || appt.status === 'cancelled';
                    const s = statusStyles[appt.status];
                    return (
                      <Pressable
                        key={appt.id}
                        style={[styles.listItem, isDim && styles.listItemDim]}
                        onPress={() => setSelectedId(appt.id)}
                      >
                        <View style={styles.listItemHeaderRow}>
                          <View style={[styles.listIconWrap, isDim && styles.listIconWrapDim]}>
                            <Ionicons name="calendar-outline" size={22} color={isDim ? theme.tertiary : theme.purple} />
                          </View>
                          <View style={styles.listItemTitleWrap}>
                            <Text style={[styles.listItemName, isDim && styles.listItemNameDim]}>{appt.person}</Text>
                            <Text style={styles.listItemCollege}>{appt.college}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                            <Text style={[styles.statusBadgeText, { color: s.color }]}>{STATUS_LABELS[appt.status]}</Text>
                          </View>
                        </View>
                        <View style={styles.listItemGrid}>
                          <View style={styles.listItemField}>
                            <Text style={styles.listItemFieldLabel}>Date</Text>
                            <Text style={styles.listItemFieldValue}>{formatDateShort(appt.date)}</Text>
                          </View>
                          <View style={styles.listItemField}>
                            <Text style={styles.listItemFieldLabel}>Time Slot</Text>
                            <Text style={styles.listItemFieldValue}>
                              {appt.windowStart && appt.windowEnd ? `${formatTime(appt.windowStart)} – ${formatTime(appt.windowEnd)}` : '—'}
                            </Text>
                          </View>
                          {appt.appointmentType && (
                            <View style={styles.listItemFieldFull}>
                              <Text style={styles.listItemFieldLabel}>Appointment Type</Text>
                              <Text style={styles.listItemFieldValue}>{appt.appointmentType}</Text>
                            </View>
                          )}
                          <View style={styles.listItemFieldFull}>
                            <Text style={styles.listItemFieldLabel}>Location</Text>
                            <Text style={styles.listItemFieldValue}>{appt.location}</Text>
                          </View>
                          {appt.purpose ? (
                            <View style={styles.listItemFieldFull}>
                              <Text style={styles.listItemFieldLabel}>Purpose</Text>
                              <Text style={styles.listItemFieldValueMuted}>{appt.purpose}</Text>
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'all' ? 'No Appointments Yet' : `No ${TABS.find((t) => t.key === activeTab)?.label} Appointments`}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {activeTab === 'all'
                      ? 'You have no active appointments yet.'
                      : activeTab === 'pending'
                        ? 'You have no records of pending appointments.'
                        : `You have no records of ${activeTab} appointments.`}
                  </Text>
                  {(activeTab === 'all' || activeTab === 'pending') && (
                    <Pressable style={styles.bookCtaBtn} onPress={goToBooking}>
                      <Text style={styles.bookCtaBtnText}>Book an Appointment</Text>
                    </Pressable>
                  )}
                </View>
              )}
              </>
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

      {/* Cancel Appointment Confirm Modal */}
      <Modal visible={cancelConfirmId !== null} animationType="fade" transparent onRequestClose={() => setCancelConfirmId(null)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="calendar-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Cancel Appointment?</Text>
            <Text style={styles.logoutModalDescription}>
              {selectedAppt
                ? `You are about to cancel your appointment with ${selectedAppt.person} on ${formatDate(selectedAppt.date)}. This will permanently remove it — you'll need to book a new one if you change your mind.`
                : 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setCancelConfirmId(null)}>
                <Text style={styles.logoutCancelBtnText}>Keep Appointment</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={doCancel} disabled={cancelling === cancelConfirmId}>
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutConfirmBtnText}>{cancelling === cancelConfirmId ? 'Cancelling…' : 'Cancel Appointment'}</Text>
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  purple: string;
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
  purple: '#a855f7',
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
  purple: '#9333ea',
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

    scrollContent: { padding: 16, gap: 18, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Professor schedules card
    profSchedCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: 'rgba(168, 85, 247, 0.06)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 16, padding: 14,
    },
    profSchedIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    profSchedText: { flex: 1, gap: 2 },
    profSchedTitle: { fontSize: 14, fontWeight: '700', color: theme.purple },
    profSchedSubtitle: { fontSize: 11, color: theme.tertiary, lineHeight: 15 },

    // Hero
    heroCard: { borderRadius: 22, padding: 20 },
    heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroLogoWrap: {
      width: 72, height: 72, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', padding: 8,
    },
    heroLogoImg: { width: '100%', height: '100%' },
    heroTextWrap: { flex: 1, gap: 4 },
    heroServiceName: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
    heroCollegeText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

    // Tabs
    tabsScroll: { flexGrow: 0 },
    tabsRow: { flexDirection: 'row', gap: 8, borderBottomWidth: 2, borderBottomColor: theme.border, paddingBottom: 0 },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2,
    },
    tabActive: { borderBottomColor: theme.purple },
    tabText: { fontSize: 12, fontWeight: '700', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },
    tabTextActive: { color: theme.purple },
    tabCountPill: {
      minWidth: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5, backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    tabCountText: { fontSize: 10, fontWeight: '700', color: theme.purple },

    // Date range chips
    rangeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    rangeChip: {
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
    },
    rangeChipActive: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: theme.purple },
    rangeChipText: { fontSize: 12, fontWeight: '600', color: theme.subtext },
    rangeChipTextActive: { color: theme.purple },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)', borderRadius: 18,
      paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text, textAlign: 'center' },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },
    bookCtaBtn: { marginTop: 6, backgroundColor: theme.purple, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
    bookCtaBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // List
    listContainer: { gap: 14 },
    listItem: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 16, padding: 16, gap: 14,
    },
    listItemDim: { opacity: 0.72, borderColor: 'rgba(107, 114, 128, 0.25)' },
    listItemHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    listIconWrap: {
      width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(168, 85, 247, 0.12)', flexShrink: 0,
    },
    listIconWrapDim: { backgroundColor: 'rgba(107, 114, 128, 0.1)' },
    listItemTitleWrap: { flex: 1, gap: 2 },
    listItemName: { fontSize: 15, fontWeight: '700', color: theme.purple },
    listItemNameDim: { color: theme.tertiary },
    listItemCollege: { fontSize: 12, color: theme.tertiary },

    statusBadge: { borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

    listItemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    listItemField: { width: '47%', gap: 3 },
    listItemFieldFull: { width: '100%', gap: 3 },
    listItemFieldLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    listItemFieldValue: { fontSize: 13, fontWeight: '600', color: theme.purple, lineHeight: 18 },
    listItemFieldValueMuted: { fontSize: 13, fontWeight: '500', color: theme.text, lineHeight: 18 },

    // Detail info card
    infoCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)', borderRadius: 18, overflow: 'hidden',
    },
    infoCardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16,
      borderBottomWidth: 1, borderBottomColor: 'rgba(168, 85, 247, 0.1)',
    },
    infoCardTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    infoCardBody: { padding: 16, gap: 4 },
    detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(168, 85, 247, 0.1)', gap: 3 },
    detailRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    detailLabel: { fontSize: 11, fontWeight: '700', color: theme.purple, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailValue: { fontSize: 14, color: theme.text, lineHeight: 20 },

    // Cancel card
    cancelCard: { borderColor: 'rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.04)' },
    cancelCardHeader: { borderBottomColor: 'rgba(239, 68, 68, 0.15)' },
    cancelDesc: { fontSize: 12, color: theme.tertiary, lineHeight: 18, marginBottom: 12 },
    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
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

    // Confirm modals (shared card look)
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
