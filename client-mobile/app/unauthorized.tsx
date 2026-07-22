import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function UnauthorizedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Unauthorized</Text>
        <Text style={styles.subtitle}>
          You don&apos;t have permission to view this page.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/login')}>
          <Text style={styles.btnText}>Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f0a' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#f0fdf4', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 10,
    backgroundColor: '#00a63e',
  },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
