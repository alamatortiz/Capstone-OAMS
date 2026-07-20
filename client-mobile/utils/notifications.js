import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Local/foreground notifications only — no push tokens, no EAS build, no
// backend infra. Fires from socket event handlers while the app process is
// alive, same as web's toast notifications but as an OS notification-center
// entry instead of an in-app banner.
//
// Since Expo SDK 53, `expo-notifications` throws the moment it's IMPORTED
// on Android inside Expo Go — loading the module wires up a push-token
// listener as a side effect, and Expo Go no longer supports push tokens at
// all (a dev-client-only feature now). We never use push tokens, but the
// package doesn't know that until it's already crashed. So: only `require`
// it when NOT running inside Expo Go. Under Expo Go, both exports below
// become no-ops instead of throwing; a real dev client picks up the real
// implementation automatically.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let permissionRequested = false;

export async function ensureNotificationPermission() {
  if (!Notifications || permissionRequested) return;
  permissionRequested = true;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch (err) {
    console.error('Notification permission request failed:', err);
  }
}

export async function notify(title, body) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (err) {
    console.error('Failed to schedule local notification:', err);
  }
}
