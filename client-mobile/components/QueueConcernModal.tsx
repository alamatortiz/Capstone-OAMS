import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { HelpCircle } from 'lucide-react-native';

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
};

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
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.logoutOverlay}>
        <View style={styles.logoutModalCard}>
          <View style={[styles.logoutIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <HelpCircle size={26} color="#3b82f6" />
          </View>
          <Text style={styles.logoutModalTitle}>What&apos;s your concern?</Text>
          {serviceName && (
            <Text style={styles.logoutModalDescription}>
              Joining the queue for {serviceName}. Let the staff know why you&apos;re here — this step is optional.
            </Text>
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
            <Pressable style={styles.concernConfirmBtn} onPress={onConfirm} disabled={submitting}>
              <Text style={styles.concernConfirmBtnText}>{submitting ? 'Joining…' : 'Join Queue'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
