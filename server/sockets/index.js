const { Server } = require("socket.io");
const { verifyAuthToken } = require("../middleware/authMiddleware");
const { getAdminDepartmentId } = require("../utils/adminDept");
const pool = require("../db");

let io = null;

function userRoom(userId) {
  return `user:${userId}`;
}
function deptRoom(deptId) {
  return `dept:${deptId}`;
}
function slotRoom(slotId) {
  return `slot:${slotId}`;
}

async function joinStudentSlotRooms(socket, studentId) {
  const [rows] = await pool.query(
    `SELECT slot_id FROM queues WHERE student_id = ? AND status IN ('waiting','serving') AND slot_id IS NOT NULL`,
    [studentId],
  );
  rows.forEach((row) => socket.join(slotRoom(row.slot_id)));
}

async function joinStudentDeptRoom(socket, studentId) {
  const [[row]] = await pool.query(
    `SELECT department_id FROM students WHERE student_id = ?`,
    [studentId],
  );
  if (row?.department_id) socket.join(deptRoom(row.department_id));
}

function initSocketServer(server, options = {}) {
  io = new Server(server, {
    cors: options.cors || { origin: "*" },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const decoded = await verifyAuthToken(token);
      socket.user = decoded; // { userId, schoolId, role }
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId, role } = socket.user;
    socket.join(userRoom(userId));

    try {
      if (role === "admin") {
        const deptId = await getAdminDepartmentId(userId);
        if (deptId) socket.join(deptRoom(deptId));
      } else if (role === "student") {
        await joinStudentSlotRooms(socket, userId);
        await joinStudentDeptRoom(socket, userId);
      }
    } catch (err) {
      console.error("Socket room join error:", err.message);
    }

    socket.on("queue:rejoin-rooms", async () => {
      try {
        if (role === "student") await joinStudentSlotRooms(socket, userId);
      } catch (err) {
        console.error("Socket rejoin error:", err.message);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

function getIo() {
  return io;
}

function emitToSlot(slotId, event, payload) {
  if (!io || !slotId) return;
  io.to(slotRoom(slotId)).emit(event, payload);
}

function emitToDept(deptId, event, payload) {
  if (!io || !deptId) return;
  io.to(deptRoom(deptId)).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

function emitToAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = {
  initSocketServer,
  getIo,
  emitToSlot,
  emitToDept,
  emitToUser,
  emitToAll,
};
