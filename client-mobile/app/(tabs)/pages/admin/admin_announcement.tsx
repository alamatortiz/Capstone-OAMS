import { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');
const editIcon = require('@/assets/edit_icon.png');
const deleteIcon = require('@/assets/delete_icon.png');

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

type AnnouncementType = 'important' | 'event' | 'reminder' | 'general';
type AnnouncementStatus = 'active' | 'archived';

interface AnnouncementAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  date: string;
  isPinned: boolean;
  isReposted: boolean;
  createdBy: string;
  status: AnnouncementStatus;
  attachments: AnnouncementAttachment[];
}

// Mirrors server/middleware/upload.js's allow-list. Mobile still only picks
// one file at a time (no multi-select picker UI here), but that single file
// goes through the same multi-file-capable backend correctly.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
];

// Mirrors admin-announcements.css badge/icon colors (important=red, event=orange,
// reminder=blue, general=gray; pinned announcements override all of these to green).
const TYPE_META: Record<
  AnnouncementType,
  {
    label: string;
    icon: IoniconName;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeColor: string;
    gradient: readonly [string, string];
  }
> = {
  important: {
    label: 'Important',
    icon: 'alert-circle-outline',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeBorder: 'rgba(239, 68, 68, 0.35)',
    badgeColor: '#ef4444',
    gradient: ['#ef4444', '#dc2626'],
  },
  event: {
    label: 'Event',
    icon: 'calendar-outline',
    iconBg: 'rgba(249, 115, 22, 0.15)',
    iconColor: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeBorder: 'rgba(249, 115, 22, 0.35)',
    badgeColor: '#f97316',
    gradient: ['#f97316', '#ea580c'],
  },
  reminder: {
    label: 'Reminder',
    icon: 'notifications-outline',
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    badgeColor: '#3b82f6',
    gradient: ['#3b82f6', '#2563eb'],
  },
  general: {
    label: 'General',
    icon: 'information-circle-outline',
    iconBg: 'rgba(148, 163, 184, 0.15)',
    iconColor: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    badgeBorder: 'rgba(148, 163, 184, 0.35)',
    badgeColor: '#94a3b8',
    gradient: ['#94a3b8', '#64748b'],
  },
};

// Applied instead of TYPE_META when an announcement is pinned -- pinned
// status takes visual priority over type.
const PINNED_META = {
  iconBg: 'rgba(34, 197, 94, 0.15)',
  iconColor: '#22c55e',
  badgeBg: 'rgba(34, 197, 94, 0.15)',
  badgeBorder: 'rgba(34, 197, 94, 0.35)',
  badgeColor: '#22c55e',
  gradient: ['#22c55e', '#16a34a'] as const,
};

type TypeFilter = 'all' | AnnouncementType;
type TabKey = 'active' | 'pinned' | 'unpinned' | 'archived';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'unpinned', label: 'Unpinned' },
  { key: 'archived', label: 'Archived' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'important', label: 'Important' },
  { value: 'event', label: 'Events' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'general', label: 'General' },
];

const TYPE_FORM_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'event', label: 'Event' },
  { value: 'reminder', label: 'Reminder' },
];

const YES_NO_OPTIONS = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
];

const EMPTY_FORM = { title: '', content: '', type: 'general' as AnnouncementType };
const EMPTY_CREATE_FORM = { ...EMPTY_FORM, isPinned: false };

