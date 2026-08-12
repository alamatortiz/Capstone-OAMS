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
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

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

type DocStatus = 'active' | 'inactive';
type RecipientType = 'students' | 'faculty' | 'both';

interface Requirement {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  processingTime: string;
  status: DocStatus;
  isCrossCollege: boolean;
  recipientType: RecipientType;
  requiresCoding: boolean;
  deptAbbrev: string;
  requirementCount: number;
}

interface ServiceStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
}

interface ServiceType {
  id: string;
  name: string;
  description: string;
  isCrossCollege: boolean;
  deptAbbrev: string;
  locationId: string | null;
  locationName: string | null;
}

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'READ';

interface AuditLog {
  id: string;
  action: AuditAction;
  adminName: string;
  adminEmail: string;
  targetTable: string | null;
  targetRecordId: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  timestamp: string;
}

interface LocationOption {
  id: string;
  name: string;
  isGlobal: boolean;
}

const STATUS_FILTERS: { value: 'all' | DocStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const AUDIT_ACTION_FILTERS: { value: 'all' | AuditAction; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'READ', label: 'Read' },
];

const AUDIT_TINTS: Record<AuditAction, string> = {
  CREATE: '#22c55e',
  UPDATE: '#60a5fa',
  DELETE: '#f87171',
  LOGIN: '#c084fc',
  LOGOUT: '#a78bfa',
  EXPORT: '#fbbf24',
  READ: '#2dd4bf',
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

const TABS = [
  { key: 'documents', label: 'Document Settings' },
  { key: 'services', label: 'Service Settings' },
  { key: 'audit', label: 'Audit Logs' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

type ActivePicker = 'docStatus' | 'docRecipient' | 'serviceLocation' | null;
type DeleteTarget = { type: 'document' | 'service'; id: string; name: string } | null;

const BLANK_DOC_FORM = {
  name: '',
  description: '',
  processingTime: '',
  status: 'active' as DocStatus,
  isCrossCollege: false,
  recipientType: 'students' as RecipientType,
  requiresCoding: false,
};

const BLANK_SERVICE_FORM = {
  name: '',
  description: '',
  isCrossCollege: false,
  locationId: '',
  otherLocationName: '',
};

const BLANK_REQ_FORM = { name: '', description: '', isMandatory: true };
const BLANK_STEP_FORM = { title: '', description: '' };

function genId() {
  return String(Date.now()) + Math.random().toString(36).slice(2, 6);
}

function formatTargetLabel(log: AuditLog) {
  if (!log.targetTable) return 'System';
  const tableMap: Record<string, string> = {
    document_services: 'Document Type',
    services: 'Service Type',
    users: 'User Account',
    students: 'Student',
    faculty: 'Faculty',
  };
  const label = tableMap[log.targetTable] || log.targetTable;
  return log.targetRecordId ? `${label} #${log.targetRecordId}` : label;
}

function formatChangeSummary(log: AuditLog) {
  if (log.action === 'CREATE' && log.newValues) {
    const v = log.newValues;
    return `Created: ${v.name || ''}${v.status ? ` (${v.status})` : ''}`;
  }
  if (log.action === 'UPDATE' && log.oldValues && log.newValues) {
    const o = log.oldValues;
    const n = log.newValues;
    const parts: string[] = [];
    if (o.name !== n.name) parts.push(`name: "${o.name}" -> "${n.name}"`);
    if (o.status !== n.status) parts.push(`status: ${o.status} -> ${n.status}`);
    return parts.length ? parts.join(', ') : 'Updated record';
  }
  if (log.action === 'DELETE' && log.oldValues) {
    return `Deleted: ${log.oldValues.name || 'record'}`;
  }
  return '';
}

export default function AdminDataManagementScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('documents');

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [docStatusFilter, setDocStatusFilter] = useState<'all' | DocStatus>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<'all' | AuditAction>('all');

  // Document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState(BLANK_DOC_FORM);
  const [docRequirements, setDocRequirements] = useState<Requirement[]>([]);
  const [docReqForm, setDocReqForm] = useState(BLANK_REQ_FORM);
  const [docReqLoading, setDocReqLoading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState(BLANK_SERVICE_FORM);
  const [serviceRequirements, setServiceRequirements] = useState<Requirement[]>([]);
  const [serviceSteps, setServiceSteps] = useState<ServiceStep[]>([]);
  const [svcReqForm, setSvcReqForm] = useState(BLANK_REQ_FORM);
  const [svcStepForm, setSvcStepForm] = useState(BLANK_STEP_FORM);
  const [svcReqLoading, setSvcReqLoading] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const router = useRouter();
  const { user, logout } = useAuth();
  const adminName = user?.name ?? 'Admin';
  const adminRole = 'Admin';
  const adminDepartmentName = user?.departmentName ?? 'Your Department';
  const adminDepartmentAbbrev = user?.departmentAbbrev ?? '';
  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const fetchDocumentTypes = useCallback(async (status: 'all' | DocStatus = 'all') => {
    setDocLoading(true);
    setDocError(null);
    try {
      const params = status !== 'all' ? { status } : {};
      const { data } = await api.get('/admin/data-management/document-types', { params });
      setDocumentTypes(data.documentTypes ?? []);
    } catch (err) {
      console.error('Failed to load document types:', err);
      setDocError('Failed to load document types.');
    } finally {
      setDocLoading(false);
    }
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    setServiceLoading(true);
    setServiceError(null);
    try {
      const { data } = await api.get('/admin/data-management/service-types');
      setServiceTypes(data.serviceTypes ?? []);
    } catch (err) {
      console.error('Failed to load service types:', err);
      setServiceError('Failed to load services.');
    } finally {
      setServiceLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/locations');
      setLocations(data.locations ?? []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (action: 'all' | AuditAction = 'all') => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = action !== 'all' ? { action } : {};
      const { data } = await api.get('/admin/data-management/audit-logs', { params });
      setAuditLogs(data.auditLogs ?? []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditError('Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') fetchDocumentTypes(docStatusFilter);
  }, [activeTab, docStatusFilter, fetchDocumentTypes]);

  useEffect(() => {
    if (activeTab === 'services') {
      fetchServiceTypes();
      fetchLocations();
    }
  }, [activeTab, fetchServiceTypes, fetchLocations]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs(auditActionFilter);
  }, [activeTab, auditActionFilter, fetchAuditLogs]);

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

  // ── Document handlers ────────────────────────────────────────────────
  const openAddDocModal = () => {
    setEditingDocId(null);
    setDocForm(BLANK_DOC_FORM);
    setDocRequirements([]);
    setDocReqForm(BLANK_REQ_FORM);
    setShowDocModal(true);
  };

  const openEditDocModal = async (doc: DocumentType) => {
    setEditingDocId(doc.id);
    setDocForm({
      name: doc.name,
      description: doc.description,
      processingTime: doc.processingTime,
      status: doc.status,
      isCrossCollege: doc.isCrossCollege,
      recipientType: doc.recipientType,
      requiresCoding: doc.requiresCoding,
    });
    setDocRequirements([]);
    setDocReqForm(BLANK_REQ_FORM);
    setShowDocModal(true);

    setDocReqLoading(true);
    try {
      const { data } = await api.get(`/admin/data-management/document-types/${doc.id}/requirements`);
      setDocRequirements(data.requirements ?? []);
    } catch (err) {
      console.error('Failed to load requirements:', err);
      Alert.alert('Error', 'Failed to load requirements.');
    } finally {
      setDocReqLoading(false);
    }
  };

  const closeDocModal = () => {
    setShowDocModal(false);
    setEditingDocId(null);
    setDocForm(BLANK_DOC_FORM);
    setDocRequirements([]);
    setDocReqForm(BLANK_REQ_FORM);
  };

  const addDocRequirement = () => {
    if (!docReqForm.name.trim()) return Alert.alert('Missing information', 'Requirement name is required.');
    setDocRequirements((prev) => [...prev, { ...docReqForm, id: genId() }]);
    setDocReqForm(BLANK_REQ_FORM);
  };
  const removeDocRequirement = (idx: number) => setDocRequirements((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveDocument = async () => {
    const { name, description, processingTime } = docForm;
    if (!name || !description || !processingTime) {
      Alert.alert('Missing information', 'Please fill in all required fields.');
      return;
    }
    setDocSaving(true);
    try {
      const payload = {
        name,
        description,
        processingTime,
        status: docForm.status,
        isCrossCollege: docForm.isCrossCollege,
        recipientType: docForm.recipientType,
        requiresCoding: docForm.requiresCoding,
        requirements: docRequirements.map((r) => ({
          name: r.name,
          description: r.description || '',
          isMandatory: r.isMandatory !== false,
        })),
      };

      if (editingDocId) {
        await api.put(`/admin/data-management/document-types/${editingDocId}`, payload);
        Alert.alert('Success', 'Document type updated.');
      } else {
        await api.post('/admin/data-management/document-types', payload);
        Alert.alert('Success', 'Document type created.');
      }
      closeDocModal();
      fetchDocumentTypes(docStatusFilter);
    } catch (err) {
      console.error('Failed to save document type:', err);
      Alert.alert('Error', 'Failed to save document type.');
    } finally {
      setDocSaving(false);
    }
  };

  // ── Service handlers ─────────────────────────────────────────────────
  const openAddServiceModal = () => {
    setEditingServiceId(null);
    setServiceForm(BLANK_SERVICE_FORM);
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm(BLANK_REQ_FORM);
    setSvcStepForm(BLANK_STEP_FORM);
    setShowServiceModal(true);
  };

  const openEditServiceModal = async (s: ServiceType) => {
    setEditingServiceId(s.id);
    setServiceForm({
      name: s.name,
      description: s.description || '',
      isCrossCollege: s.isCrossCollege,
      locationId: s.locationId ? String(s.locationId) : '',
      otherLocationName: '',
    });
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm(BLANK_REQ_FORM);
    setSvcStepForm(BLANK_STEP_FORM);
    setShowServiceModal(true);

    setSvcReqLoading(true);
    try {
      const [reqRes, stepRes] = await Promise.all([
        api.get(`/admin/data-management/service-types/${s.id}/requirements`),
        api.get(`/admin/data-management/service-types/${s.id}/steps`),
      ]);
      setServiceRequirements(reqRes.data.requirements ?? []);
      setServiceSteps(stepRes.data.steps ?? []);
    } catch (err) {
      console.error('Failed to load service details:', err);
      Alert.alert('Error', 'Failed to load service details.');
    } finally {
      setSvcReqLoading(false);
    }
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingServiceId(null);
    setServiceForm(BLANK_SERVICE_FORM);
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm(BLANK_REQ_FORM);
    setSvcStepForm(BLANK_STEP_FORM);
  };

  const addServiceRequirement = () => {
    if (!svcReqForm.name.trim()) return Alert.alert('Missing information', 'Requirement name is required.');
    setServiceRequirements((prev) => [...prev, { ...svcReqForm, id: genId() }]);
    setSvcReqForm(BLANK_REQ_FORM);
  };
  const removeServiceRequirement = (idx: number) => setServiceRequirements((prev) => prev.filter((_, i) => i !== idx));

  const addServiceStep = () => {
    if (!svcStepForm.title.trim()) return Alert.alert('Missing information', 'Step title is required.');
    setServiceSteps((prev) => [...prev, { ...svcStepForm, id: genId(), stepNumber: prev.length + 1 }]);
    setSvcStepForm(BLANK_STEP_FORM);
  };
  const removeServiceStep = (idx: number) =>
    setServiceSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })));

  const handleSaveService = async () => {
    const { name, locationId, otherLocationName } = serviceForm;
    if (!name) {
      Alert.alert('Missing information', 'Service name is required.');
      return;
    }
    if (locationId === '__other__' && !otherLocationName.trim()) {
      Alert.alert('Missing information', 'Please type a location name.');
      return;
    }
    setServiceSaving(true);
    try {
      let finalLocationId: string | null = locationId || null;
      if (finalLocationId === '__other__') {
        const { data } = await api.post('/admin/locations', { name: otherLocationName.trim() });
        finalLocationId = String(data.id);
        setLocations((prev) => [...prev, data]);
      }

      const payload = {
        name,
        description: serviceForm.description,
        isCrossCollege: serviceForm.isCrossCollege,
        locationId: finalLocationId,
      };

      let serviceId = editingServiceId;
      if (editingServiceId) {
        await api.put(`/admin/data-management/service-types/${editingServiceId}`, payload);
        Alert.alert('Success', 'Service updated.');
      } else {
        const { data } = await api.post('/admin/data-management/service-types', payload);
        serviceId = String(data.id);
        Alert.alert('Success', 'Service created.');
      }

      await Promise.all([
        api.put(`/admin/data-management/service-types/${serviceId}/requirements`, {
          requirements: serviceRequirements.map((r) => ({
            name: r.name,
            description: r.description || '',
            isMandatory: r.isMandatory !== false,
          })),
        }),
        api.put(`/admin/data-management/service-types/${serviceId}/steps`, {
          steps: serviceSteps.map((s) => ({
            stepNumber: s.stepNumber,
            title: s.title,
            description: s.description || '',
          })),
        }),
      ]);

      closeServiceModal();
      fetchServiceTypes();
    } catch (err) {
      console.error('Failed to save service:', err);
      Alert.alert('Error', 'Failed to save service.');
    } finally {
      setServiceSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const runDeleteAction = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'document') {
        await api.delete(`/admin/data-management/document-types/${deleteTarget.id}`);
        Alert.alert('Success', 'Document type deleted.');
        fetchDocumentTypes(docStatusFilter);
      } else {
        await api.delete(`/admin/data-management/service-types/${deleteTarget.id}`);
        Alert.alert('Success', 'Service deleted.');
        fetchServiceTypes();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      Alert.alert('Error', deleteTarget.type === 'document' ? 'Failed to delete document type.' : 'Failed to delete service.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExportLogs = () => Alert.alert('Success', 'Logs exported successfully.');

  // ── Derived (server already filters by status/action) ──────────────────
  const filteredDocs = documentTypes;
  const filteredLogs = auditLogs;

  const pickerConfig = (() => {
    switch (activePicker) {
      case 'docStatus':
        return {
          title: 'Select Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          value: docForm.status,
          onSelect: (v: string) => setDocForm((p) => ({ ...p, status: v as DocStatus })),
        };
      case 'docRecipient':
        return {
          title: 'Available To',
          options: [
            { value: 'students', label: 'Students' },
            { value: 'faculty', label: 'Faculty' },
            { value: 'both', label: 'Both' },
          ],
          value: docForm.recipientType,
          onSelect: (v: string) => setDocForm((p) => ({ ...p, recipientType: v as RecipientType })),
        };
      case 'serviceLocation':
        return {
          title: 'Select Location',
          options: [
            { value: '', label: 'No specific location' },
            ...locations.map((l) => ({ value: l.id, label: l.isGlobal ? `${l.name} (Shared)` : l.name })),
            { value: '__other__', label: 'Other (type your own)…' },
          ],
          value: serviceForm.locationId,
          onSelect: (v: string) => setServiceForm((p) => ({ ...p, locationId: v })),
        };
      default:
        return null;
    }
  })();

  const confirmMeta = deleteTarget && {
    title: deleteTarget.type === 'document' ? 'Delete Document Type?' : 'Delete Service?',
    description: `Delete ${deleteTarget.name}? This action cannot be undone.`,
    confirmLabel: 'Delete',
    icon: 'trash-outline' as IoniconName,
    color: '#ef4444',
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
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title (mirrors PageHeader on the web: gradient icon box + title/subtitle, no banner) */}
          <View style={styles.titleRow}>
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <Ionicons name="server-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Data Management</Text>
              <Text style={styles.pageSubtitle}>
                {adminDepartmentName} ({adminDepartmentAbbrev}) — Configure document types and queue services
              </Text>
            </View>
          </View>

          {/* Tabs container (mirrors .adm-tabs-container / .adm-tabs-bar: 3-column row, active tab raised) */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsBar}>
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Document Types */}
            {activeTab === 'documents' && (
            <View style={styles.tabContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitleText}>Document Type Management</Text>
                <Text style={styles.cardSubtitleText}>
                  Configure available document types and requirements for {adminDepartmentAbbrev}
                </Text>
              </View>
              <Pressable onPress={openAddDocModal}>
                <LinearGradient colors={[theme.primary, theme.success]} style={styles.addBtnFull}>
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addBtnFullText}>Add Document Type</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.filterPillsRow}>
                {STATUS_FILTERS.map((f) => {
                  const active = docStatusFilter === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => setDocStatusFilter(f.value)}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {docLoading ? (
                <View style={styles.emptyCard}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={styles.emptyTitle}>Loading document types…</Text>
                </View>
              ) : docError ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>{docError}</Text>
                  <Pressable style={styles.filterPill} onPress={() => fetchDocumentTypes(docStatusFilter)}>
                    <Text style={styles.filterPillTextActive}>Retry</Text>
                  </Pressable>
                </View>
              ) : filteredDocs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No document types found. Add one to get started.</Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {filteredDocs.map((doc) => (
                    <View key={doc.id} style={styles.itemCard}>
                      <View style={styles.itemCardTop}>
                        <View style={styles.itemMain}>
                          <Text style={styles.itemName}>{doc.name}</Text>
                          <View style={styles.itemBadgesRow}>
                            <View style={styles.badgeDept}>
                              <Text style={styles.badgeDeptText}>{doc.deptAbbrev}</Text>
                            </View>
                            {doc.isCrossCollege && (
                              <View style={styles.badgeGlobal}>
                                <Text style={styles.badgeGlobalText}>Cross-College</Text>
                              </View>
                            )}
                            <View style={styles.badgeRecipient}>
                              <Text style={styles.badgeRecipientText}>{doc.recipientType}</Text>
                            </View>
                            {doc.requiresCoding && (
                              <View style={styles.badgeGlobal}>
                                <Text style={styles.badgeGlobalText}>Requires Coding</Text>
                              </View>
                            )}
                            <View style={doc.status === 'active' ? styles.badgeStatusActive : styles.badgeStatusInactive}>
                              <Text
                                style={
                                  doc.status === 'active' ? styles.badgeStatusActiveText : styles.badgeStatusInactiveText
                                }
                              >
                                {doc.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.itemDesc}>{doc.description}</Text>
                          <View style={styles.itemMetaRow}>
                            <Text style={styles.itemMetaText}>Processing: {doc.processingTime}</Text>
                            <Text style={styles.itemMetaText}>
                              {doc.requirementCount} requirement{doc.requirementCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.itemActionsRow}>
                          <Pressable
                            style={[styles.iconActionBtn, styles.iconActionBtnEdit]}
                            onPress={() => openEditDocModal(doc)}
                            hitSlop={6}
                          >
                            <Ionicons name="create-outline" size={15} color="#3b82f6" />
                          </Pressable>
                          <Pressable
                            style={[styles.iconActionBtn, styles.iconActionBtnDelete]}
                            onPress={() => setDeleteTarget({ type: 'document', id: doc.id, name: doc.name })}
                            hitSlop={6}
                          >
                            <Ionicons name="trash-outline" size={15} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

            {/* Service Settings */}
            {activeTab === 'services' && (
            <View style={styles.tabContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitleText}>Service Configuration</Text>
                <Text style={styles.cardSubtitleText}>Manage queue services for {adminDepartmentAbbrev}</Text>
              </View>
              <Pressable onPress={openAddServiceModal}>
                <LinearGradient colors={[theme.primary, theme.success]} style={styles.addBtnFull}>
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addBtnFullText}>Add Service</Text>
                </LinearGradient>
              </Pressable>

              {serviceLoading ? (
                <View style={styles.emptyCard}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={styles.emptyTitle}>Loading services…</Text>
                </View>
              ) : serviceError ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>{serviceError}</Text>
                  <Pressable style={styles.filterPill} onPress={fetchServiceTypes}>
                    <Text style={styles.filterPillTextActive}>Retry</Text>
                  </Pressable>
                </View>
              ) : serviceTypes.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No services found. Add one to get started.</Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {serviceTypes.map((s) => (
                    <View key={s.id} style={styles.itemCard}>
                      <View style={styles.itemCardTop}>
                        <View style={styles.itemMain}>
                          <Text style={styles.itemName}>{s.name}</Text>
                          <View style={styles.itemBadgesRow}>
                            <View style={styles.badgeDept}>
                              <Text style={styles.badgeDeptText}>{s.deptAbbrev}</Text>
                            </View>
                            {s.isCrossCollege && (
                              <View style={styles.badgeGlobal}>
                                <Text style={styles.badgeGlobalText}>Cross-College</Text>
                              </View>
                            )}
                          </View>
                          {!!s.description && <Text style={styles.itemDesc}>{s.description}</Text>}
                        </View>
                        <View style={styles.itemActionsRow}>
                          <Pressable
                            style={[styles.iconActionBtn, styles.iconActionBtnEdit]}
                            onPress={() => openEditServiceModal(s)}
                            hitSlop={6}
                          >
                            <Ionicons name="create-outline" size={15} color="#3b82f6" />
                          </Pressable>
                          <Pressable
                            style={[styles.iconActionBtn, styles.iconActionBtnDelete]}
                            onPress={() => setDeleteTarget({ type: 'service', id: s.id, name: s.name })}
                            hitSlop={6}
                          >
                            <Ionicons name="trash-outline" size={15} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

            {/* Audit Logs */}
            {activeTab === 'audit' && (
            <View style={styles.tabContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitleText}>System Audit Logs</Text>
                <Text style={styles.cardSubtitleText}>Track all administrative actions for {adminDepartmentAbbrev}</Text>
              </View>
              <Pressable style={styles.exportBtn} onPress={handleExportLogs}>
                <Ionicons name="download-outline" size={14} color={theme.text} />
                <Text style={styles.exportBtnText}>Export Logs</Text>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.auditFilterScroll}>
                <View style={styles.auditFilterRow}>
                  {AUDIT_ACTION_FILTERS.map((f) => {
                    const active = auditActionFilter === f.value;
                    const tint = f.value === 'all' ? theme.primary : AUDIT_TINTS[f.value];
                    return (
                      <Pressable
                        key={f.value}
                        style={[styles.auditPill, active && { borderBottomColor: tint }]}
                        onPress={() => setAuditActionFilter(f.value)}
                      >
                        <Text style={[styles.auditPillText, active && { color: tint }]}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {auditLoading ? (
                <View style={styles.emptyCard}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={styles.emptyTitle}>Loading audit logs…</Text>
                </View>
              ) : auditError ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="alert-circle-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>{auditError}</Text>
                  <Pressable style={styles.filterPill} onPress={() => fetchAuditLogs(auditActionFilter)}>
                    <Text style={styles.filterPillTextActive}>Retry</Text>
                  </Pressable>
                </View>
              ) : filteredLogs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="reload-circle-outline" size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No audit log entries found.</Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {filteredLogs.map((log) => {
                    const tint = AUDIT_TINTS[log.action];
                    const summary = formatChangeSummary(log);
                    return (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logTopRow}>
                          <View style={[styles.logBadge, { backgroundColor: `${tint}26`, borderColor: `${tint}59` }]}>
                            <Text style={[styles.logBadgeText, { color: tint }]}>{log.action}</Text>
                          </View>
                          <Text style={styles.logUser}>
                            {log.adminName} ({log.adminEmail})
                          </Text>
                        </View>
                        <Text style={styles.logTarget}>{formatTargetLabel(log)}</Text>
                        {!!summary && <Text style={styles.logDetails}>{summary}</Text>}
                        <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                      </View>
                    );
                  })}
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
        adminDepartmentName={adminDepartmentName}
      />

      {/* Document Add/Edit Modal */}
      <Modal visible={showDocModal} animationType="fade" transparent onRequestClose={closeDocModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formModalTitle}>{editingDocId ? 'Edit Document Type' : 'Add Document Type'}</Text>
                <Text style={styles.formModalSubtitle}>
                  {editingDocId ? 'Update document type details and requirements' : 'Create a new document type for your department'}
                </Text>
              </View>
              <Pressable onPress={closeDocModal} hitSlop={8}>
                <Ionicons name="close-outline" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formModalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Document Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Certificate of Grades"
                  placeholderTextColor={theme.tertiary}
                  value={docForm.name}
                  onChangeText={(v) => setDocForm((p) => ({ ...p, name: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Brief description of the document"
                  placeholderTextColor={theme.tertiary}
                  multiline
                  value={docForm.description}
                  onChangeText={(v) => setDocForm((p) => ({ ...p, description: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Processing Time *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 3-5 business days"
                  placeholderTextColor={theme.tertiary}
                  value={docForm.processingTime}
                  onChangeText={(v) => setDocForm((p) => ({ ...p, processingTime: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status *</Text>
                <Pressable style={styles.formSelect} onPress={() => setActivePicker('docStatus')}>
                  <Text style={styles.formSelectText}>{docForm.status === 'active' ? 'Active' : 'Inactive'}</Text>
                  <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
                </Pressable>
              </View>
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setDocForm((p) => ({ ...p, isCrossCollege: !p.isCrossCollege }))}
              >
                <Ionicons
                  name={docForm.isCrossCollege ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={docForm.isCrossCollege ? theme.primary : theme.tertiary}
                />
                <Text style={styles.checkboxLabel}>Share with all colleges</Text>
              </Pressable>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Available To</Text>
                <Pressable style={styles.formSelect} onPress={() => setActivePicker('docRecipient')}>
                  <Text style={styles.formSelectText}>
                    {docForm.recipientType === 'students' ? 'Students' : docForm.recipientType === 'faculty' ? 'Faculty' : 'Both'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
                </Pressable>
              </View>
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setDocForm((p) => ({ ...p, requiresCoding: !p.requiresCoding }))}
              >
                <Ionicons
                  name={docForm.requiresCoding ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={docForm.requiresCoding ? theme.primary : theme.tertiary}
                />
                <Text style={styles.checkboxLabel}>Requires an official code (dean-sanctioned) before release</Text>
              </Pressable>

              {/* Requirements */}
              <View style={styles.reqSection}>
                <Text style={styles.reqTitle}>Document Requirements</Text>
                <Text style={styles.reqSubtitle}>List what students need to submit for this document type</Text>

                {docReqLoading && <ActivityIndicator color={theme.primary} />}

                {!docReqLoading && docRequirements.length > 0 && (
                  <View style={styles.reqList}>
                    {docRequirements.map((req, idx) => (
                      <View key={req.id} style={styles.reqItem}>
                        <View style={styles.reqItemMain}>
                          <View style={styles.reqItemTopRow}>
                            <Text style={styles.reqItemName}>{req.name}</Text>
                            <View style={req.isMandatory ? styles.badgeMandatory : styles.badgeOptional}>
                              <Text style={req.isMandatory ? styles.badgeMandatoryText : styles.badgeOptionalText}>
                                {req.isMandatory ? 'Required' : 'Optional'}
                              </Text>
                            </View>
                          </View>
                          {!!req.description && <Text style={styles.reqItemDesc}>{req.description}</Text>}
                        </View>
                        <Pressable onPress={() => removeDocRequirement(idx)} hitSlop={6}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.reqAddForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Requirement name *"
                    placeholderTextColor={theme.tertiary}
                    value={docReqForm.name}
                    onChangeText={(v) => setDocReqForm((p) => ({ ...p, name: v }))}
                  />
                  <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    placeholder="Description (optional)"
                    placeholderTextColor={theme.tertiary}
                    value={docReqForm.description}
                    onChangeText={(v) => setDocReqForm((p) => ({ ...p, description: v }))}
                  />
                  <Pressable
                    style={[styles.checkboxRow, { marginTop: 8 }]}
                    onPress={() => setDocReqForm((p) => ({ ...p, isMandatory: !p.isMandatory }))}
                  >
                    <Ionicons
                      name={docReqForm.isMandatory ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={docReqForm.isMandatory ? theme.primary : theme.tertiary}
                    />
                    <Text style={styles.checkboxLabel}>Mandatory</Text>
                  </Pressable>
                  <Pressable style={styles.reqAddBtn} onPress={addDocRequirement}>
                    <Ionicons name="add" size={14} color={theme.primary} />
                    <Text style={styles.reqAddBtnText}>Add Requirement</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.formModalFooter}>
              <Pressable style={styles.cancelBtn} onPress={closeDocModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={handleSaveDocument} disabled={docSaving}>
                <Text style={styles.confirmBtnText}>{docSaving ? 'Saving…' : editingDocId ? 'Update' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Add/Edit Modal */}
      <Modal visible={showServiceModal} animationType="fade" transparent onRequestClose={closeServiceModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formModalTitle}>{editingServiceId ? 'Edit Service' : 'Add Service'}</Text>
                <Text style={styles.formModalSubtitle}>
                  {editingServiceId ? 'Update queue service configuration' : 'Create a new queue service for your department'}
                </Text>
              </View>
              <Pressable onPress={closeServiceModal} hitSlop={8}>
                <Ionicons name="close-outline" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formModalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Enrollment Assistance"
                  placeholderTextColor={theme.tertiary}
                  value={serviceForm.name}
                  onChangeText={(v) => setServiceForm((p) => ({ ...p, name: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Brief description of this service"
                  placeholderTextColor={theme.tertiary}
                  multiline
                  value={serviceForm.description}
                  onChangeText={(v) => setServiceForm((p) => ({ ...p, description: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <Pressable style={styles.formSelect} onPress={() => setActivePicker('serviceLocation')}>
                  <Text style={styles.formSelectText}>
                    {serviceForm.locationId === '__other__'
                      ? 'Other (type your own)…'
                      : locations.find((l) => l.id === serviceForm.locationId)?.name || 'No specific location'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.tertiary} />
                </Pressable>
                {serviceForm.locationId === '__other__' && (
                  <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    placeholder="Type the location name"
                    placeholderTextColor={theme.tertiary}
                    value={serviceForm.otherLocationName}
                    onChangeText={(v) => setServiceForm((p) => ({ ...p, otherLocationName: v }))}
                  />
                )}
              </View>
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setServiceForm((p) => ({ ...p, isCrossCollege: !p.isCrossCollege }))}
              >
                <Ionicons
                  name={serviceForm.isCrossCollege ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={serviceForm.isCrossCollege ? theme.primary : theme.tertiary}
                />
                <Text style={styles.checkboxLabel}>Share with all colleges</Text>
              </Pressable>

              {/* Service Requirements */}
              <View style={styles.reqSection}>
                <Text style={styles.reqTitle}>Service Requirements</Text>
                <Text style={styles.reqSubtitle}>List what students need to bring or prepare</Text>

                {svcReqLoading && <ActivityIndicator color={theme.primary} />}

                {!svcReqLoading && serviceRequirements.length > 0 && (
                  <View style={styles.reqList}>
                    {serviceRequirements.map((req, idx) => (
                      <View key={req.id} style={styles.reqItem}>
                        <View style={styles.reqItemMain}>
                          <View style={styles.reqItemTopRow}>
                            <Text style={styles.reqItemName}>{req.name}</Text>
                            <View style={req.isMandatory ? styles.badgeMandatory : styles.badgeOptional}>
                              <Text style={req.isMandatory ? styles.badgeMandatoryText : styles.badgeOptionalText}>
                                {req.isMandatory ? 'Required' : 'Optional'}
                              </Text>
                            </View>
                          </View>
                          {!!req.description && <Text style={styles.reqItemDesc}>{req.description}</Text>}
                        </View>
                        <Pressable onPress={() => removeServiceRequirement(idx)} hitSlop={6}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.reqAddForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Requirement name *"
                    placeholderTextColor={theme.tertiary}
                    value={svcReqForm.name}
                    onChangeText={(v) => setSvcReqForm((p) => ({ ...p, name: v }))}
                  />
                  <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    placeholder="Description (optional)"
                    placeholderTextColor={theme.tertiary}
                    value={svcReqForm.description}
                    onChangeText={(v) => setSvcReqForm((p) => ({ ...p, description: v }))}
                  />
                  <Pressable
                    style={[styles.checkboxRow, { marginTop: 8 }]}
                    onPress={() => setSvcReqForm((p) => ({ ...p, isMandatory: !p.isMandatory }))}
                  >
                    <Ionicons
                      name={svcReqForm.isMandatory ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={svcReqForm.isMandatory ? theme.primary : theme.tertiary}
                    />
                    <Text style={styles.checkboxLabel}>Mandatory</Text>
                  </Pressable>
                  <Pressable style={styles.reqAddBtn} onPress={addServiceRequirement}>
                    <Ionicons name="add" size={14} color={theme.primary} />
                    <Text style={styles.reqAddBtnText}>Add Requirement</Text>
                  </Pressable>
                </View>
              </View>

              {/* Procedure Steps */}
              <View style={styles.reqSection}>
                <Text style={styles.reqTitle}>Procedure Steps</Text>
                <Text style={styles.reqSubtitle}>Step-by-step process students will follow</Text>

                {!svcReqLoading && serviceSteps.length > 0 && (
                  <View style={styles.reqList}>
                    {serviceSteps.map((step, idx) => (
                      <View key={step.id} style={styles.reqItem}>
                        <View style={styles.reqItemMain}>
                          <View style={styles.reqItemTopRow}>
                            <View style={styles.badgeMandatory}>
                              <Text style={styles.badgeMandatoryText}>Step {step.stepNumber}</Text>
                            </View>
                            <Text style={styles.reqItemName}>{step.title}</Text>
                          </View>
                          {!!step.description && <Text style={styles.reqItemDesc}>{step.description}</Text>}
                        </View>
                        <Pressable onPress={() => removeServiceStep(idx)} hitSlop={6}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.reqAddForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Step title *"
                    placeholderTextColor={theme.tertiary}
                    value={svcStepForm.title}
                    onChangeText={(v) => setSvcStepForm((p) => ({ ...p, title: v }))}
                  />
                  <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    placeholder="Description (optional)"
                    placeholderTextColor={theme.tertiary}
                    value={svcStepForm.description}
                    onChangeText={(v) => setSvcStepForm((p) => ({ ...p, description: v }))}
                  />
                  <Pressable style={styles.reqAddBtn} onPress={addServiceStep}>
                    <Ionicons name="add" size={14} color={theme.primary} />
                    <Text style={styles.reqAddBtnText}>Add Step</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.formModalFooter}>
              <Pressable style={styles.cancelBtn} onPress={closeServiceModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={handleSaveService} disabled={serviceSaving}>
                <Text style={styles.confirmBtnText}>{serviceSaving ? 'Saving…' : editingServiceId ? 'Update' : 'Add Service'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shared picker (status / recipient / location) */}
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

      {/* Delete confirmation */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          {confirmMeta && (
            <View style={styles.confirmModalCard}>
              <View style={[styles.confirmIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name={confirmMeta.icon} size={26} color={confirmMeta.color} />
              </View>
              <Text style={styles.confirmTitle}>{confirmMeta.title}</Text>
              <Text style={styles.confirmDescription}>{confirmMeta.description}</Text>
              <View style={styles.confirmActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, { backgroundColor: confirmMeta.color }]} onPress={runDeleteAction}>
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

    // Title (mirrors .adm-page-header / .adm-title-icon / .adm-page-title / .adm-page-subtitle on the web)
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Tabs container (mirrors .adm-tabs-container / .adm-tabs-bar / .adm-tab-btn: 3-column row, active tab raised)
    tabsContainer: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    tabsBar: {
      flexDirection: 'row',
      gap: 6,
      padding: 8,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 6,
      borderRadius: 10,
    },
    tabBtnActive: {
      backgroundColor: theme.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 1,
    },
    tabBtnText: { fontSize: 12, fontWeight: '500', color: theme.subtext },
    tabBtnTextActive: { color: theme.text, fontWeight: '700' },
    tabContent: { padding: 16, gap: 14 },

    cardHeaderRow: { gap: 3 },
    cardTitleText: { fontSize: 16, fontWeight: '700', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.subtext, lineHeight: 17 },

    addBtnFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 12,
    },
    addBtnFullText: { fontSize: 13.5, fontWeight: '700', color: '#ffffff' },

    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    exportBtnText: { fontSize: 13, fontWeight: '600', color: theme.text },

    // Status filter pills (documents)
    filterPillsRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.border },
    filterPill: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
    filterPillActive: { borderBottomColor: theme.primary },
    filterPillText: { fontSize: 11.5, fontWeight: '600', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },
    filterPillTextActive: { color: theme.primary },

    // Audit action pills
    auditFilterScroll: { flexGrow: 0 },
    auditFilterRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.border },
    auditPill: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
    auditPillText: { fontSize: 11, fontWeight: '700', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },

    emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle: { fontSize: 13, color: theme.tertiary, textAlign: 'center' },

    cardsList: { gap: 12 },

    // Item cards (documents / services)
    itemCard: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, gap: 10 },
    itemCardTop: { flexDirection: 'column' },
    itemMain: { gap: 6 },
    itemName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    itemBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badgeDept: { backgroundColor: 'rgba(20, 184, 166, 0.1)', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.25)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    badgeDeptText: { fontSize: 10, fontWeight: '700', color: '#2dd4bf', textTransform: 'uppercase' },
    badgeGlobal: { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    badgeGlobalText: { fontSize: 10, fontWeight: '700', color: '#818cf8', textTransform: 'uppercase' },
    badgeRecipient: { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    badgeRecipientText: { fontSize: 10, fontWeight: '700', color: '#c084fc', textTransform: 'capitalize' },
    badgeStatusActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.35)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    badgeStatusActiveText: { fontSize: 10, fontWeight: '700', color: '#22c55e', textTransform: 'capitalize' },
    badgeStatusInactive: { backgroundColor: 'rgba(100, 116, 139, 0.12)', borderWidth: 1, borderColor: 'rgba(100, 116, 139, 0.25)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    badgeStatusInactiveText: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'capitalize' },
    itemDesc: { fontSize: 12.5, color: theme.subtext, lineHeight: 18 },
    itemMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    itemMetaText: { fontSize: 11, color: theme.tertiary },
    itemActionsRow: { flexDirection: 'row', gap: 8, alignSelf: 'flex-end' },
    iconActionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    iconActionBtnEdit: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' },
    iconActionBtnDelete: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },

    // Requirements / steps sub-section
    reqSection: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      backgroundColor: theme.background,
    },
    reqTitle: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    reqSubtitle: { fontSize: 11.5, color: theme.tertiary, marginTop: -6 },
    reqList: { gap: 8 },
    reqItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 10,
    },
    reqItemMain: { flex: 1, gap: 3 },
    reqItemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    reqItemName: { fontSize: 13, fontWeight: '600', color: theme.text },
    reqItemDesc: { fontSize: 11.5, color: theme.tertiary },
    badgeMandatory: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
    badgeMandatoryText: { fontSize: 9.5, fontWeight: '700', color: '#60a5fa' },
    badgeOptional: { backgroundColor: 'rgba(100, 116, 139, 0.1)', borderWidth: 1, borderColor: 'rgba(100, 116, 139, 0.2)', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
    badgeOptionalText: { fontSize: 9.5, fontWeight: '700', color: theme.tertiary },
    reqAddForm: { paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border, borderStyle: 'dashed' },
    reqAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: 10,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(34, 197, 94, 0.35)',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
    },
    reqAddBtnText: { fontSize: 12, fontWeight: '700', color: theme.primary },

    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkboxLabel: { fontSize: 13, color: theme.text },

    // Audit log items
    logItem: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, gap: 5 },
    logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    logBadge: { borderWidth: 1, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    logBadgeText: { fontSize: 10, fontWeight: '700' },
    logUser: { fontSize: 12, color: theme.subtext },
    logTarget: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    logDetails: { fontSize: 12, color: theme.subtext },
    logTimestamp: { fontSize: 11, color: theme.tertiary },

    // Add / Edit form modal
    formModalCard: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 16 },
    formModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: theme.border },
    formModalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    formModalSubtitle: { fontSize: 11.5, color: theme.subtext, marginTop: 3 },
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
    formTextarea: { minHeight: 70, textAlignVertical: 'top' },
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
    formSelectText: { fontSize: 13, color: theme.text },
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
