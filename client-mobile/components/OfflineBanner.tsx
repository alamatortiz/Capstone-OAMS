import { Text, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '@/utils/offlineCache';

// Shown at the top of a screen that's currently rendering from
// offlineCache.ts instead of a live fetch -- one shared component so the
// copy/treatment stays consistent everywhere it's used (student_transactions/
// student_announcement/student_faq.tsx) rather than three bespoke banners.
export default function OfflineBanner({
  cachedAt,
  theme,
}: {
  cachedAt: string | null;
  theme: { text: string; subtext: string; border: string };
}) {
  return (
    <View style={[styles.wrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
      <Text style={[styles.text, { color: theme.text }]}>
        You&apos;re offline — showing data from {cachedAt ? timeAgo(cachedAt) : 'your last visit'}.
      </Text>
    </View>
  );
}

const styles = {
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  } as ViewStyle,
  text: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  } as TextStyle,
};
