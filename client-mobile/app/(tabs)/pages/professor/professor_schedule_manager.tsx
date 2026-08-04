import { useState, useEffect, useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/coams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function CoamsLogo({
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
// GET /faculty/availability and GET /faculty/locations really return
// (availability_id, day_of_week, start_time, end_time, location, max_students,
// appointmentTypes) — this screen ports the actual wired
// prof-schedule-manager.jsx/.css 1:1: weekly day list + detail panel (stacked
// instead of side-by-side on mobile), Add/Edit Time Slot modal with day
// checkboxes, location picker (with "Other" free text), appointment-type tag
// input, overlap validation, and the Weekly Schedule Summary list. ───
interface AppointmentType {
  id: string | number;
  name: string;
}

interface AvailabilitySlot {
  availability_id: number;
  day_of_week: string;
  start_time: string; // "HH:MM" or "HH:MM:SS" from server
  end_time: string;
  location: string;
  max_students: number;
  appointmentTypes: AppointmentType[];
}

interface LocationOption {
  id: string | number;
  name: string;
  isGlobal: boolean;
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function ProfessorScheduleManagerScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSaving, setAddSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addDays, setAddDays] = useState<string[]>([]);
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [showOtherLocation, setShowOtherLocation] = useState(false);
  const [addMaxStudents, setAddMaxStudents] = useState('');
  const [addApptTypes, setAddApptTypes] = useState<string[]>([]);
  const [addApptInput, setAddApptInput] = useState('');

  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ slot: AvailabilitySlot; day: string } | null>(null);

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty/availability');
      setSlots(data ?? []);
    } catch (err) {
      console.error('Fetch availability error:', err);
      Alert.alert('Error', 'Failed to load schedule data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    api
      .get('/faculty/locations')
      .then(({ data }) => setLocations(data.locations ?? []))
      .catch((err) => console.error('Fetch locations error:', err));
  }, []);

  const cameFromAppointments = params.from === 'appointments';
  const goBack = () =>
    router.push(
      cameFromAppointments ? '/pages/professor/professor_appointment' : '/pages/professor/professor_dashboard',
    );

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'dashboard') { router.push('/pages/professor/professor_dashboard'); return; }
    if (key === 'appointments') { router.push('/pages/professor/professor_appointment'); return; }
    if (key === 'documents') { router.push('/pages/professor/professor_documents'); return; }
    if (key === 'transactions') { router.push('/pages/professor/professor_transactions'); return; }
    Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const slotsByDay: Record<string, AvailabilitySlot[]> = {};
  slots.forEach((slot) => {
    if (!slotsByDay[slot.day_of_week]) slotsByDay[slot.day_of_week] = [];
    slotsByDay[slot.day_of_week].push(slot);
  });

  const scheduledDays = DAYS.filter((d) => (slotsByDay[d] ?? []).length > 0);
  const selectedSlots = selectedDay ? (slotsByDay[selectedDay] ?? []) : [];

  const handleDayClick = (day: string) => setSelectedDay((prev) => (prev === day ? null : day));

  const openAddSlot = (day: string | null) => {
    setEditingId(null);
    setAddDays(day ? [day] : []);
    setAddStart('');
    setAddEnd('');
    setAddLocation('');
    setShowOtherLocation(false);
    setAddMaxStudents('');
    setAddApptTypes([]);
    setAddApptInput('');
    setShowAddSlot(true);
  };

  const openEditSlot = (slot: AvailabilitySlot, day: string) => {
    setEditingId(slot.availability_id);
    setAddDays([day]);
    setAddStart(slot.start_time.slice(0, 5));
    setAddEnd(slot.end_time.slice(0, 5));
    setAddLocation(slot.location);
    setShowOtherLocation(!!slot.location && !locations.some((loc) => loc.name === slot.location));
    setAddMaxStudents(String(slot.max_students));
    setAddApptTypes(slot.appointmentTypes.map((t) => t.name));
    setAddApptInput('');
    setShowAddSlot(true);
  };

  const toggleAddDay = (day: string) => {
    if (editingId) { setAddDays([day]); return; }
    setAddDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const commitApptTag = () => {
    const val = addApptInput.trim();
    if (!val || addApptTypes.includes(val) || addApptTypes.length >= 10) { setAddApptInput(''); return; }
    setAddApptTypes((prev) => [...prev, val]);
    setAddApptInput('');
  };

  const removeApptTag = (tag: string) => setAddApptTypes((prev) => prev.filter((t) => t !== tag));

  const findOverlap = (day: string, start: string, end: string) =>
    (slotsByDay[day] ?? []).find((s) => {
      if (editingId && s.availability_id === editingId) return false;
      const sStart = s.start_time.slice(0, 5);
      const sEnd = s.end_time.slice(0, 5);
      return start < sEnd && sStart < end;
    });

  const handleSaveSlot = async () => {
    if (addDays.length === 0 || !addStart || !addEnd || !addLocation.trim()) {
      Alert.alert('Missing information', 'Please select at least one day, times, and location.');
      return;
    }
    if (addEnd <= addStart) {
      Alert.alert('Invalid time range', 'End time must be after start time.');
      return;
    }
    const maxStu = parseInt(addMaxStudents, 10);
    if (!addMaxStudents.trim() || isNaN(maxStu) || maxStu < 1) {
      Alert.alert('Invalid max students', 'Max students must be a positive number.');
      return;
    }

    const conflictDays = addDays.filter((day) => findOverlap(day, addStart, addEnd));
    if (conflictDays.length > 0) {
      Alert.alert('Time conflict', `This time overlaps an existing slot on ${conflictDays.join(', ')}.`);
      return;
    }

    const trimmedLocation = addLocation.trim();
    setAddSaving(true);
    try {
      if (showOtherLocation && !locations.some((loc) => loc.name === trimmedLocation)) {
        try {
          const { data } = await api.post('/faculty/locations', { name: trimmedLocation });
          setLocations((prev) => [...prev, data]);
        } catch {
          // Non-fatal: the slot can still be saved with the typed location text.
        }
      }

      if (editingId) {
        await api.patch(`/faculty/availability/${editingId}`, {
          day_of_week: addDays[0],
          start_time: addStart,
          end_time: addEnd,
          location: trimmedLocation,
          max_students: maxStu,
          appointmentTypes: addApptTypes,
        });
        setShowAddSlot(false);
        setSelectedDay(addDays[0]);
      } else {
        const results = await Promise.allSettled(
          addDays.map((day) =>
            api.post('/faculty/availability', {
              day_of_week: day,
              start_time: addStart,
              end_time: addEnd,
              location: trimmedLocation,
              max_students: maxStu,
              appointmentTypes: addApptTypes,
            }),
          ),
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length === 0) {
          setShowAddSlot(false);
          if (!selectedDay) setSelectedDay(addDays[0]);
        } else if (failed.length < addDays.length) {
          Alert.alert('Partial failure', `${failed.length} of ${addDays.length} day(s) failed to save.`);
          setShowAddSlot(false);
        } else {
          const reason: any = (failed[0] as PromiseRejectedResult).reason;
          Alert.alert('Error', reason?.response?.data?.message ?? 'Failed to add time slot.');
        }
      }
      await fetchSlots();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save time slot.');
    } finally {
      setAddSaving(false);
    }
  };

  const requestDeleteSlot = (slot: AvailabilitySlot, day: string) => setDeleteTarget({ slot, day });

  const confirmDeleteSlot = async () => {
    if (!deleteTarget) return;
    const { slot, day } = deleteTarget;
    try {
      await api.delete(`/faculty/availability/${slot.availability_id}`);
      await fetchSlots();
      const remaining = (slotsByDay[day] ?? []).filter((s) => s.availability_id !== slot.availability_id);
      if (remaining.length === 0 && selectedDay === day) setSelectedDay(null);
    } catch (err) {
      console.error('Delete availability error:', err);
      Alert.alert('Error', 'Failed to remove time slot.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const selectedLocationLabel = showOtherLocation ? 'Other (type your own)…' : addLocation || 'Select a location';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={pncLogo} style={styles.headerPncLogo} resizeMode="contain" />
            <CoamsLogo style={styles.headerOamsLogo} outline={isDarkMode} />
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
          <Pressable style={styles.breadcrumb} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>{cameFromAppointments ? 'Appointment Manager' : 'Home'}</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
              <Ionicons name="calendar-outline" size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Schedule Manager</Text>
              <Text style={styles.pageSubtitle}>
                Set your weekly recurring availability by day. It repeats every week until you edit or remove it.
              </Text>
            </View>
          </View>

          <Pressable style={styles.addBtn} onPress={() => openAddSlot(selectedDay)}>
            <LinearGradient colors={['#a855f7', '#9333ea']} style={StyleSheet.absoluteFill} />
            <Ionicons name="add-outline" size={16} color="#ffffff" />
            <Text style={styles.addBtnText}>Add Time Slot</Text>
          </Pressable>

          {/* Weekly Overview */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Weekly Overview</Text>
            <Text style={styles.sectionDesc}>Select a day to view or manage its slots. Days with slots are highlighted.</Text>
            {loading && <Text style={styles.sectionDesc}>Loading…</Text>}
            <View style={styles.dayList}>
              {DAYS.map((day) => {
                const count = (slotsByDay[day] ?? []).length;
                const active = selectedDay === day;
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayBtn, count > 0 && styles.dayBtnHasSlots, active && styles.dayBtnActive]}
                    onPress={() => handleDayClick(day)}
                  >
                    <Text style={styles.dayBtnName}>{day}</Text>
                    <Text style={[styles.dayBtnCount, (count > 0 || active) && styles.dayBtnCountAccent]}>
                      {count} slot{count !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Detail panel */}
          {selectedDay && (
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>{selectedDay}</Text>
              {selectedSlots.length === 0 ? (
                <View style={styles.detailEmpty}>
                  <Text style={styles.emptyText}>No time slots set for {selectedDay}.</Text>
                  <Pressable style={styles.addBtn} onPress={() => openAddSlot(selectedDay)}>
                    <LinearGradient colors={['#a855f7', '#9333ea']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="add-outline" size={16} color="#ffffff" />
                    <Text style={styles.addBtnText}>Add your first slot</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.slotList}>
                  {selectedSlots.map((s) => (
                    <View key={s.availability_id} style={styles.slotCard}>
                      <View style={styles.slotRow}>
                        <Ionicons name="time-outline" size={16} color="#a855f7" />
                        <Text style={styles.slotTime}>{fmt12(s.start_time)} – {fmt12(s.end_time)}</Text>
                        <View style={styles.slotActions}>
                          <Pressable style={styles.editBtn} onPress={() => openEditSlot(s, selectedDay)} hitSlop={6}>
                            <Ionicons name="pencil-outline" size={16} color="#a855f7" />
                          </Pressable>
                          <Pressable style={styles.deleteBtn} onPress={() => requestDeleteSlot(s, selectedDay)} hitSlop={6}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.slotMeta}>
                        {s.location} · Max {s.max_students} students
                      </Text>
                      {s.appointmentTypes.length > 0 && (
                        <View style={styles.slotTypes}>
                          {s.appointmentTypes.map((t) => (
                            <View key={t.id} style={styles.previewChip}>
                              <Text style={styles.previewChipText}>{t.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {!selectedDay && (
            <View style={styles.card}>
              <View style={styles.detailPlaceholder}>
                <Ionicons name="calendar-outline" size={30} color="#a855f7" style={{ opacity: 0.4 }} />
                <Text style={styles.emptyText}>Select a day in the weekly overview to view or add time slots.</Text>
              </View>
            </View>
          )}

          {/* Weekly Schedule Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Weekly Schedule Summary</Text>
            <Text style={styles.sectionDesc}>Your recurring availability across the week</Text>
            {scheduledDays.length === 0 ? (
              <View style={styles.emptyUpcoming}>
                <Text style={styles.emptyText}>No weekly availability set. Tap a day above or use &quot;Add Time Slot&quot; to get started.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {scheduledDays.map((day) => {
                  const daySlots = slotsByDay[day] ?? [];
                  const active = selectedDay === day;
                  return (
                    <Pressable
                      key={day}
                      style={[styles.upcomingItem, active && styles.upcomingItemActive]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={styles.upcomingDateLabel}>{day}</Text>
                      <Text style={styles.upcomingCount}>{daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</Text>
                      <View style={styles.upcomingSlotsCol}>
                        {daySlots.map((s) => (
                          <View key={s.availability_id} style={styles.upcomingChip}>
                            <Ionicons name="time-outline" size={11} color="#a855f7" />
                            <Text style={styles.upcomingChipText}>{fmt12(s.start_time)} – {fmt12(s.end_time)}</Text>
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Add / Edit Time Slot Modal */}
      <Modal visible={showAddSlot} animationType="fade" transparent onRequestClose={() => setShowAddSlot(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formDialogCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.requestDialogHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmTitle}>{editingId ? 'Edit Time Slot' : 'Add Time Slot'}</Text>
                  <Text style={styles.requestDialogSubtitle}>
                    {editingId ? 'Update this recurring weekly slot' : 'Set your recurring weekly availability'}
                  </Text>
                </View>
                <Pressable onPress={() => setShowAddSlot(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.subtext} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{editingId ? 'Day of Week' : 'Day(s) of Week'}</Text>
                <View style={styles.dayCheckboxGroup}>
                  {DAYS.map((day) => {
                    const checked = addDays.includes(day);
                    return (
                      <Pressable
                        key={day}
                        style={[styles.dayCheckbox, checked && styles.dayCheckboxChecked]}
                        onPress={() => toggleAddDay(day)}
                      >
                        <Text style={[styles.dayCheckboxText, checked && styles.dayCheckboxTextChecked]}>
                          {day.slice(0, 3)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.fieldHint}>
                  This time slot will repeat weekly on the selected day{editingId ? '' : '(s)'}.
                </Text>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <Pressable style={styles.selectTrigger} onPress={() => setStartPickerOpen(true)}>
                    <Text style={addStart ? styles.selectTriggerText : styles.selectPlaceholder}>
                      {addStart ? fmt12(addStart) : 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.subtext} />
                  </Pressable>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>End Time</Text>
                  <Pressable style={styles.selectTrigger} onPress={() => setEndPickerOpen(true)}>
                    <Text style={addEnd ? styles.selectTriggerText : styles.selectPlaceholder}>
                      {addEnd ? fmt12(addEnd) : 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.subtext} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <Pressable style={styles.selectTrigger} onPress={() => setLocationPickerOpen(true)}>
                  <Text style={addLocation || showOtherLocation ? styles.selectTriggerText : styles.selectPlaceholder}>
                    {selectedLocationLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.subtext} />
                </Pressable>
                {showOtherLocation && (
                  <TextInput
                    style={[styles.textInput, { marginTop: 8 }]}
                    placeholder="Type the location name"
                    placeholderTextColor={theme.tertiary}
                    value={addLocation}
                    onChangeText={setAddLocation}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Max Students</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 5"
                  placeholderTextColor={theme.tertiary}
                  keyboardType="number-pad"
                  value={addMaxStudents}
                  onChangeText={setAddMaxStudents}
                />
                <Text style={styles.fieldHint}>Students are assigned slots in order of booking (first come, first served).</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Appointment Types (optional)</Text>
                {addApptTypes.length > 0 && (
                  <View style={styles.tagRow}>
                    {addApptTypes.map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag}</Text>
                        <Pressable onPress={() => removeApptTag(tag)} hitSlop={6}>
                          <Ionicons name="close" size={12} color="#a855f7" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder={addApptTypes.length === 0 ? 'e.g. Thesis Consultation' : 'Add another…'}
                    placeholderTextColor={theme.tertiary}
                    value={addApptInput}
                    onChangeText={setAddApptInput}
                    onSubmitEditing={commitApptTag}
                    returnKeyType="done"
                  />
                  <Pressable style={styles.tagAddBtn} onPress={commitApptTag}>
                    <Ionicons name="add" size={18} color="#ffffff" />
                  </Pressable>
                </View>
                <Text style={styles.fieldHint}>Students will choose from these types when booking. Leave empty for no restriction.</Text>
              </View>

              <View style={styles.dialogActionsRow}>
                <Pressable style={styles.cancelBtn} onPress={() => { setShowAddSlot(false); setEditingId(null); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.submitBtn} onPress={handleSaveSlot} disabled={addSaving}>
                  <Text style={styles.confirmBtnText}>
                    {addSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Slot'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Start Time Picker */}
      <TimePickerModal
        visible={startPickerOpen}
        title="Start Time"
        value={addStart}
        onSelect={(t) => { setAddStart(t); setStartPickerOpen(false); }}
        onClose={() => setStartPickerOpen(false)}
        styles={styles}
      />

      {/* End Time Picker */}
      <TimePickerModal
        visible={endPickerOpen}
        title="End Time"
        value={addEnd}
        onSelect={(t) => { setAddEnd(t); setEndPickerOpen(false); }}
        onClose={() => setEndPickerOpen(false)}
        styles={styles}
      />

      {/* Location Picker */}
      <Modal visible={locationPickerOpen} animationType="fade" transparent onRequestClose={() => setLocationPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Location</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {locations.map((loc) => {
                const selected = !showOtherLocation && addLocation === loc.name;
                return (
                  <Pressable
                    key={loc.id}
                    style={[styles.pickerOption, selected && styles.pickerOptionActive]}
                    onPress={() => {
                      setShowOtherLocation(false);
                      setAddLocation(loc.name);
                      setLocationPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>
                      {loc.name}{loc.isGlobal ? ' (Shared)' : ''}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color="#a855f7" />}
                  </Pressable>
                );
              })}
              <Pressable
                style={[styles.pickerOption, showOtherLocation && styles.pickerOptionActive]}
                onPress={() => {
                  setShowOtherLocation(true);
                  setAddLocation('');
                  setLocationPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerOptionText, showOtherLocation && styles.pickerOptionTextActive]}>
                  Other (type your own)…
                </Text>
                {showOtherLocation && <Ionicons name="checkmark" size={16} color="#a855f7" />}
              </Pressable>
            </ScrollView>
            <Pressable style={styles.pickerModalClose} onPress={() => setLocationPickerOpen(false)}>
              <Text style={styles.pickerModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Time Slot Confirmation */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={[styles.confirmIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="trash-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Remove Time Slot?</Text>
            <Text style={styles.confirmDescription}>
              Remove the{' '}
              <Text style={{ fontWeight: '700', color: theme.text }}>
                {deleteTarget ? `${fmt12(deleteTarget.slot.start_time)} – ${fmt12(deleteTarget.slot.end_time)}` : ''}
              </Text>{' '}
              slot on <Text style={{ fontWeight: '700', color: theme.text }}>{deleteTarget?.day}</Text>? This action cannot be undone.
            </Text>
            <View style={styles.confirmActionsRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmActionBtn, { backgroundColor: '#ef4444' }]} onPress={confirmDeleteSlot}>
                <Text style={styles.confirmBtnText}>Remove</Text>
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

function timeStringToDate(value: string): Date {
  const d = new Date();
  const [h, m] = value ? value.split(':').map(Number) : [8, 0];
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Free-entry time picker (native OS time picker via
// @react-native-community/datetimepicker) instead of a fixed 30-minute-
// increment list, so professors aren't blocked from setting e.g. 9:15.
function TimePickerModal({
  visible,
  title,
  value,
  onSelect,
  onClose,
  styles,
}: {
  visible: boolean;
  title: string;
  value: string;
  onSelect: (t: string) => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!visible) return null;

  if (Platform.OS === 'android') {
    // Android's native time picker is itself a dialog with no separate
    // "open" state needed — it fires once and closes.
    return (
      <DateTimePicker
        value={timeStringToDate(value)}
        mode="time"
        display="default"
        onChange={(event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            onSelect(dateToTimeString(selectedDate));
          } else {
            onClose();
          }
        }}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalCard}>
          <Text style={styles.pickerModalTitle}>{title}</Text>
          <DateTimePicker
            value={timeStringToDate(value)}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) onSelect(dateToTimeString(selectedDate));
            }}
          />
          <Pressable style={styles.pickerModalClose} onPress={onClose}>
            <Text style={styles.pickerModalCloseText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
              const active = item.key === 'appointments';
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
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3, lineHeight: 17 },

    // Add button
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    addBtnText: { fontSize: 13.5, fontWeight: '700', color: '#ffffff' },

    // Generic card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 16,
      padding: 16,
      gap: 4,
    },
    sectionHeading: { fontSize: 16, fontWeight: '700', color: theme.text },
    sectionDesc: { fontSize: 12.5, color: theme.tertiary, marginBottom: 10 },

    // Day list
    dayList: { gap: 8, marginTop: 6 },
    dayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(168, 85, 247, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.15)',
      borderRadius: 12,
    },
    dayBtnHasSlots: { borderColor: 'rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.07)' },
    dayBtnActive: { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.14)' },
    dayBtnName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    dayBtnCount: { fontSize: 12, fontWeight: '600', color: theme.tertiary },
    dayBtnCountAccent: { color: '#a855f7' },

    // Detail panel
    detailPlaceholder: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    detailEmpty: { alignItems: 'center', gap: 12, paddingVertical: 16 },
    emptyText: { fontSize: 13, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },

    slotList: { gap: 10, marginTop: 6 },
    slotCard: {
      gap: 6,
      backgroundColor: 'rgba(168, 85, 247, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.18)',
      borderRadius: 12,
      padding: 12,
    },
    slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    slotTime: { fontSize: 14.5, fontWeight: '700', color: '#a855f7', flex: 1 },
    slotMeta: { fontSize: 12.5, color: theme.tertiary, paddingLeft: 24 },
    slotActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    editBtn: { padding: 4, borderRadius: 8 },
    deleteBtn: { padding: 4, borderRadius: 8 },
    slotTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 24 },
    previewChip: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 999,
    },
    previewChipText: { fontSize: 11.5, fontWeight: '600', color: '#a855f7' },

    // Weekly summary
    emptyUpcoming: {
      paddingVertical: 24,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(168, 85, 247, 0.03)',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 14,
      marginTop: 6,
    },
    upcomingItem: {
      gap: 6,
      padding: 14,
      backgroundColor: 'rgba(168, 85, 247, 0.04)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.15)',
      borderRadius: 14,
    },
    upcomingItemActive: { borderColor: 'rgba(168, 85, 247, 0.5)', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    upcomingDateLabel: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    upcomingCount: { fontSize: 11.5, fontWeight: '600', color: '#a855f7' },
    upcomingSlotsCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    upcomingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.25)',
      borderRadius: 999,
    },
    upcomingChipText: { fontSize: 11.5, fontWeight: '600', color: '#a855f7' },

    // Add/Edit modal
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },
    formDialogCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '88%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 22,
    },
    requestDialogHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
    requestDialogSubtitle: { fontSize: 12.5, color: theme.subtext, marginTop: 4 },

    formGroup: { gap: 8, marginBottom: 16 },
    formRow: { flexDirection: 'row', gap: 12 },
    formLabel: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    fieldHint: { fontSize: 11.5, color: theme.tertiary, lineHeight: 16 },

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
    textInput: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      color: theme.text,
      fontSize: 13.5,
    },

    dayCheckboxGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayCheckbox: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      backgroundColor: theme.inputBg,
    },
    dayCheckboxChecked: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.45)' },
    dayCheckboxText: { fontSize: 12.5, fontWeight: '600', color: theme.text },
    dayCheckboxTextChecked: { color: '#a855f7' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.35)',
      borderRadius: 999,
    },
    tagChipText: { fontSize: 12, fontWeight: '600', color: '#a855f7' },
    tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    tagAddBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#a855f7',
    },

    dialogActionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
    submitBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: '#a855f7',
    },

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
    pickerOptionActive: { backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    pickerOptionText: { fontSize: 13.5, fontWeight: '600', color: theme.text },
    pickerOptionTextActive: { color: '#a855f7' },
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
