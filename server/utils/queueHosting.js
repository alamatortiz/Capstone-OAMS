const pool = require("../db");

// Authorization core shared by the admin and faculty mounts of
// queueHostingRoutes.js. Both mounts run the SAME handlers, so every
// "may this person do this?" decision has to live in one place or the two
// roles will quietly drift apart.
//
// The two roles are deliberately not symmetric:
//
//   admin   — department-wide authority, including over queues a faculty
//             member is hosting in that department. The secretary remains
//             accountable for the office, so they can always step in.
//   faculty — only the slots they are personally hosting, and they may only
//             OPEN a queue for a service that has been delegated to them.
//
// Both roles' ids are PK-FKs onto users.user_id, so queue_slots.host_user_id
// can point at either without ambiguity.

// Resolves the caller to { userId, role, deptId }. deptId is null when the
// account has no department, which every caller must treat as "can't host".
async function resolveHostContext(user) {
  const userId = user.userId;
  if (user.role === "admin") {
    const [[row]] = await pool.query(
      `SELECT department_id FROM administrators WHERE admin_id = ?`,
      [userId],
    );
    return { userId, role: "admin", deptId: row?.department_id ?? null };
  }
  if (user.role === "faculty") {
    const [[row]] = await pool.query(
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

  if (host.role === "faculty") {
    // A faculty member runs their own line and nobody else's -- without this
    // any delegated faculty could call-next on the secretary's counter.
    if (slot.host_user_id !== host.userId) {
      await conn.rollback();
      res.status(403).json({ error: "You can only manage queues you are hosting" });
      return null;
    }
    return slot;
  }

  if (slot.department_id !== host.deptId) {
    await conn.rollback();
    res.status(403).json({ error: "You can only manage queues for your own department" });
    return null;
  }
  return slot;
}

// Which services this host may OPEN a queue for. An admin gets their whole
// department; a faculty member gets only what has been delegated to them and
// is still active.
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

// Guard for opening a queue: faculty must hold an active delegation for the
// service, and (defence in depth) it must sit in their own department.
async function canFacultyHostService(db, { facultyId, serviceId }) {
  const [[row]] = await db.query(
    `SELECT 1 AS ok
       FROM service_delegations sd
       JOIN services s ON sd.service_id = s.service_id
       JOIN faculty f ON f.faculty_id = sd.faculty_id
      WHERE sd.faculty_id = ? AND sd.service_id = ?
        AND sd.is_active = TRUE
        AND s.department_id = f.department_id
      LIMIT 1`,
    [facultyId, serviceId],
  );
  return !!row;
}

module.exports = {
  resolveHostContext,
  getHostableSlotOrRespond,
  getHostableServices,
  canFacultyHostService,
};
