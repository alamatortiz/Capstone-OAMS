import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shareFile, type DownloadedFile } from '@/utils/openAttachment';

// Full-screen in-app image preview (web FilePreviewModal's image branch).
// Deliberately an absolute-fill View, NOT a <Modal>: several call sites open
// it from inside an existing Modal, and two stacked native Modals break touch
// handling on this app's new architecture (same pattern as
// admin_scan_document.tsx's in-Modal confirm overlay). Place it last inside
// the screen root, or inside the Modal it's opened from.
export default function ImagePreviewOverlay({
  file,
  onClose,
}: {
  file: DownloadedFile | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Android back button closes the preview instead of leaving the screen.
  useEffect(() => {
    if (!file) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [file, onClose]);

  if (!file) return null;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title} numberOfLines={1}>
          {file.filename}
        </Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => shareFile(file).catch((err) => console.error('Share failed:', err))}
          hitSlop={8}
          accessibilityLabel="Download or share"
        >
          <Ionicons name="download-outline" size={22} color="#ffffff" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close preview">
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
      </View>
      <Image source={{ uri: file.uri }} style={styles.image} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    elevation: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { flex: 1, color: '#ffffff', fontSize: 14, fontWeight: '600' },
  iconBtn: { padding: 6 },
  image: { flex: 1, width: '100%' },
});
