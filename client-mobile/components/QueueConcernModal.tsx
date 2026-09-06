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

export type UniversalServiceOption = {
  serviceId: number;
  serviceName: string;
  description?: string | null;
  requirements?: any[];
  procedureSteps?: any[];
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
  const picked =
    needsPick && pickedServiceId
      ? universalServices!.find((s) => s.serviceId === pickedServiceId) ?? null
      : null;
  const pickedReqs: any[] = picked?.requirements ?? [];
  const pickedSteps: any[] = picked?.procedureSteps ?? [];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.logoutOverlay}>
        {/* Universal join needs the room of the doc-request dialog (maxWidth 400,
            maxHeight 85%). Applied inline only here so the shared logout-modal
            card style is untouched. */}
        <View style={[styles.logoutModalCard, needsPick && { maxWidth: 400, maxHeight: '88%' as const }]}>
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

          <ScrollView
            style={{ maxHeight: 400, alignSelf: 'stretch' }}
            keyboardShouldPersistTaps="handled"
          >
            {needsPick &&
              universalServices!.map((s) => {
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
                      borderColor: selected ? '#3b82f6' : (theme.border ?? 'rgba(148,163,184,0.35)'),
                      backgroundColor: selected ? 'rgba(59,130,246,0.12)' : 'transparent',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: theme.text ?? '#0f172a', fontSize: 14, fontWeight: selected ? '700' : '500', flex: 1 }}>
                      {s.serviceName}
                    </Text>
                    {selected && <Check size={16} color="#3b82f6" />}
                  </Pressable>
                );
              })}

            {picked && (!!picked.description || pickedReqs.length > 0 || pickedSteps.length > 0) && (
              <View
                style={{
                  alignSelf: 'stretch',
                  backgroundColor: 'rgba(59,130,246,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(59,130,246,0.2)',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 2,
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                {!!picked.description && (
                  <Text style={{ color: theme.tertiary, fontSize: 12.5, lineHeight: 18 }}>
                    {picked.description}
                  </Text>
                )}
                {pickedReqs.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: theme.text ?? '#0f172a', fontSize: 12.5, fontWeight: '700' }}>
                      Requirements
                    </Text>
                    {pickedReqs.map((req: any) => (
                      <View key={req.id ?? req.name} style={{ gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <Text style={{ color: theme.text ?? '#0f172a', fontSize: 13, fontWeight: '600', flex: 1 }}>
                            {req.name}
                          </Text>
                          <View
                            style={{
                              paddingVertical: 2,
                              paddingHorizontal: 8,
                              borderRadius: 6,
                              backgroundColor: req.isMandatory ? 'rgba(59,130,246,0.14)' : 'rgba(100,116,139,0.12)',
                              borderWidth: 1,
                              borderColor: req.isMandatory ? 'rgba(59,130,246,0.35)' : 'rgba(100,116,139,0.25)',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: req.isMandatory ? '#60a5fa' : theme.tertiary,
                              }}
                            >
                              {req.isMandatory ? 'Required' : 'Optional'}
                            </Text>
                          </View>
                        </View>
                        {!!req.description && (
                          <Text style={{ color: theme.tertiary, fontSize: 11.5, lineHeight: 16 }}>
                            {req.description}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {pickedSteps.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: theme.text ?? '#0f172a', fontSize: 12.5, fontWeight: '700' }}>
                      Steps
                    </Text>
                    {pickedSteps.map((step: any) => (
                      <View key={step.id ?? step.stepNumber} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: 'rgba(59,130,246,0.15)',
                            borderWidth: 1,
                            borderColor: 'rgba(59,130,246,0.35)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#60a5fa' }}>{step.stepNumber}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text ?? '#0f172a', fontSize: 13 }}>{step.title}</Text>
                          {!!step.description && (
                            <Text style={{ color: theme.tertiary, fontSize: 11.5, lineHeight: 16 }}>
                              {step.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
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
          </ScrollView>
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
