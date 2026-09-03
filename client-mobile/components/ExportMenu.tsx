import { useState } from 'react';
import { Modal, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shared CSV/PDF export trigger + choice sheet for the three transaction
// screens (student/professor/admin) -- mirrors web's client/src/components/
// ExportMenu.jsx (a hover dropdown there; a small confirm-style Modal here,
// matching every other "pick one of a few options" sheet already in this
// codebase). `triggerStyle`/`triggerTextStyle` let each screen keep its own
// existing export button look (professor_transactions.tsx's `exportBtn`)
// instead of this component imposing its own -- only the choice sheet is new.
type ExportMenuTheme = {
  text: string;
  subtext: string;
  card: string;
  border: string;
};

export default function ExportMenu({
  theme,
  label = 'Export',
  disabled = false,
  busy = false,
  triggerStyle,
  triggerTextStyle,
  onExportCsv,
  onExportPdf,
}: {
  theme: ExportMenuTheme;
  label?: string;
  disabled?: boolean;
  busy?: boolean;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerTextStyle?: StyleProp<TextStyle>;
  onExportCsv: () => void;
  onExportPdf: () => void;
}) {
  const [open, setOpen] = useState(false);

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <Pressable style={triggerStyle} onPress={() => setOpen(true)} disabled={disabled}>
        <Ionicons name="download-outline" size={14} color={theme.text} />
        <Text style={triggerTextStyle}>{busy ? 'Exporting…' : label}</Text>
        <Ionicons name="chevron-down-outline" size={12} color={theme.text} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={exportOverlayStyle} onPress={() => setOpen(false)}>
          <View style={[exportCardStyle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[exportTitleStyle, { color: theme.text }]}>Export Transactions</Text>
            <Pressable
              style={({ pressed }) => [exportItemStyle, { borderColor: theme.border }, pressed && { opacity: 0.6 }]}
              onPress={() => choose(onExportCsv)}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.text} />
              <Text style={[exportItemTextStyle, { color: theme.text }]}>Export as CSV</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [exportItemStyle, { borderColor: theme.border }, pressed && { opacity: 0.6 }]}
              onPress={() => choose(onExportPdf)}
            >
              <Ionicons name="document-attach-outline" size={18} color={theme.text} />
              <Text style={[exportItemTextStyle, { color: theme.text }]}>Export as PDF</Text>
            </Pressable>
            <Pressable style={exportCloseStyle} onPress={() => setOpen(false)}>
              <Text style={[exportCloseTextStyle, { color: theme.subtext }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const exportOverlayStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.6)',
  padding: 24,
};
const exportCardStyle: ViewStyle = {
  width: '100%',
  maxWidth: 320,
  borderWidth: 1,
  borderRadius: 16,
  padding: 16,
};
const exportTitleStyle: TextStyle = { fontSize: 15, fontWeight: '800', marginBottom: 10 };
const exportItemStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 4,
  borderTopWidth: 1,
};
const exportItemTextStyle: TextStyle = { fontSize: 13.5, fontWeight: '600' };
const exportCloseStyle: ViewStyle = { alignItems: 'center', paddingVertical: 10, marginTop: 4 };
const exportCloseTextStyle: TextStyle = { fontSize: 13, fontWeight: '700' };
