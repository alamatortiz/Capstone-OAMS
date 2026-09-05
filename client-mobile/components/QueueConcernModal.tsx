import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Check, HelpCircle } from 'lucide-react-native';

// Prompts the student for an optional concern before joining a queue.
// Unlike QueueReasonModal (admin pause/stop/skip reasons, required text),
// this concern is optional -- confirming with empty text is allowed.
// Mirrors web's client/src/components/QueueConcernModal.jsx.
type QueueConcernModalStyles = {
  logoutOverlay: object;
  logoutModalCard: object;
  logoutIconCircle: object;
  logoutModalTitle: object;
  logoutModalDescription: object;
  logoutModalActions: object;
  logoutCancelBtn: object;
  logoutCancelBtnText: object;
  concernInput: object;
  concernConfirmBtn: object;
  concernConfirmBtnText: object;
};

type QueueConcernModalTheme = {
  tertiary: string;
  primary?: string;
  border?: string;
  text?: string;
};

export type UniversalServiceOption = { serviceId: number; serviceName: string };

export default function QueueConcernModal({
  visible,
  serviceName,
  concern,
  onChangeConcern,
  onCancel,
  onConfirm,
  submitting,
  theme,
  styles,
  // When present, this is a Universal Service Queue: the student must pick
  // which specific service they're here for before joining.
  universalServices = null,
  pickedServiceId = null,
  onPickService,
}: {
  visible: boolean;
  serviceName?: string;
  concern: string;
  onChangeConcern: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
  theme: QueueConcernModalTheme;
  styles: QueueConcernModalStyles;
  universalServices?: UniversalServiceOption[] | null;
  pickedServiceId?: number | null;
  onPickService?: (id: number) => void;
}) {
  const needsPick = Array.isArray(universalServices);
  const canConfirm = !submitting && (!needsPick || !!pickedServiceId);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.logoutOverlay}>
        <View style={styles.logoutModalCard}>
          <View style={[styles.logoutIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <HelpCircle size={26} color="#3b82f6" />
          </View>
          <Text style={styles.logoutModalTitle}>What&apos;s your concern?</Text>
          {needsPick ? (
            <Text style={styles.logoutModalDescription}>
              Joining the Universal Service Queue. Pick the specific service you need, then let
              the staff know why you&apos;re here.
            </Text>
          ) : serviceName ? (
            <Text style={styles.logoutModalDescription}>
              Joining the queue for {serviceName}. Let the staff know why you&apos;re here — this step is optional.
            </Text>
          ) : null}

          {needsPick && (
            <ScrollView style={{ maxHeight: 180, alignSelf: 'stretch', marginBottom: 8 }}>
              {universalServices!.map((s) => {
                const selected = s.serviceId === pickedServiceId;
                return (
                  <Pressable
                    key={s.serviceId}
                    onPress={() => onPickService?.(s.serviceId)}
                    disabled={submitting}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? (theme.primary ?? '#22c55e') : (theme.border ?? 'rgba(148,163,184,0.35)'),
                      backgroundColor: selected ? 'rgba(34,197,94,0.12)' : 'transparent',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: theme.text ?? '#0f172a', fontSize: 14, fontWeight: selected ? '700' : '500', flex: 1 }}>
                      {s.serviceName}
                    </Text>
                    {selected && <Check size={16} color={theme.primary ?? '#22c55e'} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <TextInput
            style={styles.concernInput}
            placeholder="Briefly describe why you're joining this queue (optional)"
            placeholderTextColor={theme.tertiary}
            value={concern}
            onChangeText={onChangeConcern}
            multiline
            maxLength={255}
            editable={!submitting}
          />
          <View style={styles.logoutModalActions}>
            <Pressable style={styles.logoutCancelBtn} onPress={onCancel} disabled={submitting}>
              <Text style={styles.logoutCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.concernConfirmBtn, !canConfirm && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={!canConfirm}
            >
              <Text style={styles.concernConfirmBtnText}>{submitting ? 'Joining…' : 'Join Queue'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