// Single line whose label reflects whether this announcement has ever been
// edited/restored (isReposted, set server-side) -- "Posted" the first time,
// "Reposted" from then on. Matches the web admin/student pages' convention.
const formatPostedLabel = (announcement: { date: string; isReposted: boolean }) => {
  const label = announcement.isReposted ? 'Reposted' : 'Posted';
  const formatted = new Date(announcement.date).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${label}: ${formatted}`;
};

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

// Same drawer list every existing admin screen uses — Announcements is reached
// only via the dashboard stat tile for now, so it isn't added here.
const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'queue', label: 'Queue', icon: 'time-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
];

interface PickerOption {
  value: string;
  label: string;
}

interface PickerState {
  title: string;
  options: PickerOption[];
  currentValue: string;
  onSelect: (value: string) => void;
}

export default function AdminAnnouncementScreen() {
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

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TypeFilter>('all');
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [picker, setPicker] = useState<PickerState | null>(null);

  const [viewingAnnouncement, setViewingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editAttachment, setEditAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createAttachment, setCreateAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/announcements');
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

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
    logout();
    router.replace('/login');
  };

  // ── Derived stats + filtered list (mirrors admin-announcements.jsx) ──
  const stats = {
    total: announcements.filter((a) => a.status === 'active').length,
    pinned: announcements.filter((a) => a.isPinned && a.status === 'active').length,
    important: announcements.filter((a) => a.type === 'important' && a.status === 'active').length,
    archived: announcements.filter((a) => a.status === 'archived').length,
  };

  const getFiltered = (tab: TabKey) => {
    let list = announcements.filter((a) => {
      if (tab === 'archived') return a.status === 'archived';
      if (tab === 'pinned') return a.status === 'active' && a.isPinned;
      if (tab === 'unpinned') return a.status === 'active' && !a.isPinned;
      return a.status === 'active';
    });
    if (selectedType !== 'all') list = list.filter((a) => a.type === selectedType);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.createdBy.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  };

  const list = getFiltered(activeTab);

  const STAT_CARDS: { key: keyof typeof stats; label: string; icon: IoniconName; border: string; color: string }[] = [
    { key: 'total', label: 'Total Active', icon: 'megaphone-outline', border: 'rgba(34, 197, 94, 0.35)', color: theme.primary },
    { key: 'pinned', label: 'Pinned', icon: 'pin-outline', border: 'rgba(34, 197, 94, 0.35)', color: theme.primary },
    { key: 'important', label: 'Important', icon: 'alert-circle-outline', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
    { key: 'archived', label: 'Archived', icon: 'close-outline', border: 'rgba(148, 163, 184, 0.3)', color: theme.tertiary },
  ];

  // ── CRUD handlers (wired to /admin/announcements) ──
  const togglePin = async (id: string) => {
    try {
      const { data } = await api.patch(`/admin/announcements/${id}/pin`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isPinned: data.isPinned } : a)));
    } catch {
      Alert.alert('Error', 'Failed to update pin status.');
    }
  };

  const archiveAnnouncement = async (id: string) => {
    try {
      await api.patch(`/admin/announcements/${id}/archive`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'archived' } : a)));
    } catch {
      Alert.alert('Error', 'Failed to archive announcement.');
    }
  };

  const restoreAnnouncement = async (id: string) => {
    try {
      const { data } = await api.patch(`/admin/announcements/${id}/restore`);
      // Restoring counts as a repost -- move it to the front of the list,
      // matching the web admin page's same treatment.
      setAnnouncements((prev) => {
        const restored = { ...prev.find((a) => a.id === id)!, status: 'active' as const, date: data.date, isReposted: data.isReposted };
        return [restored, ...prev.filter((a) => a.id !== id)];
      });
    } catch {
      Alert.alert('Error', 'Failed to restore announcement.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/announcements/${deleteId}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteId));
    } catch {
      Alert.alert('Error', 'Failed to delete announcement.');
    } finally {
      setDeleteId(null);
    }
  };

  const pickAttachment = async (
    onPicked: (asset: DocumentPicker.DocumentPickerAsset) => void,
    existingCount = 0,
    existingBytes = 0,
  ) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_TYPES });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size != null && asset.size > MAX_FILE_BYTES) {
      Alert.alert('File too large', 'Each file must be 10MB or smaller.');
      return;
    }
    if (existingCount + 1 > MAX_FILES) {
      Alert.alert('Attachment limit reached', `You can attach up to ${MAX_FILES} files.`);
      return;
    }
    if (asset.size != null && existingBytes + asset.size > MAX_TOTAL_BYTES) {
      Alert.alert('Attachment limit reached', 'Adding this file would exceed the combined size limit.');
      return;
    }
    onPicked(asset);
  };

  const removeAttachment = async (announcementId: string, attachmentId: string) => {
    try {
      await api.delete(`/admin/announcements/${announcementId}/attachments/${attachmentId}`);
      const strip = (list?: AnnouncementAttachment[]) => (list ?? []).filter((att) => att.id !== attachmentId);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, attachments: strip(a.attachments) } : a)),
      );
      setEditingAnnouncement((prev) =>
        prev && prev.id === announcementId ? { ...prev, attachments: strip(prev.attachments) } : prev,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to remove attachment.');
    }
  };

  const openEdit = (a: AnnouncementItem) => {
    setEditingAnnouncement(a);
    setEditForm({ title: a.title, content: a.content, type: a.type });
    setEditAttachment(null);
  };
  const closeEdit = () => {
    setEditingAnnouncement(null);
    setEditForm(EMPTY_FORM);
    setEditAttachment(null);
  };
  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!editingAnnouncement) return;
    try {
      let data: any;
      if (editAttachment) {
        const formData = new FormData();
        formData.append('title', editForm.title);
        formData.append('content', editForm.content);
        formData.append('type', editForm.type);
        formData.append('attachments', {
          uri: editAttachment.uri,
          name: editAttachment.name,
          type: editAttachment.mimeType ?? 'application/octet-stream',
        } as any);
        ({ data } = await api.put(`/admin/announcements/${editingAnnouncement.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }));
      } else {
        ({ data } = await api.put(`/admin/announcements/${editingAnnouncement.id}`, {
          title: editForm.title,
          content: editForm.content,
          type: editForm.type,
        }));
      }
      // An edit is a repost -- move it to the front of the list, matching
      // the web admin page's same treatment.
      setAnnouncements((prev) => {
        const existing = prev.find((a) => a.id === editingAnnouncement.id)!;
        const updated = {
          ...existing,
          title: editForm.title,
          content: editForm.content,
          type: editForm.type,
          date: data?.date,
          isReposted: data?.isReposted,
          attachments: data?.attachments ?? existing.attachments,
        };
        return [updated, ...prev.filter((a) => a.id !== editingAnnouncement.id)];
      });
      closeEdit();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update announcement.');
    }
  };

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateAttachment(null);
    setIsCreating(true);
  };
  const closeCreate = () => {
    setIsCreating(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateAttachment(null);
  };
  const saveCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    try {
      let data;
      if (createAttachment) {
        const formData = new FormData();
        formData.append('title', createForm.title);
        formData.append('content', createForm.content);
        formData.append('type', createForm.type);
        formData.append('isPinned', String(createForm.isPinned));
        formData.append('attachments', {
          uri: createAttachment.uri,
          name: createAttachment.name,
          type: createAttachment.mimeType ?? 'application/octet-stream',
        } as any);
        ({ data } = await api.post('/admin/announcements', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }));
      } else {
        ({ data } = await api.post('/admin/announcements', {
          title: createForm.title,
          content: createForm.content,
          type: createForm.type,
          isPinned: createForm.isPinned,
        }));
      }
      setAnnouncements((prev) => [data.announcement, ...prev]);
      closeCreate();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create announcement.');
    }
  };

  const typeFilterLabel = TYPE_FILTER_OPTIONS.find((o) => o.value === selectedType)?.label ?? 'All Types';

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
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <Ionicons name="megaphone-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Announcements Management</Text>
              <Text style={styles.pageSubtitle}>Manage announcements for {adminDepartmentName}</Text>
            </View>
          </View>

          {/* New Announcement */}
          <Pressable onPress={openCreate} style={styles.newBtnWrap}>
            <LinearGradient
              colors={[theme.primary, theme.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newBtn}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.newBtnText}>New Announcement</Text>
            </LinearGradient>
          </Pressable>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {STAT_CARDS.map((stat) => (
              <View key={stat.key} style={[styles.statCard, { borderColor: stat.border }]}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statCardLabel}>{stat.label}</Text>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={[styles.statCardValue, { color: stat.color }]}>{stats[stat.key]}</Text>
              </View>
            ))}
          </View>

          {/* Filters */}
          <View style={styles.card}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color={theme.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search announcements by title, content, or creator..."
                placeholderTextColor={theme.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable
              style={styles.filterSelect}
              onPress={() =>
                setPicker({
                  title: 'Select Type',
                  options: TYPE_FILTER_OPTIONS,
                  currentValue: selectedType,
                  onSelect: (value) => {
                    setSelectedType(value as TypeFilter);
                    setPicker(null);
                  },
                })
              }
            >
              <Text style={styles.filterSelectText} numberOfLines={1}>
                {typeFilterLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.primary} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabsBar}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  {active && <View style={styles.tabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.emptyTitle}>Loading announcements…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable style={styles.actionBtn} onPress={fetchAnnouncements}>
                <Text style={styles.actionBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : list.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="megaphone-outline" size={32} color={theme.tertiary} />
              <Text style={styles.emptyTitle}>No {activeTab} announcements found.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {list.map((a) => {
                const meta = a.isPinned ? { ...TYPE_META[a.type], ...PINNED_META } : TYPE_META[a.type];
                return (
                  <View key={a.id} style={[styles.itemCard, a.isPinned && styles.itemCardPinned]}>
                    <View style={styles.itemTop}>
                      <View style={[styles.itemIcon, { backgroundColor: meta.iconBg }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.iconColor} />
                      </View>
                      <View style={styles.itemBody}>
                        <Text style={styles.itemTitle}>
                          {a.isPinned ? '📌 ' : ''}
                          {a.title}
                        </Text>
                        <View style={styles.itemBadgeRow}>
                          <View style={[styles.badge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
                            <Text style={[styles.badgeText, { color: meta.badgeColor }]}>{meta.label}</Text>
                          </View>
                          {a.attachments?.length > 0 && (
                            <View style={[styles.countBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <Ionicons name="attach-outline" size={11} color={theme.primary} />
                              <Text style={styles.countBadgeText}>
                                {a.attachments.length > 1 ? `${a.attachments.length} Attachments` : 'Attachment'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <Text style={styles.itemDesc} numberOfLines={3}>
                      {a.content}
                    </Text>

                    <View style={styles.itemMetaRow}>
                      <Ionicons name="calendar-outline" size={12} color={theme.tertiary} />
                      <Text style={styles.itemMetaText}>{formatPostedLabel(a)}</Text>
                      <Text style={styles.itemMetaText}>•</Text>
                      <Text style={styles.itemMetaText}>By: {a.createdBy}</Text>
                    </View>

                    <View style={styles.itemActionsRow}>
                      <Pressable style={styles.actionBtn} onPress={() => setViewingAnnouncement(a)}>
                        <Ionicons name="eye-outline" size={13} color={theme.text} />
                        <Text style={styles.actionBtnText}>View</Text>
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => openEdit(a)}>
                        <Image source={editIcon} style={styles.actionBtnImg} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </Pressable>
                      {a.status === 'active' ? (
                        <>
                          <Pressable
                            style={[styles.actionBtn, a.isPinned && styles.actionBtnPinOn]}
                            onPress={() => togglePin(a.id)}
                          >
                            <Ionicons
                              name="pin-outline"
                              size={13}
                              color={a.isPinned ? theme.primary : theme.text}
                            />
                            <Text style={[styles.actionBtnText, a.isPinned && styles.actionBtnPinOnText]}>
                              {a.isPinned ? 'Unpin' : 'Pin'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, styles.actionBtnArchive]}
                            onPress={() => archiveAnnouncement(a.id)}
                          >
                            <Image source={deleteIcon} style={styles.actionBtnImg} />
                            <Text style={[styles.actionBtnText, styles.actionBtnArchiveText]}>Archive</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable
                            style={[styles.actionBtn, styles.actionBtnRestore]}
                            onPress={() => restoreAnnouncement(a.id)}
                          >
                            <Text style={[styles.actionBtnText, styles.actionBtnRestoreText]}>Restore</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, styles.actionBtnDelete]}
                            onPress={() => setDeleteId(a.id)}
                          >
                            <Image source={deleteIcon} style={styles.actionBtnImg} />
                            <Text style={[styles.actionBtnText, styles.actionBtnDeleteText]}>Delete</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
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
        adminName={adminName}
        adminRole={adminRole}
        adminDepartmentName={adminDepartmentName}
      />

      {/* View Modal */}
      <Modal
        visible={!!viewingAnnouncement}
        animationType="fade"
        transparent
        onRequestClose={() => setViewingAnnouncement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewModalCard}>
            {viewingAnnouncement && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>Announcement Details</Text>
                    <Text style={styles.modalDesc}>View complete information about this announcement</Text>
                  </View>
                  <Pressable onPress={() => setViewingAnnouncement(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={theme.subtext} />
                  </Pressable>
                </View>

                <LinearGradient colors={[theme.primary, theme.success]} style={styles.viewBanner}>
                  <Text style={styles.viewBannerTitle}>{viewingAnnouncement.title}</Text>
                  <View style={styles.viewBannerDateRow}>
                    <Ionicons name="calendar-outline" size={13} color="#ffffff" />
                    <Text style={styles.viewBannerDate}>{formatPostedLabel(viewingAnnouncement)}</Text>
                  </View>
                  <View style={styles.viewBannerBadges}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: viewingAnnouncement.isPinned ? PINNED_META.badgeBg : TYPE_META[viewingAnnouncement.type].badgeBg,
                          borderColor: viewingAnnouncement.isPinned ? PINNED_META.badgeBorder : TYPE_META[viewingAnnouncement.type].badgeBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: viewingAnnouncement.isPinned ? PINNED_META.badgeColor : TYPE_META[viewingAnnouncement.type].badgeColor }]}>
                        {TYPE_META[viewingAnnouncement.type].label}
                      </Text>
                    </View>
                    {viewingAnnouncement.isPinned && (
                      <View style={styles.pinnedPill}>
                        <Text style={styles.pinnedPillText}>📌 Pinned</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>

                <Text style={styles.formLabel}>Content</Text>
                <View style={styles.viewBlock}>
                  <Text style={styles.viewBlockText}>{viewingAnnouncement.content}</Text>
                </View>

                <View style={styles.viewGrid}>
                  <View style={styles.viewGridItem}>
                    <Text style={styles.formLabel}>Created By</Text>
                    <Text style={styles.viewValue}>{viewingAnnouncement.createdBy}</Text>
                  </View>
                  <View style={styles.viewGridItem}>
                    <Text style={styles.formLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusPill,
                        viewingAnnouncement.status === 'active'
                          ? styles.statusPillActive
                          : styles.statusPillArchived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          viewingAnnouncement.status === 'active'
                            ? styles.statusPillActiveText
                            : styles.statusPillArchivedText,
                        ]}
                      >
                        {viewingAnnouncement.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalFooterRow}>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => {
                      const a = viewingAnnouncement;
                      setViewingAnnouncement(null);
                      openEdit(a);
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>Edit Announcement</Text>
                  </Pressable>
                  <Pressable style={styles.primaryBtn} onPress={() => setViewingAnnouncement(null)}>
                    <Text style={styles.primaryBtnText}>Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={!!editingAnnouncement}
        animationType="fade"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit Announcement</Text>
                <Pressable onPress={closeEdit} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.title}
                  onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  placeholderTextColor={theme.tertiary}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Content *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={editForm.content}
                  onChangeText={(text) => setEditForm({ ...editForm, content: text })}
                  placeholderTextColor={theme.tertiary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
              <Pressable
                style={styles.filterSelect}
                onPress={() =>
                  setPicker({
                    title: 'Select Type',
                    options: TYPE_FORM_OPTIONS,
                    currentValue: editForm.type,
                    onSelect: (value) => {
                      setEditForm({ ...editForm, type: value as AnnouncementType });
                      setPicker(null);
                    },
                  })
                }
              >
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {TYPE_META[editForm.type].label}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.primary} />
              </Pressable>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>
                  Attachments ({editingAnnouncement?.attachments?.length ?? 0}/{MAX_FILES})
                </Text>
                {editingAnnouncement?.attachments?.map((att) => (
                  <View key={att.id} style={[styles.filterSelect, { marginBottom: 8 }]}>
                    <Text style={styles.filterSelectText} numberOfLines={1}>{att.filename}</Text>
                    <Pressable onPress={() => removeAttachment(editingAnnouncement.id, att.id)} hitSlop={8}>
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={styles.filterSelect}
                  onPress={() =>
                    pickAttachment(
                      setEditAttachment,
                      editingAnnouncement?.attachments?.length ?? 0,
                      (editingAnnouncement?.attachments ?? []).reduce((sum, a) => sum + a.size, 0),
                    )
                  }
                >
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {editAttachment ? editAttachment.name : 'Attach a file'}
                  </Text>
                  <Ionicons name="attach-outline" size={16} color={theme.primary} />
                </Pressable>
                {editAttachment && (
                  <Pressable onPress={() => setEditAttachment(null)}>
                    <Text style={[styles.filterSelectText, { color: '#ef4444', marginTop: 4 }]}>Remove selected file</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.modalFooterRow}>
                <Pressable style={styles.secondaryBtn} onPress={closeEdit}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={saveEdit}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Save Changes</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={isCreating} animationType="fade" transparent onRequestClose={closeCreate}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>New Announcement</Text>
                <Pressable onPress={closeCreate} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter announcement title"
                  placeholderTextColor={theme.tertiary}
                  value={createForm.title}
                  onChangeText={(text) => setCreateForm({ ...createForm, title: text })}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Content *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Enter announcement content"
                  placeholderTextColor={theme.tertiary}
                  value={createForm.content}
                  onChangeText={(text) => setCreateForm({ ...createForm, content: text })}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.formRow}>
                <Pressable
                  style={[styles.filterSelect, styles.formSelectHalf]}
                  onPress={() =>
                    setPicker({
                      title: 'Select Type',
                      options: TYPE_FORM_OPTIONS,
                      currentValue: createForm.type,
                      onSelect: (value) => {
                        setCreateForm({ ...createForm, type: value as AnnouncementType });
                        setPicker(null);
                      },
                    })
                  }
                >
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {TYPE_META[createForm.type].label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.primary} />
                </Pressable>
                <Pressable
                  style={[styles.filterSelect, styles.formSelectHalf]}
                  onPress={() =>
                    setPicker({
                      title: 'Pin this announcement?',
                      options: YES_NO_OPTIONS,
                      currentValue: createForm.isPinned ? 'true' : 'false',
                      onSelect: (value) => {
                        setCreateForm({ ...createForm, isPinned: value === 'true' });
                        setPicker(null);
                      },
                    })
                  }
                >
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {createForm.isPinned ? 'Pinned: Yes' : 'Pinned: No'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.primary} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Attach File (optional)</Text>
                <Pressable style={styles.filterSelect} onPress={() => pickAttachment(setCreateAttachment)}>
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {createAttachment ? createAttachment.name : 'Attach a file'}
                  </Text>
                  <Ionicons name="attach-outline" size={16} color={theme.primary} />
                </Pressable>
                {createAttachment && (
                  <Pressable onPress={() => setCreateAttachment(null)}>
                    <Text style={[styles.filterSelectText, { color: '#ef4444', marginTop: 4 }]}>Remove selected file</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.modalFooterRow}>
                <Pressable style={styles.secondaryBtn} onPress={closeCreate}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={saveCreate}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Save Announcement</Text>
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
              <Ionicons name="trash-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Announcement?</Text>
            <Text style={styles.confirmDescription}>
              Delete this announcement permanently? This can&apos;t be undone.
            </Text>
            <View style={styles.confirmActionsRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Picker modal (type / yes-no selects) */}
      <Modal visible={!!picker} animationType="fade" transparent onRequestClose={() => setPicker(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.confirmTitle}>{picker?.title}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {picker?.options.map((opt) => {
                const selected = opt.value === picker.currentValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => picker.onSelect(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setPicker(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

    // New announcement button
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

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1, marginRight: 6 },
    statCardValue: { fontSize: 24, fontWeight: '800' },

    // Shared card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },

    // Filters
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
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
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
    filterSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },

    // Tabs (underline style, mirrors .ann-tab on web)
    tabsBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },
    tab: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tabTextActive: { color: theme.primary },
    tabIndicator: { marginTop: 8, height: 2, width: '100%', backgroundColor: theme.primary },

    // List / item cards
    list: { gap: 12 },
    itemCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      borderLeftColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    itemCardPinned: { borderLeftColor: theme.primary },
    itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    itemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    itemBody: { flex: 1, gap: 6 },
    itemTitle: { fontSize: 15, fontWeight: '700', color: theme.text, lineHeight: 20 },
    itemBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    countBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.35)',
    },
    countBadgeText: { fontSize: 10, fontWeight: '700', color: theme.primary },
    itemDesc: { fontSize: 13, color: theme.subtext, lineHeight: 19 },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    itemMetaText: { fontSize: 11, color: theme.tertiary },
    itemActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    actionBtnImg: { width: 12, height: 12 },
    actionBtnPinOn: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.45)',
    },
    actionBtnPinOnText: { color: theme.primary },
    actionBtnArchive: {
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    actionBtnArchiveText: { color: '#f59e0b' },
    actionBtnRestore: { borderColor: 'rgba(34, 197, 94, 0.4)' },
    actionBtnRestoreText: { color: theme.primary },
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
    modalHeaderText: { flex: 1, gap: 3 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
    modalDesc: { fontSize: 12, color: theme.tertiary },

    // View modal
    viewModalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 20,
    },
    viewBanner: { borderRadius: 16, padding: 16, marginBottom: 16, gap: 8 },
    viewBannerTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
    viewBannerDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    viewBannerDate: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    viewBannerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    pinnedPill: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    pinnedPillText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    viewBlock: { backgroundColor: theme.background, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 16 },
    viewBlockText: { fontSize: 13, color: theme.text, lineHeight: 20 },
    viewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
    viewGridItem: { flexBasis: '45%', flexGrow: 1, gap: 5 },
    viewValue: { fontSize: 13, fontWeight: '700', color: theme.text },
    statusPill: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
    statusPillActive: { backgroundColor: 'rgba(34, 197, 94, 0.18)' },
    statusPillArchived: { backgroundColor: 'rgba(148, 163, 184, 0.18)' },
    statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    statusPillActiveText: { color: theme.primary },
    statusPillArchivedText: { color: theme.tertiary },

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
    formRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    formSelectHalf: { flex: 1 },

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

    // Confirm / filter modals (shared card look)
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

    // Picker options modal
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
  });
}
