import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { connectSocket } from '@/utils/socket';
import api from '@/utils/api';

type NotificationBellTheme = {
  text: string;
  subtext: string;
  primary: string;
  card: string;
  border: string;
  iconBtnBg: string;
  iconBtnBorder: string;
};

type NotificationItem = {
  notification_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
};

// Ported from client/src/components/NotificationBell.jsx. Mirrors its data
// logic (same endpoints, same watched socket events, same 45s fallback poll)
// -- AppState replaces document.visibilityState, Modal replaces the CSS
// dropdown + mousedown outside-click listener.
const WATCHED_EVENTS = [
  'queue:called',
  'queue:served',
  'queue:uncalled',
  'queue:queue-stopped',
  'appointment:status-updated',
  'appointment:slot-updated',
  'document:status-updated',
];

const FALLBACK_POLL_INTERVAL_MS = 45000;

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationBell({
  endpointBase,
  theme,
}: {
  endpointBase: 'student' | 'faculty';
  theme: NotificationBellTheme;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationsRef = useRef<NotificationItem[]>([]);
  notificationsRef.current = notifications;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(`/${endpointBase}/notifications`);
      setNotifications(res.data.notifications);
    } catch {
      // Silent -- a failed notification fetch shouldn't disrupt the screen.
    }
  }, [endpointBase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;

    WATCHED_EVENTS.forEach((event) => socket.on(event, fetchNotifications));
    return () => {
      WATCHED_EVENTS.forEach((event) => socket.off(event, fetchNotifications));
    };
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchNotifications();
    });
    return () => sub.remove();
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') fetchNotifications();
    }, FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.patch(`/${endpointBase}/notifications/${id}/read`);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)),
      );
    }
  };

  const markAllRead = async () => {
    const previous = notificationsRef.current;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch(`/${endpointBase}/notifications/read-all`);
    } catch {
      setNotifications(previous);
    }
  };

  const styles = createStyles(theme);

  return (
    <>
      <Pressable style={styles.iconBtn} onPress={() => setOpen(true)} hitSlop={8}>
        <Ionicons name="notifications-outline" size={20} color={theme.text} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable onPress={markAllRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => String(item.notification_id)}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.item, !item.is_read && styles.itemUnread]}
                  onPress={() => !item.is_read && markRead(item.notification_id)}
                >
                  <Text style={styles.itemMessage}>{item.message}</Text>
                  <Text style={styles.itemTime}>{formatTimestamp(item.created_at)}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: NotificationBellTheme) {
  return StyleSheet.create({
    iconBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: theme.iconBtnBg,
      borderWidth: 1,
      borderColor: theme.iconBtnBorder,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 3,
      borderRadius: 8,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 60,
      paddingRight: 16,
    },
    panel: {
      width: 300,
      maxHeight: 380,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    markAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    list: {
      maxHeight: 320,
    },
    emptyText: {
      padding: 20,
      textAlign: 'center',
      fontSize: 13,
      color: theme.subtext,
    },
    item: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    itemUnread: {
      backgroundColor: theme.iconBtnBg,
    },
    itemMessage: {
      fontSize: 13,
      color: theme.text,
      marginBottom: 4,
    },
    itemTime: {
      fontSize: 11,
      color: theme.subtext,
    },
  });
}
