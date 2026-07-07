const pool = require("../db");

// Resolve admin -> department_id, or null if not found.
async function getAdminDepartmentId(adminId) {
  const [[row]] = await pool.query(
    `SELECT department_id FROM administrators WHERE admin_id = ?`,
    [adminId],
  );
  return row?.department_id ?? null;
}

module.exports = { getAdminDepartmentId };
