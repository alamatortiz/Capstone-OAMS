import { useState, useEffect, useCallback } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { notify } from '@/utils/notifications';
import NotificationBell from '@/components/NotificationBell';
import { PROFESSOR_NOTIFICATION_PATHS, PROFESSOR_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/coams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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
// GET /faculty/appointments really returns (studentName, studentId,
// appointmentType, date, time, location, purpose, status, requestedAt) — this
// screen otherwise ports the actual wired prof-appointments.jsx/.css 1:1
// (no stat cards — that's a design-mockup-only feature, not part of the real
// page), including the "All" tab's embedded This Week/Month/All Time range
// picker, which on mobile opens as a small modal instead of a native <select>. ───
type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';

interface Appointment {
  id: number;
  studentName: string;
  studentId: string;
  appointmentType: string | null;
  date: string;
  time: string;
  location: string;
  purpose: string;
  status: AppointmentStatus;
  requestedAt: string;
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

const TABS = ['all', 'pending', 'approved', 'completed', 'rejected'] as const;
type TabKey = (typeof TABS)[number];

const TAB_ICON_MAP: Record<TabKey, IoniconName> = {
  all: 'list-outline',
  pending: 'time-outline',
  approved: 'checkmark-circle-outline',
  completed: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

const ALL_RANGES = ['week', 'month', 'all'] as const;
type AllRange = (typeof ALL_RANGES)[number];

const ALL_RANGE_LABELS: Record<AllRange, string> = {
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

const STATUS_TINTS: Record<AppointmentStatus, { bg: string; border: string; color: string }> = {
  pending: { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.4)', color: '#fcd34d' },
  approved: { bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#86efac' },
  completed: { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399' },
  rejected: { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#d1d5db' },
};

type ActionType = 'approve' | 'reject' | 'complete' | 'cancel';

const STATUS_BY_ACTION: Record<ActionType, AppointmentStatus> = {
  approve: 'approved',
  reject: 'rejected',
  complete: 'completed',
  cancel: 'cancelled',
};

const CONFIRM_META: Record<
  ActionType,
  (apt: Appointment) => { title: string; message: string; confirmText: string; cancelText: string; icon: IoniconName; accent: string }
> = {
  approve: (apt) => ({
    title: 'Approve Appointment?',
    message: `Approve the appointment request from ${apt.studentName}?`,
    confirmText: 'Approve',
    cancelText: 'Cancel',
    icon: 'checkmark-circle-outline',
    accent: '#16a34a',
  }),
  reject: (apt) => ({
    title: 'Reject Appointment?',
    message: `Reject the appointment request from ${apt.studentName}? This action cannot be undone.`,
    confirmText: 'Reject',
    cancelText: 'Cancel',
    icon: 'close-circle-outline',
    accent: '#dc2626',
  }),
  complete: (apt) => ({
    title: 'Mark as Completed?',
    message: `Mark the appointment with ${apt.studentName} as completed?`,
    confirmText: 'Mark Complete',
    cancelText: 'Cancel',
    icon: 'checkmark-circle-outline',
    accent: '#2563eb',
  }),
  cancel: (apt) => ({
    title: 'Cancel Appointment?',
    message: `Cancel the appointment with ${apt.studentName}? This action cannot be undone.`,
    confirmText: 'Cancel Appointment',
    cancelText: 'Keep Appointment',
    icon: 'close-circle-outline',
    accent: '#ef4444',
  }),
};

// ─── Date helpers — mirrors getWeekRange/getMonthRange/isWithinRange in the
// web prof-appointments.jsx (week starts Sunday, matching the booking calendar). ───
function getWeekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isWithinRange(dateStr: string, range: { start: Date; end: Date }) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d >= range.start && d <= range.end;
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProfessorAppointmentScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [allRange, setAllRange] = useState<AllRange>('week');
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: ActionType; apt: Appointment } | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty/appointments');
      setAppointments(data ?? []);
    } catch (err) {
      console.error('Fetch appointments error:', err);
      Alert.alert('Error', 'Could not load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchAppointments();
    const events = ['appointment:slot-updated', 'appointment:status-updated'];
    events.forEach((event) => socket.on(event, refetch));

    const onStatusUpdated = () => {
      notify('Appointment update', 'An appointment status has changed.');
    };
    socket.on('appointment:status-updated', onStatusUpdated);

    return () => {
      events.forEach((event) => socket.off(event, refetch));
      socket.off('appointment:status-updated', onStatusUpdated);
    };
  }, [user, token, fetchAppointments]);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/professor/professor_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'appointments') return;
    if (key === 'dashboard') {
      goToDashboard();
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

  const allRangeAppointments =
    allRange === 'all'
      ? appointments
      : appointments.filter((a) => isWithinRange(a.date, allRange === 'week' ? getWeekRange() : getMonthRange()));

  const tabCounts: Record<TabKey, number> = {
    all: allRangeAppointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    approved: appointments.filter((a) => a.status === 'approved').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    rejected: appointments.filter((a) => a.status === 'rejected').length,
  };

  const visibleAppointments =
    activeTab === 'all' ? allRangeAppointments : appointments.filter((a) => a.status === activeTab);

  const requestAction = (type: ActionType, apt: Appointment) => setConfirmAction({ type, apt });

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, apt } = confirmAction;
    const status = STATUS_BY_ACTION[type];
    setConfirmSaving(true);
    try {
      await api.patch(`/faculty/appointments/${apt.id}/status`, { status });
      await fetchAppointments();
    } catch (err) {
      console.error('Update appointment status error:', err);
      Alert.alert('Error', 'Could not update the appointment.');
    } finally {
      setConfirmSaving(false);
      setConfirmAction(null);
    }
  };

  const confirmMeta = confirmAction ? CONFIRM_META[confirmAction.type](confirmAction.apt) : null;

  const selectRange = (r: AllRange) => {
    setAllRange(r);
    setActiveTab('all');
    setRangeModalOpen(false);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={pncLogo} style={styles.headerPncLogo} resizeMode="contain" />
            <CoamsLogo style={styles.headerOamsLogo} outline={isDarkMode} />
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
              endpointBase="faculty"
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
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
              <Ionicons name="calendar-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Appointment Manager</Text>
              <Text style={styles.pageSubtitle}>Review and manage student appointment requests</Text>
            </View>
          </View>

          {/* Schedule Manager card */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/pages/professor/professor_schedule_manager',
                params: { from: 'appointments' },
              })
            }
          >
            <LinearGradient
              colors={['rgba(124, 58, 237, 0.14)', 'rgba(168, 85, 247, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.schedCard}
            >
              <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.schedIcon}>
                <Ionicons name="time-outline" size={20} color="#ffffff" />
              </LinearGradient>
              <View style={styles.schedTextWrap}>
                <Text style={styles.schedTitle}>Schedule Manager</Text>
                <Text style={styles.schedSubtitle}>
                  Set your weekly consultation hours so students can book with you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a855f7" style={{ opacity: 0.7 }} />
            </LinearGradient>
          </Pressable>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsList}>
              {TABS.map((tab) => {
                const active = activeTab === tab;
                const icon = TAB_ICON_MAP[tab];

                if (tab === 'all') {
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.tabTrigger, active && styles.tabTriggerActive]}
                      onPress={() => setActiveTab('all')}
                    >
                      <Ionicons name={icon} size={14} color={active ? '#a855f7' : theme.subtext} />
                      <Pressable style={styles.rangeDropdown} onPress={() => setRangeModalOpen(true)} hitSlop={6}>
                        <Text style={[styles.tabTriggerText, active && styles.tabTriggerTextActive]}>
                          {ALL_RANGE_LABELS[allRange]}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={active ? '#a855f7' : theme.subtext} />
                      </Pressable>
                      <View style={[styles.tabCount, active && styles.tabCountActive]}>
                        <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                          {tabCounts.all}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={tab}
                    style={[styles.tabTrigger, active && styles.tabTriggerActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Ionicons name={icon} size={14} color={active ? '#a855f7' : theme.subtext} />
                    <Text style={[styles.tabTriggerText, active && styles.tabTriggerTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                    <View style={[styles.tabCount, active && styles.tabCountActive]}>
                      <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                        {tabCounts[tab]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* List */}
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading appointments…</Text>
            </View>
          ) : visibleAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'all' ? 'No Appointments Yet' : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Appointments`}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all'
                  ? 'New appointment requests from students will appear here.'
                  : `You have no ${activeTab} appointments.`}
              </Text>
            </View>
          ) : (
            <View style={styles.apptList}>
              {visibleAppointments.map((apt) => {
                const statusTint = STATUS_TINTS[apt.status];
                return (
                  <View key={apt.id} style={styles.apptCard}>
                    <View style={styles.apptCardHeaderRow}>
                      <View style={styles.apptIconWrap}>
                        <Ionicons name="calendar-outline" size={20} color="#a855f7" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.studentName}>{apt.studentName}</Text>
                        <Text style={styles.studentSub}>
                          {apt.studentId}
                          {apt.appointmentType ? ` · ${apt.appointmentType}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                        <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.apptInfoGrid}>
                      <View style={styles.apptInfoField}>
                        <Text style={styles.apptInfoLabel}>Date</Text>
                        <Text style={styles.apptInfoValue}>{formatDate(apt.date)}</Text>
                      </View>
                      <View style={styles.apptInfoField}>
                        <Text style={styles.apptInfoLabel}>Time</Text>
                        <Text style={styles.apptInfoValue}>{apt.time}</Text>
                      </View>
                      <View style={[styles.apptInfoField, styles.apptInfoFieldFull]}>
                        <Text style={styles.apptInfoLabel}>Location</Text>
                        <Text style={styles.apptInfoValue}>{apt.location}</Text>
                      </View>
                      {apt.purpose && (
                        <View style={[styles.apptInfoField, styles.apptInfoFieldFull]}>
                          <Text style={styles.apptInfoLabel}>Purpose</Text>
                          <Text style={styles.apptNotesText}>{apt.purpose}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.apptFooter}>
                      {apt.status === 'pending' && (
                        <View style={styles.apptActionsRow}>
                          <Pressable style={[styles.apptBtn, styles.apptBtnApprove]} onPress={() => requestAction('approve', apt)}>
                            <Ionicons name="checkmark-outline" size={14} color="#ffffff" />
                            <Text style={styles.apptBtnText}>Approve</Text>
                          </Pressable>
                          <Pressable style={[styles.apptBtn, styles.apptBtnReject]} onPress={() => requestAction('reject', apt)}>
                            <Ionicons name="close-outline" size={14} color="#ffffff" />
                            <Text style={styles.apptBtnText}>Reject</Text>
                          </Pressable>
                        </View>
                      )}
                      {apt.status === 'approved' && (
                        <View style={styles.apptActionsRow}>
                          <Pressable style={[styles.apptBtn, styles.apptBtnComplete]} onPress={() => requestAction('complete', apt)}>
                            <Ionicons name="checkmark-outline" size={14} color="#ffffff" />
                            <Text style={styles.apptBtnText}>Mark Complete</Text>
                          </Pressable>
                          <Pressable style={[styles.apptBtn, styles.apptBtnCancel]} onPress={() => requestAction('cancel', apt)}>
                            <Text style={styles.apptBtnCancelText}>Cancel</Text>
                          </Pressable>
                        </View>
                      )}
                      <Text style={styles.requestedText}>Requested: {apt.requestedAt}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <RangePickerModal
        visible={rangeModalOpen}
        value={allRange}
        onSelect={selectRange}
        onClose={() => setRangeModalOpen(false)}
        styles={styles}
      />

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
        userName={user?.name ?? 'Faculty'}
        userDept={user?.departmentName ?? ''}
      />

      <ConfirmActionModal
        visible={!!confirmAction}
        meta={confirmMeta ? { ...confirmMeta, confirmText: confirmSaving ? 'Please wait…' : confirmMeta.confirmText } : null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
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

function RangePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  styles,
}: {
  visible: boolean;
  value: AllRange;
  onSelect: (r: AllRange) => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.rangeModalCard}>
          {ALL_RANGES.map((r) => {
            const selected = value === r;
            return (
              <Pressable
                key={r}
                style={[styles.rangeOption, selected && styles.rangeOptionActive]}
                onPress={() => onSelect(r)}
              >
                <Text style={[styles.rangeOptionText, selected && styles.rangeOptionTextActive]}>
                  {ALL_RANGE_LABELS[r]}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color="#a855f7" />}
              </Pressable>
            );
          })}
          <Pressable style={styles.rangeModalClose} onPress={onClose}>
            <Text style={styles.rangeModalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmActionModal({
  visible,
  meta,
  onCancel,
  onConfirm,
  styles,
}: {
  visible: boolean;
  meta: { title: string; message: string; confirmText: string; cancelText: string; icon: IoniconName; accent: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!meta) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalCard}>
          <View style={[styles.confirmIconCircle, { backgroundColor: `${meta.accent}26` }]}>
            <Ionicons name={meta.icon} size={26} color={meta.accent} />
          </View>
          <Text style={styles.confirmTitle}>{meta.title}</Text>
          <Text style={styles.confirmDescription}>{meta.message}</Text>
          <View style={styles.confirmActionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>{meta.cancelText}</Text>
            </Pressable>
            <Pressable style={[styles.confirmActionBtn, { backgroundColor: meta.accent }]} onPress={onConfirm}>
              <Text style={styles.confirmBtnText}>{meta.confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  userName,
  userDept,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  userName: string;
  userDept: string;
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
              <Text style={styles.drawerName}>{userName}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>Professor</Text>
            </View>
            <Text style={styles.drawerCollege}>{userDept}</Text>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => {
              const active = item.key === 'appointments';
              return (
                <Pressable
                  key={item.key}
                  style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                  onPress={() => onNavPress(item.key)}
                >
                  <Ionicons name={item.icon} size={18} color={active ? '#ffffff' : theme.subtext} />
                  <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
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

    scrollContent: { padding: 16, gap: 18, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Schedule Manager card
    schedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    schedIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    schedTextWrap: { flex: 1, minWidth: 0, gap: 4 },
    schedTitle: { fontSize: 14, fontWeight: '700', color: '#a855f7' },
    schedSubtitle: { fontSize: 12, color: theme.subtext, lineHeight: 17 },

    // Tabs
    tabsScroll: { flexGrow: 0 },
    tabsList: { flexDirection: 'row', gap: 6, borderBottomWidth: 2, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, paddingBottom: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: '#a855f7', marginBottom: -2 },
    tabTriggerText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tabTriggerTextActive: { color: '#a855f7' },
    tabCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    tabCountActive: { backgroundColor: 'rgba(168, 85, 247, 0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: '#a855f7' },
    tabCountTextActive: { color: '#a855f7' },
    rangeDropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    // Empty state
    emptyState: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyText: { fontSize: 13, color: theme.tertiary, textAlign: 'center' },

    // Appointment cards
    apptList: { gap: 14 },
    apptCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 16,
      padding: 18,
      gap: 14,
    },
    apptCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    apptIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    studentName: { fontSize: 16, fontWeight: '700', color: '#a855f7' },
    studentSub: { fontSize: 13, color: theme.tertiary, marginTop: 2 },
    statusBadge: {
      minWidth: 76,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    statusBadgeText: { fontSize: 11.5, fontWeight: '700' },

    apptInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    apptInfoField: { width: '46%', gap: 3 },
    apptInfoFieldFull: { width: '100%' },
    apptInfoLabel: { fontSize: 10.5, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    apptInfoValue: { fontSize: 14, fontWeight: '600', color: '#a855f7', lineHeight: 19 },
    apptNotesText: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 19 },

    apptFooter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(168, 85, 247, 0.15)',
    },
    apptActionsRow: { flexDirection: 'row', gap: 8 },
    apptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    apptBtnApprove: { backgroundColor: '#16a34a' },
    apptBtnReject: { backgroundColor: '#dc2626' },
    apptBtnComplete: { backgroundColor: '#2563eb' },
    apptBtnCancel: { borderWidth: 1, borderColor: theme.border },
    apptBtnText: { fontSize: 12.5, fontWeight: '600', color: '#ffffff' },
    apptBtnCancelText: { fontSize: 12.5, fontWeight: '600', color: theme.text },
    requestedText: { fontSize: 11.5, color: theme.tertiary, marginLeft: 'auto' },

    // Range picker modal
    rangeModalCard: {
      width: '80%',
      maxWidth: 280,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 8,
    },
    rangeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    rangeOptionActive: { backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    rangeOptionText: { fontSize: 14, fontWeight: '600', color: theme.text },
    rangeOptionTextActive: { color: '#a855f7' },
    rangeModalClose: {
      paddingVertical: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 4,
    },
    rangeModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

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
    confirmActionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
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
  });
}
