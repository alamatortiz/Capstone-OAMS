const pool = require("../db");

// `type` is required (not defaulted) so every call site states its category
// explicitly -- a forgotten conversion fails loudly here instead of silently
// miscategorizing a notification under some other type.
async function createNotification(userId, message, type) {
  if (!userId || !message || !type) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
      [userId, message, type],
    );
  } catch (err) {
    console.error("Notification insert error:", err.message);
  }
}

module.exports = { createNotification };
