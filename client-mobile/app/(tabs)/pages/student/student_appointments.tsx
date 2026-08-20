import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  Alert,
  Animated,
  Easing,
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
  Calendar, CalendarDays, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ClipboardList,
  Clock, FileText, GraduationCap, Home as HomeIcon, Loader2, MapPin, Megaphone, Users, X, XCircle,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import NotificationBell from '@/components/NotificationBell';
import { STUDENT_NOTIFICATION_PATHS, STUDENT_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';

// Mirrors web's CSS `spin 1s linear infinite` on Loader2 for loading states.
function SpinningLoader({ size, color }: { size: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

type LucideIconType = typeof Calendar;

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

interface College {
  abbrev: string;
  name: string;
}


interface AppointmentType {
  id: string;
  name: string;
}

interface Slot {
  availabilityId: string;
  professorId: string;
  professorName: string;
  college: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  location: string;
  spotsLeft: number | null;
  maxStudents: number | null;
  professorAvailabilityStatus: 'available' | 'unavailable';
  isPast?: boolean;
  isFull?: boolean;
  appointmentTypes?: AppointmentType[];
}

type BookingStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';

interface Booking {
  id: string;
  availabilityId: string;
  person: string;
  college: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  location: string;
  purpose: string;
  appointmentType?: string;
  status: BookingStatus;
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The Available Slots tab only ever shows this week and next week (Monday–Saturday),
// same window the real faculty_availability recurrence covers on web.
function buildTwoWeekDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun..6=Sat
  const monday = new Date(today);
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
  const buildWeek = (weekOffset: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(dt.getDate() + weekOffset * 7 + i);
      return toDateStr(dt);
    });
  return { thisWeek: buildWeek(0), nextWeek: buildWeek(1) };
}

// Mirrors AppointmentListItem.css's .apst-badge-* (dark) and
// [data-theme="light"] .apst-badge-* (light) values exactly.
const STATUS_STYLES_DARK: Record<BookingStatus, { bg: string; border: string; color: string }> = {
  pending: { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.4)', color: '#fcd34d' },
  approved: { bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#86efac' },
  completed: { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399' },
  rejected: { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.35)', color: '#d1d5db' },
};
const STATUS_STYLES_LIGHT: Record<BookingStatus, { bg: string; border: string; color: string }> = {
  pending: { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)', color: '#92400e' },
  approved: { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  completed: { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  rejected: { bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.08)', border: 'rgba(107, 114, 128, 0.2)', color: '#374151' },
};

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: HomeIcon },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'queue', label: 'Queue', icon: Users },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: ClipboardList },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDate = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
};

type ActiveFilter = 'college' | 'professor' | null;
type ActiveTab = 'slots' | 'bookings';

export default function StudentAppointmentsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ activeTab?: string }>();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const twoWeekDates = useMemo(buildTwoWeekDates, []);
  const twoWeekDateSet = useMemo(
    () => new Set([...twoWeekDates.thisWeek, ...twoWeekDates.nextWeek]),
    [twoWeekDates],
  );
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  const { user, token, logout } = useAuth();

  const [collegeOptions, setCollegeOptions] = useState<College[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Mirrors the latest data for the catch blocks below, without making the
  // fetch callbacks depend on (and change identity with) the state itself.
  const slotsRef = useRef(slots);
  useEffect(() => { slotsRef.current = slots; }, [slots]);
  const bookingsRef = useRef(bookings);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

  const fetchSlots = useCallback(async () => {
    try {
      const { data } = await api.get('/student/appointments/available-slots');
      setSlots(
        (data.slots ?? []).map((s: any) => ({
          availabilityId: String(s.availabilityId),
          professorId: String(s.professorId),
          professorName: s.professorName,
          college: s.college,
          date: s.date,
          windowStart: s.windowStart,
          windowEnd: s.windowEnd,
          location: s.location,
          spotsLeft: s.spotsLeft,
          maxStudents: s.maxStudents,
          professorAvailabilityStatus: s.professorAvailabilityStatus,
          appointmentTypes: (s.appointmentTypes ?? []).map((t: any) => ({ id: String(t.id), name: t.name })),
        })),
      );
      setSlotsError(null);
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      // Only take over the whole tab with a blocking error on the true first
      // load -- a background poll/socket refresh failing shouldn't wipe out
      // an already-good, visible list.
      if (slotsRef.current.length === 0) {
        setSlotsError('Could not load available slots. Please try again.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh available slots.' });
      }
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const fetchMyBookings = useCallback(async () => {
    try {
      const { data } = await api.get('/student/appointments');
      setBookings(
        (data.appointments ?? []).map((b: any) => ({
          id: String(b.id),
          availabilityId: String(b.availabilityId),
          person: b.person,
          college: b.collegeAbbrev || b.college,
          date: b.date,
          windowStart: b.windowStart ?? '',
          windowEnd: b.windowEnd ?? '',
          location: b.location,
          purpose: b.purpose ?? '',
          appointmentType: b.appointmentType ?? undefined,
          status: b.status,
        })),
      );
      setBookingsError(null);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      if (bookingsRef.current.length === 0) {
        setBookingsError('Could not load your bookings. Please try again.');
      } else {
        Toast.show({ type: 'error', text1: 'Could not refresh your bookings.' });
      }
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    fetchMyBookings();
  }, [fetchSlots, fetchMyBookings]);

  // College filter options are sourced live from the departments that
  // actually have faculty (same endpoint student_professor_schedules.tsx
  // uses), instead of a static list, so a newly added college shows up here too.
  useEffect(() => {
    const fetchCollegeOptions = async () => {
      try {
        const { data } = await api.get('/student/professor-schedules');
        setCollegeOptions(
          (data.departments ?? []).map((d: any) => ({
            abbrev: d.departmentAbbrev,
            name: d.departmentName,
          })),
        );
      } catch (err) {
        console.error('Failed to fetch college options:', err);
      }
    };
    fetchCollegeOptions();
  }, []);

  // ── Live updates: refetch slots when capacity changes elsewhere (mirrors
  // stud-appointments.jsx's "appointment:slot-updated"/"appointment:slot-removed"),
  // and refetch "My Bookings" on a status change so it doesn't go stale until
  // the student leaves and re-enters this screen. This is the browse/book
  // screen -- refetches silently; status-change notifications belong to
  // student_appointment_status.tsx. ──
  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const slotEvents = ['appointment:slot-updated', 'appointment:slot-removed'];
    slotEvents.forEach((event) => socket.on(event, fetchSlots));
    socket.on('appointment:status-updated', fetchMyBookings);

    return () => {
      slotEvents.forEach((event) => socket.off(event, fetchSlots));
      socket.off('appointment:status-updated', fetchMyBookings);
    };
  }, [user, token, fetchSlots, fetchMyBookings]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(params.activeTab === 'bookings' ? 'bookings' : 'slots');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [hasUserSetCollege, setHasUserSetCollege] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return { year: y, month: m };
  });

  useEffect(() => {
    if (!hasUserSetCollege && user?.departmentAbbrev) {
      setSelectedCollege(user.departmentAbbrev);
    }
  }, [user?.departmentAbbrev, hasUserSetCollege]);

  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedApptType, setSelectedApptType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const comingSoon = () => Alert.alert('Coming soon', 'This section is not wired up yet on mobile.');
  const goToDashboard = () => router.push('/pages/student/student_dashboard');

  const handleNavPress = (key: string) => {
    setMenuOpen(false);
    if (key === 'appointments') return;
    if (key === 'dashboard') { goToDashboard(); return; }
    if (key === 'queue') { router.push('/pages/student/student_queue'); return; }
    if (key === 'announcements') { router.push('/pages/student/student_announcement'); return; }
    if (key === 'documents') { router.push('/pages/student/student_documents'); return; }
    if (key === 'transactions') { router.push('/pages/student/student_transactions'); return; }
    comingSoon();
  };

  const handleLogout = () => { setMenuOpen(false); setLogoutModalVisible(true); };
  const confirmLogout = () => { setLogoutModalVisible(false); logout(); router.replace('/login'); };

  const availableSlots = useMemo(() => slots.filter((slot) => {
    const matchesDate = !selectedDate || slot.date === selectedDate;
    const matchesCollege = !selectedCollege || slot.college === selectedCollege;
    const matchesProfessor = !selectedProfessorId || slot.professorId === selectedProfessorId;
    return matchesDate && matchesCollege && matchesProfessor;
  }), [slots, selectedDate, selectedCollege, selectedProfessorId]);

  const visibleSlots = useMemo(
    () => (selectedDate ? availableSlots : availableSlots.filter((s) => twoWeekDateSet.has(s.date))),
    [availableSlots, selectedDate, twoWeekDateSet],
  );

  const slotsByDate = useMemo(() => visibleSlots.reduce((acc: Record<string, Slot[]>, slot) => {
    (acc[slot.date] ||= []).push(slot);
    return acc;
  }, {}), [visibleSlots]);

  const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'approved');

  const bookedSlotKeys = useMemo(() => new Set(
    bookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
      .map((b) => `${b.availabilityId}_${b.date}`),
  ), [bookings]);

  const sortedActiveBookings = useMemo(
    () => [...activeBookings].sort((a, b) => a.date.localeCompare(b.date)),
    [activeBookings],
  );

  const cancelTarget = bookings.find((b) => b.id === cancelConfirmId) ?? null;

  const availableProfessors = useMemo(() => {
    const seen = new Set<string>();
    return slots
      .filter((s) => !selectedCollege || s.college === selectedCollege)
      .filter((s) => { if (seen.has(s.professorId)) return false; seen.add(s.professorId); return true; })
      .map((s) => ({ id: s.professorId, name: s.professorName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [slots, selectedCollege]);

  const calendarDays = useMemo(() => {
    if (!selectedProfessorId) return [];
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const profSlots = slots.filter((s) => s.professorId === selectedProfessorId && twoWeekDateSet.has(s.date));
    const slotDates = new Set(profSlots.map((s) => s.date));
    const result: { date: string; status: 'available' | 'unavailable' }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ date: dateStr, status: dateStr >= todayStr && slotDates.has(dateStr) ? 'available' : 'unavailable' });
    }
    return result;
  }, [slots, selectedProfessorId, calendarMonth, twoWeekDateSet, todayStr]);

  const isPastDate = (dateString: string) => dateString < todayStr;
  const weekInfo = (dateString: string) => (twoWeekDates.thisWeek.includes(dateString)
    ? { key: 'this-week', label: 'This Week' }
    : { key: 'next-week', label: 'Next Week' });

  const collegeFilterOptions = collegeOptions.map((c) => ({ value: c.abbrev, label: `${c.abbrev} - ${c.name}` }));
  const professorOptions = [
    { value: '', label: availableProfessors.length === 0 ? 'No professors available' : 'All Professors' },
    ...availableProfessors.map((p) => ({ value: p.id, label: p.name })),
  ];
  const filterOptions = activeFilter === 'college' ? collegeFilterOptions : professorOptions;
  const filterTitle = activeFilter === 'college' ? 'Select College' : 'Select Professor';
  const filterCurrentValue = activeFilter === 'college' ? selectedCollege : selectedProfessorId;

  const selectFilterOption = (value: string) => {
    if (activeFilter === 'college') { setSelectedCollege(value); setHasUserSetCollege(true); setSelectedProfessorId(''); setSelectedDate(''); }
    else if (activeFilter === 'professor') { setSelectedProfessorId(value); setSelectedDate(''); }
    setActiveFilter(null);
  };

  const openBookDialog = (slot: Slot) => {
    setSelectedSlot(slot); setSelectedApptType(''); setPurpose(''); setShowBookDialog(true);
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || submitting) return;
    if (selectedSlot.appointmentTypes && selectedSlot.appointmentTypes.length > 0 && !selectedApptType) {
      Alert.alert('Missing information', 'Please select an appointment type.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/student/appointments/book-slot', {
        availabilityId: selectedSlot.availabilityId,
        appointmentDate: selectedSlot.date,
        appointmentType: selectedApptType || null,
        purpose: purpose.trim(),
      });
      setShowBookDialog(false); setSelectedSlot(null); setSelectedApptType(''); setPurpose('');
      Alert.alert('Success', 'Appointment booked successfully!');
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err: any) {
      console.error('Failed to book appointment:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to book appointment. The slot may no longer be available.');
    } finally {
      setSubmitting(false);
    }
  };

  const doCancel = async () => {
    const id = cancelConfirmId;
    setCancelConfirmId(null);
    if (!id || cancellingId) return;
    setCancellingId(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to cancel the appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  const collegeLabel = (abbrev: string) => collegeOptions.find((c) => c.abbrev === abbrev)?.abbrev ?? abbrev;

  const renderDateGroup = (date: string) => {
    const daySlots = slotsByDate[date] ?? [];
    if (daySlots.length === 0) {
      return (
        <View key={date} style={styles.dateGroupDisabled}>
          <View style={styles.dateHeaderRow}>
            <Calendar size={18} color={theme.tertiary} />
            <Text style={styles.dateHeaderTextDisabled}>{formatDate(date)}</Text>
          </View>
          <Text style={styles.dateCountDisabled}>
            {isPastDate(date) ? 'This day has already passed' : 'No slots available'}
          </Text>
        </View>
      );
    }
    return (
      <View key={date} style={styles.dateGroup}>
        <View style={styles.dateHeaderRow}>
          <Calendar size={18} color={theme.purple} />
          <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
        </View>
        <View style={styles.slotCountBadge}>
          <CalendarDays size={12} color={theme.purple} />
          <Text style={styles.slotCountBadgeText}>{daySlots.length} Slots</Text>
        </View>
        <View style={styles.slotsList}>
          {daySlots.map((slot) => {
            const isUnavailable = slot.professorAvailabilityStatus === 'unavailable';
            const isAlreadyBooked = bookedSlotKeys.has(`${slot.availabilityId}_${slot.date}`);
            const isPast = !!slot.isPast;
            const isFull = !!slot.isFull;
            return (
              <View key={slot.availabilityId} style={[styles.slotCard, (isUnavailable || isPast || isFull) && styles.slotCardDisabled]}>
                <View style={styles.slotHeaderRow}>
                  <Text style={styles.slotProfessorName}>{slot.professorName}</Text>
                  <View style={styles.collegeBadge}>
                    <Text style={styles.collegeBadgeText}>{collegeLabel(slot.college)}</Text>
                  </View>
                </View>
                <View style={styles.slotDetails}>
                  <View style={styles.slotDetailRow}>
                    <Clock size={15} color={theme.purple} />
                    <Text style={styles.slotDetailText}>{formatTime(slot.windowStart)} – {formatTime(slot.windowEnd)}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <MapPin size={15} color={theme.purple} />
                    <Text style={styles.slotDetailText}>{slot.location}</Text>
                  </View>
                  <View style={styles.slotDetailRow}>
                    <Users size={15} color={theme.purple} />
                    <Text style={styles.slotDetailText}>
                      {slot.spotsLeft != null ? `${slot.spotsLeft} ${slot.spotsLeft === 1 ? 'spot' : 'spots'} left` : 'Unlimited'}
                      {slot.maxStudents != null ? ` (max ${slot.maxStudents})` : ''}
                    </Text>
                  </View>
                </View>
                {isPast ? (
                  <View style={[styles.bookBtn, styles.bookBtnDisabled]}>
                    <Text style={styles.bookBtnTextDisabled}>No Longer Available</Text>
                  </View>
                ) : isFull ? (
                  <View style={[styles.bookBtn, styles.bookBtnDisabled]}>
                    <Text style={styles.bookBtnTextDisabled}>Fully Booked</Text>
                  </View>
                ) : isUnavailable ? (
                  <View style={[styles.bookBtn, styles.bookBtnDisabled]}>
                    <Text style={styles.bookBtnTextDisabled}>Currently Unavailable</Text>
                  </View>
                ) : isAlreadyBooked ? (
                  <View style={[styles.bookBtn, styles.bookBtnDisabled]}>
                    <Text style={styles.bookBtnTextDisabled}>Already Booked</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => openBookDialog(slot)}>
                    <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.bookBtn}>
                      <Text style={styles.bookBtnText}>Book this Slot</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            );
          })}
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
              <Image source={isDarkMode ? sunIcon : darkModeIcon} style={styles.iconBtnImg} resizeMode="contain" />
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
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleRow}>
            <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.titleIcon}>
              <Calendar size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Appointments</Text>
              <Text style={styles.pageSubtitle}>Schedule appointments with professors and view available slots.</Text>
            </View>
          </View>

          {/* Professor Schedules quick link */}
          <Pressable
            style={styles.profSchedCard}
            onPress={() =>
              router.push({
                pathname: '/pages/student/student_professor_schedules',
                params: { from: 'appointments' },
              })
            }
          >
            <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.profSchedIcon}>
              <GraduationCap size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.profSchedText}>
              <Text style={styles.profSchedTitle}>Professor Schedules</Text>
              <Text style={styles.profSchedSubtitle}>Check professor consultation hours and availability across all departments.</Text>
            </View>
            <ChevronRight size={18} color={theme.purple} />
          </Pressable>

          {/* Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Filter & Search</Text>
            <Text style={styles.filtersDescription}>Optionally filter by college, professor, or date.</Text>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>College</Text>
              <Pressable style={styles.filterSelect} onPress={() => setActiveFilter('college')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {(() => {
                    const c = collegeOptions.find((c) => c.abbrev === selectedCollege);
                    return c ? `${c.abbrev} - ${c.name}` : 'Select college';
                  })()}
                </Text>
                <ChevronDown size={16} color={theme.purple} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Professor</Text>
              <Pressable
                style={[styles.filterSelect, availableProfessors.length === 0 && styles.filterSelectDisabled]}
                onPress={() => availableProfessors.length > 0 && setActiveFilter('professor')}
              >
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {selectedProfessorId
                    ? availableProfessors.find((p) => p.id === selectedProfessorId)?.name
                    : availableProfessors.length === 0 ? 'No professors available' : 'All Professors'}
                </Text>
                <ChevronDown size={16} color={theme.purple} />
              </Pressable>
            </View>

            {selectedProfessorId !== '' && (
              <View style={styles.filterField}>
                <Text style={[styles.filterLabel, { textAlign: 'center' }]}>Date</Text>
                <MiniCalendar
                  year={calendarMonth.year}
                  month={calendarMonth.month}
                  days={calendarDays}
                  selectedDate={selectedDate}
                  todayStr={todayStr}
                  onDateClick={(date) => setSelectedDate(date === selectedDate ? '' : date)}
                  onPrevMonth={() => setCalendarMonth(({ year, month }) => {
                    const d = new Date(year, month - 2, 1); return { year: d.getFullYear(), month: d.getMonth() + 1 };
                  })}
                  onNextMonth={() => setCalendarMonth(({ year, month }) => {
                    const d = new Date(year, month, 1); return { year: d.getFullYear(), month: d.getMonth() + 1 };
                  })}
                  theme={theme}
                  styles={styles}
                />
                {selectedDate !== '' && (
                  <Pressable onPress={() => setSelectedDate('')}>
                    <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.clearDateBtn}>
                      <Text style={styles.clearDateBtnText}>Clear date filter</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <Pressable style={[styles.tab, activeTab === 'slots' && styles.tabActive]} onPress={() => setActiveTab('slots')}>
              <CalendarDays size={15} color={activeTab === 'slots' ? theme.purple : theme.subtext} />
              <Text style={[styles.tabText, activeTab === 'slots' && styles.tabTextActive]}>Available Slots</Text>
              <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{visibleSlots.length}</Text></View>
            </Pressable>
            <Pressable style={[styles.tab, activeTab === 'bookings' && styles.tabActive]} onPress={() => setActiveTab('bookings')}>
              <ClipboardList size={15} color={activeTab === 'bookings' ? theme.purple : theme.subtext} />
              <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>Active Bookings</Text>
              <View style={styles.tabCountPill}><Text style={styles.tabCountText}>{activeBookings.length}</Text></View>
            </Pressable>
          </View>

          {/* Available Slots */}
          {activeTab === 'slots' && (
            <View style={styles.tabPanel}>
              {slotsLoading ? (
                <View style={styles.emptyCard}>
                  <SpinningLoader size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Loading available slots…</Text>
                </View>
              ) : slotsError ? (
                <View style={styles.emptyCard}>
                  <Calendar size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Could not load slots</Text>
                  <Text style={styles.emptyDescription}>{slotsError}</Text>
                  <Pressable onPress={fetchSlots}>
                    <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.clearDateBtn}>
                      <Text style={styles.clearDateBtnText}>Retry</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Calendar size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Available Slots</Text>
                  <Text style={styles.emptyDescription}>
                    {selectedDate || selectedProfessorId ? 'Try adjusting your filters to see more results.' : 'No professors have published their consultation hours yet.'}
                  </Text>
                </View>
              ) : selectedDate ? (
                <View style={styles.weekSection}>
                  <View style={[styles.weekBadge, weekInfo(selectedDate).key === 'this-week' ? styles.weekBadgeThis : styles.weekBadgeNext]}>
                    <Text style={[styles.weekBadgeText, weekInfo(selectedDate).key === 'this-week' ? styles.weekBadgeTextThis : styles.weekBadgeTextNext]}>
                      {weekInfo(selectedDate).label}
                    </Text>
                  </View>
                  {renderDateGroup(selectedDate)}
                </View>
              ) : (
                <>
                  <View style={styles.weekSection}>
                    <View style={[styles.weekBadge, styles.weekBadgeThis]}>
                      <Text style={[styles.weekBadgeText, styles.weekBadgeTextThis]}>This Week</Text>
                    </View>
                    {twoWeekDates.thisWeek.map(renderDateGroup)}
                  </View>
                  <View style={styles.weekSection}>
                    <View style={[styles.weekBadge, styles.weekBadgeNext]}>
                      <Text style={[styles.weekBadgeText, styles.weekBadgeTextNext]}>Next Week</Text>
                    </View>
                    {twoWeekDates.nextWeek.map(renderDateGroup)}
                  </View>
                </>
              )}
            </View>
          )}

          {/* My Bookings */}
          {activeTab === 'bookings' && (
            <View style={styles.tabPanel}>
              {bookingsLoading ? (
                <View style={styles.emptyCard}>
                  <SpinningLoader size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Loading your appointments…</Text>
                </View>
              ) : bookingsError ? (
                <View style={styles.emptyCard}>
                  <CheckCircle size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>Could not load your appointments</Text>
                  <Text style={styles.emptyDescription}>{bookingsError}</Text>
                  <Pressable onPress={fetchMyBookings}>
                    <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.clearDateBtn}>
                      <Text style={styles.clearDateBtnText}>Retry</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : activeBookings.length === 0 ? (
                <View style={styles.emptyCard}>
                  <CheckCircle size={32} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No Appointments Booked</Text>
                  <Text style={styles.emptyDescription}>You have no active appointments yet.</Text>
                </View>
              ) : (
                sortedActiveBookings.map((booking) => {
                  const s = isDarkMode ? STATUS_STYLES_DARK[booking.status] : STATUS_STYLES_LIGHT[booking.status];
                  return (
                    <Pressable
                      key={booking.id}
                      style={styles.bookingCard}
                      onPress={() =>
                        router.push({
                          pathname: '/pages/student/student_appointment_status',
                          params: { appointmentId: booking.id, fromBookings: 'true' },
                        })
                      }
                    >
                      <View style={styles.bookingHeaderRow}>
                        <View style={styles.bookingIconWrap}>
                          <Calendar size={24} color={theme.purple} />
                        </View>
                        <View style={styles.bookingTitleSection}>
                          <Text style={styles.bookingPersonName}>{booking.person}</Text>
                          <Text style={styles.bookingCollegeText}>{collegeLabel(booking.college)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                          <Text style={[styles.statusBadgeText, { color: s.color }]}>{booking.status}</Text>
                        </View>
                      </View>
                      {booking.appointmentType && (
                        <View style={styles.apptTypeRow}>
                          <Text style={styles.apptTypeLabel}>Type:</Text>
                          <View style={styles.apptTypePill}><Text style={styles.apptTypePillText}>{booking.appointmentType}</Text></View>
                        </View>
                      )}
                      <View style={styles.fieldGrid}>
                        <View style={styles.fieldGridItem}>
                          <Text style={styles.fieldLabel}>Date</Text>
                          <Text style={styles.fieldValue}>{formatDate(booking.date)}</Text>
                        </View>
                        <View style={styles.fieldGridItem}>
                          <Text style={styles.fieldLabel}>Time Slot</Text>
                          <Text style={styles.fieldValue}>
                            {booking.windowStart && booking.windowEnd
                              ? `${formatTime(booking.windowStart)} – ${formatTime(booking.windowEnd)}` : '—'}
                          </Text>
                        </View>
                        <View style={styles.fieldGridItem}>
                          <Text style={styles.fieldLabel}>Location</Text>
                          <Text style={styles.fieldValue}>{booking.location}</Text>
                        </View>
                        {booking.purpose ? (
                          <View style={styles.fieldGridItemFull}>
                            <Text style={styles.fieldLabel}>Purpose</Text>
                            <Text style={styles.fieldValueFull}>{booking.purpose}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Pressable
                        style={styles.cancelBtn}
                        onPress={() => setCancelConfirmId(booking.id)}
                        disabled={cancellingId === booking.id}
                      >
                        <XCircle size={16} color="#ef4444" />
                        <Text style={styles.cancelBtnText}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}</Text>
                      </Pressable>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Nav Drawer */}
      <Modal visible={menuOpen} animationType="fade" transparent onRequestClose={() => setMenuOpen(false)}>
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
                const active = item.key === 'appointments';
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.drawerNavItem, active && styles.drawerNavItemActive]}
                    onPress={() => handleNavPress(item.key)}
                  >
                    <item.icon size={18} color={active ? '#ffffff' : theme.subtext} />
                    <Text style={[styles.drawerNavLabel, active && styles.drawerNavLabelActive]}>{item.label}</Text>
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

      {/* Book Slot Dialog */}
      <Modal visible={showBookDialog && selectedSlot !== null} animationType="fade" transparent onRequestClose={() => setShowBookDialog(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeaderRow}>
              <Text style={styles.dialogHeaderTitle}>Confirm Appointment</Text>
              <Pressable onPress={() => setShowBookDialog(false)} hitSlop={8}>
                <X size={20} color={theme.subtext} />
              </Pressable>
            </View>
            <ScrollView style={styles.dialogBody}>
              {selectedSlot && (
                <>
                  <View style={styles.slotSummary}>
                    <Text style={styles.slotSummaryName}>{selectedSlot.professorName}</Text>
                    <View style={styles.summaryDetails}>
                      <View style={styles.slotDetailRow}>
                        <Calendar size={15} color={theme.purple} />
                        <Text style={styles.slotDetailText}>{formatDate(selectedSlot.date)}</Text>
                      </View>
                      <View style={styles.slotDetailRow}>
                        <Clock size={15} color={theme.purple} />
                        <Text style={styles.slotDetailText}>{formatTime(selectedSlot.windowStart)} – {formatTime(selectedSlot.windowEnd)}</Text>
                      </View>
                      <View style={styles.slotDetailRow}>
                        <MapPin size={15} color={theme.purple} />
                        <Text style={styles.slotDetailText}>{selectedSlot.location}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedSlot.appointmentTypes && selectedSlot.appointmentTypes.length > 0 && (
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Appointment Type *</Text>
                      <View style={styles.apptTypeOptions}>
                        {selectedSlot.appointmentTypes.map((t) => {
                          const selected = t.id === selectedApptType;
                          return (
                            <Pressable
                              key={t.id}
                              style={[styles.apptTypeOption, selected && styles.apptTypeOptionSelected]}
                              onPress={() => setSelectedApptType(t.id)}
                            >
                              <Text style={[styles.apptTypeOptionText, selected && styles.apptTypeOptionTextSelected]}>{t.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Purpose of Consultation (optional)</Text>
                    <TextInput
                      style={styles.textarea}
                      placeholder="e.g., Thesis consultation, Grade inquiry, Academic advising..."
                      placeholderTextColor={theme.tertiary}
                      value={purpose}
                      onChangeText={setPurpose}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.dialogActions}>
              <Pressable style={styles.btnSecondary} onPress={() => setShowBookDialog(false)} disabled={submitting}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleBookSlot} disabled={submitting}>
                <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>{submitting ? 'Booking…' : 'Confirm Booking'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Appointment Confirm Modal */}
      <Modal visible={cancelConfirmId !== null} animationType="fade" transparent onRequestClose={() => setCancelConfirmId(null)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <XCircle size={26} color="#ef4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Cancel Appointment?</Text>
            <Text style={styles.logoutModalDescription}>
              You are about to cancel your appointment with <Text style={{ fontWeight: '700' }}>{cancelTarget?.person}</Text>
              {cancelTarget ? <> on <Text style={{ fontWeight: '700' }}>{formatDate(cancelTarget.date)}</Text></> : null}. This will
              permanently remove it — you&apos;ll need to book a new one if you change your mind.
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutCancelBtn} onPress={() => setCancelConfirmId(null)} disabled={cancellingId !== null}>
                <Text style={styles.logoutCancelBtnText}>Keep Appointment</Text>
              </Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={doCancel} disabled={cancellingId !== null}>
                <Text style={styles.logoutConfirmBtnText}>{cancellingId !== null ? 'Cancelling…' : 'Cancel Appointment'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Options Modal (College / Professor) */}
      <Modal visible={activeFilter !== null} animationType="fade" transparent onRequestClose={() => setActiveFilter(null)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.logoutModalTitle}>{filterTitle}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {filterOptions.map((opt) => {
                const selected = opt.value === filterCurrentValue;
                return (
                  <Pressable
                    key={opt.value || 'all'}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => selectFilterOption(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.purple} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.filterModalClose} onPress={() => setActiveFilter(null)}>
              <Text style={styles.filterModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Confirm Logout Modal */}
      <Modal visible={logoutModalVisible} animationType="fade" transparent onRequestClose={() => setLogoutModalVisible(false)}>
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
              <Pressable style={styles.logoutCancelBtn} onPress={() => setLogoutModalVisible(false)}>
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

// ─── Mini month calendar (date filter, only shown once a professor is selected) ───
function MiniCalendar({
  year, month, days, selectedDate, todayStr, onDateClick, onPrevMonth, onNextMonth, theme, styles,
}: {
  year: number;
  month: number;
  days: { date: string; status: 'available' | 'unavailable' }[];
  selectedDate: string;
  todayStr: string;
  onDateClick: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayMap: Record<string, { date: string; status: string }> = {};
  days.forEach((d) => { dayMap[d.date] = d; });

  const cells: ({ date: string; status: string; isPast: boolean } | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = dayMap[dateStr] ?? { date: dateStr, status: 'unavailable' };
    cells.push({ ...dayData, isPast: dateStr < todayStr });
  }

  return (
    <View style={styles.calendarWrap}>
      <View style={styles.calendarHeaderRow}>
        <Pressable onPress={onPrevMonth} hitSlop={8} style={styles.calendarNavBtn}>
          <ChevronLeft size={16} color={theme.purple} />
        </Pressable>
        <Text style={styles.calendarMonthLabel}>{MONTH_NAMES[month - 1]} {year}</Text>
        <Pressable onPress={onNextMonth} hitSlop={8} style={styles.calendarNavBtn}>
          <ChevronRight size={16} color={theme.purple} />
        </Pressable>
      </View>
      <View style={styles.calendarDowRow}>
        {DOW_LABELS.map((d) => <Text key={d} style={styles.calendarDowText}>{d}</Text>)}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.calendarCell} />;
          const isSelected = cell.date === selectedDate;
          const isAvailable = cell.status === 'available' && !cell.isPast;
          return (
            <Pressable
              key={i}
              disabled={!isAvailable}
              onPress={() => onDateClick(cell.date)}
              style={[
                styles.calendarCell,
                isAvailable && styles.calendarDayAvailable,
                isSelected && styles.calendarDaySelected,
              ]}
            >
              <Text style={[
                styles.calendarDayText,
                isAvailable && styles.calendarDayTextAvailable,
                isSelected && styles.calendarDayTextSelected,
                cell.isPast && styles.calendarDayTextPast,
              ]}>
                {parseInt(cell.date.split('-')[2], 10)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ThemePalette = {
  background: string;
  card: string;
  cardAlt: string;
  cardAltBorder: string;
  border: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  subtext: string;
  tertiary: string;
  primary: string;
  primaryDark: string;
  success: string;
  blue: string;
  purple: string;
  purpleDark: string;
  collegeBadgeBg: string;
  collegeBadgeText: string;
  collegeBadgeBorder: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  card: '#111612',
  cardAlt: 'rgba(17, 22, 18, 0.6)',
  cardAltBorder: 'rgba(168, 85, 247, 0.2)',
  border: '#1e3a23',
  headerBg: 'rgba(17, 22, 18, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  tertiary: '#94a3b8',
  primary: '#16a34a',
  primaryDark: '#15803d',
  success: '#10b981',
  blue: '#3b82f6',
  purple: '#a855f7',
  purpleDark: '#9333ea',
  collegeBadgeBg: 'rgba(168, 85, 247, 0.15)',
  collegeBadgeText: '#d8b4fe',
  collegeBadgeBorder: 'transparent',
  iconBtnBg: 'rgba(34, 197, 94, 0.1)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.2)',
};

const lightPalette: ThemePalette = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: 'rgba(248, 250, 252, 0.9)',
  cardAltBorder: 'rgba(147, 51, 234, 0.2)',
  border: '#e2e8f0',
  headerBg: 'rgba(255, 255, 255, 0.95)',
  headerBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#1e293b',
  subtext: '#64748b',
  tertiary: '#64748b',
  primary: '#166534',
  primaryDark: '#14532d',
  success: '#059669',
  blue: '#2563eb',
  purple: '#9333ea',
  purpleDark: '#7c3aed',
  collegeBadgeBg: 'rgba(147, 51, 234, 0.1)',
  collegeBadgeText: '#7e22ce',
  collegeBadgeBorder: 'rgba(147, 51, 234, 0.25)',
  iconBtnBg: 'rgba(34, 197, 94, 0.08)',
  iconBtnBorder: 'rgba(34, 197, 94, 0.15)',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: theme.headerBg, borderBottomWidth: 1, borderBottomColor: theme.headerBorder,
    },
    headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    headerPncLogo: { width: 40, height: 40 },
    headerOamsLogo: { height: 34, width: 96 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { padding: 8, borderRadius: 10, backgroundColor: theme.iconBtnBg, borderWidth: 1, borderColor: theme.iconBtnBorder },
    iconBtnImg: { width: 18, height: 18 },

    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

    // Breadcrumb
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    breadcrumbText: { fontSize: 14, fontWeight: '600', color: theme.subtext },

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Professor schedules card
    profSchedCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 16, padding: 14,
    },
    profSchedIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    profSchedText: { flex: 1, gap: 2 },
    profSchedTitle: { fontSize: 14, fontWeight: '700', color: theme.purple },
    profSchedSubtitle: { fontSize: 11, color: theme.tertiary, lineHeight: 15 },

    // Filters card
    filtersCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.15)',
      borderRadius: 18, padding: 18, gap: 14,
    },
    filtersTitle: { fontSize: 17, fontWeight: '800', color: theme.text, textAlign: 'center' },
    filtersDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', marginTop: -8 },
    filterField: { gap: 6 },
    filterLabel: { fontSize: 12, fontWeight: '700', color: theme.text },
    filterSelect: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background,
    },
    filterSelectDisabled: { opacity: 0.5 },
    filterSelectText: { fontSize: 13, color: theme.text, flex: 1, marginRight: 8 },
    clearDateBtn: {
      marginTop: 4, alignSelf: 'center', backgroundColor: theme.purple,
      borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16,
    },
    clearDateBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

    // Mini calendar
    calendarWrap: { gap: 8, marginTop: 4 },
    calendarHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    calendarNavBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.cardAlt },
    calendarMonthLabel: { fontSize: 13, fontWeight: '700', color: theme.text },
    calendarDowRow: { flexDirection: 'row' },
    calendarDowText: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 10, fontWeight: '700', color: theme.tertiary },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: {
      width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, marginVertical: 1,
    },
    calendarDayAvailable: { backgroundColor: 'rgba(168, 85, 247, 0.12)' },
    calendarDaySelected: { backgroundColor: theme.purple },
    calendarDayText: { fontSize: 12, color: theme.tertiary },
    calendarDayTextAvailable: { color: theme.purple, fontWeight: '700' },
    calendarDayTextSelected: { color: '#ffffff', fontWeight: '800' },
    calendarDayTextPast: { color: theme.border },

    // Tabs
    tabsRow: { flexDirection: 'row', gap: 8, borderBottomWidth: 2, borderBottomColor: theme.border },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2,
    },
    tabActive: { borderBottomColor: theme.purple },
    tabText: { fontSize: 12, fontWeight: '700', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.3 },
    tabTextActive: { color: theme.purple },
    tabCountPill: {
      minWidth: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 5, backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    tabCountText: { fontSize: 10, fontWeight: '700', color: theme.purple },

    tabPanel: { gap: 16 },

    // Empty state
    emptyCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18,
      paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
    emptyDescription: { fontSize: 12, color: theme.tertiary, textAlign: 'center', lineHeight: 18 },

    // Week sections
    weekSection: { gap: 14 },
    weekBadge: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    weekBadgeThis: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
    weekBadgeNext: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
    weekBadgeText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    weekBadgeTextThis: { color: theme.success },
    weekBadgeTextNext: { color: theme.blue },

    // Date groups
    dateGroup: { gap: 8 },
    dateGroupDisabled: { gap: 4, opacity: 0.55 },
    dateHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateHeaderText: { fontSize: 15, fontWeight: '700', color: theme.text },
    dateHeaderTextDisabled: { fontSize: 15, fontWeight: '700', color: theme.tertiary },
    dateCount: { fontSize: 12, color: theme.tertiary },
    dateCountDisabled: { fontSize: 12, color: theme.tertiary, fontStyle: 'italic' },
    slotCountBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
      backgroundColor: 'rgba(168, 85, 247, 0.12)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)',
      borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10,
    },
    slotCountBadgeText: { fontSize: 11, fontWeight: '700', color: theme.purple, textTransform: 'uppercase', letterSpacing: 0.4 },

    // Slot cards
    slotsList: { gap: 12 },
    slotCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 16, padding: 14, gap: 12,
    },
    slotCardDisabled: { opacity: 0.6, borderColor: theme.border },
    slotHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    slotProfessorName: { fontSize: 14, fontWeight: '700', color: theme.text, flex: 1 },
    collegeBadge: {
      backgroundColor: theme.collegeBadgeBg, borderWidth: 1, borderColor: theme.collegeBadgeBorder,
      borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10,
    },
    collegeBadgeText: { fontSize: 11, fontWeight: '700', color: theme.collegeBadgeText },
    slotDetails: { gap: 6 },
    slotDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    slotDetailText: { fontSize: 12, color: theme.subtext, flex: 1 },

    bookBtn: {
      alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
      borderRadius: 12,
    },
    bookBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    bookBtnDisabled: { backgroundColor: theme.border },
    bookBtnTextDisabled: { fontSize: 13, fontWeight: '700', color: theme.tertiary },

    // Bookings
    bookingsHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    bookingsHeaderTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
    bookingsHeaderSubtitle: { fontSize: 12, color: theme.tertiary, marginTop: 2 },
    statusLink: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: 'rgba(168, 85, 247, 0.12)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10,
    },
    statusLinkText: { fontSize: 11, fontWeight: '700', color: theme.purple },

    statusGroup: { gap: 8 },
    statusGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: {
      alignItems: 'center', justifyContent: 'center', minWidth: 88,
      paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    statusGroupTitle: { fontSize: 14, fontWeight: '700', color: theme.text },

    bookingCard: {
      backgroundColor: theme.card, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 16, padding: 20, gap: 14, marginBottom: 4,
    },
    bookingHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    bookingIconWrap: {
      width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(168, 85, 247, 0.12)', flexShrink: 0,
    },
    bookingTitleSection: { flex: 1, minWidth: 0 },
    bookingPersonName: { fontSize: 16, fontWeight: '700', color: theme.purple },
    bookingCollegeText: { fontSize: 13, color: theme.tertiary, marginTop: 2 },
    apptTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    apptTypeLabel: { fontSize: 10, fontWeight: '700', color: theme.tertiary, textTransform: 'uppercase' },
    apptTypePill: {
      backgroundColor: 'rgba(168, 85, 247, 0.12)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
      borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10,
    },
    apptTypePillText: { fontSize: 11, fontWeight: '600', color: theme.purple },

    fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    fieldGridItem: { width: '42%', flexGrow: 1, gap: 3 },
    fieldGridItemFull: { width: '100%', gap: 3 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: theme.purple, lineHeight: 20 },
    fieldValueFull: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 20 },

    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: 4, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

    // Nav drawer
    drawerOverlay: { flex: 1, flexDirection: 'row' },
    drawerPanel: {
      width: 270, backgroundColor: theme.card, borderRightWidth: 1, borderRightColor: theme.border,
      padding: 20, justifyContent: 'space-between',
    },
    drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerProfile: {
      width: '100%', alignItems: 'flex-start', gap: 8,
      backgroundColor: 'rgba(22, 163, 74, 0.12)', borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.25)',
      borderRadius: 14, padding: 14,
    },
    drawerProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    drawerAvatar: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(22, 163, 74, 0.18)',
      borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)', alignItems: 'center', justifyContent: 'center',
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
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    drawerLogoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    // Book dialog
    dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    dialogCard: {
      width: '100%', maxWidth: 400, maxHeight: '85%', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, overflow: 'hidden',
    },
    dialogHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 18, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    dialogHeaderTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    dialogBody: { padding: 18 },
    slotSummary: {
      backgroundColor: 'rgba(168, 85, 247, 0.08)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)',
      borderRadius: 14, padding: 14, gap: 10, marginBottom: 16,
    },
    slotSummaryName: { fontSize: 14, fontWeight: '700', color: theme.text },
    summaryDetails: { gap: 8 },
    formGroup: { gap: 8, marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    apptTypeOptions: { gap: 8 },
    apptTypeOption: {
      paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background,
    },
    apptTypeOptionSelected: { borderColor: theme.purple, backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    apptTypeOptionText: { fontSize: 13, color: theme.text },
    apptTypeOptionTextSelected: { color: theme.purple, fontWeight: '700' },
    textarea: {
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
      padding: 12, color: theme.text, fontSize: 13, minHeight: 80, textAlignVertical: 'top',
    },
    dialogActions: {
      flexDirection: 'row', gap: 10, justifyContent: 'flex-end',
      padding: 18, borderTopWidth: 1, borderTopColor: theme.border,
    },
    btnPrimary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
    btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    btnSecondary: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    btnSecondaryText: { fontSize: 13, fontWeight: '700', color: theme.subtext },

    // Confirm / filter modals (shared card look)
    logoutOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
    logoutModalCard: {
      width: '100%', maxWidth: 340, alignItems: 'center', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 24,
    },
    logoutIconCircle: {
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)', marginBottom: 16,
    },
    logoutModalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
    logoutModalDescription: { fontSize: 13, color: theme.subtext, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    logoutModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    logoutCancelBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
      borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    },
    logoutCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.text },
    logoutConfirmBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444',
    },
    logoutConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

    // Filter options modal
    filterModalCard: {
      width: '100%', maxWidth: 340, maxHeight: '70%', backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 20, alignItems: 'stretch', gap: 12,
    },
    filterOptionsList: { maxHeight: 320 },
    filterOptionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(168, 85, 247, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.purple, fontWeight: '700' },
    filterModalClose: {
      paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4,
    },
    filterModalCloseText: { fontSize: 13, fontWeight: '700', color: theme.subtext },
  });
}
