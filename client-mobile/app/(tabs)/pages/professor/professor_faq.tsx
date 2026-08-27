import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
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
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from '@/components/NotificationBell';
import { PROFESSOR_NOTIFICATION_PATHS, PROFESSOR_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
  { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'time-outline' },
];

function FaqAccordionItem({
  faq,
  theme,
  styles,
}: {
  faq: FaqItem;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      style={[styles.accordionCard, expanded && styles.accordionCardExpanded]}
      onPress={() => setExpanded((prev) => !prev)}
    >
      <View style={styles.accordionHeaderRow}>
        <Text style={styles.accordionQuestion}>{faq.question}</Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <Ionicons name="chevron-down" size={18} color={expanded ? theme.accent : theme.subtext} />
        </View>
      </View>
      {expanded && (
        <View style={styles.accordionAnswerWrap}>
          <Text style={styles.accordionAnswer}>{faq.answer}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ProfessorFaqScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchFaqs = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/professor/faqs');
      setFaqs(data.faqs ?? []);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      setError('Could not load FAQs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // ── Live updates: silently refetch when an admin posts/edits/removes an
  // FAQ (mirrors student_faq.tsx / stud-faqs.jsx -- no toast on refresh). ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    socket.on('faq:changed', fetchFaqs);

    return () => {
      socket.off('faq:changed', fetchFaqs);
    };
  }, [user, token, fetchFaqs]);

  const goToAnnouncements = () => router.push('/pages/professor/professor_announcement');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') {
      router.push('/pages/professor/professor_dashboard');
      return;
    }
    if (key === 'announcements') {
      goToAnnouncements();
      return;
    }
    if (key === 'appointments') {
      router.push('/pages/professor/professor_appointment');
      return;
    }
    if (key === 'documents') {
      router.push('/pages/professor/professor_documents');
      return;
    }
    if (key === 'transactions') {
      router.push('/pages/professor/professor_transactions');
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

  const q = searchQuery.trim().toLowerCase();
  const filteredFaqs = q
    ? faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    : faqs;

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
              endpointBase="professor"
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
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToAnnouncements} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Announcements</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Ionicons name="help-circle-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Frequently Asked Questions</Text>
              <Text style={styles.pageSubtitle}>Answers to common questions from your department.</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color={theme.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs..."
              placeholderTextColor={theme.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {error && (
            <View style={styles.emptyCard}>
              <Ionicons name="help-circle-outline" size={32} color="#ef4444" />
              <Text style={styles.emptyDescription}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={fetchFaqs}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {loading && !error && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading FAQs…</Text>
            </View>
          )}

          {!loading && !error && (
            <View>
              {faqs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="help-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No FAQs yet</Text>
                  <Text style={styles.emptyDescription}>Your department hasn&apos;t posted any FAQs yet.</Text>
                </View>
              ) : filteredFaqs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="help-circle-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No matches</Text>
                  <Text style={styles.emptyDescription}>No FAQs match your search.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filteredFaqs.map((faq) => (
                    <FaqAccordionItem key={faq.id} faq={faq} theme={theme} styles={styles} />
                  ))}
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
                <Text style={styles.drawerName}>{user?.name ?? 'Faculty'}</Text>
              </View>
              <View style={styles.drawerRoleBadge}>
                <Text style={styles.drawerRoleBadgeText}>Professor</Text>
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
  accent: string;
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
  accent: '#22c55e',
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
  accent: '#15803d',
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
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Search
    searchWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
    searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingLeft: 40,
      paddingRight: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      color: theme.text,
      fontSize: 13,
    },

    retryBtn: {
      marginTop: 6,
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 10,
      backgroundColor: theme.accent,
    },
    retryBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    list: { gap: 12 },

    // Accordion
    accordionCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
    },
    accordionCardExpanded: { borderColor: theme.accent },
    accordionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    accordionQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text, lineHeight: 20 },
    accordionAnswerWrap: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    accordionAnswer: { fontSize: 13, color: theme.subtext, lineHeight: 20 },

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

    // Logout confirm modal
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
  });
}
