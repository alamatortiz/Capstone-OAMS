import { useEffect, useState } from 'react';
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
import { useQueue } from '@/context/QueueContext';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/coams_logo.png');
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

type QueueStatus = 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
type SlotStatus = 'open' | 'paused' | 'full' | 'expired';

interface ActiveQueueRecord {
  queueId: string;
  departmentAbbrev: string;
  departmentName: string;
  serviceName: string;
  queueNumberBadge: string;
  status: QueueStatus;
  slotStatus: SlotStatus;
  slotPauseReason?: string;
  position: number;
  totalWaiting: number;
  totalInQueue: number;
  maxCapacity: number;
  queueOccupancyPercent: number;
  servicedCount: number;
  servicedPercent: number;
  estimatedWait: string;
  joinedAt: string;
  arrivedAt?: string | null;
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

const STATUS_META: Record<QueueStatus, { label: string; bg: string; border: string; color: string }> = {
  serving: { label: 'Your Turn!', bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
  waiting: { label: 'Waiting', bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' },
  no_show: { label: 'Marked as No-Show', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' },
};

type TabKey = 'active' | 'history' | 'analytics';

export default function StudentQueueTrackingScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [leaveTarget, setLeaveTarget] = useState<any | null>(null);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { queues: activeQueues, queueHistory, leaveQueue, metrics, metricsError, fetchMetrics } = useQueue();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  const params = useLocalSearchParams<{ from?: string }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'queue') {
      router.push('/pages/student/student_queue');
      return;
    }
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

  const breadcrumb =
    from === 'queue'
      ? { label: 'Queues', onPress: () => router.push('/pages/student/student_queue') }
      : from === 'queue-status'
        ? { label: 'My Queue Status', onPress: () => router.push('/pages/student/student_queue_status') }
        : { label: 'Home', onPress: goToDashboard };

  const collegeLogoFor = (abbrev: string) => collegeLogos[abbrev] ?? ccsLogo;

  const totalJoined = metrics?.totalQueuesJoined ?? 0;
  const totalCompleted = metrics?.totalQueuesCompleted ?? 0;
  const totalCancelled = metrics?.totalQueuesCancelled ?? 0;

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

  const goToQueueStatus = () => router.push('/pages/student/student_queue_status');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
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
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.titleIcon}>
              <Ionicons name="pulse-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queue Tracking</Text>
              <Text style={styles.pageSubtitle}>Monitor your active queues, review history, and view your stats</Text>
            </View>
          </View>

          {/* Metrics Strip */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.35)', 'rgba(59, 130, 246, 0.12)']}
                style={styles.metricIcon}
              >
                <Ionicons name="flag-outline" size={18} color={theme.blue} />
              </LinearGradient>
              <Text style={styles.metricLabel}>Total Joined</Text>
              <Text style={[styles.metricValue, { color: theme.blue }]}>{totalJoined}</Text>
            </View>
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.35)', 'rgba(16, 185, 129, 0.12)']}
                style={styles.metricIcon}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
              </LinearGradient>
              <Text style={styles.metricLabel}>Completed</Text>
              <Text style={[styles.metricValue, { color: theme.success }]}>{totalCompleted}</Text>
            </View>
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.35)', 'rgba(239, 68, 68, 0.12)']}
                style={styles.metricIcon}
              >
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              </LinearGradient>
              <Text style={styles.metricLabel}>Cancelled</Text>
              <Text style={[styles.metricValue, { color: '#ef4444' }]}>{totalCancelled}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsList}>
            <Pressable
              style={[styles.tab, activeTab === 'active' && styles.tabActive]}
              onPress={() => setActiveTab('active')}
            >
              <Ionicons name="pulse-outline" size={14} color={activeTab === 'active' ? theme.blue : theme.tertiary} />
              <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
              <View style={[styles.tabCount, activeTab === 'active' && styles.tabCountActive]}>
                <Text style={styles.tabCountText}>{activeQueues.length}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons name="time-outline" size={14} color={activeTab === 'history' ? theme.blue : theme.tertiary} />
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
              <View style={[styles.tabCount, activeTab === 'history' && styles.tabCountActive]}>
                <Text style={styles.tabCountText}>{queueHistory.length}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
              onPress={() => setActiveTab('analytics')}
            >
              <Ionicons name="stats-chart-outline" size={14} color={activeTab === 'analytics' ? theme.blue : theme.tertiary} />
              <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>Analytics</Text>
            </Pressable>
          </View>

          {/* ─── ACTIVE TAB ─── */}
          {activeTab === 'active' && (
            activeQueues.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No Active Queues</Text>
                <Text style={styles.emptyDescription}>
                  You&apos;re not currently in any queues. Browse available queues to join one.
                </Text>
                <Pressable style={styles.emptyJoinBtn} onPress={() => router.push('/pages/student/student_queue')}>
                  <Text style={styles.emptyJoinBtnText}>Join a Queue</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.list}>
                {activeQueues.map((queue: any) => {
                  const statusMeta = STATUS_META[queue.status as QueueStatus];
                  return (
                    <Pressable key={queue.queueId} style={styles.queueCard} onPress={goToQueueStatus}>
                      {/* Header */}
                      <View style={styles.queueCardHeader}>
                        <View style={styles.queueCardInfo}>
                          <Image
                            source={collegeLogoFor(queue.departmentAbbrev)}
                            style={styles.collegeLogoImg}
                            resizeMode="contain"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.queueService}>{queue.serviceName}</Text>
                            <Text style={styles.queueCollege}>{queue.departmentName}</Text>
                          </View>
                        </View>
                        <View style={styles.queueBadgeCol}>
                          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                          <View style={styles.numberBadge}>
                            <Text style={styles.numberBadgeText}>{queue.queueNumberBadge}</Text>
                          </View>
                        </View>
                      </View>

                      {queue.slotStatus === 'paused' && (
                        <View style={styles.inlineBanner}>
                          <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
                          <Text style={styles.inlineBannerText}>
                            Paused{queue.slotPauseReason ? `: ${queue.slotPauseReason}` : ''}
                          </Text>
                        </View>
                      )}

                      {/* Position */}
                      <View style={styles.positionSection}>
                        <View style={styles.positionHeader}>
                          <View style={styles.positionLabelRow}>
                            <Ionicons name="people-outline" size={14} color={theme.text} />
                            <Text style={styles.positionLabelText}>Your Position</Text>
                          </View>
                          <Text style={styles.positionNumber}>
                            {queue.status === 'serving' ? (queue.arrivedAt ? 'Being Served' : 'Called') : queue.position}
                          </Text>
                          {queue.status !== 'serving' && (
                            <Text style={styles.positionTotal}>of {queue.totalWaiting}</Text>
                          )}
                        </View>
                        <ProgressBars queue={queue} theme={theme} styles={styles} />
                      </View>

                      {/* Stats */}
                      <View style={styles.statsGrid3}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Estimated Wait</Text>
                          <Text style={styles.statValue}>{queue.estimatedWait}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Total Waiting</Text>
                          <Text style={styles.statValue}>{queue.totalWaiting}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Joined At</Text>
                          <Text style={styles.statValue}>{queue.joinedAt}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      {(queue.status === 'waiting' || queue.status === 'serving') && (
                        <Pressable
                          style={styles.leaveBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            setLeaveTarget(queue);
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                          <Text style={styles.leaveBtnText}>Leave Queue</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )
          )}

          {/* ─── HISTORY TAB ─── */}
          {activeTab === 'history' && (
            queueHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No Queue History Yet</Text>
                <Text style={styles.emptyDescription}>
                  Your completed and cancelled queues will appear here once you start using the service.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {queueHistory.map((item: any) => {
                  const statusMeta = STATUS_META[item.status as QueueStatus];
                  return (
                    <View key={item.id} style={styles.historyItem}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.historyHeaderRow}>
                          <Text style={styles.historyService}>{item.service}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.historyCollege}>
                          {item.college} • {item.queueNumber}
                        </Text>
                        <View style={styles.historyMetaRow}>
                          <Text style={styles.historyMetaText}>Joined: {item.joinedAt}</Text>
                          <Text style={styles.historyMetaText}>
                            {item.status === 'completed' ? `Completed: ${item.completedAt}` : `Ended: ${item.completedAt}`}
                          </Text>
                          {item.actualWaitTime !== '—' && (
                            <Text style={[styles.historyMetaText, styles.historyWaitText]}>
                              Wait: {item.actualWaitTime}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name={item.status === 'completed' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                        size={22}
                        color={item.status === 'completed' ? theme.success : '#ef4444'}
                      />
                    </View>
                  );
                })}
              </View>
            )
          )}

          {/* ─── ANALYTICS TAB ─── */}
          {activeTab === 'analytics' && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="stats-chart-outline" size={18} color={theme.blue} />
                <Text style={styles.cardTitleText}>Queue Statistics</Text>
              </View>
              <Text style={styles.cardSubtitle}>Overview of your total queue activity</Text>
              {metricsError ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Couldn&apos;t Load Analytics</Text>
                  <Text style={styles.emptyDescription}>{metricsError}</Text>
                  <Pressable style={styles.emptyJoinBtn} onPress={fetchMetrics}>
                    <Text style={styles.emptyJoinBtnText}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.analyticsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Joined</Text>
                    <Text style={styles.statValue}>{totalJoined}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Completed</Text>
                    <Text style={styles.statValue}>{totalCompleted}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Cancelled</Text>
                    <Text style={styles.statValue}>{totalCancelled}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Active Now</Text>
                    <Text style={styles.statValue}>{activeQueues.length}</Text>
                  </View>
                </View>
              )}
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

      {/* Leave Queue Confirm Modal */}
      <Modal
        visible={leaveTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setLeaveTarget(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="close-circle-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmModalTitle}>Leave Queue?</Text>
            <Text style={styles.confirmModalDescription}>
              {leaveTarget?.status === 'serving'
                ? `You are currently being served for ${leaveTarget?.serviceName}. Leaving now ends your turn immediately — the staff will move on to the next student.`
                : `You are about to leave the ${leaveTarget?.serviceName} queue. Leaving will permanently remove your spot — you will need to rejoin and wait from the back of the line if you change your mind.`}
            </Text>
            <View style={styles.confirmModalActions}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setLeaveTarget(null)}>
                <Text style={styles.confirmCancelBtnText}>Stay in Queue</Text>
              </Pressable>
              <Pressable style={styles.confirmLeaveBtn} onPress={confirmLeaveQueue}>
                <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmLeaveBtnText}>Leave Queue</Text>
              </Pressable>
            </View>
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
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="log-out-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Logout</Text>
            <Text style={styles.confirmModalDescription}>
              Are you sure you want to log out? Any unsaved changes will be lost.
            </Text>
            <View style={styles.confirmModalActions}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmLeaveBtn} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmLeaveBtnText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Dual progress bars (Occupied Slots / Serviced People) — mirrors QueueProgressBars.jsx ───
function ProgressBars({
  queue,
  theme,
  styles,
}: {
  queue: ActiveQueueRecord;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressWrap}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Occupied Slots</Text>
          <Text style={styles.progressValue}>
            {queue.totalInQueue}/{queue.maxCapacity} ({queue.queueOccupancyPercent}%)
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${queue.queueOccupancyPercent}%`, backgroundColor: theme.blue }]} />
        </View>
      </View>
      <View style={styles.progressWrap}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Serviced People</Text>
          <Text style={styles.progressValue}>
            {queue.servicedCount}/{queue.totalInQueue} ({queue.servicedPercent}%)
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${queue.servicedPercent}%`, backgroundColor: theme.blue }]} />
        </View>
      </View>
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
      gap: 16,
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

    // Metrics strip
    metricsGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.cardAltBorder,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    metricIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
      textAlign: 'center',
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
    },

    // Tabs
    tabsList: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -2,
    },
    tabActive: {
      borderBottomColor: theme.blue,
    },
    tabText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tabTextActive: {
      color: theme.blue,
    },
    tabCount: {
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    tabCountActive: {
      backgroundColor: 'rgba(59, 130, 246, 0.28)',
    },
    tabCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.blue,
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
    emptyJoinBtn: {
      marginTop: 6,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 12,
      backgroundColor: theme.blue,
    },
    emptyJoinBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },

    // Active queue cards
    list: {
      gap: 14,
    },
    queueCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.2)',
      borderRadius: 18,
      padding: 16,
      gap: 14,
    },
    queueCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(59, 130, 246, 0.2)',
    },
    queueCardInfo: {
      flex: 1,
      flexDirection: 'row',
      gap: 10,
    },
    collegeLogoImg: {
      width: 40,
      height: 40,
      flexShrink: 0,
    },
    queueService: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    queueCollege: {
      fontSize: 11,
      color: theme.tertiary,
      marginTop: 2,
    },
    queueBadgeCol: {
      alignItems: 'flex-end',
      gap: 6,
      flexShrink: 0,
    },

    statusBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
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
    },

    inlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    inlineBannerText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#f59e0b',
    },

    // Position section
    positionSection: {
      gap: 12,
    },
    positionHeader: {
      alignItems: 'center',
      gap: 4,
    },
    positionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    positionLabelText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    positionNumber: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.blue,
      lineHeight: 38,
    },
    positionTotal: {
      fontSize: 13,
      color: theme.tertiary,
    },

    // Progress bars
    progressCard: {
      gap: 10,
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
    progressValue: {
      fontSize: 11,
      color: theme.text,
      fontWeight: '700',
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
    },

    // Stats grid (3 col)
    statsGrid3: {
      flexDirection: 'row',
      gap: 8,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.cardAltBorder,
      borderRadius: 12,
      padding: 10,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.blue,
      marginTop: 4,
    },

    leaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    leaveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ef4444',
    },

    // History list
    historyList: {
      gap: 10,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 14,
    },
    historyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
      flexWrap: 'wrap',
    },
    historyService: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    historyCollege: {
      fontSize: 11,
      color: theme.tertiary,
      marginBottom: 6,
    },
    historyMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    historyMetaText: {
      fontSize: 11,
      color: theme.tertiary,
    },
    historyWaitText: {
      fontWeight: '700',
      color: theme.blue,
    },

    // Generic card (analytics)
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    cardTitleText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.tertiary,
      marginBottom: 14,
    },
    analyticsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
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
    drawerNavLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.subtext,
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

    // Confirm modals (shared look for leave-queue + logout)
    confirmOverlay: {
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
    confirmIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      marginBottom: 16,
    },
    confirmModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 8,
    },
    confirmModalDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    confirmModalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    confirmCancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    confirmLeaveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#ef4444',
    },
    confirmLeaveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}
