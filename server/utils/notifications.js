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

// Same-message fan-out to many users (e.g. an announcement broadcast to a
// whole department) as a single multi-row INSERT instead of one round trip
// per user -- at seed scale (~100 users) createNotification()'s per-row
// loop is harmless, but it doesn't hold up as a pattern: N concurrent
// fire-and-forget inserts against a 10-connection pool (see db.js) means N
// queued queries competing with whatever else is hitting the API at that
// moment, when this does the same job in one query with no contention.
async function createNotificationsBatch(userIds, message, type) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0 || !message || !type) return;
  try {
    const values = ids.map((id) => [id, message, type]);
    await pool.query(`INSERT INTO notifications (user_id, message, type) VALUES ?`, [values]);
  } catch (err) {
    console.error("Notification batch insert error:", err.message);
  }
}

module.exports = { createNotification, createNotificationsBatch };
