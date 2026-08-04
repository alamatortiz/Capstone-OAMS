const pool = require("../db");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Sends the same push to every device this user is registered on (a user can
// be logged in on more than one). Expo's endpoint accepts a batch in one
// call; per-token failures (stale/invalid tokens) come back in its response
// body rather than as a thrown error, so they're not handled individually
// here -- pruning dead tokens can be added later if it becomes worth doing.
async function sendPushNotification(userId, title, body, data = {}) {
  const [rows] = await pool.query(
    `SELECT expo_push_token FROM push_tokens WHERE user_id = ?`,
    [userId],
  );
  if (rows.length === 0) return;

  const messages = rows.map((row) => ({
    to: row.expo_push_token,
    title,
    body,
    data,
    sound: "default",
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Push notification send error:", err.message);
  }
}

module.exports = { sendPushNotification };
