import { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Home as HomeIcon,
  Key,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

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

// GET/PUT/DELETE/PATCH /api/admin/users* are superadmin-only (adminRoutes.js)
// and genuinely system-wide — they join students/faculty/administrators
// across every department, not just one college. This screen mirrors
// sa-user-management.jsx (the web page) rather than the design-mockup
// UserManagementPage.tsx: no stats grid and no "Add User" — there is no
// POST /users route — and the edit form locks Role, since
// PUT /api/admin/users/:id treats it as read-only.
type Role = 'student' | 'professor' | 'admin';
type Status = 'active' | 'inactive' | 'suspended';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  college: string;
  employeeId?: string;
  studentId?: string;
  status: Status;
  lastLogin?: string;
  createdDate: string;
}

const COLLEGE_OPTIONS = [
  { value: 'CCS', label: 'College of Computing Studies (CCS)' },
  { value: 'CBAA', label: 'College of Business, Accountancy and Administration (CBAA)' },
  { value: 'COED', label: 'College of Education (COED)' },
  { value: 'COE', label: 'College of Engineering (COE)' },
  { value: 'CAS', label: 'College of Arts and Sciences (CAS)' },
  { value: 'CHAS', label: 'College of Health and Allied Sciences (CHAS)' },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'professor', label: 'Professor' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const FILTER_ROLE_OPTIONS = [{ value: 'all', label: 'All Roles' }, ...ROLE_OPTIONS.map((r) => ({ value: r.value, label: `${r.label}s` }))];
const FILTER_STATUS_OPTIONS = [{ value: 'all', label: 'All Statuses' }, ...STATUS_OPTIONS];

const ROLE_BADGE_TINTS: Record<Role, { bg: string; border: string; color: string }> = {
  student: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  professor: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', color: '#a855f7' },
  admin: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
};

const STATUS_BADGE_TINTS: Record<Status, { bg: string; border: string; color: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  inactive: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)', color: '#94a3b8' },
  suspended: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

type LucideIconType = typeof HomeIcon;

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'user-management', label: 'User Management', icon: Users },
  { key: 'pinnacle-sync', label: 'Pinnacle Sync', icon: RefreshCw },
];

