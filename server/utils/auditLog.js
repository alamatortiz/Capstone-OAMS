const pool = require("../db");

// Shared by routes/adminRoutes.js and routes/internal/sa.js.
async function logAudit(adminId, action, targetTable, targetRecordId, oldValues, newValues) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, target_table, target_record_id, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        targetTable,
        targetRecordId ?? null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ],
    );
  } catch (e) {
    console.error("Audit log write error:", e.message);
  }
}

module.exports = { logAudit };
