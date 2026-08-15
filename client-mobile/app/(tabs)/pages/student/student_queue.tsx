import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  Alert,
  Animated,
  Easing,
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
import {
  AlertCircle, Calendar, CheckCircle, ChevronDown, ChevronLeft, Clock, FileText, HelpCircle,
  Home as HomeIcon, Loader2, Megaphone, MapPin, Users, X, XCircle, ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useQueue } from '@/context/QueueContext';
import api from '@/utils/api';
import QueueConcernModal from '@/components/QueueConcernModal';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

type LucideIconType = typeof Users;

// Mirrors web's CSS `spin 1s linear infinite` on Loader2 for loading states.
function SpinningLoader({ size, color }: { size: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

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

interface College {
  abbrev: string;
  name: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: HomeIcon },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'queue', label: 'Queue', icon: Users },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: ClipboardList },
];

type FilterKind = 'college' | 'service' | null;

export default function StudentQueueScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterKind>(null);
  const [leaveTarget, setLeaveTarget] = useState<any | null>(null);
  const [concernModal, setConcernModal] = useState<{ slotId: number; serviceName: string } | null>(null);
  const [concernText, setConcernText] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [detailSlot, setDetailSlot] = useState<any | null>(null);
  const [servicesByDept, setServicesByDept] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    queues: myQueues, availableSlots, joinQueue, leaveQueue, isAlreadyInQueue: isSlotJoined,
    isLoading: queuesLoading, activeQueuesError, availableSlotsError,
  } = useQueue();

  // Requirements/Procedure aren't on the availableSlots payload -- mirrors
  // stud-queue.jsx's fetchServices(), called once on mount and again every
  // time a Service Detail view opens so newly-added requirements/procedure
  // never show stale.
  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const { data } = await api.get('/student/services/by-department');
      setServicesByDept(data.departments ?? []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Matched client-side by case-insensitive service name, same as web's
  // getServiceRequirements/getProcedureSteps -- there's no serviceId on the
  // availableSlots payload to join on directly.
  const findServiceMeta = (serviceName?: string) => {
    if (!serviceName) return null;
    const lower = serviceName.toLowerCase();
    for (const dept of servicesByDept) {
      const match = (dept.services ?? []).find((s: any) => s.serviceName?.toLowerCase() === lower);
      if (match) return match;
    }
    return null;
  };

  const openServiceDetail = (slot: any) => {
    setDetailSlot(slot);
    fetchServices();
  };

  // Shared by both the list card and the detail modal's CTA so they can
  // never disagree about whether a queue is joinable right now.
  const getJoinState = (q: any) => {
    const alreadyIn = isSlotJoined(q.slotId);
    const isPaused = q.status === 'paused';
    const atCapacity = !q.hasCapacity;
    const outsideHours = !q.isWithinHours;
    const canJoin = !alreadyIn && !isPaused && !outsideHours && !atCapacity;
    const badgeLabel = isPaused ? 'Paused' : outsideHours ? 'Closed' : atCapacity ? 'Full' : 'Open';
    const joinLabel = alreadyIn
      ? 'Already in Queue'
      : isPaused
        ? 'Queue Paused'
        : outsideHours
          ? 'Currently Closed'
          : atCapacity
            ? 'Queue Full'
            : 'Join Queue';
    return { alreadyIn, isPaused, atCapacity, outsideHours, canJoin, badgeLabel, joinLabel };
  };

  const COLLEGES: College[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const slot of availableSlots) {
      if (!seen.has(slot.departmentAbbrev)) {
        seen.set(slot.departmentAbbrev, slot.departmentName);
      }
    }
    return [...seen.entries()].map(([abbrev, name]) => ({ abbrev, name }));
  }, [availableSlots]);

  const SERVICES: string[] = useMemo(
    () => [...new Set<string>(availableSlots.map((slot: any) => slot.serviceName))],
    [availableSlots],
  );

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

  const handleJoinQueue = async (slotId: number, notes: string) => {
    setIsJoining(true);
    try {
      await joinQueue(slotId, notes);
      setConcernModal(null);
      setConcernText('');
      Alert.alert('Success', 'Successfully joined the queue!');
    } catch (error: any) {
      Alert.alert('Could not join queue', error?.message ?? 'Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const confirmLeaveQueue = async () => {
    if (!leaveTarget) return;
    try {
      await leaveQueue(leaveTarget.queueId);
    } catch (error: any) {
      Alert.alert('Could not leave queue', error?.message ?? 'Please try again.');
    } finally {
      setLeaveTarget(null);
    }
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

  const filteredQueues = availableSlots.filter(
    (q: any) =>
      (selectedCollege === 'all' || q.departmentName === selectedCollege) &&
      (selectedService === 'all' || q.serviceName === selectedService),
  );

  const collegeLogoFor = (abbrev: string) => collegeLogos[abbrev ?? 'CCS'] ?? ccsLogo;

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
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.titleIcon}>
              <Users size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queues</Text>
              <Text style={styles.pageSubtitle}>Join queues and track your position in real-time.</Text>
            </View>
          </View>

          {/* My Active Queues */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Clock size={16} color={theme.primary} />
              <Text style={styles.sectionTitle}>My Active Queues</Text>
            </View>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{myQueues.length}</Text>
            </View>
          </View>

          {queuesLoading ? (
            <View style={styles.emptyCard}>
              <SpinningLoader size={28} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Loading your queues…</Text>
            </View>
          ) : activeQueuesError ? (
            <View style={styles.emptyCard}>
              <AlertCircle size={32} color="#ef4444" />
              <Text style={styles.emptyDescription}>{activeQueuesError}</Text>
            </View>
          ) : myQueues.length > 0 ? (
            <View style={styles.queueList}>
              {myQueues.map((queue: any) => {
                const percent = queue.totalWaiting > 0
                  ? Math.max(0, Math.min(100, Math.round((1 - queue.position / queue.totalWaiting) * 100)))
                  : 100;
                return (
                  <Pressable
                    key={queue.queueId}
                    style={styles.activeQueueCard}
                    onPress={() => router.push('/pages/student/student_queue_status')}
                  >
                    <View style={styles.activeQueueHeaderRow}>
                      <Image
                        source={collegeLogoFor(queue.departmentAbbrev)}
                        style={styles.collegeLogoImg}
                        resizeMode="contain"
                      />
                      <View style={styles.activeQueueTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName}>{queue.serviceName}</Text>
                          <Text style={styles.collegeNameText}>{queue.departmentName}</Text>
                        </View>
                        <View style={styles.numberBadge}>
                          <Text style={styles.numberBadgeText}>{queue.queueNumberBadge}</Text>
                        </View>
                      </View>
                    </View>

                    {queue.slotStatus === 'paused' && (
                      <View style={styles.inlineWarningBanner}>
                        <AlertCircle size={14} color="#f59e0b" />
                        <Text style={styles.inlineWarningText}>
                          Paused{queue.slotPauseReason ? `: ${queue.slotPauseReason}` : ''}
                        </Text>
                      </View>
                    )}
                    {queue.slotStatus === 'full' && (
                      <View style={styles.inlineWarningBanner}>
                        <AlertCircle size={14} color="#f59e0b" />
                        <Text style={styles.inlineWarningText}>
                          Queue Full: No longer accepting students but students within the queue will still be served.
                        </Text>
                      </View>
                    )}

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

                    {queue.voidTimeoutMinutes != null && (
                      <View style={styles.activeVoidWarningBox}>
                        <AlertCircle size={14} color={theme.tertiary} />
                        <Text style={styles.activeVoidWarningText}>
                          Void after {queue.voidTimeoutMinutes} min if you don&apos;t show up when called.
                        </Text>
                      </View>
                    )}

                    <View style={styles.progressWrap}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Queue Progress</Text>
                        <Text style={styles.progressLabel}>{percent}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${percent}%` }]} />
                      </View>
                    </View>

                    <Pressable
                      style={styles.leaveBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setLeaveTarget(queue);
                      }}
                    >
                      <XCircle size={16} color="#ef4444" />
                      <Text style={styles.leaveBtnText}>Leave Queue</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <CheckCircle size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Not Participating in Any Queues</Text>
              <Text style={styles.emptyDescription}>
                You are not participating in any active queues.
              </Text>
            </View>
          )}

          {/* Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Queues Filter</Text>
            <Text style={styles.filtersDescription}>Select a queue to view service details and join.</Text>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>College</Text>
              <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('college')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {selectLabel(selectedCollege, 'All Colleges')}
                </Text>
                <ChevronDown size={16} color={theme.tertiary} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Service</Text>
              <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('service')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {selectLabel(selectedService, 'All Services')}
                </Text>
                <ChevronDown size={16} color={theme.tertiary} />
              </Pressable>
            </View>
          </View>

          {/* Available Queues List */}
          {queuesLoading ? (
            <View style={styles.emptyCard}>
              <SpinningLoader size={28} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Loading queues…</Text>
            </View>
          ) : availableSlotsError ? (
            <View style={styles.emptyCard}>
              <AlertCircle size={32} color="#ef4444" />
              <Text style={styles.emptyDescription}>{availableSlotsError}</Text>
            </View>
          ) : filteredQueues.length > 0 ? (
            <View style={styles.queueList}>
              {filteredQueues.map((q: any) => {
                const { canJoin, badgeLabel, joinLabel } = getJoinState(q);
                return (
                  <Pressable
                    key={q.slotId}
                    style={styles.availableQueueCard}
                    onPress={() => openServiceDetail(q)}
                  >
                    <View style={styles.availableQueueLeft}>
                      <View style={styles.logoCircle}>
                        <Image
                          source={collegeLogoFor(q.departmentAbbrev)}
                          style={styles.collegeLogoImgSm}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.availableQueueHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName}>{q.serviceName}</Text>
                          <Text style={styles.collegeNameText}>{q.departmentName}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          badgeLabel !== 'Open' && styles.statusBadgeWarning,
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            badgeLabel !== 'Open' && styles.statusBadgeTextWarning,
                          ]}>{badgeLabel}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Users size={16} color={theme.blue} />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Waiting</Text>
                          <Text style={styles.detailValue}>{q.waitingCount}</Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Clock size={16} color={theme.blue} />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Avg Wait</Text>
                          <Text style={styles.detailValue}>{q.avgWaitTime}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.detailItemFull}>
                      <View style={[styles.detailIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                        <CheckCircle size={16} color={theme.blue} />
                      </View>
                      <View>
                        <Text style={styles.detailLabel}>Now Serving</Text>
                        <Text style={styles.detailValue}>{q.currentlyServing}</Text>
                      </View>
                    </View>

                    <Pressable
                      style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setConcernModal({ slotId: q.slotId, serviceName: q.serviceName });
                      }}
                      disabled={!canJoin}
                    >
                      <Text style={[styles.joinBtnText, !canJoin && styles.joinBtnTextDisabled]}>
                        {joinLabel}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Users size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No Active Queues</Text>
              <Text style={styles.emptyDescription}>
                {selectedCollege !== 'all' || selectedService !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'There are no open queues yet.'}
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
                <Text style={styles.drawerName}>{user?.name ?? 'Student'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Student</Text>
              </View>
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''})</Text>
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
                    <item.icon size={18} color={active ? '#ffffff' : theme.subtext} />
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

      {/* Service Detail Modal */}
      <Modal visible={detailSlot !== null} animationType="fade" transparent onRequestClose={() => setDetailSlot(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dialogHeaderTitle}>{detailSlot?.serviceName}</Text>
                <Text style={styles.dialogHeaderSubtitle}>{detailSlot?.departmentName}</Text>
              </View>
              <Pressable onPress={() => setDetailSlot(null)} hitSlop={8}>
                <X size={20} color={theme.subtext} />
              </Pressable>
            </View>
            <ScrollView style={styles.dialogBody}>
              <View style={styles.detailHeroRow}>
                <View style={styles.detailHeroStat}>
                  <Users size={16} color={theme.blue} />
                  <Text style={styles.detailHeroStatText}>{detailSlot?.waitingCount ?? 0} currently waiting</Text>
                </View>
                {!!detailSlot?.location && (
                  <View style={styles.detailHeroStat}>
                    <MapPin size={16} color={theme.purple} />
                    <Text style={styles.detailHeroStatText}>{detailSlot.location}</Text>
                  </View>
                )}
              </View>

              {detailSlot?.voidTimeoutMinutes != null && (
                <View style={styles.voidWarningBox}>
                  <AlertCircle size={14} color={theme.tertiary} />
                  <Text style={styles.voidWarningText}>
                    Void after {detailSlot.voidTimeoutMinutes} min if you don&apos;t show up when called.
                  </Text>
                </View>
              )}

              {!!detailSlot?.description && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionTitleRow}>
                    <FileText size={15} color={theme.text} />
                    <Text style={styles.detailSectionTitle}>About this Service</Text>
                  </View>
                  <Text style={styles.detailSectionText}>{detailSlot.description}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <View style={styles.detailSectionTitleRow}>
                  <CheckCircle size={15} color={theme.text} />
                  <Text style={styles.detailSectionTitle}>Requirements</Text>
                </View>
                {servicesLoading ? (
                  <Text style={styles.detailSectionText}>Loading…</Text>
                ) : !findServiceMeta(detailSlot?.serviceName) ? (
                  <Text style={styles.detailSectionText}>No requirements information available.</Text>
                ) : (findServiceMeta(detailSlot?.serviceName)?.requirements ?? []).length === 0 ? (
                  <Text style={styles.detailSectionText}>No specific requirements listed.</Text>
                ) : (
                  <View style={styles.hintRequirements}>
                    {(findServiceMeta(detailSlot?.serviceName)?.requirements ?? []).map((req: any) => (
                      <View key={req.id ?? req.name} style={styles.hintRequirementRow}>
                        <View style={styles.hintRequirementNameRow}>
                          <Text style={styles.hintText}>{req.name}</Text>
                          <View style={req.isMandatory ? styles.reqTagRequired : styles.reqTagOptional}>
                            <Text style={req.isMandatory ? styles.reqTagRequiredText : styles.reqTagOptionalText}>
                              {req.isMandatory ? 'Required' : 'Optional'}
                            </Text>
                          </View>
                        </View>
                        {req.description && <Text style={styles.hintRequirementDesc}>{req.description}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailSectionTitleRow}>
                  <HelpCircle size={15} color={theme.text} />
                  <Text style={styles.detailSectionTitle}>Procedure</Text>
                </View>
                {servicesLoading ? (
                  <Text style={styles.detailSectionText}>Loading…</Text>
                ) : (findServiceMeta(detailSlot?.serviceName)?.procedureSteps ?? []).length === 0 ? (
                  <Text style={styles.detailSectionText}>No procedure information available.</Text>
                ) : (
                  <View style={styles.procedureList}>
                    {(findServiceMeta(detailSlot?.serviceName)?.procedureSteps ?? []).map((step: any) => (
                      <View key={step.id ?? step.stepNumber} style={styles.procedureStepRow}>
                        <View style={styles.procedureStepBadge}>
                          <Text style={styles.procedureStepBadgeText}>{step.stepNumber}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.procedureStepTitle}>{step.title}</Text>
                          {step.description && <Text style={styles.procedureStepDesc}>{step.description}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.dialogActions}>
              <Pressable style={styles.btnSecondary} onPress={() => setDetailSlot(null)}>
                <Text style={styles.btnSecondaryText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, detailSlot && !getJoinState(detailSlot).canJoin && styles.joinBtnDisabled]}
                disabled={!!detailSlot && !getJoinState(detailSlot).canJoin}
                onPress={() => {
                  if (!detailSlot) return;
                  setConcernModal({ slotId: detailSlot.slotId, serviceName: detailSlot.serviceName });
                  setDetailSlot(null);
                }}
              >
                <Text style={styles.btnPrimaryText}>
                  {detailSlot ? getJoinState(detailSlot).joinLabel : 'Join Queue'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Queue Confirm Modal */}
      <QueueConcernModal
        visible={concernModal !== null}
        serviceName={concernModal?.serviceName}
        concern={concernText}
        onChangeConcern={setConcernText}
        onCancel={() => {
          setConcernModal(null);
          setConcernText('');
        }}
        onConfirm={() => {
          if (concernModal) handleJoinQueue(concernModal.slotId, concernText.trim());
        }}
        submitting={isJoining}
        theme={theme}
        styles={styles}
      />

      <Modal
        visible={leaveTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setLeaveTarget(null)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <XCircle size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Leave Queue?</Text>
            <Text style={styles.logoutModalDescription}>
              Leaving will permanently remove your spot in the {leaveTarget?.serviceName} queue —
              you will need to rejoin and wait from the back of the line if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setLeaveTarget(null)}>
                <Text style={styles.logoutCancelBtnText}>Stay in Queue</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={confirmLeaveQueue}>
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
            <Pressable style={styles.filterModalClose} onPress={() => setActiveFilter(null)}>
              <Text style={styles.filterModalCloseText}>Close</Text>
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
      backgroundColor: theme.blue,
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

    inlineWarningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
    },
    inlineWarningText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#f59e0b',
      flexShrink: 1,
    },
    activeVoidWarningBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
      padding: 10,
    },
    activeVoidWarningText: { flex: 1, fontSize: 11, color: theme.tertiary, lineHeight: 15 },

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
    statusBadgeWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    statusBadgeTextWarning: {
      color: '#f59e0b',
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
    concernInput: {
      width: '100%',
      minHeight: 64,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    concernConfirmBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#3b82f6',
    },
    concernConfirmBtnText: {
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
    filterModalClose: {
      paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4,
    },
    filterModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

    // Service Detail dialog (mirrors student_documents.tsx's request dialog chrome)
    dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    dialogCard: {
      width: '100%', maxWidth: 400, maxHeight: '85%', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, overflow: 'hidden',
    },
    dialogHeaderRow: {
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: 18, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    dialogHeaderTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    dialogHeaderSubtitle: { fontSize: 12, color: theme.tertiary, marginTop: 4 },
    dialogBody: { padding: 18 },
    dialogActions: {
      flexDirection: 'row', gap: 10, justifyContent: 'flex-end',
      padding: 18, borderTopWidth: 1, borderTopColor: theme.border,
    },
    btnPrimary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.blue },
    btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    btnSecondary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    btnSecondaryText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

    detailHeroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
    detailHeroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailHeroStatText: { fontSize: 12.5, fontWeight: '600', color: theme.text },
    voidWarningBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
      padding: 12, marginBottom: 16,
    },
    voidWarningText: { flex: 1, fontSize: 11.5, color: theme.tertiary, lineHeight: 16 },
    detailSection: { marginBottom: 18 },
    detailSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    detailSectionTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
    detailSectionText: { fontSize: 12.5, color: theme.subtext, lineHeight: 18 },

    // Requirements list (mirrors student_documents.tsx's hint/req-tag pattern)
    hintRequirements: { gap: 10 },
    hintRequirementRow: { gap: 2 },
    hintRequirementNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    hintText: { fontSize: 12.5, color: theme.subtext, lineHeight: 18 },
    hintRequirementDesc: { fontSize: 11.5, color: theme.tertiary, opacity: 0.85 },
    reqTagRequired: {
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    reqTagRequiredText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
    reqTagOptional: {
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
      backgroundColor: 'rgba(107, 114, 128, 0.15)', borderWidth: 1, borderColor: 'rgba(107, 114, 128, 0.35)',
    },
    reqTagOptionalText: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },

    // Procedure list
    procedureList: { gap: 12 },
    procedureStepRow: { flexDirection: 'row', gap: 10 },
    procedureStepBadge: {
      width: 24, height: 24, borderRadius: 12, backgroundColor: theme.blue,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    procedureStepBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
    procedureStepTitle: { fontSize: 12.5, fontWeight: '700', color: theme.text },
    procedureStepDesc: { fontSize: 11.5, color: theme.tertiary, lineHeight: 16, marginTop: 2 },
  });
}
