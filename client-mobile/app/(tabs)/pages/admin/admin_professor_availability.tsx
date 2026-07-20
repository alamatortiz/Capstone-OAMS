import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
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
// GET /api/admin/faculty-availability (adminRoutes.js), is scoped strictly to
// the signed-in admin's own department — it returns
// id/name/position/college/status/currentActivity/nextAvailableSlot/email/
// todaySchedule (time/activity/location/status), with no phone number and no
// cross-college data, unlike the design-mockup TeacherAvailabilityPage.tsx.
// This mirrors the actual wired admin-professor-availability.jsx: one
// department only, filtered with status tabs (all/available/busy/unavailable)
// rather than a college dropdown, since the response only ever contains one
// college. ───
type FacultyStatus = 'available' | 'busy' | 'unavailable';
type SlotStatus = 'free' | 'booked' | 'unavailable';

interface ScheduleSlot {
  time: string;
  activity: string;
  location: string;
  status: SlotStatus;
}

interface FacultyMember {
  id: string;
  name: string;
  position: string;
  college: string;
  status: FacultyStatus;
  currentActivity: string | null;
  nextAvailableSlot: string;
  email: string;
  todaySchedule: ScheduleSlot[];
}

const STATUS_TABS = ['all', 'available', 'busy', 'unavailable'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_TINTS: Record<FacultyStatus, { bg: string; border: string; color: string }> = {
  available: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#10b981' },
  busy: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' },
  unavailable: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const SLOT_TINTS: Record<SlotStatus, { bg: string; border: string }> = {
  free: { bg: 'rgba(16, 185, 129, 0.07)', border: 'rgba(16, 185, 129, 0.45)' },
  booked: { bg: 'rgba(59, 130, 246, 0.07)', border: 'rgba(59, 130, 246, 0.45)' },
  unavailable: { bg: 'rgba(107, 114, 128, 0.08)', border: 'rgba(107, 114, 128, 0.45)' },
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter((n) => /^[A-Za-z]/.test(n))
    .map((n) => n[0])
    .join('')
    .slice(0, 3);
}

export default function AdminProfessorAvailabilityScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/faculty-availability');
      setFacultyList(data.faculty ?? []);
    } catch (err) {
      console.error('Failed to load faculty availability:', err);
      setError('Failed to load faculty availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchFaculty();
    const events = ['appointment:slot-updated', 'appointment:slot-removed'];
    events.forEach((event) => socket.on(event, refetch));
    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [user, token, fetchFaculty]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/admin/admin_dashboard');

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

  const tabCounts: Record<StatusTab, number> = {
    all: facultyList.length,
    available: facultyList.filter((f) => f.status === 'available').length,
    busy: facultyList.filter((f) => f.status === 'busy').length,
    unavailable: facultyList.filter((f) => f.status === 'unavailable').length,
  };

  const visibleFaculty =
    activeTab === 'all' ? facultyList : facultyList.filter((f) => f.status === activeTab);

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
              <Ionicons name="people-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Faculty Availability</Text>
              <Text style={styles.pageSubtitle}>
                Monitor faculty consultation schedules and availability for {adminDepartmentName}
              </Text>
            </View>
          </View>

          {/* Status Tabs */}
          <View style={styles.tabsList}>
            {STATUS_TABS.map((tab) => {
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

          {/* Faculty List */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.emptyTitle}>Loading faculty availability…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable onPress={fetchFaculty}>
                <Text style={styles.emptyText}>Retry</Text>
              </Pressable>
            </View>
          ) : visibleFaculty.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={28} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No faculty found</Text>
              <Text style={styles.emptyText}>Try adjusting your filter.</Text>
            </View>
          ) : (
            <View style={styles.facultyList}>
              {visibleFaculty.map((f) => {
                const statusTint = STATUS_TINTS[f.status];
                return (
                  <View key={f.id} style={styles.facultyCard}>
                    <View style={styles.facultyTop}>
                      <View style={styles.facultyIdentity}>
                        <View style={styles.facultyAvatar}>
                          <Text style={styles.facultyAvatarText}>{getInitials(f.name)}</Text>
                        </View>
                        <View style={styles.facultyIdentityText}>
                          <Text style={styles.facultyName}>{f.name}</Text>
                          <Text style={styles.facultyPosition}>{f.position}</Text>
                          <Text style={styles.facultyCollege}>{f.college}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusTint.color }]} />
                        <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>{f.status}</Text>
                      </View>
                    </View>

                    {f.currentActivity && (
                      <View style={styles.currentActivityBanner}>
                        <Text style={styles.currentActivityText}>
                          <Text style={styles.currentActivityLabel}>Current: </Text>
                          {f.currentActivity}
                        </Text>
                      </View>
                    )}

                    <View style={styles.facultyMeta}>
                      <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                        <Text style={styles.metaLabel}>Next Available:</Text>
                        <Text style={styles.metaValue}>{f.nextAvailableSlot}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="mail-outline" size={14} color={theme.tertiary} />
                        <Text style={styles.metaEmail}>{f.email}</Text>
                      </View>
                    </View>

                    {f.todaySchedule.length > 0 && (
                      <View style={styles.scheduleSection}>
                        <Text style={styles.scheduleLabel}>Today&apos;s Schedule</Text>
                        <View style={styles.scheduleGrid}>
                          {f.todaySchedule.map((slot, idx) => {
                            const slotTint = SLOT_TINTS[slot.status];
                            return (
                              <View
                                key={idx}
                                style={[styles.slot, { backgroundColor: slotTint.bg, borderColor: slotTint.border }]}
                              >
                                <View style={styles.slotTimeRow}>
                                  <Ionicons name="time-outline" size={12} color={theme.tertiary} />
                                  <Text style={styles.slotTime}>{slot.time}</Text>
                                </View>
                                <Text style={styles.slotActivity}>{slot.activity}</Text>
                                <View style={styles.slotLocationRow}>
                                  <Ionicons name="location-outline" size={11} color={theme.tertiary} />
                                  <Text style={styles.slotLocation}>{slot.location}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
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

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Status tabs (mirrors admin-professor-availability.css .apa-tabs)
    tabsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderBottomWidth: 2, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: '#a855f7', marginBottom: -2 },
    tabTriggerText: { fontSize: 12, fontWeight: '600', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },
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

    // Empty state
    emptyCard: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 40,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
    },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    emptyText: { fontSize: 12, color: theme.subtext },

    // Faculty list (mirrors .apa-faculty-card / .apa-faculty-top / .apa-slot-*)
    facultyList: { gap: 14 },
    facultyCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    facultyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    facultyIdentity: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
    facultyAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    facultyAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    facultyIdentityText: { flex: 1, gap: 2 },
    facultyName: { fontSize: 15, fontWeight: '700', color: theme.text },
    facultyPosition: { fontSize: 12.5, color: theme.subtext },
    facultyCollege: { fontSize: 11.5, color: theme.tertiary },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    currentActivityBanner: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    currentActivityText: { fontSize: 12.5, color: '#f59e0b' },
    currentActivityLabel: { fontWeight: '700' },

    facultyMeta: { gap: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    metaLabel: { fontSize: 12.5, color: theme.subtext },
    metaValue: { fontSize: 12.5, fontWeight: '700', color: theme.text },
    metaEmail: { fontSize: 12, color: theme.tertiary },

    scheduleSection: { gap: 8 },
    scheduleLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slot: {
      width: '47.5%',
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 9,
      gap: 3,
    },
    slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slotTime: { fontSize: 11, fontWeight: '700', color: theme.text },
    slotActivity: { fontSize: 11.5, fontWeight: '600', color: theme.subtext },
    slotLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slotLocation: { fontSize: 10.5, color: theme.tertiary },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },

    // Nav drawer (shared visual language with admin_dashboard.tsx / admin_appointment.tsx)
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
    drawerNavLabel: { fontSize: 14, fontWeight: '600', color: theme.subtext },
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
