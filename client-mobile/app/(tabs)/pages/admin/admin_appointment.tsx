import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import Toast from 'react-native-toast-message';
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
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

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

// ─── Field shapes documented here mirror what The real server route,
// GET /api/admin/appointments (adminRoutes.js), is scoped strictly to the
// signed-in admin's own department — it has no cross-college listing, so
// unlike the design-mockup AdminAppointmentsPage.tsx this mirrors the actual
// wired admin-appointment.jsx: one department's appointments only. Field
// shapes below match what that endpoint really returns (college, location,
// studentCourse, serviceName, isToday, etc.) — there is no "type" field, so
// it isn't rendered here. ───
type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  college: string;
  location: string;
  studentName: string;
  studentId: string;
  studentCourse: string;
  professor: string;
  serviceName: string | null;
  purpose: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  requestedAt: string;
  isToday: boolean;
}

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

const TABS = ['all', 'pending', 'approved', 'completed', 'rejected'] as const;
type TabKey = (typeof TABS)[number];

const STAT_TINTS = {
  total: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.25)', color: '#a855f7' },
  pending: { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.25)', color: '#10b981' },
  today: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' },
} as const;

const STATUS_TINTS: Record<AppointmentStatus, { bg: string; border: string; color: string; icon: IoniconName }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b', icon: 'alert-circle-outline' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981', icon: 'checkmark-circle-outline' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444', icon: 'alert-circle-outline' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981', icon: 'checkmark-circle-outline' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#6b7280', icon: 'alert-circle-outline' },
};

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminAppointmentScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';
  const adminDepartmentAbbrev = user?.departmentAbbrev ?? '';

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  // Mirrors `appointments` for the catch block below, without making
  // fetchAppointments depend on (and change identity with) the state itself.
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const fetchAppointments = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/admin/appointments');
      setAppointments(data.appointments ?? []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      if (appointmentsRef.current.length === 0) {
        setError('Failed to load appointments.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh appointments.' });
      }
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
    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [user, token, fetchAppointments]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'appointments') return;
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'queue') {
      router.push('/pages/admin/admin_queue');
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
    logout();
    router.replace('/login');
  };

  const searchFiltered = searchQuery
    ? appointments.filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.studentName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.professor.toLowerCase().includes(q)
        );
      })
    : appointments;

  const tabCounts: Record<TabKey, number> = {
    all: searchFiltered.length,
    pending: searchFiltered.filter((a) => a.status === 'pending').length,
    approved: searchFiltered.filter((a) => a.status === 'approved').length,
    completed: searchFiltered.filter((a) => a.status === 'completed').length,
    rejected: searchFiltered.filter((a) => a.status === 'rejected').length,
  };

  const visibleAppointments =
    activeTab === 'all' ? searchFiltered : searchFiltered.filter((a) => a.status === activeTab);

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    approved: appointments.filter((a) => a.status === 'approved').length,
    today: appointments.filter((a) => a.isToday).length,
  };

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
              <Image
                source={isDarkMode ? sunIcon : darkModeIcon}
                style={styles.iconBtnImg}
                resizeMode="contain"
              />
            </Pressable>
            <NotificationBell
              endpointBase="admin"
              theme={theme}
              typePaths={ADMIN_NOTIFICATION_PATHS}
              viewAllPath={ADMIN_NOTIFICATIONS_VIEW_ALL}
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
              <Text style={styles.pageTitle}>Centralized Appointment Management</Text>
              <Text style={styles.pageSubtitle}>
                Monitor and manage appointments for {adminDepartmentName}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {(
              [
                { key: 'total', label: 'Total Appointments', value: String(stats.total), icon: 'calendar-outline' as IoniconName },
                { key: 'pending', label: 'Pending', value: String(stats.pending), icon: 'alert-circle-outline' as IoniconName },
                { key: 'approved', label: 'Approved', value: String(stats.approved), icon: 'checkmark-circle-outline' as IoniconName },
                { key: 'today', label: 'Today', value: String(stats.today), icon: 'time-outline' as IoniconName },
              ] as const
            ).map((stat) => {
              const tint = STAT_TINTS[stat.key];
              return (
                <View key={stat.key} style={[styles.statCard, { borderColor: tint.border }]}>
                  <View style={styles.statCardTop}>
                    <Text style={styles.statCardLabel}>{stat.label}</Text>
                    <Ionicons name={stat.icon} size={18} color={tint.color} />
                  </View>
                  <Text style={[styles.statCardValue, { color: tint.color }]}>{stat.value}</Text>
                </View>
              );
            })}
          </View>

          {/* Search */}
          <View style={styles.card}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by student name, ID, or professor..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Appointment Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitleText}>Appointment Overview</Text>
            <Text style={styles.cardSubtitleText}>
              Appointment tracking and management for {adminDepartmentAbbrev}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <View style={styles.tabsList}>
                {TABS.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.tabTrigger, active && styles.tabTriggerActive]}
                      onPress={() => setActiveTab(tab)}
                    >
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

            {loading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color={theme.primary} />
                <Text style={styles.emptyTitle}>Loading appointments…</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>{error}</Text>
                <Pressable style={styles.viewDetailsBtn} onPress={fetchAppointments}>
                  <Text style={styles.viewDetailsBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : visibleAppointments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No appointments found</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {visibleAppointments.map((appointment) => {
                  const statusTint = STATUS_TINTS[appointment.status];
                  return (
                    <View key={appointment.id} style={styles.apptCard}>
                      <View style={styles.apptCardHeaderRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.collegeBadge}>
                            <Ionicons name="business-outline" size={13} color="#a855f7" />
                            <Text style={styles.collegeBadgeText}>{adminDepartmentAbbrev}</Text>
                          </View>
                          <View style={styles.studentInfoRow}>
                            <Ionicons name="person-outline" size={15} color={theme.tertiary} />
                            <Text style={styles.studentName}>{appointment.studentName}</Text>
                            <Text style={styles.studentId}>({appointment.studentId})</Text>
                          </View>
                          <Text style={styles.purposeText}>{appointment.purpose}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                          <Ionicons name={statusTint.icon} size={12} color={statusTint.color} />
                          <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.apptDetailsGrid}>
                        <View style={styles.apptDetailItem}>
                          <Text style={styles.apptDetailLabel}>Professor</Text>
                          <Text style={styles.apptDetailValue}>{appointment.professor}</Text>
                        </View>
                        <View style={styles.apptDetailItem}>
                          <Text style={styles.apptDetailLabel}>Date</Text>
                          <Text style={styles.apptDetailValue}>{formatDate(appointment.date)}</Text>
                        </View>
                        <View style={styles.apptDetailItem}>
                          <Text style={styles.apptDetailLabel}>Time</Text>
                          <Text style={styles.apptDetailValue}>{appointment.time}</Text>
                        </View>
                        <View style={styles.apptDetailItem}>
                          <Text style={styles.apptDetailLabel}>Location</Text>
                          <Text style={styles.apptDetailValue}>{appointment.location}</Text>
                        </View>
                      </View>

                      <View style={styles.apptCardFooter}>
                        <Text style={styles.requestedText}>Requested: {appointment.requestedAt}</Text>
                        <Pressable
                          style={styles.viewDetailsBtn}
                          onPress={() => setSelectedAppointment(appointment)}
                        >
                          <Text style={styles.viewDetailsBtnText}>View Details</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
        adminName={adminName}
        adminRole={adminRole}
        adminDepartmentName={adminDepartmentName}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
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

function AppointmentDetailsModal({
  appointment,
  onClose,
  theme,
  styles,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!appointment) return null;
  const statusTint = STATUS_TINTS[appointment.status];

  return (
    <Modal visible={!!appointment} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailsModalCard}>
          <View style={styles.detailsModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsModalTitle}>Appointment Details</Text>
              <Text style={styles.detailsModalSubtitle}>Read-only — monitoring view</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close-outline" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailsModalBody}>
            <View style={styles.detailsStatusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                <Ionicons name={statusTint.icon} size={12} color={statusTint.color} />
                <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.detailsTracking}>#{appointment.id}</Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Student</Text>
                <Text style={styles.detailsValue}>
                  {appointment.studentName} ({appointment.studentId})
                </Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Course</Text>
                <Text style={styles.detailsValue}>{appointment.studentCourse}</Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Faculty</Text>
                <Text style={styles.detailsValue}>{appointment.professor}</Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>College</Text>
                <Text style={styles.detailsValue}>{appointment.college}</Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Date</Text>
                <Text style={styles.detailsValue}>{formatDate(appointment.date)}</Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Time</Text>
                <Text style={styles.detailsValue}>{appointment.time}</Text>
              </View>
              <View style={styles.detailsField}>
                <Text style={styles.detailsLabel}>Location</Text>
                <Text style={styles.detailsValue}>{appointment.location}</Text>
              </View>
              {appointment.serviceName && (
                <View style={styles.detailsField}>
                  <Text style={styles.detailsLabel}>Service</Text>
                  <Text style={styles.detailsValue}>{appointment.serviceName}</Text>
                </View>
              )}
              <View style={[styles.detailsField, styles.detailsFieldFull]}>
                <Text style={styles.detailsLabel}>Purpose / Notes</Text>
                <Text style={styles.detailsValue}>{appointment.purpose}</Text>
              </View>
              <View style={[styles.detailsField, styles.detailsFieldFull]}>
                <Text style={styles.detailsLabel}>Requested At</Text>
                <Text style={styles.detailsValue}>{appointment.requestedAt}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.detailsModalFooter}>
            <Pressable style={styles.detailsCloseBtn} onPress={onClose}>
              <Text style={styles.detailsCloseBtnText}>Close</Text>
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
  adminName,
  adminRole,
  adminDepartmentName,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
  adminRole: string;
  adminDepartmentName: string;
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
              <Text style={styles.drawerName}>{adminName}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>{adminRole}</Text>
            </View>
            <Text style={styles.drawerCollege}>{adminDepartmentName}</Text>
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
  primary: '#22c55e',
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
  primary: '#15803d',
  blue: '#2563eb',
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

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47.5%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1 },
    statCardValue: { fontSize: 22, fontWeight: '800' },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    cardTitleText: { fontSize: 15, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, marginTop: -8 },

    // Search
    searchWrapper: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
    searchInput: {
      paddingVertical: 12,
      paddingLeft: 36,
      paddingRight: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },

    // Tabs
    tabsScroll: { flexGrow: 0 },
    tabsList: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingBottom: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: '#a855f7' },
    tabTriggerText: { fontSize: 13, fontWeight: '600', color: theme.subtext },
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

    // Appointment cards
    cardsList: { gap: 12 },
    emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle: { fontSize: 13, color: theme.tertiary },
    apptCard: {
      backgroundColor: 'rgba(168, 85, 247, 0.05)',
      borderWidth: 1.5,
      borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    apptCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    collegeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    collegeBadgeText: { fontSize: 11.5, fontWeight: '700', color: '#a855f7' },
    studentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    studentName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    studentId: { fontSize: 12, color: theme.tertiary },
    purposeText: { fontSize: 12.5, fontWeight: '500', color: theme.subtext },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 0.5,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    apptDetailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 10,
      backgroundColor: 'rgba(168, 85, 247, 0.06)',
      borderRadius: 10,
    },
    apptDetailItem: { width: '46%', gap: 2 },
    apptDetailLabel: { fontSize: 9.5, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    apptDetailValue: { fontSize: 12.5, fontWeight: '600', color: theme.text },

    apptCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(168, 85, 247, 0.2)',
    },
    requestedText: { fontSize: 11, color: theme.tertiary, flexShrink: 1, paddingRight: 8 },
    viewDetailsBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    viewDetailsBtnText: { fontSize: 12, fontWeight: '700', color: theme.text },

    // Details modal
    detailsModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.25)',
      borderRadius: 16,
    },
    detailsModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    detailsModalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    detailsModalSubtitle: { fontSize: 11.5, color: theme.subtext, marginTop: 3 },
    detailsModalBody: { padding: 18 },
    detailsStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    detailsTracking: { fontSize: 12, color: theme.subtext },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    detailsField: { width: '46%', gap: 3 },
    detailsFieldFull: { width: '100%' },
    detailsLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    detailsValue: { fontSize: 13, color: theme.text },
    detailsModalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    detailsCloseBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: theme.iconBtnBg,
      borderWidth: 1,
      borderColor: theme.iconBtnBorder,
    },
    detailsCloseBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },

    // Nav drawer (shared visual language with admin_dashboard.tsx / admin_queue.tsx)
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
