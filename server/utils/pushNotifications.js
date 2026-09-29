const pool = require("../db");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Sends the same push to every device this user is registered on (a user can
// be logged in on more than one).
//
// One request PER TOKEN, not one batch: Expo rejects an entire batch with
// PUSH_TOO_MANY_EXPERIENCE_IDS when its tokens come from different Expo
// projects -- which happened for real when the mobile app moved to a new Expo
// account, leaving users with tokens from both the old and new project, so
// nobody got anything. Users only have a handful of devices, so the extra
// requests are negligible.
//
// Expo reports per-device failures inside the response body (a "ticket"), not
// as an HTTP error, so each one is read: DeviceNotRegistered (app uninstalled
// or token rotated) removes the stale token; anything else is logged.
async function sendToToken(token, title, body, data) {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // channelId "default" = the HIGH-importance, sound-on channel the app
      // creates (client-mobile/utils/notifications.js). Without it Android put
      // pushes on Expo's silent fallback channel. priority "high" so a queue
      // call isn't held back by battery-saving (Doze) delivery.
      body: JSON.stringify({ to: token, title, body, data, sound: "default", channelId: "default", priority: "high" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Push notification request rejected:", res.status, JSON.stringify(json.errors ?? json).slice(0, 300));
      return;
    }
    const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
    if (ticket?.status === "error") {
      if (ticket.details?.error === "DeviceNotRegistered") {
        await pool.query(`DELETE FROM push_tokens WHERE expo_push_token = ?`, [token]);
      } else {
        console.error("Push notification ticket error:", ticket.details?.error || ticket.message);
      }
    }
  } catch (err) {
    console.error("Push notification send error:", err.message);
  }
}

async function sendPushNotification(userId, title, body, data = {}) {
  const [rows] = await pool.query(
    `SELECT expo_push_token FROM push_tokens WHERE user_id = ?`,
    [userId],
  );
  if (rows.length === 0) return;
  await Promise.all(rows.map((row) => sendToToken(row.expo_push_token, title, body, data)));
}

module.exports = { sendPushNotification };
