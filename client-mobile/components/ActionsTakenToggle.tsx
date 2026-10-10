import { useState } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Collapsed-by-default "Actions Taken" note for an appointment row in
// Transaction History, so long notes don't stretch every row. Mirrors web's
// client/src/components/ActionsTakenToggle.jsx. Takes the screen's own
// box/text/meta styles, like QueueReasonModal/ExportMenu do.
export default function ActionsTakenToggle({
  text,
  meta,
  boxStyle,
  textStyle,
  metaStyle,
  color = '#a855f7',
}: {
  text: string;
  meta?: string | null;
  boxStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  metaStyle: StyleProp<TextStyle>;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={boxStyle}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Ionicons name="chatbubble-outline" size={13} color={color} />
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color }}>Actions Taken</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={color} />
      </Pressable>
      {open && (
        <>
          <Text style={textStyle}>{text}</Text>
          {meta ? <Text style={metaStyle}>{meta}</Text> : null}
        </>
      )}
    </View>
  );
}
