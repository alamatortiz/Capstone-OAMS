import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors stud-announcements.jsx) ───
const demoStudent = {
  name: 'Demo Student',
  role: 'Student',
  studentNumber: '2300001',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type AnnouncementCategory = 'important' | 'event' | 'reminder' | 'general';

const CATEGORY_STYLE: Record<
  AnnouncementCategory,
  { icon: IoniconName; gradient: readonly [string, string]; badgeBg: string; badgeBorder: string; badgeColor: string }
> = {
  important: { icon: 'alert-circle-outline', gradient: ['#ef4444', '#dc2626'], badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', badgeColor: '#ef4444' },
  event: { icon: 'calendar-outline', gradient: ['#3b82f6', '#2563eb'], badgeBg: 'rgba(59, 130, 246, 0.15)', badgeBorder: 'rgba(59, 130, 246, 0.3)', badgeColor: '#3b82f6' },
  reminder: { icon: 'notifications-outline', gradient: ['#f59e0b', '#d97706'], badgeBg: 'rgba(245, 158, 11, 0.15)', badgeBorder: 'rgba(245, 158, 11, 0.3)', badgeColor: '#f59e0b' },
  general: { icon: 'information-circle-outline', gradient: ['#8b5cf6', '#7c3aed'], badgeBg: 'rgba(139, 92, 246, 0.15)', badgeBorder: 'rgba(139, 92, 246, 0.3)', badgeColor: '#8b5cf6' },
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface Announcement {
  id: string;
  title: string;
  description: string;
  college: string;
  category: AnnouncementCategory;
  date: string;
  isPinned: boolean;
}

const ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'Enrollment Period for Second Semester', description: 'The enrollment period for the Second Semester AY 2025-2026 will be from April 1-15, 2026. Please prepare all necessary documents and settle any outstanding balances before enrollment.', college: 'College of Computing Studies (CCS)', category: 'important', date: 'March 25, 2026', isPinned: true },
  { id: '2', title: 'System Maintenance Notice', description: 'The OAMS system will undergo scheduled maintenance on March 29, 2026, from 12:00 AM to 6:00 AM. Services will be temporarily unavailable during this period.', college: 'All Departments', category: 'important', date: 'March 26, 2026', isPinned: true },
  { id: '3', title: 'Career Fair 2026', description: 'Join us for the University Career Fair on April 10, 2026, at the University Gymnasium. Meet with potential employers and learn about career opportunities.', college: 'College of Business Accountancy and Administration (CBAA)', category: 'event', date: 'March 24, 2026', isPinned: false },
  { id: '4', title: 'Thesis Defense Schedule', description: 'Final thesis defense schedules for graduating students are now available. Please check with your respective department offices for your assigned date and time.', college: 'College of Engineering (COE)', category: 'reminder', date: 'March 23, 2026', isPinned: false },
  { id: '5', title: 'Scholarship Application Open', description: 'Scholarship applications for Academic Year 2026-2027 are now open. Deadline for submission is April 30, 2026. Visit the Scholarship Office for more details.', college: 'All Departments', category: 'general', date: 'March 22, 2026', isPinned: false },
  { id: '6', title: 'Library Extended Hours', description: 'The University Library will extend its operating hours during the examination period. Open from 7:00 AM to 10:00 PM starting April 1, 2026.', college: 'All Departments', category: 'general', date: 'March 21, 2026', isPinned: false },
  { id: '7', title: 'Health and Wellness Week', description: 'Join us for Health and Wellness Week from April 5-9, 2026. Free health screenings, fitness activities, and mental health awareness programs will be available.', college: 'College of Health and Allied Sciences (CHAS)', category: 'event', date: 'March 20, 2026', isPinned: false },
  { id: '8', title: 'Clearance Processing Reminder', description: 'Graduating students are reminded to start their clearance processing. Please settle all obligations and return borrowed items to avoid delays.', college: 'All Departments', category: 'reminder', date: 'March 19, 2026', isPinned: false },
  { id: '9', title: 'Research Symposium', description: 'The Annual Research Symposium will be held on April 15, 2026. Students are encouraged to attend and learn from research presentations across all disciplines.', college: 'College of Arts and Sciences (CAS)', category: 'event', date: 'March 18, 2026', isPinned: false },
  { id: '10', title: 'Student Council Elections', description: 'Filing of candidacy for Student Council Elections is now open until April 5, 2026. Voting will take place on April 20-22, 2026.', college: 'All Departments', category: 'general', date: 'March 17, 2026', isPinned: false },
  { id: '11', title: 'Practicum Orientation', description: 'Mandatory practicum orientation for Education students will be held on April 8, 2026, at 2:00 PM in the AVR. Attendance is required.', college: 'College of Education (COED)', category: 'important', date: 'March 16, 2026', isPinned: false },
  { id: '12', title: 'No Classes on April 9', description: 'In observance of the Day of Valor, there will be no classes on April 9, 2026. Regular schedule resumes on April 10, 2026.', college: 'All Departments', category: 'general', date: 'March 15, 2026', isPinned: false },
];

// Announcements filed under "All Departments" are cross-college and always
// stay visible regardless of which single college is selected below.
const CROSS_COLLEGE = 'All Departments';

type FilterTabKey = 'pinned' | 'all' | AnnouncementCategory;

const FILTER_TABS: { key: FilterTabKey; label: string }[] = [
  { key: 'pinned', label: 'Pinned' },
  { key: 'all', label: 'All' },
  { key: 'important', label: 'Important' },
  { key: 'event', label: 'Events' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'general', label: 'General' },
];

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
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [collegeModalVisible, setCollegeModalVisible] = useState(false);
  const router = useRouter();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

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

  // College options derived from the demo data, same rule the web page uses:
  // cross-college announcements stay visible no matter which college is picked.
  const collegeOptions = useMemo(() => {
    const seen = new Set<string>();
    ANNOUNCEMENTS.forEach((a) => {
      if (a.college !== CROSS_COLLEGE) seen.add(a.college);
    });
    return [...seen].sort();
  }, []);

  const matchesCollege = (a: Announcement) =>
    selectedCollege === 'all' || a.college === selectedCollege || a.college === CROSS_COLLEGE;

  const pinnedAnnouncements = ANNOUNCEMENTS.filter((a) => a.isPinned).filter(matchesCollege);
  const filteredAnnouncements = ANNOUNCEMENTS.filter(
    (a) => selectedFilter === 'all' || a.category === selectedFilter,
  )
    .filter(matchesCollege)
    .filter((a) => !a.isPinned);

  const isPinnedTab = selectedFilter === 'pinned';
  const visibleList = isPinnedTab ? pinnedAnnouncements : filteredAnnouncements;
  const sectionTitle = isPinnedTab
    ? 'Pinned Announcements'
    : selectedFilter === 'all'
      ? 'All Announcements'
      : `${capitalize(selectedFilter)} Announcements`;

  const renderCard = (announcement: Announcement) => {
    const style = CATEGORY_STYLE[announcement.category];
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
              <Text style={styles.cardMetaText}>{announcement.date}</Text>
            </View>
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
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.titleIcon}>
              <Ionicons name="megaphone-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Announcements</Text>
              <Text style={styles.pageSubtitle}>Stay updated with the latest notices</Text>
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

          {/* College Filter */}
          <Pressable style={styles.collegeFilterBtn} onPress={() => setCollegeModalVisible(true)}>
            <Text style={styles.collegeFilterText} numberOfLines={1}>
              {selectedCollege === 'all' ? 'All Colleges' : selectedCollege}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.tertiary} />
          </Pressable>

          {/* Announcement List */}
          <View>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            {visibleList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-off-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>
                  {isPinnedTab ? 'No Pinned Announcements' : 'No Announcements Found'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {isPinnedTab
                    ? 'Announcements marked as important will appear here.'
                    : 'Try adjusting your filters to see more results.'}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>{visibleList.map((a) => renderCard(a))}</View>
            )}
          </View>
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

      {/* College Filter Modal */}
      <Modal
        visible={collegeModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCollegeModalVisible(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.logoutModalTitle}>Select College</Text>
            <ScrollView style={styles.filterOptionsList}>
              {['all', ...collegeOptions].map((opt) => {
                const selected = opt === selectedCollege;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => {
                      setSelectedCollege(opt);
                      setCollegeModalVisible(false);
                    }}
                  >
                    <Text
                      style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}
                      numberOfLines={2}
                    >
                      {opt === 'all' ? 'All Colleges' : opt}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.logoutCancelBtn} onPress={() => setCollegeModalVisible(false)}>
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
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  primaryDark: string;
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
