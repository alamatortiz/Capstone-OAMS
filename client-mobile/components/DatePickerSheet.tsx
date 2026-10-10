import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';

// Drop-in replacement for <DateTimePicker mode="date"> that behaves on iOS.
//
// Android: the native picker is itself a dialog that fires onChange once and
// closes, so it is passed straight through.
// iOS: the raw component renders inline/compact and fires onChange on every
// wheel movement, so screens that hide it on the first onChange made it
// unusable. Here it is a spinner that only reports the final value when the
// user taps Done ({type:'set'}) or Cancel ({type:'dismissed'}). Rendered in
// place (not in its own <Modal>) because several callers sit inside form
// Modals and iOS cannot present a Modal on top of another Modal.
export default function DatePickerSheet({
  value,
  minimumDate,
  maximumDate,
  onChange,
}: {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
}) {
  const { isDarkMode } = useTheme();
  const [draft, setDraft] = useState(value);

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={onChange}
      />
    );
  }

  const fg = isDarkMode ? '#e5e7eb' : '#111827';
  const border = isDarkMode ? '#3f3f46' : '#d4d4d8';
  const emit = (type: 'set' | 'dismissed', date?: Date) =>
    onChange({ type, nativeEvent: { timestamp: (date ?? draft).getTime(), utcOffset: 0 } } as DateTimePickerEvent, date);

  return (
    <View
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
      }}
    >
      <DateTimePicker
        value={draft}
        mode="date"
        display="spinner"
        themeVariant={isDarkMode ? 'dark' : 'light'}
        textColor={fg}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(_e, d) => {
          if (d) setDraft(d);
        }}
      />
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: border }}>
        <Pressable style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }} onPress={() => emit('dismissed')}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>Cancel</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: border }}
          onPress={() => emit('set', draft)}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#3b82f6' }}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
