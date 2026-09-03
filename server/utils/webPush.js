const webpush = require("web-push");
const pool = require("../db");

// Same architectural pattern as pushNotifications.js (Expo/mobile), but for
// the W3C Push API standard (browser Web Push) -- a separate, incompatible
// mechanism, so this is its own utility rather than a shared one.
//
// web-push throws synchronously at require-time if any VAPID var is missing
// -- that used to crash the ENTIRE server on boot (a misconfigured/missing
// env var on one unrelated feature took down the whole API). Guard it and
// degrade to a no-op instead: web push just won't send, everything else
// keeps working.
const vapidConfigured =
  !!process.env.VAPID_SUBJECT && !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
} else {
  console.error(
    "Web push disabled: VAPID_SUBJECT/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not fully set. " +
      "Browser push notifications will silently no-op until these are configured.",
  );
}

// Sends the same push to every browser/device this user has enabled
// notifications on. Fire-and-forget from the caller's perspective -- errors
// are handled per-subscription here, never thrown back up, since a failed
// push must never affect the already-committed notification it's announcing.
async function sendWebPush(userId, title, body, data = {}) {
  if (!vapidConfigured) return;

  const [rows] = await pool.query(
    `SELECT subscription_id, endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ?`,
    [userId],
  );
  if (rows.length === 0) return;

  await Promise.all(
    rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, data }));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or was revoked by the browser -- prune it.
          // (pushNotifications.js left this as a future TODO for Expo
          // tokens; doing it properly here from day one.)
          await pool
            .query(`DELETE FROM web_push_subscriptions WHERE subscription_id = ?`, [row.subscription_id])
            .catch(() => {});
        } else {
          console.error("Web push send error:", err.message);
        }
      }
    }),
  );
}

module.exports = { sendWebPush };