const TABS = [
  { key: 'all', label: 'All Users', title: 'All Users', desc: 'Complete list of all user accounts' },
  { key: 'students', label: 'Students', title: 'Student Accounts', desc: 'Manage student user accounts' },
  { key: 'professors', label: 'Professors', title: 'Professor Accounts', desc: 'Manage professor/faculty user accounts' },
  { key: 'admins', label: 'Admins', title: 'Admin Accounts', desc: 'Manage administrator user accounts' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

type ActionType = 'delete' | 'reset' | 'suspend';
type ActivePicker = 'filterRole' | 'filterStatus' | 'formCollege' | 'formStatus' | null;

const BLANK_FORM = { name: '', email: '', role: 'student' as Role, college: '', employeeId: '', studentId: '', status: 'active' as Status };

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function SuperadminUserManagementScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | Role>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(0);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: ActionType; user: AppUser } | null>(null);

  const router = useRouter();
  const { user, logout } = useAuth();
  const adminName = user?.name ?? 'Superadmin';
  const adminRole = 'Superadmin';
  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users ?? []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToDashboard = () => router.push('/pages/superadmin/superadmin_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'user-management') {
      router.push('/pages/superadmin/superadmin_user_management');
      return;
    }
    if (key === 'pinnacle-sync') {
      router.push('/pages/superadmin/superadmin_pinnacle_sync');
      return;
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

  // ── Form (edit-only — there is no create-user endpoint) ────────────────
  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      college: u.college,
      employeeId: u.employeeId || '',
      studentId: u.studentId || '',
      status: u.status,
    });
    setShowFormModal(true);
  };
  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingUser(null);
    setForm(BLANK_FORM);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (!form.name || !form.email || !form.college) return Alert.alert('Missing information', 'Please fill in all required fields');
    if (!form.email.endsWith('@pnc.edu.ph')) return Alert.alert('Invalid email', 'Email must use @pnc.edu.ph domain');
    if (form.role === 'student' && !form.studentId) return Alert.alert('Missing information', 'Student ID is required for students');
    if (form.role !== 'student' && !form.employeeId) return Alert.alert('Missing information', 'Employee ID is required for professors and admins');

    try {
      await api.put(`/admin/users/${editingUser.id}`, form);
      Alert.alert('Success', 'User updated successfully');
      closeFormModal();
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  // ── Row actions ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`);
      Alert.alert('Success', 'User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      Alert.alert('Error', 'Failed to delete user');
    }
  };
  const handleResetPassword = async (u: AppUser) => {
    try {
      const { data } = await api.post(`/admin/users/${u.id}/reset-password`);
      Alert.alert('Temporary password generated', `${data.tempPassword}\n\nRelay this to ${u.name} manually.`);
    } catch (err) {
      console.error('Failed to reset password:', err);
      Alert.alert('Error', 'Failed to reset password');
    }
  };
  const handleToggleSuspend = async (u: AppUser) => {
    const suspending = u.status !== 'suspended';
    try {
      await api.patch(`/admin/users/${u.id}/status`, { status: suspending ? 'suspended' : 'active' });
      Alert.alert('Success', `Account ${suspending ? 'suspended' : 'reactivated'}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update account status:', err);
      Alert.alert('Error', 'Failed to update account status');
    }
  };

  const runConfirmAction = () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    if (type === 'delete') handleDelete(user.id);
    else if (type === 'reset') handleResetPassword(user);
    else if (type === 'suspend') handleToggleSuspend(user);
    setConfirmAction(null);
  };

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.studentId || '').toLowerCase().includes(q) ||
      (u.employeeId || '').toLowerCase().includes(q);
    return matchesSearch && (filterRole === 'all' || u.role === filterRole) && (filterStatus === 'all' || u.status === filterStatus);
  });
  const studentUsers = filtered.filter((u) => u.role === 'student');
  const professorUsers = filtered.filter((u) => u.role === 'professor');
  const adminUsers = filtered.filter((u) => u.role === 'admin');
  const displayUsers = activeTab === 'students' ? studentUsers : activeTab === 'professors' ? professorUsers : activeTab === 'admins' ? adminUsers : filtered;
  const tabCounts: Record<TabKey, number> = { all: filtered.length, students: studentUsers.length, professors: professorUsers.length, admins: adminUsers.length };
  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterRole, filterStatus, activeTab]);

  const totalPages = Math.max(1, Math.ceil(displayUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedUsers = displayUsers.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // ── Picker (status / college selects, shared by filters + form) ────────
  const pickerConfig = (() => {
    switch (activePicker) {
      case 'filterRole':
        return { title: 'Filter by Role', options: FILTER_ROLE_OPTIONS, value: filterRole, onSelect: (v: string) => setFilterRole(v as typeof filterRole) };
      case 'filterStatus':
        return { title: 'Filter by Status', options: FILTER_STATUS_OPTIONS, value: filterStatus, onSelect: (v: string) => setFilterStatus(v as typeof filterStatus) };
      case 'formCollege':
        return { title: 'Select College', options: COLLEGE_OPTIONS, value: form.college, onSelect: (v: string) => setForm((p) => ({ ...p, college: v })) };
      case 'formStatus':
        return { title: 'Select Status', options: STATUS_OPTIONS, value: form.status, onSelect: (v: string) => setForm((p) => ({ ...p, status: v as Status })) };
      default:
        return null;
    }
  })();

  // ── Confirm-modal copy, derived from the pending action ──────────────
  const confirmSuspending = confirmAction?.user.status !== 'suspended';
  const confirmMeta = confirmAction && ({
    delete: {
      title: 'Delete User?',
      description: `Delete ${confirmAction.user.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      icon: Trash2,
      color: '#ef4444',
    },
    reset: {
      title: 'Reset Password?',
      description: `Reset password for ${confirmAction.user.name}? A temporary password will be generated for you to relay to them manually.`,
      confirmLabel: 'Reset Password',
      icon: Key,
      color: '#f59e0b',
    },
    suspend: {
      title: confirmSuspending ? 'Suspend Account?' : 'Reactivate Account?',
      description: `${confirmSuspending ? 'Suspend' : 'Reactivate'} ${confirmAction.user.name}'s account?`,
      confirmLabel: confirmSuspending ? 'Suspend' : 'Reactivate',
      icon: confirmSuspending ? Ban : CheckCircle,
      color: confirmSuspending ? '#f59e0b' : '#22c55e',
    },
  }[confirmAction.type]);

  const collegeLabel = (abbrev: string) => COLLEGE_OPTIONS.find((c) => c.value === abbrev)?.label ?? abbrev;

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
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <Users size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>User Account Management</Text>
              <Text style={styles.pageSubtitle}>Manage all user accounts across the OAMS system</Text>
            </View>
          </View>

          {/* Filter & Search */}
          <View style={styles.card}>
            <View style={styles.filterHeaderRow}>
              <View style={styles.filterTitleGroup}>
                <Filter size={17} color={theme.text} />
                <View>
                  <Text style={styles.cardTitleText}>Filter &amp; Search</Text>
                  <Text style={styles.cardSubtitleText}>Find and filter user accounts</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterActionsRow}>
              <Pressable style={styles.smBtn} onPress={() => Alert.alert('Export', 'Export started')}>
                <Download size={13} color={theme.subtext} />
                <Text style={styles.smBtnText}>Export</Text>
              </Pressable>
              <Pressable style={styles.smBtn} onPress={() => Alert.alert('Import', 'Import feature coming soon')}>
                <Upload size={13} color={theme.subtext} />
                <Text style={styles.smBtnText}>Import</Text>
              </Pressable>
              <Pressable style={styles.smBtn} onPress={() => { fetchUsers(); Alert.alert('Refreshed', 'Data refreshed'); }}>
                <RefreshCw size={13} color={theme.subtext} />
                <Text style={styles.smBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.searchWrapper}>
              <Search size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or ID..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterSelectsRow}>
              <Pressable style={styles.filterSelect} onPress={() => setActivePicker('filterRole')}>
                <Text style={styles.filterSelectText}>{FILTER_ROLE_OPTIONS.find((o) => o.value === filterRole)?.label ?? 'All Roles'}</Text>
                <ChevronDown size={14} color={theme.tertiary} />
              </Pressable>
              <Pressable style={styles.filterSelect} onPress={() => setActivePicker('filterStatus')}>
                <Text style={styles.filterSelectText}>{FILTER_STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label ?? 'All Statuses'}</Text>
                <ChevronDown size={14} color={theme.tertiary} />
              </Pressable>
            </View>
          </View>

          {/* Tabs + list */}
          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <View style={styles.tabsList}>
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <Pressable key={tab.key} style={[styles.tabTrigger, active && styles.tabTriggerActive]} onPress={() => setActiveTab(tab.key)}>
                      <Text style={[styles.tabTriggerText, active && styles.tabTriggerTextActive]}>{tab.label}</Text>
                      <View style={[styles.tabCount, active && styles.tabCountActive]}>
                        <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{tabCounts[tab.key]}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View>
              <Text style={styles.cardTitleText}>{activeTabMeta.title}</Text>
              <Text style={styles.cardSubtitleText}>{activeTabMeta.desc}</Text>
            </View>

            {loading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color={theme.primary} />
                <Text style={styles.emptyTitle}>Loading users…</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyCard}>
                <AlertCircle size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>{error}</Text>
                <Pressable style={styles.smBtn} onPress={fetchUsers}>
                  <Text style={styles.smBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : displayUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Users size={28} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No users found matching your filters.</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {pagedUsers.map((u) => {
                  const roleTint = ROLE_BADGE_TINTS[u.role];
                  const statusTint = STATUS_BADGE_TINTS[u.status];
                  return (
                    <View key={u.id} style={styles.userCard}>
                      <View style={styles.userCardTop}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.userNameRow}>
                            <Text style={styles.userName}>{u.name}</Text>
                            <View style={[styles.badge, { backgroundColor: roleTint.bg, borderColor: roleTint.border }]}>
                              <Text style={[styles.badgeText, { color: roleTint.color }]}>{u.role}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                              <Text style={[styles.badgeText, { color: statusTint.color }]}>{u.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.userEmail}>{u.email}</Text>
                          <View style={styles.userMetaRow}>
                            <View style={styles.collegeBadge}>
                              <Text style={styles.collegeBadgeText}>{u.college}</Text>
                            </View>
                            {u.studentId ? <Text style={styles.metaText}>ID: {u.studentId}</Text> : null}
                            {u.employeeId ? <Text style={styles.metaText}>ID: {u.employeeId}</Text> : null}
                          </View>
                          {u.lastLogin ? <Text style={styles.metaText}>Last login: {formatDateTime(u.lastLogin)}</Text> : null}
                          <Text style={styles.metaText}>Created: {formatDate(u.createdDate)}</Text>
                        </View>
                      </View>

                      <View style={styles.userActionsRow}>
                        <Pressable style={[styles.iconActionBtn, styles.iconActionBtnEdit]} onPress={() => openEditModal(u)} hitSlop={6}>
                          <Pencil size={15} color="#3b82f6" />
                        </Pressable>
                        <Pressable
                          style={[styles.iconActionBtn, u.status === 'suspended' ? styles.iconActionBtnReactivate : styles.iconActionBtnSuspend]}
                          onPress={() => setConfirmAction({ type: 'suspend', user: u })}
                          hitSlop={6}
                        >
                          {u.status === 'suspended' ? (
                            <CheckCircle size={15} color={theme.primary} />
                          ) : (
                            <Ban size={15} color="#f59e0b" />
                          )}
                        </Pressable>
                        <Pressable style={[styles.iconActionBtn, styles.iconActionBtnKey]} onPress={() => setConfirmAction({ type: 'reset', user: u })} hitSlop={6}>
                          <Key size={15} color="#f59e0b" />
                        </Pressable>
                        <Pressable style={[styles.iconActionBtn, styles.iconActionBtnDelete]} onPress={() => setConfirmAction({ type: 'delete', user: u })} hitSlop={6}>
                          <Trash2 size={15} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {totalPages > 1 && (
                  <View style={styles.pagerRow}>
                    <Pressable
                      style={[styles.pagerBtn, safePage === 0 && styles.pagerBtnDisabled]}
                      onPress={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                    >
                      <ChevronLeft size={16} color={safePage === 0 ? theme.tertiary : theme.text} />
                      <Text style={[styles.pagerBtnText, safePage === 0 && styles.pagerBtnTextDisabled]}>Prev</Text>
                    </Pressable>
                    <Text style={styles.pagerLabel}>
                      Page {safePage + 1} of {totalPages}
                    </Text>
                    <Pressable
                      style={[styles.pagerBtn, safePage >= totalPages - 1 && styles.pagerBtnDisabled]}
                      onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage >= totalPages - 1}
                    >
                      <Text style={[styles.pagerBtnText, safePage >= totalPages - 1 && styles.pagerBtnTextDisabled]}>Next</Text>
                      <ChevronRight
                        size={16}
                        color={safePage >= totalPages - 1 ? theme.tertiary : theme.text}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
        adminName={adminName}
        adminRole={adminRole}
      />

      {/* Edit user modal */}
      <Modal visible={showFormModal} animationType="fade" transparent onRequestClose={closeFormModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsModalTitle}>Edit User Account</Text>
                <Text style={styles.detailsModalSubtitle}>Update user account information</Text>
              </View>
              <Pressable onPress={closeFormModal} hitSlop={8}>
                <X size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formModalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Juan Dela Cruz"
                  placeholderTextColor={theme.tertiary}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="user@pnc.edu.ph"
                  placeholderTextColor={theme.tertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <View style={[styles.formSelect, styles.formSelectDisabled]}>
                  <Text style={styles.formSelectText}>{ROLE_OPTIONS.find((r) => r.value === form.role)?.label}</Text>
                </View>
                <Text style={styles.formHint}>Role changes aren&apos;t supported — delete and recreate the account instead.</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>College *</Text>
                <Pressable style={styles.formSelect} onPress={() => setActivePicker('formCollege')}>
                  <Text style={[styles.formSelectText, !form.college && { color: theme.tertiary }]}>
                    {form.college ? collegeLabel(form.college) : 'Select college'}
                  </Text>
                  <ChevronDown size={14} color={theme.tertiary} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                {form.role === 'student' ? (
                  <>
                    <Text style={styles.formLabel}>Student ID *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g., 2312345"
                      placeholderTextColor={theme.tertiary}
                      value={form.studentId}
                      onChangeText={(v) => setForm((p) => ({ ...p, studentId: v }))}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.formLabel}>Employee ID *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g., EMP-2020-045"
                      placeholderTextColor={theme.tertiary}
                      value={form.employeeId}
                      onChangeText={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                    />
                  </>
                )}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status *</Text>
                <Pressable style={styles.formSelect} onPress={() => setActivePicker('formStatus')}>
                  <Text style={styles.formSelectText}>{STATUS_OPTIONS.find((s) => s.value === form.status)?.label}</Text>
                  <ChevronDown size={14} color={theme.tertiary} />
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.formModalFooter}>
              <Pressable style={styles.cancelBtn} onPress={closeFormModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={handleSaveUser}>
                <Text style={styles.confirmBtnText}>Update User</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shared picker (filters + form selects) */}
      <Modal visible={!!activePicker} animationType="fade" transparent onRequestClose={() => setActivePicker(null)}>
        <View style={styles.modalOverlay}>
          {pickerConfig && (
            <View style={styles.filterModalCard}>
              <Text style={styles.confirmTitle}>{pickerConfig.title}</Text>
              {pickerConfig.options.map((opt) => {
                const selected = opt.value === pickerConfig.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => {
                      pickerConfig.onSelect(opt.value);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>{opt.label}</Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
              <Pressable style={styles.cancelBtn} onPress={() => setActivePicker(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* Delete / reset / suspend confirmation */}
      <Modal visible={!!confirmAction} animationType="fade" transparent onRequestClose={() => setConfirmAction(null)}>
        <View style={styles.modalOverlay}>
          {confirmMeta && (
            <View style={styles.confirmModalCard}>
              <View style={[styles.confirmIconCircle, { backgroundColor: `${confirmMeta.color}26` }]}>
                <confirmMeta.icon size={26} color={confirmMeta.color} />
              </View>
              <Text style={styles.confirmTitle}>{confirmMeta.title}</Text>
              <Text style={styles.confirmDescription}>{confirmMeta.description}</Text>
              <View style={styles.confirmActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmAction(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, { backgroundColor: confirmMeta.color }]} onPress={runConfirmAction}>
                  <Text style={styles.confirmBtnText}>{confirmMeta.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <LogoutModal visible={logoutModalVisible} onCancel={() => setLogoutModalVisible(false)} onConfirm={confirmLogout} styles={styles} />
    </View>
  );
}

// ─────────────────────────── Shared sub-components ───────────────────────────

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  adminName,
  adminRole,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
  adminRole: string;
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
              <Text style={styles.drawerName}>{adminName}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>{adminRole}</Text>
            </View>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => (
              <Pressable key={item.key} style={styles.drawerNavItem} onPress={() => onNavPress(item.key)}>
                <item.icon size={18} color={theme.subtext} />
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
          <Text style={styles.confirmDescription}>Are you sure you want to log out? Any unsaved changes will be lost.</Text>
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
    iconBtn: { padding: 8, borderRadius: 10, backgroundColor: theme.iconBtnBg, borderWidth: 1, borderColor: theme.iconBtnBorder },
    iconBtnImg: { width: 18, height: 18 },

    scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title (mirrors PageHeader on the web: gradient icon box + title/subtitle, no banner)
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Generic card
    card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, gap: 14 },
    cardTitleText: { fontSize: 15, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, marginTop: 2 },

    // Filter section
    filterHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    filterTitleGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
    filterActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    smBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.border,
    },
    smBtnText: { fontSize: 12, fontWeight: '500', color: theme.subtext },

    searchWrapper: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
    searchInput: {
      paddingVertical: 12,
      paddingLeft: 36,
      paddingRight: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },
    filterSelectsRow: { flexDirection: 'row', gap: 10 },
    filterSelect: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterSelectText: { fontSize: 12.5, fontWeight: '600', color: theme.text },

    // Tabs
    tabsScroll: { flexGrow: 0 },
    tabsList: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingBottom: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabTriggerText: { fontSize: 13, fontWeight: '600', color: theme.subtext },
    tabTriggerTextActive: { color: theme.primary },
    tabCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    tabCountActive: { backgroundColor: 'rgba(34, 197, 94, 0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: theme.primary },
    tabCountTextActive: { color: theme.primary },

    // User cards
    cardsList: { gap: 12 },

    // Pagination
    pagerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    pagerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    pagerBtnDisabled: { opacity: 0.5 },
    pagerBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },
    pagerBtnTextDisabled: { color: theme.tertiary },
    pagerLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext },

    emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle: { fontSize: 13, color: theme.tertiary },
    userCard: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    userCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    userNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    userName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 0.5 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    userEmail: { fontSize: 12.5, color: theme.subtext },
    userMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    collegeBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, borderWidth: 1, borderColor: theme.border },
    collegeBadgeText: { fontSize: 10.5, fontWeight: '700', color: theme.subtext },
    metaText: { fontSize: 11, color: theme.tertiary },

    userActionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    iconActionBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    iconActionBtnEdit: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' },
    iconActionBtnSuspend: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' },
    iconActionBtnReactivate: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
    iconActionBtnKey: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' },
    iconActionBtnDelete: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },

    // Add / Edit form modal
    formModalCard: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 16 },
    formModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: theme.border },
    detailsModalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    detailsModalSubtitle: { fontSize: 11.5, color: theme.subtext, marginTop: 3 },
    formModalBody: { padding: 18 },
    formGroup: { gap: 6, marginBottom: 14 },
    formLabel: { fontSize: 12.5, fontWeight: '600', color: theme.subtext },
    formInput: {
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
    },
    formSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    formSelectDisabled: { opacity: 0.55 },
    formSelectText: { fontSize: 13, color: theme.text },
    formHint: { fontSize: 10.5, color: theme.tertiary, marginTop: 2 },
    formModalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.border },
    submitBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10, backgroundColor: theme.primary },

    // Filter / picker modal
    filterModalCard: { width: '100%', maxWidth: 340, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 20, gap: 4 },
    filterOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
    filterOptionRowActive: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    filterOptionText: { fontSize: 14, fontWeight: '600', color: theme.text },
    filterOptionTextActive: { color: theme.primary },

    // Nav drawer
    drawerOverlay: { flex: 1, flexDirection: 'row' },
    drawerPanel: { width: 270, backgroundColor: theme.card, borderRightWidth: 1, borderRightColor: theme.border, padding: 20, justifyContent: 'space-between' },
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

    // Shared confirm-modal chrome
    modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
    confirmModalCard: { width: '100%', maxWidth: 340, alignItems: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 24 },
    confirmIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' },
    confirmDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    confirmActionsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
    confirmBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
    logoutConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444' },
  });
}
