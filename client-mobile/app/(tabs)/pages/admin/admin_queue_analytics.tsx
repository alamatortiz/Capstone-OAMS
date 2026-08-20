import { useCallback, useEffect, useState } from 'react';
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
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  History,
  Home as HomeIcon,
  RefreshCw,
  Smile,
  TrendingUp,
  Users,
  Activity,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { ADMIN_NOTIFICATION_PATHS, ADMIN_NOTIFICATIONS_VIEW_ALL } from '@/utils/notificationRoutes';
import api from '@/utils/api';
import { connectSocket } from '@/utils/socket';
import { exportRowsAsCsv } from '@/utils/csvExport';

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

// GET /api/admin/queue-analytics (adminRoutes.js) is scoped strictly to the
// signed-in admin's own department — it aggregates completed queues for that
// one department only, filtered by period/service, with no cross-college
// breakdown, and returns performance/insights/serviceTypes pre-computed.
type PerfStatus = 'excellent' | 'good' | 'needs improvement';

interface ServicePerformance {
  service: string;
  college: string;
  status: PerfStatus;
  studentsServed: number;
  avgWait: string;
  peakHours: string;
  satisfaction: number;
}

interface Insight {
  title: string;
  desc: string;
}

const TIME_PERIODS = ['Today', 'This Week', 'This Month', 'This Semester'] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

type SelectField = 'period' | 'service' | null;

const STATUS_TINTS: Record<PerfStatus, { bg: string; border: string; color: string }> = {
  excellent: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  good: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  'needs improvement': { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#f97316' },
};

function getSatisfactionColor(val: number) {
  if (val >= 90) return '#22c55e';
  if (val >= 80) return '#3b82f6';
  return '#f97316';
}

const STAT_TINTS = {
  served: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
  wait: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
  satisfaction: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
  services: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' },
} as const;

const ANALYTICS_TABS = ['performance', 'trends', 'insights'] as const;
type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

type LucideIconType = typeof Clock;

const TAB_META: Record<AnalyticsTab, { label: string; icon: LucideIconType }> = {
  performance: { label: 'Performance', icon: TrendingUp },
  trends: { label: 'Trends', icon: Calendar },
  insights: { label: 'Insights', icon: AlertTriangle },
};

interface WeeklyComparisonRow {
  label: string;
  value: string;
  change: string;
  color: string;
}

interface Trends {
  peakActivityTime: string;
  bestServiceTime: string;
  weeklyComparison: WeeklyComparisonRow[];
}

const DEFAULT_TRENDS: Trends = { peakActivityTime: 'N/A', bestServiceTime: 'N/A', weeklyComparison: [] };

interface NavItem {
  key: string;
  label: string;
  icon: LucideIconType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'queue', label: 'Queue', icon: Clock },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transactions', label: 'Transactions', icon: History },
];

