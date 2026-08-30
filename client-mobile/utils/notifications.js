import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import api from './api';

// Local (foreground) notifications fire from socket event handlers while the
// app process is alive, same as web's toast notifications but as an OS
// notification-center entry instead of an in-app banner. Remote push (app
// closed/backgrounded) goes through registerPushToken() below, which POSTs
// this device's Expo push token to POST /api/auth/push-token; the server
// looks that up to actually send via Expo's push API when triggering one.
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

// Registers this device's Expo push token with the server so it can be
// targeted by server-triggered pushes (queue calls, etc). Only called once
// permission is confirmed granted -- a token nobody can send to is useless,
// and requesting one otherwise just adds noise to the OS permission prompt.
async function registerPushToken() {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/auth/push-token', { expoPushToken: data });
  } catch (err) {
    console.error('Push token registration failed:', err);
  }
}

export async function ensureNotificationPermission() {
  if (!Notifications || permissionRequested) return;
  permissionRequested = true;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    if (status === 'granted') {
      await registerPushToken();
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
