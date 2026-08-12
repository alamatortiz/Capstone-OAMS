import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import Toast from 'react-native-toast-message';
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

interface AvailabilitySlot {
  day: string;
  timeStart: string;
  timeEnd: string;
  location: string;
}

interface Faculty {
  facultyId: string;
  name: string;
  position: string;
  specialization: string;
  email: string;
  availabilityStatus: 'available' | 'unavailable';
  availability: AvailabilitySlot[];
}

interface Department {
  departmentId: string;
  departmentName: string;
  departmentAbbrev: string;
  faculty: Faculty[];
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDaySchedules(faculty: Faculty) {
  const grouped: Record<string, AvailabilitySlot[]> = {};
  faculty.availability.forEach((slot) => {
    (grouped[slot.day] ||= []).push(slot);
  });
  return DAY_ORDER.filter((day) => grouped[day]).map((day) => ({ day, schedules: grouped[day] }));
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

type ViewMode = 'departments' | 'schedules';

export default function StudentProfessorSchedulesScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('departments');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  // Mirrors `departments` for the catch block below, without making
  // fetchSchedules depend on (and change identity with) the state itself.
  const departmentsRef = useRef(departments);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);

  const fetchSchedules = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get('/student/professor-schedules');
      setDepartments(
        (data.departments ?? []).map((d: any) => ({
          departmentId: String(d.departmentId),
          departmentName: d.departmentName,
          departmentAbbrev: d.departmentAbbrev,
          faculty: (d.faculty ?? []).map((f: any) => ({
            facultyId: String(f.facultyId),
            name: f.name,
            position: f.position,
            specialization: f.specialization,
            email: f.email,
            availabilityStatus: f.availabilityStatus,
            availability: f.availability ?? [],
          })),
        })),
      );
    } catch (err) {
      console.error('Fetch professor schedules error:', err);
      if (departmentsRef.current.length === 0) {
        setLoadError('Could not load professor schedules. Please try again.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh professor schedules.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ── Live updates: refetch when a professor toggles Available/Unavailable ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on('faculty:availability-status-changed', fetchSchedules);
    return () => {
      socket.off('faculty:availability-status-changed', fetchSchedules);
    };
  }, [user, token, fetchSchedules]);

  // Fallback poll: a student browsing a professor from another college is in
  // their own department's socket room, not the professor's, so
  // faculty:availability-status-changed events for that professor never
  // reach them -- this keeps availability status from drifting stale.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSchedules();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

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
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const handleDepartmentSelect = (deptId: string) => {
    setSelectedDeptId(deptId);
    setViewMode('schedules');
  };

  const handleBack = () => {
    setViewMode('departments');
    setSelectedDeptId(null);
  };

  const selectedDepartment = departments.find((d) => d.departmentId === selectedDeptId) ?? null;

  const breadcrumb =
    viewMode === 'schedules'
      ? { label: 'Back to Departments', onPress: handleBack }
      : from === 'appointments'
        ? { label: 'Appointments', onPress: () => router.push('/pages/student/student_appointments') }
        : from === 'appointment-status'
          ? { label: 'My Appointments', onPress: () => router.push('/pages/student/student_appointment_status') }
          : { label: 'Home', onPress: goToDashboard };

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
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={breadcrumb.onPress} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>{breadcrumb.label}</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
              <Ionicons name="school-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Professor Schedules</Text>
              <Text style={styles.pageSubtitle}>View faculty consultation hours and availability</Text>
            </View>
          </View>

          {loading && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading professor schedules…</Text>
            </View>
          )}

          {!loading && loadError && (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>{loadError}</Text>
              <Pressable style={styles.drawerNavItem} onPress={fetchSchedules}>
                <Text style={styles.breadcrumbText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Departments View */}
          {!loading && !loadError && viewMode === 'departments' && (
            <View style={styles.departmentsGrid}>
              {departments.length === 0 && (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No faculty schedules are available yet.</Text>
                </View>
              )}
              {departments.map((dept) => {
                const logoSrc = collegeLogos[dept.departmentAbbrev] ?? pncLogo;
                const professorCount = dept.faculty.length;
                return (
                  <Pressable
                    key={dept.departmentId}
                    style={styles.departmentCard}
                    onPress={() => handleDepartmentSelect(dept.departmentId)}
                  >
                    <View style={styles.cardLogoWrap}>
                      <Image source={logoSrc} style={styles.collegeLogoImg} resizeMode="contain" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.deptCardTitle} numberOfLines={2}>{dept.departmentName}</Text>
                      <Text style={styles.cardAbbrev}>{dept.departmentAbbrev}</Text>
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>
                          {professorCount} {professorCount === 1 ? 'Faculty' : 'Faculty Members'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.purple} style={{ opacity: 0.7 }} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Schedules View */}
          {!loading && !loadError && viewMode === 'schedules' && selectedDepartment && (
            <View style={styles.schedulesView}>
              {/* Department Header */}
              <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.departmentHeaderCard}>
                <View style={styles.departmentHeaderContent}>
                  <View style={styles.departmentLogoWrapper}>
                    <Image
                      source={collegeLogos[selectedDepartment.departmentAbbrev] ?? pncLogo}
                      style={styles.departmentLogo}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.departmentHeaderTextWrap}>
                    <Text style={styles.departmentHeaderTitle}>{selectedDepartment.departmentName}</Text>
                    <Text style={styles.departmentHeaderSubtitle}>
                      Faculty consultation schedules and availability
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Professors List */}
              <View style={styles.professorsList}>
                {selectedDepartment.faculty.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
                    <Text style={styles.emptyTitle}>No faculty members found for this department.</Text>
                  </View>
                ) : (
                  selectedDepartment.faculty.map((professor) => {
                    const isUnavailable = professor.availabilityStatus === 'unavailable';
                    const daySchedules = getDaySchedules(professor);
                    return (
                      <View
                        key={professor.facultyId}
                        style={[styles.professorCard, isUnavailable && styles.professorCardUnavailable]}
                      >
                        <View style={styles.professorHeader}>
                          <View style={styles.professorAvatar}>
                            <Ionicons name="person-outline" size={20} color={theme.purple} />
                          </View>
                          <View style={styles.professorInfo}>
                            <View style={styles.professorNameRow}>
                              <Text style={styles.professorName}>{professor.name}</Text>
                              {isUnavailable && (
                                <View style={styles.unavailableBadge}>
                                  <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.professorPosition}>{professor.position}</Text>
                            <Text style={styles.professorSpecialization}>{professor.specialization}</Text>
                            <Text style={styles.professorEmail}>{professor.email}</Text>
                          </View>
                        </View>

                        <View style={styles.consultationSection}>
                          <Text style={styles.consultationTitle}>Consultation Hours</Text>
                          {isUnavailable ? (
                            <View style={styles.unavailableNotice}>
                              <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                              <Text style={styles.unavailableNoticeText}>
                                This professor is currently unavailable and is not accepting consultations right now.
                              </Text>
                            </View>
                          ) : daySchedules.length === 0 ? (
                            <Text style={styles.noHoursText}>No consultation hours have been set yet.</Text>
                          ) : (
                            <View style={styles.scheduleList}>
                              {daySchedules.map(({ day, schedules }) => (
                                <View key={day} style={styles.dayCard}>
                                  <View style={styles.dayHeaderRow}>
                                    <Ionicons name="calendar-outline" size={15} color={theme.purple} />
                                    <Text style={styles.dayName}>{day}</Text>
                                  </View>
                                  <View style={styles.daySlots}>
                                    {schedules.map((schedule, idx) => (
                                      <View key={idx} style={styles.scheduleSlot}>
                                        <View style={styles.slotDetailRow}>
                                          <Ionicons name="time-outline" size={14} color={theme.tertiary} />
                                          <Text style={styles.timeRange}>
                                            {schedule.timeStart} – {schedule.timeEnd}
                                          </Text>
                                        </View>
                                        <View style={styles.slotDetailRow}>
                                          <Ionicons name="location-outline" size={14} color={theme.tertiary} />
                                          <Text style={styles.locationText}>{schedule.location}</Text>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
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
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''}</Text>
            </View>

            <View style={styles.drawerNav}>
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.drawerNavItem}
                  onPress={() => handleNavPress(item.key)}
                >
                  <Ionicons name={item.icon} size={18} color={theme.subtext} />
                  <Text style={styles.drawerNavLabel}>{item.label}</Text>
                </Pressable>
              ))}
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
  cardAlt: string;
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  primaryDark: string;
  success: string;
  purple: string;
  purpleDark: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#16a34a',
  primaryDark: '#15803d',
  success: '#10b981',
  purple: '#a855f7',
  purpleDark: '#9333ea',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: 'rgba(248, 250, 252, 0.9)',
  border: '#e2e8f0',
  headerBg: 'rgba(255, 255, 255, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#1e293b',
  subtext: '#64748b',
  tertiary: '#64748b',
  primary: '#166534',
  primaryDark: '#14532d',
  success: '#059669',
  purple: '#9333ea',
  purpleDark: '#7c3aed',
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

    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Departments grid
    departmentsGrid: { gap: 12 },
    departmentCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 16, padding: 16,
    },
    cardLogoWrap: {
      width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    collegeLogoImg: { width: '100%', height: '100%', padding: 6 },
    cardInfo: { flex: 1, gap: 3 },
    deptCardTitle: { fontSize: 14, fontWeight: '700', color: theme.purple },
    cardAbbrev: { fontSize: 12, color: theme.tertiary },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardBadge: {
      backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)',
      borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10,
    },
    cardBadgeText: { fontSize: 11, fontWeight: '600', color: theme.purple },

    // Schedules view
    schedulesView: { gap: 20 },
    departmentHeaderCard: { borderRadius: 22, padding: 20 },
    departmentHeaderContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    departmentLogoWrapper: {
      width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    departmentLogo: { width: '100%', height: '100%', padding: 8 },
    departmentHeaderTextWrap: { flex: 1 },
    departmentHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', lineHeight: 24 },
    departmentHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 6 },

    // Professors list
    professorsList: { gap: 16 },
    professorCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 18, padding: 16,
    },
    professorCardUnavailable: { opacity: 0.75 },
    professorHeader: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(168, 85, 247, 0.15)',
    },
    professorAvatar: {
      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 2, borderColor: 'rgba(168, 85, 247, 0.3)', flexShrink: 0,
    },
    professorInfo: { flex: 1, gap: 3 },
    professorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    professorName: { fontSize: 15, fontWeight: '700', color: theme.text },
    unavailableBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)',
      borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8,
    },
    unavailableBadgeText: { fontSize: 9, fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.3 },
    professorPosition: { fontSize: 12, fontWeight: '600', color: theme.purple, textTransform: 'capitalize' },
    professorSpecialization: { fontSize: 12, color: theme.subtext },
    professorEmail: { fontSize: 11, color: theme.tertiary },

    // Consultation section
    consultationSection: { gap: 10 },
    consultationTitle: { fontSize: 12, fontWeight: '700', color: theme.text, textTransform: 'uppercase', letterSpacing: 0.5 },
    unavailableNotice: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', borderRadius: 12,
    },
    unavailableNoticeText: { flex: 1, fontSize: 12, color: theme.subtext, lineHeight: 17 },
    noHoursText: { fontSize: 12, color: theme.tertiary, fontStyle: 'italic' },

    scheduleList: { gap: 10 },
    dayCard: {
      backgroundColor: 'rgba(168, 85, 247, 0.08)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.15)',
      borderRadius: 14, padding: 12,
    },
    dayHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    dayName: { fontSize: 13, fontWeight: '700', color: theme.purple },
    daySlots: { gap: 8, marginLeft: 20 },
    scheduleSlot: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
      borderRadius: 10, padding: 10, gap: 6,
    },
    slotDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeRange: { fontSize: 12, fontWeight: '600', color: theme.text },
    locationText: { fontSize: 12, color: theme.subtext },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18,
      paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8,
    },
    emptyTitle: { fontSize: 13, color: theme.tertiary, textAlign: 'center' },

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
    drawerNavLabel: { fontSize: 14, fontWeight: '600', color: theme.subtext },
    drawerLogout: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    drawerLogoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    // Confirm logout modal
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
