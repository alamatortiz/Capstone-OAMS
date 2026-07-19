import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '../context/AuthContext';
import { QueueProvider } from '../context/QueueContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueueProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <Toast />
      </QueueProvider>
    </AuthProvider>
  );
}