export default function AdminQueueAnalyticsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Today');
  const [serviceType, setServiceType] = useState('All Services');
  const [selectField, setSelectField] = useState<SelectField>(null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('performance');
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [performance, setPerformance] = useState<ServicePerformance[]>([]);
  const [positiveInsights, setPositiveInsights] = useState<Insight[]>([]);
  const [improvementAreas, setImprovementAreas] = useState<Insight[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(['All Services']);
  const [trends, setTrends] = useState<Trends>(DEFAULT_TRENDS);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/admin/queue-analytics', {
        params: { period: timePeriod, service: serviceType },
      });
      setPerformance(res.data.performance ?? []);
      setPositiveInsights(res.data.positiveInsights ?? []);
      setImprovementAreas(res.data.improvementAreas ?? []);
      setServiceTypes(res.data.serviceTypes ?? ['All Services']);
      setTrends(res.data.trends ?? DEFAULT_TRENDS);
    } catch (error) {
      console.error('Failed to fetch queue analytics:', error);
    }
  }, [timePeriod, serviceType]);

  const handleExportReport = async () => {
    try {
      await exportRowsAsCsv(
        performance.map((p) => ({
          service: p.service,
          college: p.college,
          status: p.status,
          studentsServed: p.studentsServed,
          avgWait: p.avgWait,
          peakHours: p.peakHours,
          satisfaction: p.satisfaction,
        })),
        `queue-analytics-${timePeriod.replace(/\s+/g, '-').toLowerCase()}.csv`,
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Could not export the report.');
    }
  };

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, fetchAnalytics]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    const refetch = () => fetchAnalytics();
    const events = ['queue:called', 'queue:served', 'queue:no-show'];
    events.forEach((event) => socket.on(event, refetch));
    return () => {
      events.forEach((event) => socket.off(event, refetch));
    };
  }, [user, token, fetchAnalytics]);

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
    logout();
    router.replace('/login');
  };

  const filteredPerformance = performance;

  const totalServed = filteredPerformance.reduce((sum, p) => sum + p.studentsServed, 0);
  const parseAvgWait = (avgWait: string) => parseFloat(avgWait) || 0;
  const avgWaitAll =
    filteredPerformance.length > 0
      ? Math.round(filteredPerformance.reduce((sum, p) => sum + parseAvgWait(p.avgWait), 0) / filteredPerformance.length)
      : 0;
  const avgSatisfaction =
    filteredPerformance.length > 0
      ? Math.round(filteredPerformance.reduce((sum, p) => sum + p.satisfaction, 0) / filteredPerformance.length)
      : 0;

  const selectOptions: string[] = selectField === 'period' ? [...TIME_PERIODS] : serviceTypes;
  const selectTitle = selectField === 'period' ? 'Select Time Period' : 'Select Service Type';
  const selectCurrentValue = selectField === 'period' ? timePeriod : serviceType;

  const chooseOption = (value: string) => {
    if (selectField === 'period') setTimePeriod(value as TimePeriod);
    else if (selectField === 'service') setServiceType(value);
    setSelectField(null);
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
          <Pressable style={styles.breadcrumb} onPress={goToDashboard} hitSlop={8}>
            <ChevronLeft size={18} color={theme.subtext} />
            <Text style={styles.breadcrumbText}>Home</Text>
          </Pressable>

          <View style={styles.titleRow}>
            <LinearGradient colors={[theme.primary, theme.success]} style={styles.titleIcon}>
              <BarChart3 size={22} color="#ffffff" />
            </LinearGradient>
            <View style={styles.titleTextWrap}>
              <Text style={styles.pageTitle}>Queue Analytics</Text>
              <Text style={styles.pageSubtitle}>Real-time queue performance metrics and insights</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.card}>
            <View style={styles.filtersHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>Analytics Filters</Text>
                <Text style={styles.cardSubtitleText}>Customize your analytics view</Text>
              </View>
            </View>
            <View style={styles.filtersActionsRow}>
              <Pressable style={styles.outlineBtn} onPress={handleExportReport}>
                <Download size={14} color={theme.text} />
                <Text style={styles.outlineBtnText}>Export Report</Text>
              </Pressable>
              <Pressable style={styles.outlineBtn} onPress={fetchAnalytics}>
                <RefreshCw size={14} color={theme.text} />
                <Text style={styles.outlineBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Department</Text>
              <View style={styles.filterDisplay}>
                <Text style={styles.filterDisplayText}>{user?.departmentName ?? ''}</Text>
              </View>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Time Period</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('period')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{timePeriod}</Text>
                <ChevronDown size={16} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Service Type</Text>
              <Pressable style={styles.filterSelect} onPress={() => setSelectField('service')}>
                <Text style={styles.filterSelectText} numberOfLines={1}>{serviceType}</Text>
                <ChevronDown size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: STAT_TINTS.served.border }]}>
              <View style={styles.statCardTop}>
                <Users size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Total Served</Text>
              </View>
              <Text style={[styles.statCardValue, { color: STAT_TINTS.served.color }]}>{totalServed}</Text>
              <Text style={styles.statCardSub}>{timePeriod}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: STAT_TINTS.wait.border }]}>
              <View style={styles.statCardTop}>
                <Clock size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Avg Wait Time</Text>
              </View>
              <Text style={[styles.statCardValue, { color: STAT_TINTS.wait.color }]}>
                {avgWaitAll > 0 ? `${avgWaitAll} min` : 'N/A'}
              </Text>
              <Text style={styles.statCardSub}>Across services</Text>
            </View>
            <View style={[styles.statCard, { borderColor: STAT_TINTS.satisfaction.border }]}>
              <View style={styles.statCardTop}>
                <Smile size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Satisfaction</Text>
              </View>
              <Text style={[styles.statCardValue, { color: STAT_TINTS.satisfaction.color }]}>
                {avgSatisfaction > 0 ? `${avgSatisfaction}%` : 'N/A'}
              </Text>
              <Text style={styles.statCardSub}>Average score</Text>
            </View>
            <View style={[styles.statCard, { borderColor: STAT_TINTS.services.border }]}>
              <View style={styles.statCardTop}>
                <Activity size={16} color={theme.subtext} />
                <Text style={styles.statCardLabel}>Services Tracked</Text>
              </View>
              <Text style={[styles.statCardValue, { color: STAT_TINTS.services.color }]}>{filteredPerformance.length}</Text>
              <Text style={styles.statCardSub}>{user?.departmentAbbrev ?? ''} department</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsPill}>
            {ANALYTICS_TABS.map((tab) => {
              const active = activeTab === tab;
              const meta = TAB_META[tab];
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <meta.icon size={14} color={active ? theme.primary : theme.subtext} />
                  <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tab: Performance */}
          {activeTab === 'performance' && (
            <View style={styles.card}>
              <Text style={styles.cardTitleText}>Queue Performance Metrics</Text>
              <Text style={styles.cardSubtitleText}>Detailed breakdown by service and college</Text>
              {filteredPerformance.length === 0 ? (
                <View style={styles.emptyCard}>
                  <BarChart3 size={28} color={theme.tertiary} />
                  <Text style={styles.emptyTitle}>No completed queue data</Text>
                  <Text style={styles.emptyText}>Try a different filter.</Text>
                </View>
              ) : (
                <View style={styles.perfList}>
                  {filteredPerformance.map((item, idx) => {
                    const statusTint = STATUS_TINTS[item.status];
                    return (
                      <View key={idx} style={styles.perfCard}>
                        <View style={styles.perfHeaderRow}>
                          <Text style={styles.perfService}>{item.service}</Text>
                          <View style={styles.perfCollegeBadge}>
                            <Text style={styles.perfCollegeBadgeText}>{item.college}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: statusTint.bg, borderColor: statusTint.border }]}>
                            <Text style={[styles.statusBadgeText, { color: statusTint.color }]}>{item.status}</Text>
                          </View>
                        </View>
                        <View style={styles.perfMetricsGrid}>
                          <View style={styles.perfMetric}>
                            <Text style={styles.perfMetricLabel}>Students Served</Text>
                            <Text style={[styles.perfMetricValue, { color: '#22c55e' }]}>{item.studentsServed}</Text>
                          </View>
                          <View style={styles.perfMetric}>
                            <Text style={styles.perfMetricLabel}>Avg Wait Time</Text>
                            <Text style={[styles.perfMetricValue, { color: '#3b82f6' }]}>{item.avgWait}</Text>
                          </View>
                          <View style={styles.perfMetric}>
                            <Text style={styles.perfMetricLabel}>Peak Hours</Text>
                            <Text style={styles.perfMetricValue}>{item.peakHours}</Text>
                          </View>
                          <View style={styles.perfMetric}>
                            <Text style={styles.perfMetricLabel}>Satisfaction</Text>
                            <Text style={[styles.perfMetricValue, { color: getSatisfactionColor(item.satisfaction) }]}>
                              {item.satisfaction}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Tab: Trends */}
          {activeTab === 'trends' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitleText}>Daily Trends</Text>
                <Text style={styles.cardSubtitleText}>Queue activity over time</Text>
                <View style={[styles.trendItem, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Text style={styles.trendItemLabel}>Peak Activity Time</Text>
                  <Text style={[styles.trendItemValue, { color: '#3b82f6' }]}>{trends.peakActivityTime}</Text>
                  <Text style={styles.trendItemNote}>Highest queue volume period</Text>
                </View>
                <View style={[styles.trendItem, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <Text style={styles.trendItemLabel}>Best Service Time</Text>
                  <Text style={[styles.trendItemValue, { color: '#22c55e' }]}>{trends.bestServiceTime}</Text>
                  <Text style={styles.trendItemNote}>Shortest average wait times</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitleText}>Period Comparison</Text>
                <Text style={styles.cardSubtitleText}>Performance vs the previous {timePeriod.toLowerCase()}</Text>
                {trends.weeklyComparison.length === 0 ? (
                  <Text style={styles.cardSubtitleText}>No data available for this period yet.</Text>
                ) : (
                  <View style={styles.weeklyList}>
                    {trends.weeklyComparison.map((row, idx) => (
                      <View key={idx} style={styles.weeklyRow}>
                        <Text style={styles.weeklyLabel}>{row.label}</Text>
                        <View style={styles.weeklyRight}>
                          <Text style={[styles.weeklyValue, { color: row.color }]}>{row.value}</Text>
                          <View style={styles.weeklyChangePill}>
                            <Text style={styles.weeklyChangeText}>{row.change}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* Tab: Insights */}
          {activeTab === 'insights' && (
            <>
              <View style={[styles.card, styles.insightsCardPositive]}>
                <View style={styles.insightsHeaderRow}>
                  <TrendingUp size={18} color="#22c55e" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitleText}>Positive Insights</Text>
                    <Text style={styles.cardSubtitleText}>What&apos;s working well</Text>
                  </View>
                </View>
                {positiveInsights.length === 0 ? (
                  <Text style={styles.emptyInlineText}>No data available for this period.</Text>
                ) : (
                  <View style={styles.insightsList}>
                    {positiveInsights.map((item, idx) => (
                      <View key={idx} style={styles.insightItemGreen}>
                        <Text style={styles.insightTitle}>{item.title}</Text>
                        <Text style={styles.insightDesc}>{item.desc}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.card, styles.insightsCardWarning]}>
                <View style={styles.insightsHeaderRow}>
                  <AlertTriangle size={18} color="#f97316" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitleText}>Areas for Improvement</Text>
                    <Text style={styles.cardSubtitleText}>Recommendations and action items</Text>
                  </View>
                </View>
                {improvementAreas.length === 0 ? (
                  <Text style={styles.emptyInlineText}>No improvement areas detected.</Text>
                ) : (
                  <View style={styles.insightsList}>
                    {improvementAreas.map((item, idx) => (
                      <View key={idx} style={styles.insightItemOrange}>
                        <Text style={styles.insightTitle}>{item.title}</Text>
                        <Text style={styles.insightDesc}>{item.desc}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
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
        adminName={user?.name ?? 'Admin'}
        adminDepartmentName={user?.departmentName ?? ''}
      />

      {/* Filter Options Modal (Time Period / Service Type) */}
      <Modal visible={selectField !== null} animationType="fade" transparent onRequestClose={() => setSelectField(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <Text style={styles.confirmTitle}>{selectTitle}</Text>
            <ScrollView style={styles.filterOptionsList}>
              {selectOptions.map((opt) => {
                const selected = opt === selectCurrentValue;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowActive]}
                    onPress={() => chooseOption(opt)}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]} numberOfLines={2}>
                      {opt}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setSelectField(null)}>
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

// ─────────────────────────── Shared sub-components ───────────────────────────

function NavDrawer({
  visible,
  onClose,
  onNavPress,
  onLogout,
  theme,
  styles,
  adminName,
  adminDepartmentName,
}: {
  visible: boolean;
  onClose: () => void;
  onNavPress: (key: string) => void;
  onLogout: () => void;
  theme: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  adminName: string;
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
              <Text style={styles.drawerRoleBadgeText}>Admin</Text>
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

    // Title
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titleTextWrap: { flex: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: theme.subtext, marginTop: 3 },

    // Shared card
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 18,
      gap: 12,
    },
    cardTitleText: { fontSize: 15, fontWeight: '800', color: theme.text },
    cardSubtitleText: { fontSize: 12, color: theme.tertiary, marginTop: 2 },

    // Filters
    filtersHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
    filtersActionsRow: { flexDirection: 'row', gap: 10 },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    outlineBtnText: { fontSize: 12, fontWeight: '600', color: theme.text },
    filterField: { gap: 6 },
    filterLabel: { fontSize: 12, fontWeight: '600', color: theme.subtext },
    filterDisplay: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      opacity: 0.75,
    },
    filterDisplayText: { fontSize: 13, color: theme.text },
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
    statCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statCardLabel: { fontSize: 11, fontWeight: '600', color: theme.subtext, flex: 1 },
    statCardValue: { fontSize: 22, fontWeight: '800' },
    statCardSub: { fontSize: 11, color: theme.tertiary },

    // Segmented tabs (mirrors admin-queue-analytics.css .aqa-tabs)
    tabsPill: {
      flexDirection: 'row',
      gap: 4,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 4,
      alignSelf: 'flex-start',
    },
    tabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 9,
    },
    tabPillActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
    tabPillText: { fontSize: 12.5, fontWeight: '600', color: theme.subtext },
    tabPillTextActive: { color: theme.primary },

    // Performance list
    perfList: { gap: 12 },
    perfCard: {
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    perfHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    perfService: { fontSize: 14, fontWeight: '700', color: theme.text },
    perfCollegeBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    perfCollegeBadgeText: { fontSize: 10.5, fontWeight: '700', color: theme.primary },
    statusBadge: { borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
    statusBadgeText: { fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize' },
    perfMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    perfMetric: { width: '45%', gap: 3 },
    perfMetricLabel: { fontSize: 10.5, color: theme.tertiary },
    perfMetricValue: { fontSize: 14, fontWeight: '700', color: theme.text },

    // Trends
    trendItem: { borderRadius: 12, padding: 14, gap: 4 },
    trendItemLabel: { fontSize: 12.5, fontWeight: '600', color: theme.text },
    trendItemValue: { fontSize: 18, fontWeight: '800' },
    trendItemNote: { fontSize: 11, color: theme.tertiary },
    weeklyList: { gap: 10 },
    weeklyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    weeklyLabel: { fontSize: 13, color: theme.text },
    weeklyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weeklyValue: { fontSize: 14, fontWeight: '700' },
    weeklyChangePill: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    weeklyChangeText: { fontSize: 10.5, fontWeight: '700', color: theme.primary },

    // Insights
    insightsCardPositive: { borderColor: 'rgba(34, 197, 94, 0.25)' },
    insightsCardWarning: { borderColor: 'rgba(249, 115, 22, 0.25)' },
    insightsHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    insightsList: { gap: 10 },
    insightItemGreen: {
      borderLeftWidth: 3,
      borderLeftColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.07)',
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    insightItemOrange: {
      borderLeftWidth: 3,
      borderLeftColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.07)',
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    insightTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
    insightDesc: { fontSize: 12, color: theme.subtext, lineHeight: 17 },
    emptyInlineText: { fontSize: 12.5, color: theme.tertiary },

    // Empty state
    emptyCard: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 32,
    },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    emptyText: { fontSize: 12, color: theme.subtext },

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

    // Confirm / filter modals (shared card look)
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
    filterOptionsList: { maxHeight: 320 },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    filterOptionRowActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
    filterOptionText: { fontSize: 13, color: theme.text, flex: 1, paddingRight: 8 },
    filterOptionTextActive: { color: theme.primary, fontWeight: '700' },
  });
}
