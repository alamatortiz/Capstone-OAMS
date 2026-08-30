import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  AppState,
  DeviceEventEmitter,
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
import {
  Bell, Calendar, ChevronDown, ChevronLeft, Clock, FileText, Home as HomeIcon, Megaphone, Users,
  ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useDrawerSwipeOpen } from '@/hooks/useDrawerSwipeOpen';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell, {
  WATCHED_EVENTS,
  NOTIFICATIONS_SYNC_EVENT,
  broadcastNotificationsChanged,
} from '@/components/NotificationBell';
import {
  NOTIFICATION_TYPE_META,
  STUDENT_NOTIFICATION_PATHS,
  STUDENT_NOTIFICATIONS_VIEW_ALL,
  type NotificationType,
} from '@/utils/notificationRoutes';

type LucideIconType = typeof Bell;

// Local icon mapping -- matches web's actual per-type icons (Clock/FileText/
// Calendar/Megaphone). NOTIFICATION_TYPE_META itself stays untouched since
// it's shared with the professor/admin notifications screens.
const TYPE_ICON: Record<NotificationType, LucideIconType> = {
  queue: Clock,
  document: FileText,
  appointment: Calendar,
  announcement: Megaphone,
};

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

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

interface NotificationItem {
  notification_id: number;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

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

type TypeFilter = 'all' | NotificationType;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'queue', label: 'Queue' },
  { value: 'document', label: 'Document' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'announcement', label: 'Announcement' },
];

