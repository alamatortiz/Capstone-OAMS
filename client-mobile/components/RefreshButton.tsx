import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Manual refresh for screens without complete live socket updates
// (Transaction History for all roles, professor Appointments). Mirrors web's
// client/src/components/RefreshButton.jsx; takes the screen's own header icon
// button style so it sits in line with the theme toggle and bell.
export default function RefreshButton({
  onPress,
  loading = false,
  style,
  color,
  label = 'Refresh',
}: {
  onPress: () => void;
  loading?: boolean;
  style: StyleProp<ViewStyle>;
  color: string;
  label?: string;
}) {
  return (
    <Pressable
      style={style}
      onPress={onPress}
      disabled={loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name="refresh" size={20} color={color} />}
    </Pressable>
  );
}
