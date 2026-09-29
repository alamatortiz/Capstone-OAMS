import api from './api';
import { writeCache, fetchAllPages, CACHE_KEYS } from './offlineCache';

// Fills the student's offline copies (see offlineCache.ts). Shared by the
// screens themselves (student_announcement.tsx / student_transactions.tsx /
// student_faq.tsx) and by useStudentOfflinePrefetch, which runs these right
// after login and on every reconnect -- so the copies exist even if the
// student goes offline before ever opening those screens.
//
// Each stores exactly the raw API list the screen reads back; the screens do
// all filtering/paging locally on that copy. `stillCurrent` lets a caller
// drop a result that lands after the session changed (e.g. logout ran mid-
// fetch and already wiped the cache) instead of writing it back.

type StillCurrent = () => boolean;
const always: StillCurrent = () => true;

export async function syncStudentAnnouncements(stillCurrent: StillCurrent = always) {
  const all = await fetchAllPages(async (p) => {
    const { data } = await api.get('/student/announcements', { params: { category: 'all', page: p } });
    return { items: data.announcements ?? [], totalPages: data.totalPages ?? 1 };
  }, 30);
  if (stillCurrent()) await writeCache(CACHE_KEYS.studentAnnouncementsAll, all);
}

export async function syncStudentTransactions(stillCurrent: StillCurrent = always) {
  const all = await fetchAllPages(async (p) => {
    const { data } = await api.get('/student/transactions', { params: { limit: 100, page: p } });
    return { items: data.transactions ?? [], totalPages: data.totalPages ?? 1 };
  }, 30);
  if (stillCurrent()) await writeCache(CACHE_KEYS.studentTransactionsAll, all);
}

export async function syncStudentFaqs(stillCurrent: StillCurrent = always) {
  const { data } = await api.get('/student/faqs');
  if (stillCurrent()) await writeCache(CACHE_KEYS.studentFaqs, data.faqs ?? []);
}

// All three in parallel; one failing (e.g. a flaky connection mid-sync)
// doesn't stop the others.
export async function syncAllStudentOfflineData(stillCurrent: StillCurrent = always) {
  const results = await Promise.allSettled([
    syncStudentAnnouncements(stillCurrent),
    syncStudentTransactions(stillCurrent),
    syncStudentFaqs(stillCurrent),
  ]);
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('Offline prefetch failed:', r.reason);
  });
}
