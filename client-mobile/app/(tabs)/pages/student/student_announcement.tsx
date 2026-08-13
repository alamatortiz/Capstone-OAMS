import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import type { ComponentProps } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

type AnnouncementCategory = 'important' | 'event' | 'reminder' | 'general';

const CATEGORY_STYLE: Record<
  AnnouncementCategory,
  { icon: IoniconName; gradient: readonly [string, string]; badgeBg: string; badgeBorder: string; badgeColor: string }
> = {
  important: { icon: 'alert-circle-outline', gradient: ['#ef4444', '#dc2626'], badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', badgeColor: '#ef4444' },
  event: { icon: 'calendar-outline', gradient: ['#f97316', '#ea580c'], badgeBg: 'rgba(249, 115, 22, 0.15)', badgeBorder: 'rgba(249, 115, 22, 0.3)', badgeColor: '#f97316' },
  reminder: { icon: 'notifications-outline', gradient: ['#3b82f6', '#2563eb'], badgeBg: 'rgba(59, 130, 246, 0.15)', badgeBorder: 'rgba(59, 130, 246, 0.3)', badgeColor: '#3b82f6' },
  general: { icon: 'information-circle-outline', gradient: ['#94a3b8', '#64748b'], badgeBg: 'rgba(148, 163, 184, 0.15)', badgeBorder: 'rgba(148, 163, 184, 0.3)', badgeColor: '#94a3b8' },
};

// Applied instead of CATEGORY_STYLE when an announcement is pinned -- pinned
// status takes visual priority over category.
const PINNED_STYLE = {
  gradient: ['#22c55e', '#16a34a'] as const,
  badgeBg: 'rgba(34, 197, 94, 0.15)',
  badgeBorder: 'rgba(34, 197, 94, 0.3)',
  badgeColor: '#22c55e',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface AnnouncementAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  college: string;
  category: AnnouncementCategory;
  date: string;
  isPinned: boolean;
  isReposted: boolean;
  departmentAbbrev: string;
  departmentName: string;
  attachments: AnnouncementAttachment[];
}

// Single line whose label reflects whether this announcement has ever been
// edited/restored (isReposted, set server-side) -- "Posted" the first time,
// "Reposted" from then on. Matches the web student page's convention.
const formatPostedLabel = (announcement: { date: string; isReposted: boolean }) => {
  const label = announcement.isReposted ? 'Reposted' : 'Posted';
  const formatted = new Date(announcement.date).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${label}: ${formatted}`;
};

type FilterTabKey = 'pinned' | 'all' | AnnouncementCategory;

const FILTER_TABS: { key: FilterTabKey; label: string }[] = [
  { key: 'pinned', label: 'Pinned' },
  { key: 'all', label: 'All' },
  { key: 'important', label: 'Important' },
  { key: 'event', label: 'Events' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'general', label: 'General' },
];

const EMPTY_STATE_COPY: Record<FilterTabKey, { title: string; description: string }> = {
  pinned: { title: 'No Pinned Announcements', description: 'There are no pinned announcements yet.' },
  all: { title: 'No Announcements Found', description: 'There are no announcements yet.' },
  important: { title: 'No Important Announcements Found', description: 'There are no important announcements yet.' },
  event: { title: 'No Event Announcements Found', description: 'There are no event announcements yet.' },
  reminder: { title: 'No Reminder Announcements Found', description: 'There are no reminder announcements yet.' },
  general: { title: 'No General Announcements Found', description: 'There are no general announcements yet.' },
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

export default function StudentAnnouncementScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterTabKey>('pinned');
  const router = useRouter();
  const { user, token, logout } = useAuth();

  // Holds whatever page(s) have been loaded for the CURRENT tab only --
  // filtering/pagination now happens server-side (see fetchAnnouncements),
  // so there's no separate "all announcements ever fetched" cache anymore.
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mirrors `announcements` for the catch block below, without making
  // fetchAnnouncements depend on (and change identity with) the state itself.
  const announcementsRef = useRef(announcements);
  useEffect(() => { announcementsRef.current = announcements; }, [announcements]);

  // Guards against out-of-order responses: e.g. switching tabs while a Load
  // More request for the previous tab is still in flight would otherwise let
  // the stale response land after the fresh one and get appended onto the
  // wrong tab's list (mirrors student_transactions.tsx's requestIdRef).
  const requestIdRef = useRef(0);

  const fetchAnnouncements = useCallback(async (pageNum: number, category: FilterTabKey) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await api.get('/student/announcements', {
        params: { category, page: pageNum },
      });
      if (requestId !== requestIdRef.current) return;
      const fetched: Announcement[] = data.announcements ?? [];
      setAnnouncements((prev) => (pageNum > 1 ? [...prev, ...fetched] : fetched));
      setPage(data.page ?? pageNum);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Fetch announcements error:', err);
      if (announcementsRef.current.length === 0) {
        setError('Could not load announcements. Please try again.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh announcements.' });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Fresh load at page 1 whenever the mount happens or the selected tab
  // changes -- explicitly shows the loading state since the visible content
  // is about to change, not a silent background refresh.
  useEffect(() => {
    setLoading(true);
    fetchAnnouncements(1, selectedFilter);
  }, [selectedFilter, fetchAnnouncements]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchAnnouncements(page + 1, selectedFilter);
  };

  // ── Live updates: refetch + notify when an admin posts/edits/removes an
  // announcement (mirrors stud-announcements.jsx's "announcement:changed").
  // Refetches the currently active tab from page 1, silently -- unlike the
  // effect above, this doesn't toggle `loading`, since it's a background
  // refresh of content already on screen, not a user-driven navigation. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const onAnnouncementChanged = (payload: any) => {
      fetchAnnouncements(1, selectedFilter);
      notify('New announcement', payload?.title ? String(payload.title) : 'An announcement was posted or updated.');
    };
    socket.on('announcement:changed', onAnnouncementChanged);

    return () => {
      socket.off('announcement:changed', onAnnouncementChanged);
    };
  }, [user, token, fetchAnnouncements, selectedFilter]);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const viewAttachment = async (announcement: Announcement, attachment: AnnouncementAttachment) => {
    if (downloadingId) return;
    setDownloadingId(attachment.id);
    try {
      const safeName = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uri = `${FileSystem.cacheDirectory}announcement-${announcement.id}-${attachment.id}-${safeName}`;
      const result = await FileSystem.downloadAsync(
        `${api.defaults.baseURL}/student/announcements/${announcement.id}/attachments/${attachment.id}`,
        uri,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // downloadAsync only rejects on a true network failure -- a 404/403
      // response still "succeeds" and writes the error JSON body to disk, so
      // the status has to be checked explicitly before treating it as a file.
      if (result.status < 200 || result.status >= 300) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        Alert.alert('Error', 'Could not open the attachment.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: attachment.mimeType ?? undefined });
    } catch (err) {
      console.error('Failed to download attachment:', err);
      Alert.alert('Error', 'Could not open the attachment.');
    } finally {
      setDownloadingId(null);
    }
  };

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'announcements') return;
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'queue') {
      router.push('/pages/student/student_queue');
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

  // The backend now returns exactly this tab's items, paginated
  // (mirrors stud-announcements.jsx (web)), so `announcements` itself is
  // already the correct list to render -- no client-side filtering needed.
  const hasMore = page < totalPages;

  const renderCard = (announcement: Announcement) => {
    const style = announcement.isPinned
      ? { ...CATEGORY_STYLE[announcement.category], ...PINNED_STYLE }
      : CATEGORY_STYLE[announcement.category];
    return (
      <View key={announcement.id} style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <LinearGradient colors={style.gradient} style={styles.cardIcon}>
            <Ionicons name={style.icon} size={22} color="#ffffff" />
          </LinearGradient>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{announcement.title}</Text>
              <View style={[styles.badge, { backgroundColor: style.badgeBg, borderColor: style.badgeBorder }]}>
                <Text style={[styles.badgeText, { color: style.badgeColor }]}>
                  {capitalize(announcement.category)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDescription}>{announcement.description}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>{announcement.college}</Text>
              <Text style={styles.cardMetaText}>{formatPostedLabel(announcement)}</Text>
            </View>
            {announcement.attachments?.length > 0 && (
              <View style={styles.attachmentList}>
                {announcement.attachments.map((att) => (
                  <Pressable
                    key={att.id}
                    style={styles.attachmentRow}
                    onPress={() => viewAttachment(announcement, att)}
                    disabled={downloadingId === att.id}
                  >
                    {downloadingId === att.id ? (
                      <ActivityIndicator size="small" color={theme.subtext} />
                    ) : (
                      <Ionicons name="attach-outline" size={14} color={theme.subtext} />
                    )}
                    <Text style={styles.attachmentRowText} numberOfLines={1}>
                      {downloadingId === att.id ? 'Opening…' : att.filename}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
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
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Ionicons name="megaphone-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Announcements</Text>
              <Text style={styles.pageSubtitle}>Stay updated with the latest notices from your department.</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsBar}>
            {FILTER_TABS.map((tab) => {
              const active = selectedFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={styles.tab}
                  onPress={() => setSelectedFilter(tab.key)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  {active && <View style={styles.tabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {error && (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>Something went wrong</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
              <Pressable style={styles.collegeFilterBtn} onPress={() => fetchAnnouncements(1, selectedFilter)}>
                <Text style={styles.collegeFilterText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {loading && !error && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyDescription}>Loading announcements…</Text>
            </View>
          )}

          {/* Announcement List */}
          {!loading && !error && (
          <View>
            {announcements.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-off-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>
                  {EMPTY_STATE_COPY[selectedFilter].title}
                </Text>
                <Text style={styles.emptyDescription}>
                  {EMPTY_STATE_COPY[selectedFilter].description}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.list}>{announcements.map((a) => renderCard(a))}</View>
                {hasMore && (
                  <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
                    <Text style={styles.loadMoreBtnText}>{loadingMore ? 'Loading…' : 'Load More'}</Text>
                  </Pressable>
                )}
              </>
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
              <Text style={styles.drawerCollege}>{user?.departmentName ?? ''} ({user?.departmentAbbrev ?? ''})</Text>
            </View>

            <View style={styles.drawerNav}>
              {navItems.map((item) => {
                const active = item.key === 'announcements';
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  primaryDark: string;
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
  primaryDark: '#15803d',
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
  primaryDark: '#14532d',
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
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.2)',
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

    // Tabs (underline style, mirrors .ann-tab on web)
    tabsBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },
    tab: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tabTextActive: {
      color: theme.primary,
    },
    tabIndicator: {
      marginTop: 8,
      height: 2,
      width: '100%',
      backgroundColor: theme.primary,
    },

    // College filter
    collegeFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf: 'flex-start',
      minWidth: 160,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    collegeFilterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginRight: 8,
    },

    // Section title
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 10,
    },

    list: {
      gap: 12,
    },

    loadMoreBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      marginTop: 12,
    },
    loadMoreBtnText: { fontSize: 13, fontWeight: '700', color: theme.primary },

    // Card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardBody: {
      flex: 1,
      gap: 6,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 20,
    },
    cardDescription: {
      fontSize: 13,
      color: theme.subtext,
      lineHeight: 19,
    },
    cardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 2,
    },
    cardMetaText: {
      fontSize: 12,
      color: theme.tertiary,
    },
    attachmentList: {
      gap: 6,
      marginTop: 8,
      alignItems: 'flex-start',
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      maxWidth: '100%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    attachmentRowText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.subtext,
      flexShrink: 1,
    },

    badge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 12,
      flexShrink: 0,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
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
  });
}
