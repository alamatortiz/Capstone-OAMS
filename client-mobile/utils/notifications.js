import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Local/foreground notifications only — no push tokens, no EAS build, no
// backend infra. Fires from socket event handlers while the app process is
// alive, same as web's toast notifications but as an OS notification-center
// entry instead of an in-app banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

export async function ensureNotificationPermission() {
  if (permissionRequested) return;
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
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (err) {
    console.error('Failed to schedule local notification:', err);
  }
}
