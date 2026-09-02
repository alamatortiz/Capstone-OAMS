const pool = require("../db");
const { sendWebPush } = require("./webPush");

// `type` is required (not defaulted) so every call site states its category
// explicitly -- a forgotten conversion fails loudly here instead of silently
// miscategorizing a notification under some other type.
//
// Also fires a browser Web Push notification for whichever devices this
// user has subscribed on -- fire-and-forget, since sendWebPush already
// no-ops for any user with zero subscriptions (every non-student role,
// until a later round adds their own opt-in UI) and never throws back up.
// Hooking it here rather than at each of this function's ~15+ call sites
// means every existing notification type gets push coverage for free.
async function createNotification(userId, message, type) {
  if (!userId || !message || !type) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
      [userId, message, type],
    );
    sendWebPush(userId, "OAMS", message, { type }).catch((err) =>
      console.error("Web push dispatch error:", err.message),
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
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES ?`,
      [values],
    );
    ids.forEach((id) =>
      sendWebPush(id, "OAMS", message, { type }).catch((err) =>
        console.error("Web push dispatch error:", err.message),
      ),
    );
  } catch (err) {
    console.error("Notification batch insert error:", err.message);
  }
}

async function notifyDepartmentAdmins(departmentId, message, type) {
  if (!departmentId) return;
  try {
    const [rows] = await pool.query(
      `SELECT admin_id AS user_id FROM administrators WHERE department_id = ?`,
      [departmentId],
    );
    await createNotificationsBatch(
      rows.map((row) => row.user_id),
      message,
      type,
    );
  } catch (err) {
    console.error("Notify department admins error:", err.message);
  }
}

module.exports = {
  createNotification,
  createNotificationsBatch,
  notifyDepartmentAdmins,
};