export default function StudentNotificationsScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  useDrawerSwipeOpen(() => setMenuOpen(true));
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // Lets background refreshes (below) re-fetch every page the user has
  // already loaded via "Load More", instead of the closed-over `page` value
  // from whenever the effect was created.
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  const requestIdRef = useRef(0);

  const fetchNotifications = useCallback(async (pageNum: number) => {
    const requestId = ++requestIdRef.current;
    try {
      if (pageNum > 1) setLoadingMore(true);
      const { data } = await api.get('/student/notifications', {
        params: { type: filterType !== 'all' ? filterType : undefined, page: pageNum },
      });
      if (requestId !== requestIdRef.current) return;
      const fetched: NotificationItem[] = data.notifications ?? [];
      setNotifications((prev) => (pageNum > 1 ? [...prev, ...fetched] : fetched));
      setPage(data.page ?? pageNum);
      setTotalPages(data.totalPages ?? 1);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to fetch notifications:', err);
      if (notificationsRef.current.length === 0) {
        setError('Could not load your notifications.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh notifications.' });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filterType]);

  // Background refresh (socket/foreground/poll/cross-screen-sync, below) --
  // re-fetches every page currently on screen and replaces the list in one
  // shot, so it doesn't collapse whatever the user has "Load More"'d down to
  // just page 1 (mirrors fetchNotifications' own request-id staleness guard).
  const refreshLoadedPages = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const upTo = pageRef.current;
      const responses = await Promise.all(
        Array.from({ length: upTo }, (_, i) =>
          api.get('/student/notifications', {
            params: { type: filterType !== 'all' ? filterType : undefined, page: i + 1 },
          }),
        ),
      );
      if (requestId !== requestIdRef.current) return;
      const merged = responses.flatMap((res) => res.data.notifications ?? []);
      setNotifications(merged);
      const last = responses[responses.length - 1]?.data;
      setPage(last?.page ?? upTo);
      setTotalPages(last?.totalPages ?? 1);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to refresh notifications:', err);
      Toast.show({ type: 'error', text1: 'Could not refresh notifications.' });
    }
  }, [filterType]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchNotifications(page + 1);
  };

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    WATCHED_EVENTS.forEach((event) => socket.on(event, refreshLoadedPages));
    return () => {
      WATCHED_EVENTS.forEach((event) => socket.off(event, refreshLoadedPages));
    };
  }, [token, refreshLoadedPages]);

  useEffect(() => {
    if (!token) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshLoadedPages();
    });
    return () => sub.remove();
  }, [token, refreshLoadedPages]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refreshLoadedPages();
    }, 45000);
    return () => clearInterval(interval);
  }, [token, refreshLoadedPages]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NOTIFICATIONS_SYNC_EVENT, refreshLoadedPages);
    return () => sub.remove();
  }, [refreshLoadedPages]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/student/notifications/${id}/read`);
      broadcastNotificationsChanged();
    } catch {
      setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)));
    }
  };

  const markAllRead = async () => {
    const previous = notificationsRef.current;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch('/student/notifications/read-all');
      broadcastNotificationsChanged();
    } catch {
      setNotifications(previous);
    }
  };

  const goToNotification = (item: NotificationItem) => {
    if (!item.is_read) markRead(item.notification_id);
    router.push(STUDENT_NOTIFICATION_PATHS[item.type] as never);
  };

  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'appointments') { router.push('/pages/student/student_appointments'); return; }
    if (key === 'documents') { router.push('/pages/student/student_documents'); return; }
    if (key === 'transactions') { router.push('/pages/student/student_transactions'); return; }
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const typeLabel = TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? 'All Types';

  const chooseType = (value: string) => {
    setFilterType(value as TypeFilter);
    setTypeFilterOpen(false);
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
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Bell size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSubtitle}>Stay updated on queue, document, appointment, and announcement activity.</Text>
            </View>
          </View>

          {/* Filter + Mark all read */}
          <View style={styles.filtersCard}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Notification Filter</Text>
              <Text style={styles.filtersDescription}>Filter your notifications by category.</Text>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Type</Text>
              <Pressable style={styles.filterSelect} onPress={() => setTypeFilterOpen(true)}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{typeLabel}</Text>
                <ChevronDown size={16} color={theme.primary} />
              </Pressable>
            </View>
            {unreadCount > 0 && (
              <Pressable style={styles.markAllBtn} onPress={markAllRead}>
                <Text style={styles.markAllBtnText}>Mark all read ({unreadCount})</Text>
              </Pressable>
            )}
          </View>

          {/* Notifications list */}
          {loading ? (
            <View style={styles.emptyCard}>
              <Bell size={32} color={theme.tertiary} />
              <Text style={styles.emptyDescription}>Loading notifications…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Bell size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Could not load notifications</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
            </View>
          ) : notifications.length > 0 ? (
            <View style={styles.notifList}>
              {notifications.map((n) => {
                const meta = NOTIFICATION_TYPE_META[n.type] ?? NOTIFICATION_TYPE_META.queue;
                const TypeIcon = TYPE_ICON[n.type] ?? Clock;
                return (
                  <Pressable
                    key={n.notification_id}
                    style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}
                    onPress={() => goToNotification(n)}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: meta.color }]}>
                      <TypeIcon size={18} color="#ffffff" />
                    </View>
                    <View style={styles.notifBody}>
                      <Text style={styles.notifUpdateTitle}>{meta.label} Update</Text>
                      <View style={styles.notifBadgeRow}>
                        <View style={[styles.notifBadge, { backgroundColor: `${meta.color}26`, borderColor: `${meta.color}55` }]}>
                          <Text style={[styles.notifBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {!n.is_read && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>Unread</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <View style={styles.notifTimeRow}>
                        <Clock size={11} color={theme.tertiary} />
                        <Text style={styles.notifTime}>{formatTimestamp(n.created_at)}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Bell size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyDescription}>You&apos;re all caught up.</Text>
            </View>
          )}

          {!loading && !error && page < totalPages && (
            <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
              <Text style={styles.loadMoreBtnText}>{loadingMore ? 'Loading…' : 'Load More'}</Text>
            </Pressable>
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
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.drawerNavItem}
                  onPress={() => handleNavPress(item.key)}
                >
                  <item.icon size={18} color={theme.subtext} />
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

      {/* Type Filter Modal */}
      <Modal visible={typeFilterOpen} animationType="fade" transparent onRequestClose={() => setTypeFilterOpen(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.logoutModalTitle}>Filter by Type</Text>
            <ScrollView style={styles.filterOptionsList}>
              {TYPE_OPTIONS.map((opt) => {
                const selected = opt.value === filterType;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => chooseType(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.filterModalClose} onPress={() => setTypeFilterOpen(false)}>
              <Text style={styles.filterModalCloseText}>Close</Text>
            </Pressable>
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
  orange: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(34, 197, 94, 0.2)',
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
  orange: '#f97316',
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
  orange: '#ea580c',
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

    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3, lineHeight: 17 },

    // Filters card
    filtersCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.15)',
      borderRadius: 18,
      padding: 18,
      gap: 14,
    },
    filtersHeader: { gap: 2, marginBottom: -6 },
    filtersTitle: { fontSize: 15, fontWeight: '800', color: theme.text, textAlign: 'center' },
    filtersDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center' },
    filterField: { gap: 6 },
    filterLabel: { fontSize: 12, fontWeight: '700', color: theme.text },
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
    filterSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    markAllBtnText: { fontSize: 13, fontWeight: '700', color: theme.primary },

    loadMoreBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    loadMoreBtnText: { fontSize: 13, fontWeight: '700', color: theme.primary },

    // Notification list
    notifList: { gap: 10 },
    notifCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
    },
    notifCardUnread: { backgroundColor: theme.iconBtnBg, borderColor: theme.cardAltBorder },
    notifIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    notifBody: { flex: 1, gap: 4 },
    notifBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    notifBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    notifBadgeText: { fontSize: 10, fontWeight: '700' },
    notifUpdateTitle: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 2 },
    unreadBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 0.5,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    unreadBadgeText: { fontSize: 10, fontWeight: '700', color: theme.success },
    notifMessage: { fontSize: 13, color: theme.text, lineHeight: 18 },
    notifTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    notifTime: { fontSize: 11, color: theme.tertiary, fontWeight: '600' },

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
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },

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
    drawerRoleBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    drawerRoleBadgeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
    drawerCollege: { fontSize: 12, fontWeight: '500', color: theme.subtext },
    drawerNav: { flex: 1, marginTop: 28, gap: 4 },
    drawerNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
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
    logoutModalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    logoutModalDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    logoutModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    logoutCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    logoutCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
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
    logoutConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

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
    filterOptionsList: { maxHeight: 320 },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 2,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.primary, fontWeight: '700' },
    filterModalClose: {
      paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4,
    },
    filterModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },
  });
}
