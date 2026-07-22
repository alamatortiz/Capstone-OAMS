import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shared by admin_queue_hosting.tsx (pause/close) and admin_queue.tsx
// (pause/close/skip) -- collects a required, admin-authored reason shown to
// the affected student(s). Extracted from admin_queue_hosting.tsx so both
// screens use one implementation instead of drifting, mirroring web's
// single client/src/components/QueueReasonModal.jsx.
type ReasonModalStyles = {
  modalOverlay: object;
  confirmModalCard: object;
  confirmIconCircle: object;
  confirmTitle: object;
  confirmDescription: object;
  reasonInput: object;
  confirmActionsRow: object;
  cancelBtn: object;
  cancelBtnText: object;
  confirmBtn: object;
  confirmBtnText: object;
  formSubmitBtnDisabled: object;
};

type ReasonModalTheme = {
  tertiary: string;
};

export default function QueueReasonModal({
  visible,
  title,
  message,
  confirmText,
  confirmColor,
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
  theme,
  styles,
  submitting,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
  reason: string;
  onChangeReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  theme: ReasonModalTheme;
  styles: ReasonModalStyles;
  submitting: boolean;
}) {
  const canConfirm = !submitting && reason.trim().length > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalCard}>
          <View style={[styles.confirmIconCircle, { backgroundColor: `${confirmColor}26` }]}>
            <Ionicons name="alert-circle-outline" size={26} color={confirmColor} />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmDescription}>{message}</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter a reason (required)..."
            placeholderTextColor={theme.tertiary}
            value={reason}
            onChangeText={onChangeReason}
            multiline
            editable={!submitting}
          />
          <View style={styles.confirmActionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: confirmColor }, !canConfirm && styles.formSubmitBtnDisabled]}
              onPress={onConfirm}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
