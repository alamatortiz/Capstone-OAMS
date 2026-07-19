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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useQueue } from '@/context/QueueContext';

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

type QueueStatus = 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
type SlotStatus = 'open' | 'paused' | 'full' | 'expired';

interface QueueRecord {
  queueId: string;
  departmentAbbrev: string;
  departmentName: string;
  serviceName: string;
  queueNumberBadge: string;
  location: string;
  description: string;
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
  startTime: string;
  endTime: string;
  notes: string;
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
  waiting: { label: 'Waiting', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  serving: { label: "It's Your Turn!", bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
  completed: { label: 'Completed', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)', color: '#6b7280' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
  no_show: { label: 'Marked as No-Show', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
};

export default function StudentQueueStatusScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesText, setNotesText] = useState('');
  const router = useRouter();
  const { user, logout } = useAuth();
  const { queues, leaveQueue, updateQueueNotes } = useQueue();

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

  const selectedQueue = selectedQueueId
    ? (queues.find((q: any) => q.queueId === selectedQueueId) as QueueRecord | undefined) ?? null
    : null;

  const collegeLogoFor = (abbrev: string) => collegeLogos[abbrev] ?? ccsLogo;

  const openNotesDialog = () => {
    if (!selectedQueue) return;
    setNotesText(selectedQueue.notes ?? '');
    setShowNotesDialog(true);
  };

  const saveNotes = async () => {
    if (!selectedQueue) return;
    try {
      await updateQueueNotes(selectedQueue.queueId, notesText.trim());
      setShowNotesDialog(false);
      Alert.alert('Notes updated', 'Your concern has been saved.');
    } catch (error: any) {
      Alert.alert('Could not save notes', error?.message ?? 'Please try again.');
    }
  };

  const confirmLeaveQueue = async () => {
    if (!selectedQueue) return;
    try {
      await leaveQueue(selectedQueue.queueId);
      setShowCancelDialog(false);
      setSelectedQueueId(null);
      Alert.alert('You have left the queue.');
    } catch (error: any) {
      Alert.alert('Could not leave queue', error?.message ?? 'Please try again.');
    }
  };

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
          {selectedQueue ? (
            <QueueDetail
              theme={theme}
              styles={styles}
              queue={selectedQueue}
              collegeLogoFor={collegeLogoFor}
              onBack={() => setSelectedQueueId(null)}
              onLeave={() => setShowCancelDialog(true)}
              onEditNotes={openNotesDialog}
            />
          ) : (
            <>
              {/* Breadcrumb */}
              <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={theme.subtext} />
                <Text style={styles.breadcrumbText}>Dashboard</Text>
              </Pressable>

              {/* Title */}
              <View style={styles.titleRow}>
                <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.titleIcon}>
                  <Ionicons name="time-outline" size={22} color="#ffffff" />
                </LinearGradient>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.pageTitle}>My Queue Status</Text>
                  <Text style={styles.pageSubtitle}>View and manage your active queues</Text>
                </View>
              </View>

              {/* Queue Tracking link */}
              <Pressable
                style={styles.trackingBtn}
                onPress={() =>
                  router.push({
                    pathname: '/pages/student/student_queue_tracking',
                    params: { from: 'queue-status' },
                  })
                }
              >
                <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.trackingIconBox}>
                  <Ionicons name="pulse-outline" size={20} color="#ffffff" />
                </LinearGradient>
                <View style={styles.trackingTextWrap}>
                  <Text style={styles.trackingTitle}>Queue Tracking</Text>
                  <Text style={styles.trackingSubtitle}>Monitor your active queue positions in real-time</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.blue} />
              </Pressable>

              {/* Queue List */}
              {queues.length > 0 ? (
                <View style={styles.queueList}>
                  {queues.map((queue: any) => {
                    return (
                      <Pressable
                        key={queue.queueId}
                        style={styles.listCard}
                        onPress={() => setSelectedQueueId(queue.queueId)}
                      >
                        <View style={styles.listCardHeaderRow}>
                          <Image
                            source={collegeLogoFor(queue.departmentAbbrev)}
                            style={styles.collegeLogoImg}
                            resizeMode="contain"
                          />
                          <View style={styles.listCardTopRow}>
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
                          <View style={[styles.inlineBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                            <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
                            <Text style={[styles.inlineBannerText, { color: '#f59e0b' }]}>
                              Paused{queue.slotPauseReason ? `: ${queue.slotPauseReason}` : ''}
                            </Text>
                          </View>
                        )}
                        {(queue.slotStatus === 'full' || queue.slotStatus === 'expired') && (
                          <View style={[styles.inlineBanner, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.35)' }]}>
                            <Ionicons name="alert-circle-outline" size={14} color={theme.blue} />
                            <Text style={[styles.inlineBannerText, { color: theme.blue }]}>
                              {queue.slotStatus === 'full' ? 'Full — still serving' : 'Hours ended — still serving'}
                            </Text>
                          </View>
                        )}

                        <View style={styles.statsGrid2}>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Your Position</Text>
                            <Text style={styles.statValuePrimary}>
                              {queue.status === 'serving' ? 'Serving' : queue.position}
                            </Text>
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

                        <ProgressBars queue={queue} theme={theme} styles={styles} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Active Queues</Text>
                  <Text style={styles.emptyDescription}>
                    You&apos;re not currently in any queues. Browse available queues to join one.
                  </Text>
                  <Pressable
                    style={styles.emptyJoinBtn}
                    onPress={() => router.push('/pages/student/student_queue')}
                  >
                    <Text style={styles.emptyJoinBtnText}>Join a Queue</Text>
                  </Pressable>
                </View>
              )}
            </>
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
              {navItems.map((item) => {
                const active = false;
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

      {/* Edit Notes Modal */}
      <Modal
        visible={showNotesDialog}
        animationType="fade"
        transparent
        onRequestClose={() => setShowNotesDialog(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.notesModalCard}>
            <Text style={styles.logoutModalTitle}>Edit Your Concern</Text>
            <Text style={styles.notesModalDescription}>
              Briefly describe what you need help with so the staff can prepare.
            </Text>
            <Text style={styles.filterLabel}>Your concern or request</Text>
            <TextInput
              style={styles.notesInput}
              value={notesText}
              onChangeText={setNotesText}
              placeholder="e.g. Request for good moral certificate for job application"
              placeholderTextColor={theme.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setShowNotesDialog(false)}>
                <Text style={styles.logoutCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.notesSaveBtn} onPress={saveNotes}>
                <Text style={styles.logoutConfirmBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Queue Confirm Modal */}
      <Modal
        visible={showCancelDialog}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCancelDialog(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="close-circle-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Leave Queue?</Text>
            <Text style={styles.logoutModalDescription}>
              {selectedQueue?.status === 'serving'
                ? `You are currently being served for ${selectedQueue?.serviceName}. Leaving now ends your turn immediately — the staff will move on to the next student.`
                : `You are currently at position ${selectedQueue?.position} in the ${selectedQueue?.serviceName} queue. Leaving will permanently remove your spot — you will need to rejoin and wait from the back of the line if you change your mind.`}
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setShowCancelDialog(false)}>
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

// ─── Dual progress bars (Occupied Slots / Serviced People) — mirrors QueueProgressBars.jsx ───
function ProgressBars({
  queue,
  theme,
  styles,
}: {
  queue: QueueRecord;
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

// ─── Detail view — the queue position grid + supporting cards, stacked for mobile ───
function QueueDetail({
  theme,
  styles,
  queue,
  collegeLogoFor,
  onBack,
  onLeave,
  onEditNotes,
}: {
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  queue: QueueRecord;
  collegeLogoFor: (abbrev: string) => ImageSourcePropType;
  onBack: () => void;
  onLeave: () => void;
  onEditNotes: () => void;
}) {
  const statusMeta = STATUS_META[queue.status];
  const peopleAhead = Math.max(queue.position - 1, 0);

  return (
    <>
      {/* Breadcrumb */}
      <Pressable style={styles.breadcrumb} onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={theme.subtext} />
        <Text style={styles.breadcrumbText}>My Queues</Text>
      </Pressable>

      {/* Title */}
      <View style={styles.titleRow}>
        <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.titleIcon}>
          <Ionicons name="time-outline" size={22} color="#ffffff" />
        </LinearGradient>
        <View style={styles.titleTextWrap}>
          <Text style={styles.pageTitle}>Queue Details</Text>
          <Text style={styles.pageSubtitle}>View your position and estimated wait time</Text>
        </View>
      </View>

      {/* Hero */}
      <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLogoBox}>
            <Image
              source={collegeLogoFor(queue.departmentAbbrev)}
              style={styles.heroLogoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroServiceName}>{queue.serviceName}</Text>
            <Text style={styles.heroCollegeName}>{queue.departmentName}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{queue.queueNumberBadge}</Text>
          </View>
        </View>
        {queue.location && (
          <View style={styles.heroMetaRow}>
            <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroMetaText}>{queue.location}</Text>
          </View>
        )}
      </LinearGradient>

      {/* It's your turn */}
      {queue.status === 'serving' && (
        <View style={styles.turnBanner}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
          <Text style={styles.turnBannerText}>
            Please proceed to the designated location — it&apos;s your turn!
          </Text>
        </View>
      )}

      {/* Paused banner */}
      {queue.slotStatus === 'paused' && (
        <View style={[styles.wideBanner, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.wideBannerText, { color: '#f59e0b' }]}>
              This queue is currently paused by the admin.
            </Text>
            {queue.slotPauseReason && (
              <Text style={[styles.wideBannerSubtext, { color: '#f59e0b' }]}>
                Reason: {queue.slotPauseReason}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Full / expired banner */}
      {(queue.slotStatus === 'full' || queue.slotStatus === 'expired') && (
        <View style={[styles.wideBanner, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.35)' }]}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.blue} />
          <Text style={[styles.wideBannerText, { color: theme.blue }]}>
            This queue is no longer accepting new students, but you&apos;re still in line and will be served.
          </Text>
        </View>
      )}

      {/* Position card — the queue position grid */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people-outline" size={18} color={theme.blue} />
            <Text style={styles.cardTitleText}>Your Position</Text>
          </View>
          <View style={[styles.statusBadgePill, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
            <Text style={[styles.statusBadgeTextPill, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <View style={styles.positionCenter}>
          <Text style={styles.positionLabel}>
            {queue.status === 'serving' ? 'Status' : 'Number in Line'}
          </Text>
          <Text style={styles.positionNumber}>
            {queue.status === 'serving' ? 'Serving' : queue.position}
          </Text>
          {queue.status !== 'serving' && (
            <Text style={styles.positionTotal}>of {queue.totalWaiting} waiting</Text>
          )}
          <Text style={styles.positionMessage}>
            {queue.status === 'serving'
              ? "You're being served now!"
              : queue.position === 1
                ? "You're next!"
                : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead of you`}
          </Text>
        </View>

        <View style={styles.positionGridDivider} />
        <ProgressBars queue={queue} theme={theme} styles={styles} />
      </View>

      {/* Wait time card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={18} color={theme.blue} />
            <Text style={styles.cardTitleText}>
              {queue.status === 'serving' ? 'Next Steps' : 'Estimated Wait'}
            </Text>
          </View>
        </View>
        <View style={styles.waitTimeRow}>
          <View style={styles.waitTimeIcon}>
            <Ionicons name="time-outline" size={26} color={theme.blue} />
          </View>
          <Text style={styles.waitTimeValue}>{queue.estimatedWait}</Text>
          <Text style={styles.waitTimeJoined}>Joined at {queue.joinedAt}</Text>
        </View>
      </View>

      {/* About service */}
      {queue.description ? (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text-outline" size={18} color={theme.blue} />
              <Text style={styles.cardTitleText}>About this Service</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{queue.description}</Text>
        </View>
      ) : null}

      {/* Concern / notes */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="chatbox-outline" size={18} color={theme.blue} />
            <Text style={styles.cardTitleText}>Your Concern</Text>
          </View>
          <Pressable onPress={onEditNotes} hitSlop={8}>
            <Text style={styles.cardActionText}>Edit</Text>
          </Pressable>
        </View>
        <Text style={styles.bodyText}>
          {queue.notes && queue.notes.trim()
            ? queue.notes
            : 'No concern noted yet. Tap Edit to describe your request.'}
        </Text>
      </View>

      {/* Queue number */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="ticket-outline" size={18} color={theme.blue} />
            <Text style={styles.cardTitleText}>Queue Number</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.queueNumberText}>{queue.queueNumberBadge}</Text>
          <Text style={styles.queueNumberCaption}>
            {queue.departmentAbbrev} • {queue.serviceName}
          </Text>
        </View>
      </View>

      {/* Service hours */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={18} color={theme.blue} />
            <Text style={styles.cardTitleText}>Service Hours</Text>
          </View>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursLabel}>Queue Opened</Text>
          <Text style={styles.hoursTime}>{queue.startTime || '—'}</Text>
        </View>
        <View style={[styles.hoursRow, styles.hoursRowLast]}>
          <Text style={styles.hoursLabel}>Queue Closes</Text>
          <Text style={styles.hoursTime}>{queue.endTime || '—'}</Text>
        </View>
      </View>

      {/* Leave queue */}
      {(queue.status === 'waiting' || queue.status === 'serving') && (
        <View style={[styles.card, styles.cancelCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={[styles.cardTitleText, { color: '#ef4444' }]}>Leave Queue</Text>
            </View>
          </View>
          <Text style={styles.cancelDescription}>
            Leaving will remove you from the queue. You&apos;ll need to rejoin if you change your mind.
          </Text>
          <Pressable style={styles.cancelBtn} onPress={onLeave}>
            <Text style={styles.cancelBtnText}>Leave Queue</Text>
          </Pressable>
        </View>
      )}
    </>
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

    // Queue tracking link
    trackingBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderRadius: 16,
      padding: 14,
    },
    trackingIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    trackingTextWrap: {
      flex: 1,
      gap: 3,
    },
    trackingTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.blue,
    },
    trackingSubtitle: {
      fontSize: 11,
      color: theme.tertiary,
      lineHeight: 15,
    },

    // List cards
    queueList: {
      gap: 14,
    },
    listCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.15)',
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    listCardHeaderRow: {
      flexDirection: 'row',
      gap: 12,
    },
    collegeLogoImg: {
      width: 48,
      height: 48,
      flexShrink: 0,
    },
    listCardTopRow: {
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

    inlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    inlineBannerText: {
      fontSize: 11,
      fontWeight: '600',
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

    // Progress bars (occupancy / serviced)
    progressCard: {
      gap: 12,
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

    // Hero (detail view)
    heroCard: {
      borderRadius: 20,
      padding: 18,
      gap: 12,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroLogoBox: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      flexShrink: 0,
    },
    heroLogoImg: {
      width: '100%',
      height: '100%',
    },
    heroTextWrap: {
      flex: 1,
      gap: 3,
    },
    heroServiceName: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
    },
    heroCollegeName: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
    },
    heroBadge: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      flexShrink: 0,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#3b82f6',
      letterSpacing: 0.3,
    },
    heroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroMetaText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
    },

    // Banners
    turnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#16a34a',
      borderRadius: 16,
      padding: 14,
    },
    turnBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    wideBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
    },
    wideBannerText: {
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    wideBannerSubtext: {
      fontSize: 11,
      fontWeight: '400',
      marginTop: 4,
    },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
      gap: 14,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitleText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    cardActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.blue,
    },

    statusBadgePill: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    statusBadgeTextPill: {
      fontSize: 11,
      fontWeight: '700',
    },

    // Position grid
    positionCenter: {
      alignItems: 'center',
      gap: 4,
    },
    positionLabel: {
      fontSize: 13,
      color: theme.tertiary,
    },
    positionNumber: {
      fontSize: 48,
      fontWeight: '800',
      color: theme.blue,
      lineHeight: 54,
    },
    positionTotal: {
      fontSize: 15,
      color: theme.tertiary,
    },
    positionMessage: {
      fontSize: 13,
      color: theme.tertiary,
      marginTop: 6,
    },
    positionGridDivider: {
      height: 1,
      backgroundColor: theme.border,
    },

    // Wait time
    waitTimeRow: {
      alignItems: 'center',
      gap: 8,
    },
    waitTimeIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    waitTimeValue: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.blue,
    },
    waitTimeJoined: {
      fontSize: 12,
      color: theme.tertiary,
    },

    bodyText: {
      fontSize: 13,
      color: theme.subtext,
      lineHeight: 20,
    },

    // Queue number
    queueNumberText: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 1,
    },
    queueNumberCaption: {
      fontSize: 11,
      color: theme.tertiary,
      marginTop: 4,
    },

    // Service hours
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    hoursRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    hoursLabel: {
      fontSize: 12,
      color: theme.tertiary,
    },
    hoursTime: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    // Cancel card
    cancelCard: {
      borderColor: 'rgba(239, 68, 68, 0.25)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    cancelDescription: {
      fontSize: 12,
      color: theme.tertiary,
      marginTop: -8,
    },
    cancelBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ef4444',
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

    // Shared modal look
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

    // Edit notes modal
    notesModalCard: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'stretch',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 24,
      gap: 10,
    },
    notesModalDescription: {
      fontSize: 12,
      color: theme.subtext,
      marginTop: -4,
      marginBottom: 4,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    notesInput: {
      minHeight: 90,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 13,
      color: theme.text,
      backgroundColor: theme.background,
    },
    notesSaveBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.blue,
    },
  });
}
