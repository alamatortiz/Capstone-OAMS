const pool = require("../db");

async function createNotification(userId, message) {
  if (!userId || !message) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
      [userId, message],
    );
  } catch (err) {
    console.error("Notification insert error:", err.message);
  }
}

module.exports = { createNotification };
