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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors QueuePage.tsx) ───
const demoStudent = {
  name: 'Demo Student',
  role: 'Student',
  studentNumber: '2300001',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

interface College {
  abbrev: string;
  name: string;
}

const COLLEGES: College[] = [
  { abbrev: 'CCS', name: 'College of Computing Studies' },
  { abbrev: 'CBAA', name: 'College of Business, Accountancy and Administration' },
  { abbrev: 'COED', name: 'College of Education' },
  { abbrev: 'COE', name: 'College of Engineering' },
  { abbrev: 'CAS', name: 'College of Arts and Sciences' },
  { abbrev: 'CHAS', name: 'College of Health and Allied Sciences' },
];

const SERVICES = [
  'Registrar - Document Request',
  'Registrar - Enrollment Concerns',
  'Cashier - Payment',
  'Student Affairs - Clearance',
  'Guidance Office - Consultation',
  'Library - Book Concerns',
];

interface QueueItem {
  id: string;
  college: string;
  service: string;
  position: number;
  totalWaiting: number;
  estimatedWait: string;
  queueNumber: string;
  joinedAt: string;
}

const initialQueues: QueueItem[] = [
  {
    id: '1',
    college: 'College of Computing Studies',
    service: 'Registrar - Document Request',
    position: 3,
    totalWaiting: 12,
    estimatedWait: '15-20 mins',
    queueNumber: 'CCS-REG-047',
    joinedAt: '10:30 AM',
  },
];

interface AvailableQueue {
  college: string;
  service: string;
  currentServing: string;
  totalWaiting: number;
  avgWaitTime: string;
}

const availableQueues: AvailableQueue[] = [
  { college: 'College of Computing Studies', service: 'Registrar - Document Request', currentServing: 'CCS-REG-044', totalWaiting: 12, avgWaitTime: '5-7 mins per person' },
  { college: 'College of Business, Accountancy and Administration', service: 'Cashier - Payment', currentServing: 'CBA-CSH-028', totalWaiting: 8, avgWaitTime: '3-5 mins per person' },
  { college: 'College of Engineering', service: 'Student Affairs - Clearance', currentServing: 'COE-SAF-015', totalWaiting: 5, avgWaitTime: '8-10 mins per person' },
];

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid-outline' },
  { key: 'queue', label: 'Queue', icon: 'time-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
];

type FilterKind = 'college' | 'service' | null;

export default function StudentQueueScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [myQueues, setMyQueues] = useState<QueueItem[]>(initialQueues);
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterKind>(null);
  const [leaveTarget, setLeaveTarget] = useState<QueueItem | null>(null);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'queue') return;
    if (key === 'dashboard') {
      goToDashboard();
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

  const isAlreadyInQueue = (college: string, service: string) =>
    myQueues.some((q) => q.college === college && q.service === service);

  const handleJoinQueue = (college: string, service: string) => {
    const abbrev = COLLEGES.find((c) => c.name === college)?.abbrev ?? 'XXX';
    const newQueue: QueueItem = {
      id: Date.now().toString(),
      college,
      service,
      position: Math.floor(Math.random() * 10) + 1,
      totalWaiting: Math.floor(Math.random() * 20) + 5,
      estimatedWait: `${Math.floor(Math.random() * 20) + 10}-${Math.floor(Math.random() * 10) + 20} mins`,
      queueNumber: `${abbrev}-${service.split(' ')[0].slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`,
      joinedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMyQueues((prev) => [...prev, newQueue]);
    Alert.alert('Success', 'Successfully joined the queue!');
  };

  const confirmLeaveQueue = () => {
    if (!leaveTarget) return;
    setMyQueues((prev) => prev.filter((q) => q.id !== leaveTarget.id));
    setLeaveTarget(null);
  };

  const collegeOptions = [
    { value: 'all', label: 'All Colleges' },
    ...COLLEGES.map((c) => ({ value: c.name, label: c.name })),
  ];
  const serviceOptions = [
    { value: 'all', label: 'All Services' },
    ...SERVICES.map((s) => ({ value: s, label: s })),
  ];
  const filterOptions = activeFilter === 'college' ? collegeOptions : serviceOptions;
  const filterTitle = activeFilter === 'college' ? 'Select College' : 'Select Service';
  const filterCurrentValue = activeFilter === 'college' ? selectedCollege : selectedService;

  const selectFilterOption = (value: string) => {
    if (activeFilter === 'college') setSelectedCollege(value);
    else if (activeFilter === 'service') setSelectedService(value);
    setActiveFilter(null);
  };

  const filteredQueues = availableQueues.filter(
    (q) =>
      (selectedCollege === 'all' || q.college === selectedCollege) &&
      (selectedService === 'all' || q.service === selectedService),
  );

  const collegeLogoFor = (collegeName: string) => {
    const abbrev = COLLEGES.find((c) => c.name === collegeName)?.abbrev;
    return collegeLogos[abbrev ?? 'CCS'] ?? ccsLogo;
  };

  const selectLabel = (value: string, fallback: string) => (value === 'all' ? fallback : value);

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
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Dashboard</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.titleIcon}>
              <Ionicons name="people-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queue Management</Text>
              <Text style={styles.pageSubtitle}>Join queues and track your position in real-time</Text>
            </View>
          </View>

          {/* My Active Queues */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={16} color={theme.primary} />
              <Text style={styles.sectionTitle}>My Active Queues</Text>
            </View>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{myQueues.length}</Text>
            </View>
          </View>

          {myQueues.length > 0 ? (
            <View style={styles.queueList}>
              {myQueues.map((queue) => {
                const percent = Math.max(
                  0,
                  Math.min(100, Math.round((1 - queue.position / queue.totalWaiting) * 100)),
                );
                return (
                  <View key={queue.id} style={styles.activeQueueCard}>
                    <View style={styles.activeQueueHeaderRow}>
                      <Image
                        source={collegeLogoFor(queue.college)}
                        style={styles.collegeLogoImg}
                        resizeMode="contain"
                      />
                      <View style={styles.activeQueueTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName}>{queue.service}</Text>
                          <Text style={styles.collegeNameText}>{queue.college}</Text>
                        </View>
                        <View style={styles.numberBadge}>
                          <Text style={styles.numberBadgeText}>{queue.queueNumber}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.statsGrid2}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Your Position</Text>
                        <Text style={styles.statValuePrimary}>{queue.position}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total Waiting</Text>
                        <Text style={styles.statValue}>{queue.totalWaiting}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Est. Wait Time</Text>
                        <Text style={styles.statValueSm}>{queue.estimatedWait}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Joined At</Text>
                        <Text style={styles.statValueSm}>{queue.joinedAt}</Text>
                      </View>
                    </View>

                    <View style={styles.progressWrap}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Queue Progress</Text>
                        <Text style={styles.progressLabel}>{percent}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${percent}%` }]} />
                      </View>
                    </View>

                    <Pressable style={styles.leaveBtn} onPress={() => setLeaveTarget(queue)}>
                      <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                      <Text style={styles.leaveBtnText}>Leave Queue</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No Active Queues</Text>
              <Text style={styles.emptyDescription}>
                You&apos;re not currently in any queues. Browse available queues below to join one.
              </Text>
            </View>
          )}

          {/* Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Available Queues</Text>
            <Text style={styles.filtersDescription}>Select a college and service to join a queue</Text>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>College</Text>
              <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('college')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {selectLabel(selectedCollege, 'All Colleges')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.tertiary} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Service</Text>
              <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('service')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {selectLabel(selectedService, 'All Services')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.tertiary} />
              </Pressable>
            </View>
          </View>

          {/* Available Queues List */}
          {filteredQueues.length > 0 ? (
            <View style={styles.queueList}>
              {filteredQueues.map((q) => {
                const alreadyIn = isAlreadyInQueue(q.college, q.service);
                return (
                  <View key={`${q.college}-${q.service}`} style={styles.availableQueueCard}>
                    <View style={styles.availableQueueLeft}>
                      <View style={styles.logoCircle}>
                        <Image
                          source={collegeLogoFor(q.college)}
                          style={styles.collegeLogoImgSm}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.availableQueueHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName}>{q.service}</Text>
                          <Text style={styles.collegeNameText}>{q.college}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>Open</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Ionicons name="people-outline" size={16} color={theme.blue} />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Waiting</Text>
                          <Text style={styles.detailValue}>{q.totalWaiting}</Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                          <Ionicons name="time-outline" size={16} color={theme.purple} />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Avg Wait</Text>
                          <Text style={styles.detailValue}>{q.avgWaitTime}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.detailItemFull}>
                      <View style={[styles.detailIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                      </View>
                      <View>
                        <Text style={styles.detailLabel}>Now Serving</Text>
                        <Text style={styles.detailValue}>{q.currentServing}</Text>
                      </View>
                    </View>

                    <Pressable
                      style={[styles.joinBtn, alreadyIn && styles.joinBtnDisabled]}
                      onPress={() => handleJoinQueue(q.college, q.service)}
                      disabled={alreadyIn}
                    >
                      <Text style={[styles.joinBtnText, alreadyIn && styles.joinBtnTextDisabled]}>
                        {alreadyIn ? 'Already in Queue' : 'Join Queue'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No queues found</Text>
              <Text style={styles.emptyDescription}>
                {selectedCollege !== 'all' || selectedService !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No queues are open today. Check back later.'}
              </Text>
            </View>
          )}
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
                const active = item.key === 'queue';
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

      {/* Leave Queue Confirm Modal */}
      <Modal
        visible={leaveTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setLeaveTarget(null)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="close-circle-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Leave Queue?</Text>
            <Text style={styles.logoutModalDescription}>
              You are about to leave the {leaveTarget?.service} queue. You will need to rejoin
              and wait from the back of the line if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setLeaveTarget(null)}>
                <Text style={styles.logoutCancelBtnText}>Stay in Queue</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={confirmLeaveQueue}>
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutConfirmBtnText}>Leave Queue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Options Modal */}
      <Modal
        visible={activeFilter !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveFilter(null)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.logoutModalTitle}>{filterTitle}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {filterOptions.map((opt) => {
                const selected = opt.value === filterCurrentValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => selectFilterOption(opt.value)}
                  >
                    <Text
                      style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.logoutCancelBtn} onPress={() => setActiveFilter(null)}>
              <Text style={styles.logoutCancelBtnText}>Close</Text>
            </Pressable>
          </View>
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
  cardAlt: string;
  cardAltBorder: string;
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
  purple: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(59, 130, 246, 0.2)',
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
  purple: '#a855f7',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: 'rgba(248, 250, 252, 0.9)',
  cardAltBorder: '#e2e8f0',
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
  purple: '#9333ea',
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

    // Breadcrumb
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      alignSelf: 'flex-start',
    },
    breadcrumbText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.subtext,
    },

    // Title
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    titleIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleTextWrap: {
      flex: 1,
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },
    pageSubtitle: {
      fontSize: 12,
      color: theme.subtext,
      marginTop: 3,
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
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
    },
    sectionCountPill: {
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      borderRadius: 999,
      minWidth: 24,
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    sectionCountText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },

    // Queue list / cards
    queueList: {
      gap: 14,
    },
    activeQueueCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.25)',
      borderRadius: 18,
      padding: 16,
      gap: 14,
    },
    activeQueueHeaderRow: {
      flexDirection: 'row',
      gap: 12,
    },
    collegeLogoImg: {
      width: 48,
      height: 48,
      flexShrink: 0,
    },
    activeQueueTopRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    serviceName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    collegeNameText: {
      fontSize: 11,
      color: theme.tertiary,
      marginTop: 2,
    },
    numberBadge: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    numberBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
    },

    statsGrid2: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statBox: {
      width: '47%',
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.cardAltBorder,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statValuePrimary: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.blue,
      marginTop: 4,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      marginTop: 4,
    },
    statValueSm: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginTop: 4,
    },

    progressWrap: {
      gap: 6,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
      fontSize: 11,
      color: theme.subtext,
      fontWeight: '600',
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.primary,
    },

    leaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    leaveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ef4444',
    },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    emptyDescription: {
      fontSize: 12,
      color: theme.tertiary,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Filters card
    filtersCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.15)',
      borderRadius: 18,
      padding: 18,
      gap: 14,
    },
    filtersTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
    },
    filtersDescription: {
      fontSize: 12,
      color: theme.tertiary,
      textAlign: 'center',
      marginTop: -8,
    },
    filterField: {
      gap: 6,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    filterSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    filterSelectText: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
      marginRight: 8,
    },

    // Available queue cards
    availableQueueCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.15)',
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    availableQueueLeft: {
      flexDirection: 'row',
      gap: 12,
    },
    logoCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 6,
      flexShrink: 0,
    },
    collegeLogoImgSm: {
      width: '100%',
      height: '100%',
    },
    availableQueueHeaderRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    statusBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.success,
      textTransform: 'uppercase',
    },

    detailsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    detailItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.cardAltBorder,
      borderRadius: 12,
      padding: 10,
    },
    detailItemFull: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.cardAltBorder,
      borderRadius: 12,
      padding: 10,
    },
    detailIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    detailLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      marginTop: 2,
    },

    joinBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: theme.blue,
    },
    joinBtnDisabled: {
      backgroundColor: theme.border,
    },
    joinBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    joinBtnTextDisabled: {
      color: theme.tertiary,
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

    // Confirm / filter modals (shared card look)
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

    // Filter options modal
    filterModalCard: {
      width: '100%',
      maxWidth: 340,
      maxHeight: '70%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
      alignItems: 'stretch',
      gap: 12,
    },
    filterOptionsList: {
      maxHeight: 320,
    },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 2,
    },
    filterOptionRowActive: {
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
    },
    filterOptionText: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
      paddingRight: 8,
    },
    filterOptionTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
  });
}
