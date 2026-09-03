import AsyncStorage from '@react-native-async-storage/async-storage';

// Generic JSON cache for "nice to have offline" data (transactions,
// announcements, FAQs) -- deliberately NOT used for queues, document
// requests, appointments, or anything else that needs to reflect
// real-time/interactive state; those stay network-only. Each screen owns
// its own key and decides what shape to store (usually the same object its
// fetch function already builds), this module only handles the
// read/write/timestamp plumbing so that decision doesn't get duplicated.
//
// AsyncStorage over expo-secure-store here: SecureStore is iOS-Keychain-
// backed with a small practical per-item size limit, fine for a JWT/user
// blob (see AuthContext.tsx) but not meant for a page of transactions or a
// list of announcements.
const PREFIX = 'oams:cache:';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: string; // ISO timestamp
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { data, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch (err) {
    // Fire-and-forget by design -- a failed cache write should never
    // interrupt the screen that just successfully fetched live data.
    console.error(`offlineCache: failed to write "${key}":`, err);
  }
}

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch (err) {
    console.error(`offlineCache: failed to read "${key}":`, err);
    return null;
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch (err) {
    console.error(`offlineCache: failed to clear "${key}":`, err);
  }
}

// Short relative-time string for "showing data from X ago" banners --
// deliberately coarse (minutes/hours/days), this isn't a live-updating clock.
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const CACHE_KEYS = {
  studentTransactions: 'student:transactions',
  studentAnnouncements: 'student:announcements',
  studentFaqs: 'student:faqs',
} as const;
