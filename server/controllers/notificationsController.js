const pool = require("../db");

const PAGE_SIZE = 20;
const VALID_TYPES = ["queue", "document", "appointment", "announcement"];

// Shared by student/faculty/admin notification routes -- each router keeps
// its own thin try/catch (their error-response shapes already differ from
// each other and that's left alone here), this just owns the query/data layer.
async function getNotifications(userId, { type, page } = {}) {
  const where = ["user_id = ?"];
  const params = [userId];
  if (VALID_TYPES.includes(type)) {
    where.push("type = ?");
    params.push(type);
  }
  const whereSql = where.join(" AND ");

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM notifications WHERE ${whereSql}`,
    params,
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [rows] = await pool.query(
    `SELECT notification_id, message, type, is_read, created_at
     FROM notifications WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );

  return {
    notifications: rows,
    total,
    page: pageNum,
    totalPages,
  };
}

async function markNotificationRead(userId, notificationId) {
  const [result] = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId],
  );
  return result.affectedRows;
}

async function markAllNotificationsRead(userId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
    [userId],
  );
}

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
