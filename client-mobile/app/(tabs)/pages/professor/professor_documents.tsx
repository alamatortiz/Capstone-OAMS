import { useState, useEffect, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';

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

// ─── Field shapes documented here mirror what Field shapes mirror what
// GET /faculty/my-document-requests and GET /faculty/document-services really
// return (service_name, college, purpose, created_at, status, tracking_number,
// notes, estimated_completion, needed_by) — this screen ports the actual wired
// prof-documents.jsx/.css 1:1: Request Document dialog (type/purpose/needed-by/
// notes), Active/Completed tabs, and the Cancel Request confirm flow. ───
type DocStatus = 'pending' | 'processing' | 'generated' | 'released' | 'claimed' | 'rejected';

interface DocumentRequest {
  id: string;
  type: string;
  college: string;
  purpose: string;
  copies?: number;
  requestDate: string;
  status: DocStatus;
  trackingNumber: string;
  notes?: string;
  estimatedCompletion?: string;
  neededBy?: string;
}

interface DocumentTypeOption {
  id: number;
  name: string;
  processingTime: string;
  requirements: string[];
}

interface NavItem {
  key: string;
  label: string;
  icon: IoniconName;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-outline' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'time-outline' },
];

const STATUS_META: Record<DocStatus, { label: string; bg: string; border: string; color: string; icon: IoniconName }> = {
  pending: { label: 'Pending', bg: 'rgba(251, 191, 36, 0.18)', border: 'rgba(251, 191, 36, 0.35)', color: '#fbbf24', icon: 'time-outline' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)', color: '#60a5fa', icon: 'alert-circle-outline' },
  generated: { label: 'Ready for Pickup', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#5eead4', icon: 'checkmark-circle-outline' },
  released: { label: 'Released', bg: 'rgba(107, 114, 128, 0.18)', border: 'rgba(107, 114, 128, 0.35)', color: '#d1d5db', icon: 'checkmark-circle-outline' },
  claimed: { label: 'Claimed', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5', icon: 'close-circle-outline' },
};

const TABS = ['active', 'completed'] as const;
type TabKey = (typeof TABS)[number];

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildNeededByOptions() {
  const options: { key: string; label: string }[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 1);
  for (let i = 0; i < 21; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    options.push({ key, label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) });
  }
  return options;
}

const NEEDED_BY_OPTIONS = buildNeededByOptions();
const MIN_NEEDED_BY_DATE = getTomorrowDateString();

const emptyFormData: { typeId: number | ''; purpose: string; copies: string; notes: string; neededBy: string } = {
  typeId: '',
  purpose: '',
  copies: '1',
  notes: '',
  neededBy: '',
};

export default function ProfessorDocumentsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [, setTypesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DocumentRequest | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const comingSoon = () =>
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');

  useEffect(() => {
    const fetchTypes = async () => {
      setTypesLoading(true);
      try {
        const { data } = await api.get('/faculty/document-services');
        setDocumentTypes(
          (data ?? []).map((s: any) => ({
            id: s.service_id,
            name: s.service_name,
            processingTime: s.processing_time ?? 'TBD',
            requirements: s.requirements ?? [],
          })),
        );
      } catch (err) {
        console.error('Fetch document types error:', err);
      } finally {
        setTypesLoading(false);
      }
    };
    fetchTypes();
  }, []);

  // Mirrors `requests` for the catch block below, without making
  // fetchRequests depend on (and change identity with) the state itself.
  const requestsRef = useRef(requests);
  useEffect(() => { requestsRef.current = requests; }, [requests]);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/faculty/my-document-requests');
      setRequests(
        (data ?? []).map((r: any) => ({
          id: String(r.request_id),
          type: r.service_name,
          college: r.college,
          purpose: r.purpose,
          copies: r.copies,
          requestDate: r.created_at,
          status: r.status,
          trackingNumber: r.tracking_number,
          notes: r.notes || undefined,
          estimatedCompletion: r.estimated_completion || undefined,
          neededBy: r.needed_by || undefined,
        })),
      );
    } catch (err) {
      console.error('Fetch document requests error:', err);
      if (requestsRef.current.length === 0) {
        Alert.alert('Error', 'Could not load your document requests.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh your document requests.' });
      }
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchRequests();
    socket.on('document:status-updated', refetch);
    return () => {
      socket.off('document:status-updated', refetch);
    };
  }, [user, token, fetchRequests]);

  const goToDashboard = () => router.push('/pages/professor/professor_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'documents') return;
    if (key === 'dashboard') {
      goToDashboard();
      return;
    }
    if (key === 'appointments') {
      router.push('/pages/professor/professor_appointment');
      return;
    }
    if (key === 'transactions') {
      router.push('/pages/professor/professor_transactions');
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

  const openRequestDialog = () => {
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const selectedType = documentTypes.find((t) => t.id === formData.typeId);
  const canSubmit = !!formData.typeId && formData.purpose.trim().length > 0;

  const handleSubmitRequest = async () => {
    if (!canSubmit || !selectedType) return;
    setSubmitting(true);
    try {
      await api.post('/faculty/my-document-requests', {
        service_id: selectedType.id,
        request_type: selectedType.name,
        purpose: formData.purpose.trim(),
        copies: formData.copies,
        notes: formData.notes.trim(),
        needed_by: formData.neededBy || null,
      });
      await fetchRequests();
      setDialogOpen(false);
      setFormData(emptyFormData);
    } catch (err: any) {
      console.error('Submit document request error:', err);
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to submit document request.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancelRequest = async () => {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      await api.delete(`/faculty/my-document-requests/${cancelTarget.id}`);
      setRequests((prev) => prev.filter((r) => r.id !== cancelTarget.id));
      setCancelTarget(null);
    } catch (err: any) {
      console.error('Cancel document request error:', err);
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel document request.');
    } finally {
      setCancellingId(null);
    }
  };

  const activeRequests = requests.filter((r) => r.status !== 'claimed' && r.status !== 'rejected');
  const completedRequests = requests.filter((r) => r.status === 'claimed' || r.status === 'rejected');

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
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.titleIcon}>
              <Ionicons name="document-text-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Document Requests</Text>
              <Text style={styles.pageSubtitle}>Request official documents and track your submissions</Text>
            </View>
          </View>

          <Pressable style={styles.requestBtn} onPress={openRequestDialog}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={StyleSheet.absoluteFill} />
            <Ionicons name="add-outline" size={16} color="#ffffff" />
            <Text style={styles.requestBtnText}>Request Document</Text>
          </Pressable>

          {/* Tabs */}
          <View style={styles.tabsList}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              const count = tab === 'active' ? activeRequests.length : completedRequests.length;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabTrigger, active && styles.tabTriggerActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Ionicons
                    name={tab === 'active' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={14}
                    color={active ? '#f97316' : theme.subtext}
                  />
                  <Text style={[styles.tabTriggerText, active && styles.tabTriggerTextActive]}>
                    {tab === 'active' ? 'Active Requests' : 'Completed'}
                  </Text>
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Active Tab */}
          {activeTab === 'active' && (
            requestsLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>Loading requests...</Text>
              </View>
            ) : activeRequests.length > 0 ? (
              <View style={styles.docList}>
                {activeRequests.map((req) => {
                  const meta = STATUS_META[req.status];
                  return (
                    <Pressable
                      key={req.id}
                      style={styles.docCard}
                      onPress={() =>
                        router.push({
                          pathname: '/pages/professor/professor_documents_status',
                          params: { docId: req.id, from: 'document-request' },
                        })
                      }
                    >
                      <View style={styles.docCardHeaderRow}>
                        <View style={styles.docIconWrap}>
                          <Ionicons name="document-text-outline" size={20} color="#f97316" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.docTypeText}>{req.type}</Text>
                          <Text style={styles.docCollegeText}>{req.college}</Text>
                          <Text style={styles.docTrackingText}>
                            Tracking: <Text style={styles.docTrackingValue}>{req.trackingNumber}</Text>
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                          <Ionicons name={meta.icon} size={12} color={meta.color} />
                          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>

                      <View style={styles.docInfoGrid}>
                        <View style={styles.docInfoField}>
                          <Text style={styles.docInfoLabel}>Request Date</Text>
                          <Text style={styles.docInfoDateValue}>{formatDate(req.requestDate)}</Text>
                        </View>
                        {req.estimatedCompletion && (
                          <View style={styles.docInfoField}>
                            <Text style={styles.docInfoLabel}>Est. Completion</Text>
                            <Text style={styles.docInfoDateValue}>{formatDate(req.estimatedCompletion)}</Text>
                          </View>
                        )}
                        {req.neededBy && (
                          <View style={styles.docInfoField}>
                            <Text style={styles.docInfoLabel}>Needed By</Text>
                            <Text style={styles.docInfoDateValue}>{formatDate(req.neededBy)}</Text>
                          </View>
                        )}
                        <View style={styles.docInfoField}>
                          <Text style={styles.docInfoLabel}>Number of Copies</Text>
                          <Text style={styles.docInfoDateValue}>{req.copies ?? 1}</Text>
                        </View>
                        <View style={[styles.docInfoField, styles.docInfoFieldFull]}>
                          <Text style={styles.docInfoLabel}>Purpose</Text>
                          <Text style={styles.docInfoValue}>{req.purpose}</Text>
                        </View>
                      </View>

                      {req.notes && (
                        <View style={styles.updateBox}>
                          <Text style={styles.updateTitle}>Update</Text>
                          <Text style={styles.updateText}>{req.notes}</Text>
                        </View>
                      )}

                      {(req.status === 'pending' || req.status === 'processing') && (
                        <Pressable style={styles.cancelBtnFull} onPress={() => setCancelTarget(req)}>
                          <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                          <Text style={styles.cancelBtnFullText}>Cancel Request</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No active requests</Text>
                <Text style={styles.emptyText}>Start by requesting a document</Text>
              </View>
            )
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            completedRequests.length > 0 ? (
              <View style={styles.docList}>
                {completedRequests.map((req) => {
                  const meta = STATUS_META[req.status];
                  return (
                    <Pressable
                      key={req.id}
                      style={[styles.docCard, styles.docCardCompleted]}
                      onPress={() =>
                        router.push({
                          pathname: '/pages/professor/professor_documents_status',
                          params: { docId: req.id, from: 'document-request' },
                        })
                      }
                    >
                      <View style={styles.docCardHeaderRow}>
                        <View style={styles.docIconWrap}>
                          <Ionicons name="document-text-outline" size={20} color="#f97316" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.docTypeText}>{req.type}</Text>
                          <Text style={styles.docCollegeText}>{req.college}</Text>
                          <Text style={styles.docTrackingText}>
                            {formatDate(req.requestDate)} · {req.trackingNumber}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={32} color={theme.tertiary} />
                <Text style={styles.emptyTitle}>No completed requests</Text>
                <Text style={styles.emptyText}>Your released and rejected requests will appear here</Text>
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Request Document Dialog */}
      <Modal visible={dialogOpen} animationType="fade" transparent onRequestClose={() => setDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.requestDialogCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.requestDialogHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmTitle}>New Document Request</Text>
                  <Text style={styles.requestDialogSubtitle}>
                    Submit a request for an official HR/Records document
                  </Text>
                </View>
                <Pressable onPress={() => setDialogOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Document Type</Text>
                <Pressable style={styles.selectTrigger} onPress={() => setTypePickerOpen(true)}>
                  <Text style={selectedType ? styles.selectTriggerText : styles.selectPlaceholder}>
                    {selectedType ? selectedType.name : 'Select document type'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.subtext} />
                </Pressable>
              </View>

              {selectedType && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>
                    <Text style={styles.hintBold}>Processing Time: </Text>
                    {selectedType.processingTime}
                  </Text>
                  {selectedType.requirements.length > 0 && (
                    <Text style={styles.hintText}>
                      <Text style={styles.hintBold}>Requirements: </Text>
                      {selectedType.requirements.join(', ')}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Purpose</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="e.g., Bank loan application, Visa application"
                  placeholderTextColor={theme.tertiary}
                  value={formData.purpose}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, purpose: v }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Number of Copies</Text>
                <TextInput
                  style={styles.textArea}
                  keyboardType="number-pad"
                  value={formData.copies}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, copies: v }))}
                  placeholderTextColor={theme.tertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Needed By (optional)</Text>
                <Pressable style={styles.selectTrigger} onPress={() => setDatePickerOpen(true)}>
                  <Text style={formData.neededBy ? styles.selectTriggerText : styles.selectPlaceholder}>
                    {formData.neededBy ? formatDate(formData.neededBy) : 'Select a date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Additional Notes</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Any special instructions or urgency notes (optional)"
                  placeholderTextColor={theme.tertiary}
                  value={formData.notes}
                  onChangeText={(v) => setFormData((prev) => ({ ...prev, notes: v }))}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.dialogActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setDialogOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
                  onPress={handleSubmitRequest}
                  disabled={!canSubmit || submitting}
                >
                  <Text style={styles.confirmBtnText}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Document Type Picker */}
      <Modal visible={typePickerOpen} animationType="fade" transparent onRequestClose={() => setTypePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Document Type</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {documentTypes.map((t) => {
                const selected = formData.typeId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[styles.pickerOption, selected && styles.pickerOptionActive]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, typeId: t.id }));
                      setTypePickerOpen(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>{t.name}</Text>
                    {selected && <Ionicons name="checkmark" size={16} color="#f97316" />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.pickerModalClose} onPress={() => setTypePickerOpen(false)}>
              <Text style={styles.pickerModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Needed By Date Picker */}
      <Modal visible={datePickerOpen} animationType="fade" transparent onRequestClose={() => setDatePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Needed By</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Pressable
                style={styles.pickerOption}
                onPress={() => {
                  setFormData((prev) => ({ ...prev, neededBy: '' }));
                  setDatePickerOpen(false);
                }}
              >
                <Text style={styles.pickerOptionText}>No specific date</Text>
              </Pressable>
              {NEEDED_BY_OPTIONS.filter((o) => o.key >= MIN_NEEDED_BY_DATE).map((o) => {
                const selected = formData.neededBy === o.key;
                return (
                  <Pressable
                    key={o.key}
                    style={[styles.pickerOption, selected && styles.pickerOptionActive]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, neededBy: o.key }));
                      setDatePickerOpen(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>{o.label}</Text>
                    {selected && <Ionicons name="checkmark" size={16} color="#f97316" />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.pickerModalClose} onPress={() => setDatePickerOpen(false)}>
              <Text style={styles.pickerModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal visible={!!cancelTarget} animationType="fade" transparent onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={[styles.confirmIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="document-text-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Cancel Request?</Text>
            <Text style={styles.confirmDescription}>
              You are about to cancel your request for{' '}
              <Text style={{ fontWeight: '700', color: theme.text }}>{cancelTarget?.type}</Text>. This will
              permanently remove your request — you will need to resubmit if you change your mind.
            </Text>
            <View style={styles.confirmActionsRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setCancelTarget(null)}>
                <Text style={styles.cancelBtnText}>Keep Request</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmActionBtn, { backgroundColor: '#ef4444' }]}
                onPress={confirmCancelRequest}
                disabled={!!cancellingId}
              >
                <Text style={styles.confirmBtnText}>{cancellingId ? 'Cancelling…' : 'Cancel Request'}</Text>
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
        userName={user?.name ?? 'Faculty'}
        userDept={user?.departmentName ?? ''}
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

// ─────────────────────────── Shared sub-components ───────────────────────────

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  userName,
  userDept,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  userName: string;
  userDept: string;
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
              <Text style={styles.drawerName}>{userName}</Text>
            </View>
            <View style={styles.drawerRoleBadge}>
              <Text style={styles.drawerRoleBadgeText}>Professor</Text>
            </View>
            <Text style={styles.drawerCollege}>{userDept}</Text>
          </View>

          <View style={styles.drawerNav}>
            {navItems.map((item) => {
              // This is the sidebar's canonical "Documents" destination —
              // the tracking/status screen (professor_documents_status.tsx) is
              // reached via the dashboard's stat tile instead and stays unhighlighted.
              const active = item.key === 'documents';
              return (
                <Pressable
                  key={item.key}
                  style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                  onPress={() => onNavPress(item.key)}
                >
                  <Ionicons name={item.icon} size={18} color={active ? '#ffffff' : theme.subtext} />
                  <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
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
  iconBtnBg: string;
  iconBtnBorder: string;
  inputBg: string;
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
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
  inputBg: '#0f1a11',
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
  iconBtnBg: 'rgba(34, 197, 94, 0.08)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.15)',
  inputBg: '#f8fafc',
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
    titleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Request button
    requestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    requestBtnText: { fontSize: 13.5, fontWeight: '700', color: '#ffffff' },

    // Tabs
    tabsList: { flexDirection: 'row', gap: 6, borderBottomWidth: 2, borderBottomColor: theme.border },
    tabTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, paddingBottom: 12 },
    tabTriggerActive: { borderBottomWidth: 2, borderBottomColor: '#f97316', marginBottom: -2 },
    tabTriggerText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tabTriggerTextActive: { color: '#f97316' },
    tabCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
    },
    tabCountActive: { backgroundColor: 'rgba(249, 115, 22, 0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: '#f97316' },
    tabCountTextActive: { color: '#f97316' },

    // Empty state
    emptyState: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyText: { fontSize: 13, color: theme.tertiary, textAlign: 'center' },

    // Document cards
    docList: { gap: 14 },
    docCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(249, 115, 22, 0.25)',
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    docCardCompleted: { opacity: 0.85 },
    docCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    docIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    docTypeText: { fontSize: 15.5, fontWeight: '700', color: '#f59e0b' },
    docCollegeText: { fontSize: 12.5, color: theme.tertiary, marginTop: 2 },
    docTrackingText: { fontSize: 12.5, color: theme.tertiary, marginTop: 2 },
    docTrackingValue: { fontWeight: '700', color: '#22c55e' },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      flexShrink: 0,
    },
    statusBadgeText: { fontSize: 10.5, fontWeight: '700' },

    docInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    docInfoField: { width: '46%', gap: 3 },
    docInfoFieldFull: { width: '100%' },
    docInfoLabel: { fontSize: 10.5, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    docInfoValue: { fontSize: 13.5, fontWeight: '600', color: theme.text, lineHeight: 18 },
    docInfoDateValue: { fontSize: 13.5, fontWeight: '600', color: '#f97316', lineHeight: 18 },

    updateBox: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    updateTitle: { fontSize: 12.5, fontWeight: '700', color: '#10b981' },
    updateText: { fontSize: 13, color: theme.subtext, lineHeight: 18 },

    cancelBtnFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    cancelBtnFullText: { fontSize: 13.5, fontWeight: '700', color: '#ef4444' },

    // Request dialog
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },
    requestDialogCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 22,
    },
    requestDialogHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
    requestDialogSubtitle: { fontSize: 12.5, color: theme.subtext, marginTop: 4 },

    formGroup: { gap: 8, marginBottom: 16 },
    formLabel: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    selectTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    selectTriggerText: { fontSize: 13.5, color: theme.text, flex: 1 },
    selectPlaceholder: { fontSize: 13.5, color: theme.tertiary, flex: 1 },
    textArea: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      color: theme.text,
      fontSize: 13.5,
      minHeight: 70,
      textAlignVertical: 'top',
    },

    hintBox: {
      backgroundColor: 'rgba(249, 115, 22, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(249, 115, 22, 0.2)',
      borderRadius: 12,
      padding: 12,
      gap: 4,
      marginBottom: 16,
    },
    hintText: { fontSize: 12.5, color: theme.subtext, lineHeight: 18 },
    hintBold: { fontWeight: '700', color: theme.text },

    dialogActionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
    submitBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: '#f97316',
    },
    submitBtnDisabled: { opacity: 0.5 },

    // Generic picker modal
    pickerModalCard: {
      width: '85%',
      maxWidth: 320,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 12,
    },
    pickerModalTitle: { fontSize: 14, fontWeight: '800', color: theme.text, padding: 8, paddingBottom: 4 },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    pickerOptionActive: { backgroundColor: 'rgba(249, 115, 22, 0.1)' },
    pickerOptionText: { fontSize: 13.5, fontWeight: '600', color: theme.text },
    pickerOptionTextActive: { color: '#f97316' },
    pickerModalClose: {
      paddingVertical: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 4,
    },
    pickerModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

    // Shared confirm modal chrome
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
    confirmTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' },
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
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
    confirmActionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
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
    drawerNavItemActive: { backgroundColor: theme.primary },
    drawerNavLabel: { fontSize: 14, fontWeight: '600', color: theme.subtext },
    drawerNavLabelActive: { color: '#ffffff' },
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
  });
}
