import { useState } from 'react';
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

// ─── Demo data (mobile has no auth/API wiring yet — mirrors PinnacleSyncPage.tsx /
// admin-pinnacle-sync.jsx, whose real config+stats load from
// GET /admin/pinnacle-sync/config and /stats) ───
const demoAdmin = {
  name: 'Demo Admin',
  role: 'Admin',
  departmentAbbrev: 'CCS',
  departmentName: 'College of Computing Studies (CCS)',
};

type SyncedUser = {
  userId: string;
  fullName: string;
  email: string;
  role: 'student' | 'professor' | 'admin';
  college: string;
  status: string;
  lastSyncedAt: string;
};

const PINNACLE_TABS = ['configuration', 'sync-control', 'synced-users'] as const;
type PinnacleTab = (typeof PINNACLE_TABS)[number];

type SyncMessageType = 'success' | 'error' | 'warning' | 'info';
type SyncMessage = { type: SyncMessageType; text: string };

const ALERT_TINTS: Record<SyncMessageType, { bg: string; border: string; color: string; icon: IoniconName }> = {
  success: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', color: '#4ade80', icon: 'checkmark-circle-outline' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', icon: 'close-circle-outline' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', icon: 'alert-circle-outline' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', icon: 'information-circle-outline' },
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

export default function AdminPinnacleSyncScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<PinnacleTab>('configuration');
  const [apiUrl, setApiUrl] = useState('https://pinnacle-api.pnc.edu.ph/v1');
  const [apiKey, setApiKey] = useState('');
  const [syncInterval, setSyncInterval] = useState('60');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncedUsers, setSyncedUsers] = useState<SyncedUser[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [syncMessage, setSyncMessage] = useState<SyncMessage | null>(null);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

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
    router.replace('/login');
  };

  const flashMessage = (msg: SyncMessage, holdMs = 3000) => {
    setSyncMessage(msg);
    setTimeout(() => setSyncMessage(null), holdMs);
  };

  const handleSaveConfiguration = () => {
    flashMessage({ type: 'success', text: 'Configuration saved successfully.' });
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setSyncMessage({ type: 'info', text: 'Testing connection to PinnaCle API...' });
    setTimeout(() => {
      setIsTesting(false);
      flashMessage(
        syncEnabled
          ? { type: 'success', text: 'Connection successful!' }
          : { type: 'error', text: 'Connection failed. Please check your API key.' },
        4000
      );
    }, 1500);
  };

  const handleSyncNow = () => {
    if (!syncEnabled) {
      flashMessage({ type: 'warning', text: 'PinnaCle sync is currently disabled. Enable it in the Configuration tab.' });
      return;
    }
    setIsSyncing(true);
    setSyncMessage({ type: 'info', text: 'Syncing data from PinnaCle...' });
    setTimeout(() => {
      setSyncedUsers(DEMO_SYNCED_USERS);
      setIsSyncing(false);
      flashMessage({ type: 'success', text: 'Sync completed! 4 added, 0 updated.' });
    }, 1500);
  };

  const stats = [
    { key: 'total', label: 'Total Synced Users', value: syncedUsers.length, tint: 'blue' as const },
    { key: 'students', label: 'Students', value: syncedUsers.filter((u) => u.role === 'student').length, tint: 'green' as const },
    { key: 'professors', label: 'Professors', value: syncedUsers.filter((u) => u.role === 'professor').length, tint: 'purple' as const },
    { key: 'admins', label: 'Admins', value: syncedUsers.filter((u) => u.role === 'admin').length, tint: 'orange' as const },
  ];

  const tabMeta: Record<PinnacleTab, { label: string; icon: IoniconName }> = {
    configuration: { label: 'Configuration', icon: 'settings-outline' },
    'sync-control': { label: 'Sync Control', icon: 'sync-outline' },
    'synced-users': { label: `Synced Users (${syncedUsers.length})`, icon: 'people-outline' },
  };

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
              <Image source={isDarkMode ? sunIcon : darkModeIcon} style={styles.iconBtnImg} resizeMode="contain" />
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

          {/* Header — mirrors admin-pinnacle-sync.jsx's .aps-page-header: plain gradient
              icon box + title/subtitle on the left, status pill on the right (no banner). */}
          <View style={styles.pageHeaderRow}>
            <View style={styles.titleRow}>
              <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
                <Ionicons name="server-outline" size={22} color="#ffffff" />
              </LinearGradient>
              <View style={styles.titleTextWrap}>
                <Text style={styles.pageTitle}>Pinnacle Integration</Text>
                <Text style={styles.pageSubtitle}>Sync user data from Pinnacle microservice</Text>
              </View>
            </View>
            <View style={[styles.syncBadge, syncEnabled ? styles.syncBadgeEnabled : styles.syncBadgeDisabled]}>
              <View
                style={[
                  styles.syncBadgeDot,
                  { backgroundColor: syncEnabled ? '#4ade80' : '#ef4444' },
                ]}
              />
              <Text style={[styles.syncBadgeText, { color: syncEnabled ? '#22c55e' : '#ef4444' }]}>
                {syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {stats.map((s) => {
              const tint = STAT_TINTS[s.tint];
              return (
                <View key={s.key} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: tint.bg }]}>
                    <Ionicons name="people-outline" size={18} color={tint.color} />
                  </View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={[styles.statValue, { color: tint.color }]}>{s.value}</Text>
                </View>
              );
            })}
          </View>

          {/* Tabs */}
          <View style={styles.tabsBar}>
            {PINNACLE_TABS.map((tab) => {
              const active = activeTab === tab;
              const meta = tabMeta[tab];
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Ionicons name={meta.icon} size={14} color={active ? '#ffffff' : theme.subtext} />
                  <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Alert */}
          {syncMessage && (
            <View
              style={[
                styles.alert,
                { backgroundColor: ALERT_TINTS[syncMessage.type].bg, borderColor: ALERT_TINTS[syncMessage.type].border },
              ]}
            >
              <Ionicons name={ALERT_TINTS[syncMessage.type].icon} size={18} color={ALERT_TINTS[syncMessage.type].color} />
              <Text style={[styles.alertText, { color: ALERT_TINTS[syncMessage.type].color }]}>{syncMessage.text}</Text>
            </View>
          )}

          {/* Tab: Configuration */}
          {activeTab === 'configuration' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>PinnaCle API Configuration</Text>
                <Text style={styles.panelSubtitle}>Configure connection to PinnaCle microservice</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  API URL <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://pinnacle-api.pnc.edu.ph/v1"
                  placeholderTextColor={theme.tertiary}
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Base URL for PinnaCle API endpoints</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  API Key <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your PinnaCle API key"
                  placeholderTextColor={theme.tertiary}
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Authentication key for accessing PinnaCle API</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Auto-Sync Interval (minutes)</Text>
                <TextInput
                  style={[styles.input, styles.inputSm]}
                  value={syncInterval}
                  onChangeText={setSyncInterval}
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>How often to automatically sync data (15 min - 24 hours)</Text>
              </View>

              <View style={styles.toggleCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Enable PinnaCle Sync</Text>
                  <Text style={styles.toggleDesc}>
                    When enabled, OAMS will use PinnaCle as the source of truth for user data
                  </Text>
                </View>
                <Pressable
                  style={[styles.toggleBtn, syncEnabled && styles.toggleBtnOn]}
                  onPress={() => setSyncEnabled((v) => !v)}
                  hitSlop={6}
                >
                  <View style={[styles.toggleThumb, syncEnabled && styles.toggleThumbOn]} />
                </Pressable>
              </View>

              <View style={styles.panelActions}>
                <Pressable style={styles.primaryBtn} onPress={handleSaveConfiguration}>
                  <Ionicons name="settings-outline" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Save Configuration</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={handleTestConnection} disabled={isTesting}>
                  <Ionicons name={isTesting ? 'refresh-outline' : 'flash-outline'} size={15} color={theme.text} />
                  <Text style={styles.secondaryBtnText}>{isTesting ? 'Testing...' : 'Test Connection'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Tab: Sync Control */}
          {activeTab === 'sync-control' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Data Synchronization</Text>
                <Text style={styles.panelSubtitle}>Sync user data from PinnaCle to OAMS</Text>
              </View>

              <Pressable
                style={[styles.syncNowBtn, isSyncing && styles.syncNowBtnLoading]}
                onPress={handleSyncNow}
                disabled={isSyncing}
              >
                <Ionicons name="sync-outline" size={18} color="#ffffff" />
                <Text style={styles.syncNowBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now from PinnaCle'}</Text>
              </Pressable>

              {!syncEnabled && (
                <View style={[styles.alert, { backgroundColor: ALERT_TINTS.warning.bg, borderColor: ALERT_TINTS.warning.border }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={ALERT_TINTS.warning.color} />
                  <Text style={[styles.alertText, { color: ALERT_TINTS.warning.color }]}>
                    PinnaCle sync is currently disabled. Enable it in the Configuration tab to sync user data.
                  </Text>
                </View>
              )}

              <View style={styles.howItWorks}>
                <Text style={styles.howTitle}>How PinnaCle Sync Works</Text>
                <View style={styles.howList}>
                  <View style={styles.howItem}>
                    <Ionicons name="arrow-up-outline" size={15} color={theme.primary} />
                    <Text style={styles.howText}>Fetches latest user data from PinnaCle microservice</Text>
                  </View>
                  <View style={styles.howItem}>
                    <Ionicons name="arrow-down-outline" size={15} color={theme.primary} />
                    <Text style={styles.howText}>Updates OAMS user accounts with PinnaCle information</Text>
                  </View>
                  <View style={styles.howItem}>
                    <Ionicons name="sync-outline" size={15} color={theme.primary} />
                    <Text style={styles.howText}>Automatically syncs every {syncInterval || '60'} minutes when enabled</Text>
                  </View>
                  <View style={styles.howItem}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={theme.primary} />
                    <Text style={styles.howText}>PinnaCle becomes the single source of truth for user authentication</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Tab: Synced Users */}
          {activeTab === 'synced-users' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Users from PinnaCle</Text>
                <Text style={styles.panelSubtitle}>User accounts synced from PinnaCle microservice</Text>
              </View>

              {syncedUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="server-outline" size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Synced Users</Text>
                  <Text style={styles.emptyDesc}>Go to Sync Control and tap &quot;Sync Now&quot; to import users from PinnaCle.</Text>
                  <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => setActiveTab('sync-control')}>
                    <Ionicons name="sync-outline" size={15} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Go to Sync Control</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.usersList}>
                  {syncedUsers.map((u) => (
                    <View key={u.userId} style={styles.userItem}>
                      <View style={styles.userTopRow}>
                        <Text style={styles.userName} numberOfLines={1}>{u.fullName}</Text>
                        <View style={[styles.rolePill, { backgroundColor: ROLE_TINTS[u.role].bg }]}>
                          <Text style={[styles.rolePillText, { color: ROLE_TINTS[u.role].color }]}>{u.role}</Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      <View style={styles.userMetaRow}>
                        <View style={styles.collegePill}>
                          <Text style={styles.collegePillText}>{u.college}</Text>
                        </View>
                        <Text style={styles.userMetaText}>Synced: {u.lastSyncedAt}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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

const DEMO_SYNCED_USERS: SyncedUser[] = [
  { userId: 'PNC-2021-001', fullName: 'Juan Dela Cruz', email: 'juan.delacruz@pnc.edu.ph', role: 'student', college: 'CCS', status: 'active', lastSyncedAt: 'Jul 18, 2026, 9:02 AM' },
  { userId: 'PNC-2019-014', fullName: 'Maria Santos', email: 'maria.santos@pnc.edu.ph', role: 'professor', college: 'CCS', status: 'active', lastSyncedAt: 'Jul 18, 2026, 9:02 AM' },
  { userId: 'PNC-ADM-004', fullName: 'Admin Office CCS', email: 'admin.ccs@pnc.edu.ph', role: 'admin', college: 'CCS', status: 'active', lastSyncedAt: 'Jul 18, 2026, 9:02 AM' },
  { userId: 'PNC-2022-088', fullName: 'Pedro Garcia', email: 'pedro.garcia@pnc.edu.ph', role: 'student', college: 'CCS', status: 'active', lastSyncedAt: 'Jul 18, 2026, 9:02 AM' },
];

const STAT_TINTS = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  green: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  purple: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  orange: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
} as const;

const ROLE_TINTS: Record<SyncedUser['role'], { bg: string; color: string }> = {
  student: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  professor: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  admin: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
};

// ─────────────────────────── Shared sub-components ───────────────────────────

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
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
              <Text style={styles.drawerName}>{demoAdmin.name}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>{demoAdmin.role}</Text>
            </View>
            <Text style={styles.drawerCollege}>{demoAdmin.departmentName}</Text>
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

    // Header — mirrors .aps-page-header / .aps-title-icon / .aps-sync-badge in
    // admin-pinnacle-sync.css: plain row (icon + title/subtitle), no banner.
    pageHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flexShrink: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },
    syncBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    syncBadgeEnabled: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.4)',
    },
    syncBadgeDisabled: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    syncBadgeDot: { width: 8, height: 8, borderRadius: 4 },
    syncBadgeText: { fontSize: 12, fontWeight: '700' },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: { fontSize: 11, color: theme.subtext, fontWeight: '600' },
    statValue: { fontSize: 24, fontWeight: '800' },

    // Tabs
    tabsBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 4,
    },
    tabBtn: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 9,
      minWidth: '30%',
    },
    tabBtnActive: { backgroundColor: theme.primary },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: theme.subtext },
    tabBtnTextActive: { color: '#ffffff' },

    // Alert
    alert: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    alertText: { fontSize: 12.5, fontWeight: '600', flex: 1, lineHeight: 18 },

    // Panel
    panel: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 18,
      gap: 16,
    },
    panelHeader: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 12,
    },
    panelTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
    panelSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Form
    formGroup: { gap: 6 },
    formLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    required: { color: '#ef4444' },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 13,
      fontSize: 13.5,
      color: theme.text,
      backgroundColor: theme.background,
    },
    inputSm: { maxWidth: 140 },
    hint: { fontSize: 11.5, color: theme.tertiary },

    // Toggle
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
    },
    toggleTitle: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    toggleDesc: { fontSize: 11.5, color: theme.subtext, marginTop: 3, lineHeight: 16 },
    toggleBtn: {
      width: 46,
      height: 26,
      borderRadius: 999,
      backgroundColor: 'rgba(148, 163, 184, 0.35)',
      padding: 2,
      justifyContent: 'center',
    },
    toggleBtnOn: { backgroundColor: theme.primary },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ffffff',
    },
    toggleThumbOn: { transform: [{ translateX: 20 }] },

    // Panel actions — mirrors .aps-panel-actions at its <600px breakpoint:
    // buttons stack full-width instead of sitting side by side.
    panelActions: { flexDirection: 'column', gap: 10 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    primaryBtnText: { fontSize: 13.5, fontWeight: '700', color: '#ffffff' },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryBtnText: { fontSize: 13.5, fontWeight: '700', color: theme.text },

    // Sync Now button — flat .aps-sync-now-btn fill, dimmed while syncing/disabled
    syncNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    syncNowBtnLoading: { opacity: 0.65 },
    syncNowBtnText: { fontSize: 14.5, fontWeight: '700', color: '#ffffff' },

    // How it works
    howItWorks: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    howTitle: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    howList: { gap: 9 },
    howItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    howText: { fontSize: 12, color: theme.subtext, flex: 1, lineHeight: 17 },

    // Empty state
    emptyState: { alignItems: 'center', gap: 5, paddingVertical: 28 },
    emptyTitle: { fontSize: 14.5, fontWeight: '700', color: theme.text, marginTop: 6 },
    emptyDesc: { fontSize: 12, color: theme.subtext, textAlign: 'center', paddingHorizontal: 20 },

    // Synced users list
    usersList: { gap: 10 },
    userItem: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      gap: 5,
    },
    userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    userName: { fontSize: 14, fontWeight: '700', color: theme.text, flex: 1 },
    rolePill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
    rolePillText: { fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize' },
    userEmail: { fontSize: 12, color: theme.subtext },
    userMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    collegePill: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    collegePillText: { fontSize: 10.5, fontWeight: '700', color: theme.text },
    userMetaText: { fontSize: 11, color: theme.tertiary },

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

    // Confirm modal
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
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
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
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  });
}
