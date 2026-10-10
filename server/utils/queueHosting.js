const pool = require("../db");

// Authorization core for queue hosting (admin) and the professor hand-off.
//
// Only the college office hosts queues. A professor never owns a slot; they
// are assigned to SERVICES (service_delegations), and the office passes them
// individual students for those services (queues.assigned_faculty_id) --
// see routes/facultyQueueRoutes.js. Legacy faculty-hosted slots (host_role =
// 'faculty', from before this change) are still department slots, so the
// office can manage them like any other.

// Resolves the caller to { userId, role, deptId }. deptId is null when the
// account has no department, which every caller must treat as "can't host".
//
// Inside a transaction, pass the transaction's connection as `db`: reading
// through `pool` there needs a SECOND connection while the first is held,
// which under load exhausts the pool and hangs the server (see
// utils/txConnection.js).
async function resolveHostContext(user, db = pool) {
  const userId = user.userId;
  if (user.role === "admin") {
    const [[row]] = await db.query(
      `SELECT department_id FROM administrators WHERE admin_id = ?`,
      [userId],
    );
    return { userId, role: "admin", deptId: row?.department_id ?? null };
  }
  if (user.role === "faculty") {
    const [[row]] = await db.query(
      `SELECT department_id FROM faculty WHERE faculty_id = ?`,
      [userId],
    );
    return { userId, role: "faculty", deptId: row?.department_id ?? null };
  }
  return { userId, role: user.role, deptId: null };
}

// Locks a slot and decides whether this host may act on it. Mirrors
// getOwnedSlotOrRespond's contract exactly (writes the error response and
// returns null on failure) so the extracted handlers could adopt it without
// restructuring their control flow.
async function getHostableSlotOrRespond(conn, res, { slotId, host }) {
  if (!Number.isInteger(slotId) || slotId <= 0) {
    await conn.rollback();
    res.status(404).json({ error: "Queue slot not found" });
    return null;
  }
  const [[slot]] = await conn.query(
    `SELECT qs.slot_id, qs.status, qs.department_id, qs.is_universal,
            qs.host_user_id, qs.host_role,
            CASE WHEN qs.is_universal THEN 'Universal Service Queue' ELSE s.service_name END AS service_name
     FROM queue_slots qs
     LEFT JOIN services s ON qs.service_id = s.service_id
     WHERE qs.slot_id = ? FOR UPDATE`,
    [slotId],
  );
  if (!slot) {
    await conn.rollback();
    res.status(404).json({ error: "Queue slot not found" });
    return null;
  }

  if (slot.department_id !== host.deptId) {
    await conn.rollback();
    res.status(403).json({ error: "You can only manage queues for your own department" });
    return null;
  }
  return slot;
}

// Services a user may work with: an admin's whole department (to host queues
// for), or for a faculty member only the services delegated to them and
// still active (to receive passed students for).
async function getHostableServices(host) {
  if (!host.deptId) return [];
  if (host.role === "faculty") {
    const [rows] = await pool.query(
      `SELECT s.service_id, s.service_name, s.description, s.department_id, l.location_name
         FROM service_delegations sd
         JOIN services s ON sd.service_id = s.service_id
         LEFT JOIN locations l ON s.location_id = l.location_id
        WHERE sd.faculty_id = ? AND sd.is_active = TRUE
        ORDER BY s.service_name`,
      [host.userId],
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT s.service_id, s.service_name, s.description, s.department_id, l.location_name
       FROM services s
       LEFT JOIN locations l ON s.location_id = l.location_id
      WHERE s.department_id = ?
      ORDER BY s.service_name`,
    [host.deptId],
  );
  return rows;
}

// May this faculty member receive students for this service? They need an
// active delegation for it, the service must sit in their own department
// (defence in depth), and their account must be active -- a suspended
// professor can't be handed anyone.
async function canFacultyHandleService(db, { facultyId, serviceId }) {
  const [[row]] = await db.query(
    `SELECT 1 AS ok
       FROM service_delegations sd
       JOIN services s ON sd.service_id = s.service_id
       JOIN faculty f ON f.faculty_id = sd.faculty_id
       JOIN users u ON u.user_id = f.faculty_id
      WHERE sd.faculty_id = ? AND sd.service_id = ?
        AND sd.is_active = TRUE
        AND s.department_id = f.department_id
        AND u.status = 'active'
      LIMIT 1`,
    [facultyId, serviceId],
  );
  return !!row;
}

module.exports = {
  resolveHostContext,
  getHostableSlotOrRespond,
  getHostableServices,
  canFacultyHandleService,
};
