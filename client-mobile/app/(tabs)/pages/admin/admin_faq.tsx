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
  Calendar, CheckCircle, ChevronLeft, Clock, FileText, HelpCircle, History,
  Home as HomeIcon, Pencil, Plus, Trash2, X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

type LucideIconType = typeof Calendar;

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = { question: '', answer: '' };

// Mirrors adm-faqs.jsx's formatManilaDateTime(faq.createdAt, {month:"long"}) override.
const formatFaqDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

// Same drawer list every existing admin screen uses -- FAQ is reached only
// via the "Manage FAQs" link on the Announcements page, so it isn't added here.
const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'queue', label: 'Queue', icon: Clock },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: History },
];

export default function AdminFaqScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/faqs');
      setFaqs(data.faqs ?? []);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      setError('Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const goToAnnouncements = () => router.push('/pages/admin/admin_announcement');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') {
      router.push('/pages/admin/admin_dashboard');
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
    logout();
    router.replace('/login');
  };

  // ── CRUD handlers (wired to /admin/faqs) ──
  const openCreate = () => {
    setCreateForm(EMPTY_FORM);
    setIsCreating(true);
  };
  const closeCreate = () => {
    setIsCreating(false);
    setCreateForm(EMPTY_FORM);
  };
  const saveCreate = async () => {
    if (!createForm.question.trim() || !createForm.answer.trim()) {
      Alert.alert('Missing fields', 'Please fill in both the question and the answer.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/admin/faqs', createForm);
      setFaqs((prev) => [...prev, data.faq]);
      closeCreate();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create FAQ.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setEditForm({ question: faq.question, answer: faq.answer });
  };
  const closeEdit = () => {
    setEditingFaq(null);
    setEditForm(EMPTY_FORM);
  };
  const saveEdit = async () => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      Alert.alert('Missing fields', 'Please fill in both the question and the answer.');
      return;
    }
    if (!editingFaq) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/faqs/${editingFaq.id}`, editForm);
      setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? data.faq : f)));
      closeEdit();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update FAQ.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.delete(`/admin/faqs/${deleteId}`);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteId));
    } catch {
      Alert.alert('Error', 'Failed to delete FAQ.');
    } finally {
      setDeleteId(null);
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
            <NotificationBell
              endpointBase="admin"
              theme={theme}
              typePaths={ADMIN_NOTIFICATION_PATHS}
              viewAllPath={ADMIN_NOTIFICATIONS_VIEW_ALL}
            />
            <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Breadcrumb */}
          <Pressable style={styles.breadcrumb} onPress={goToAnnouncements} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Announcements</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <HelpCircle size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>FAQ Management</Text>
              <Text style={styles.pageSubtitle}>Manage frequently asked questions for {adminDepartmentName}</Text>
            </View>
          </View>

          {/* New FAQ */}
          <Pressable onPress={openCreate} style={styles.newBtnWrap}>
            <LinearGradient
              colors={[theme.primary, theme.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newBtn}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.newBtnText}>New FAQ</Text>
            </LinearGradient>
          </Pressable>

          {/* List */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.emptyTitle}>Loading FAQs…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <HelpCircle size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable style={styles.actionBtn} onPress={fetchFaqs}>
                <Text style={styles.actionBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : faqs.length === 0 ? (
            <View style={styles.emptyCard}>
              <HelpCircle size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No FAQs yet. Add one to get started.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {faqs.map((faq) => (
                <View key={faq.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{faq.question}</Text>
                  <Text style={styles.itemDesc}>{faq.answer}</Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemMetaText}>Added {formatFaqDate(faq.createdAt)} by {faq.createdBy}</Text>
                  </View>
                  <View style={styles.itemActionsRow}>
                    <Pressable style={styles.actionBtn} onPress={() => openEdit(faq)}>
                      <Pencil size={13} color={theme.text} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.actionBtnDelete]} onPress={() => setDeleteId(faq.id)}>
                      <Trash2 size={13} color="#ef4444" />
                      <Text style={[styles.actionBtnText, styles.actionBtnDeleteText]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Create Modal */}
      <Modal visible={isCreating} animationType="fade" transparent onRequestClose={closeCreate}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>New FAQ</Text>
                <Pressable onPress={closeCreate} hitSlop={8}>
                  <X size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Question *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter the question"
                  placeholderTextColor={theme.tertiary}
                  value={createForm.question}
                  onChangeText={(text) => setCreateForm({ ...createForm, question: text })}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Answer *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Enter the answer"
                  placeholderTextColor={theme.tertiary}
                  value={createForm.answer}
                  onChangeText={(text) => setCreateForm({ ...createForm, answer: text })}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalFooterRow}>
                <Pressable style={styles.secondaryBtn} onPress={closeCreate}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={saveCreate} disabled={saving}>
                  <CheckCircle size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save FAQ'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingFaq} animationType="fade" transparent onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit FAQ</Text>
                <Pressable onPress={closeEdit} hitSlop={8}>
                  <X size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Question *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.question}
                  onChangeText={(text) => setEditForm({ ...editForm, question: text })}
                  placeholderTextColor={theme.tertiary}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Answer *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={editForm.answer}
                  onChangeText={(text) => setEditForm({ ...editForm, answer: text })}
                  placeholderTextColor={theme.tertiary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalFooterRow}>
                <Pressable style={styles.secondaryBtn} onPress={closeEdit}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={saveEdit} disabled={saving}>
                  <CheckCircle size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={deleteId !== null} animationType="fade" transparent onRequestClose={() => setDeleteId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={[styles.confirmIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Trash2 size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete FAQ?</Text>
            <Text style={styles.confirmDescription}>
              Delete this question and answer permanently? This can&apos;t be undone.
            </Text>
            <View style={styles.confirmActionsRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                <Trash2 size={16} color="#ffffff" />
                <Text style={styles.confirmBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <NavDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavPress={handleNavPress}
        onLogout={handleLogout}
        theme={theme}
        styles={styles}
        adminName={adminName}
        adminRole={adminRole}
        adminDepartmentName={adminDepartmentName}
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

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  adminName,
  adminRole,
  adminDepartmentName,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
  adminRole: string;
  adminDepartmentName: string;
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
            <Text style={styles.drawerCollege}>{adminDepartmentName}</Text>
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
          <Text style={styles.confirmDescription}>
            Are you sure you want to log out? Any unsaved changes will be lost.
          </Text>
          <View style={styles.confirmActionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.deleteConfirmBtn} onPress={onConfirm}>
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

    // New FAQ button
    newBtnWrap: { alignSelf: 'flex-start' },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 16,
    },
    newBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

    // List / item cards
    list: { gap: 12 },
    itemCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    itemTitle: { fontSize: 15, fontWeight: '700', color: theme.text, lineHeight: 20 },
    itemDesc: { fontSize: 13, color: theme.subtext, lineHeight: 19 },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    itemMetaText: { fontSize: 11, color: theme.tertiary },
    itemActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: theme.text },
    actionBtnDelete: { borderColor: 'rgba(239, 68, 68, 0.4)' },
    actionBtnDeleteText: { color: '#ef4444' },

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
    emptyTitle: { fontSize: 13, color: theme.tertiary, textAlign: 'center' },

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

    // Modal shared
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 20,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: theme.text },

    // Form modal
    formModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
    },
    formField: { gap: 6, marginBottom: 14 },
    formLabel: { fontSize: 12, fontWeight: '700', color: theme.subtext, marginBottom: 6 },
    formInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      color: theme.text,
      backgroundColor: theme.background,
      fontSize: 13,
    },
    formTextarea: { minHeight: 110, paddingTop: 11 },

    modalFooterRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    secondaryBtn: {
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryBtnText: { fontSize: 13, fontWeight: '700', color: theme.text },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

    // Confirm modal (shared card look)
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
      marginBottom: 16,
    },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    confirmDescription: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
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
    deleteConfirmBtn: {
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
