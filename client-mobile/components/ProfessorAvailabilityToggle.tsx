import { Switch, Text, View } from 'react-native';

// The Available/Unavailable row shown in every professor screen's nav
// drawer, between the profile block and the nav item list -- lifted out of
// professor_dashboard.tsx (see useProfessorAvailability.ts for the paired
// state/logic) so it isn't duplicated per-screen. Takes the screen's own
// `styles` object like QueueReasonModal/ExportMenu/OfflineBanner do, so each
// screen keeps its own drawer's visual language.
export default function ProfessorAvailabilityToggle({
  isAvailable,
  onToggle,
  styles,
}: {
  isAvailable: boolean;
  onToggle: (value: boolean) => void;
  styles: { availabilityRow: object; availabilityLabel: object };
}) {
  return (
    <View style={styles.availabilityRow}>
      <Text style={styles.availabilityLabel}>{isAvailable ? 'Available' : 'Unavailable'}</Text>
      <Switch
        value={isAvailable}
        onValueChange={onToggle}
        trackColor={{ false: '#3f3f46', true: '#22c55e' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
