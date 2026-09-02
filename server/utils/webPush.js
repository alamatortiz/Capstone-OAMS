const webpush = require("web-push");
const pool = require("../db");

// Same architectural pattern as pushNotifications.js (Expo/mobile), but for
// the W3C Push API standard (browser Web Push) -- a separate, incompatible
// mechanism, so this is its own utility rather than a shared one.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Sends the same push to every browser/device this user has enabled
// notifications on. Fire-and-forget from the caller's perspective -- errors
// are handled per-subscription here, never thrown back up, since a failed
// push must never affect the already-committed notification it's announcing.
async function sendWebPush(userId, title, body, data = {}) {
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
