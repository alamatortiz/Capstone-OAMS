import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIsOnline } from '@/context/NetworkContext';
import { syncAllStudentOfflineData } from '@/utils/offlineSync';

// Fills the student's offline copies (announcements, transactions, FAQs) in
// the background, without waiting for each screen to be opened online first.
// Before this, a student who logged in and went offline a minute later (only
// ever seeing the dashboard) had nothing cached -- each screen only saved its
// copy on its own first online load, and logout wipes the cache.
//
// Runs on login / app start with a saved session, and on every offline ->
// online transition. Opening one of those screens online still refreshes its
// own copy as before. Students only -- the other roles have no offline cache.
export function useStudentOfflinePrefetch() {
  const { user, isAuthenticated } = useAuth();
  const isOnline = useIsOnline();
  const userId = user?.userId ?? null;
  const isStudent = isAuthenticated && user?.role === 'student';

  const lastUserRef = useRef<number | null>(null);
  const wasOnlineRef = useRef(isOnline);
  // Always the *current* student, so a sync that finishes after logout or an
  // account switch can tell it's stale and skip writing (logout already wiped
  // the cache; writing then would leak the previous account's data).
  const currentUserRef = useRef<number | null>(null);
  // Declared before the sync effect below so it's updated first on each commit.
  useEffect(() => {
    currentUserRef.current = isStudent ? userId : null;
  }, [isStudent, userId]);

  useEffect(() => {
    const cameOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!isStudent || !isOnline || userId === null) return;

    const newSession = lastUserRef.current !== userId;
    if (!newSession && !cameOnline) return;
    lastUserRef.current = userId;

    const syncedFor = userId;
    syncAllStudentOfflineData(() => currentUserRef.current === syncedFor);
  }, [isStudent, isOnline, userId]);

  // Logged out: forget the last user so logging back in (even as the same
  // student, whose cache logout just wiped) counts as a new session.
  useEffect(() => {
    if (!isAuthenticated) lastUserRef.current = null;
  }, [isAuthenticated]);
}
