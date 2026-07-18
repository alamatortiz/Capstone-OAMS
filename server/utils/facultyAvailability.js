const pool = require("../db");
const { getManilaDateString, getManilaTimeString } = require("./dateTime");

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function toTimeStr(val) {
  if (!val) return "00:00:00";
  const s = String(val);
  return s.length === 8 ? s : s.slice(0, 8).padEnd(8, "0");
}

function addOneHour(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Single source of truth for "is this faculty member available right now" --
// a professor is unavailable if they've toggled themselves unavailable, or
// have no consultation-hours schedule for today's weekday; busy if currently
// in an approved appointment window; available otherwise. Used by both the
// admin dashboard summary and the dedicated Faculty Availability page so
// they can never disagree with each other.
async function getFacultyAvailabilityToday(deptId) {
  const [facultyList] = await pool.query(
    `SELECT
       f.faculty_id,
       CONCAT(f.first_name, ' ', f.last_name) AS name,
       f.position,
       f.email,
       f.availability_status,
       d.department_name,
       d.department_abbreviation
     FROM faculty f
     JOIN departments d ON f.department_id = d.department_id
     WHERE f.department_id = ?
     ORDER BY f.last_name, f.first_name`,
    [deptId],
  );

  if (facultyList.length === 0) return [];

  const facultyIds = facultyList.map((f) => f.faculty_id);
  const manilaToday = getManilaDateString();

  const [availabilityRows] = await pool.query(
    `SELECT faculty_id, start_time, end_time, location
     FROM faculty_availability
     WHERE faculty_id IN (?) AND day_of_week = DAYNAME(?)
     ORDER BY faculty_id, start_time`,
    [facultyIds, manilaToday],
  );

  const [appointmentRows] = await pool.query(
    `SELECT
       a.faculty_id,
       a.appointment_time,
       a.status
     FROM appointments a
     WHERE a.faculty_id IN (?)
       AND a.appointment_date = ?
       AND a.status IN ('pending', 'approved')
     ORDER BY a.faculty_id, a.appointment_time`,
    [facultyIds, manilaToday],
  );

  const availMap = {};
  availabilityRows.forEach((row) => {
    if (!availMap[row.faculty_id]) availMap[row.faculty_id] = [];
    availMap[row.faculty_id].push(row);
  });

  const apptMap = {};
  appointmentRows.forEach((row) => {
    if (!apptMap[row.faculty_id]) apptMap[row.faculty_id] = [];
    apptMap[row.faculty_id].push(row);
  });

  const currentTimeStr = getManilaTimeString();

  return facultyList.map((f) => {
    const avails = availMap[f.faculty_id] || [];
    const appts = apptMap[f.faculty_id] || [];

    const isBusy = appts.some((a) => {
      if (a.status !== "approved") return false;
      const start = toTimeStr(a.appointment_time);
      const end = addOneHour(start);
      return currentTimeStr >= start && currentTimeStr < end;
    });

    const schedule = avails.map((slot) => {
      const slotStart = toTimeStr(slot.start_time);
      const slotEnd = toTimeStr(slot.end_time);
      const hasAppt = appts.some((a) => {
        const apptTime = toTimeStr(a.appointment_time);
        return apptTime >= slotStart && apptTime < slotEnd;
      });
      return {
        time: `${formatTime(slotStart)} - ${formatTime(slotEnd)}`,
        activity: hasAppt ? "Consultation" : "Available",
        location: slot.location || f.department_name,
        status: hasAppt ? "booked" : "free",
      };
    });

    let nextAvailableSlot = null;
    for (const slot of avails) {
      const slotStart = toTimeStr(slot.start_time);
      const slotEnd = toTimeStr(slot.end_time);
      const hasAppt = appts.some((a) => {
        const apptTime = toTimeStr(a.appointment_time);
        return apptTime >= slotStart && apptTime < slotEnd;
      });
      if (!hasAppt && slotStart > currentTimeStr) {
        nextAvailableSlot = `${formatTime(slotStart)} - ${formatTime(slotEnd)}`;
        break;
      }
    }

    // The professor's own toggle (faculty.availability_status) takes
    // precedence over whatever the schedule/appointments would otherwise
    // compute -- if they've marked themselves unavailable, admin sees that.
    const isToggledUnavailable = f.availability_status === "unavailable";

    const status = isToggledUnavailable
      ? "unavailable"
      : isBusy
      ? "busy"
      : avails.length === 0
      ? "unavailable"
      : "available";

    return {
      id: f.faculty_id,
      name: f.name,
      position: f.position,
      college: `${f.department_name} (${f.department_abbreviation})`,
      status,
      currentActivity: isToggledUnavailable
        ? "Marked unavailable by professor"
        : isBusy
        ? "In consultation with student"
        : null,
      nextAvailableSlot: isToggledUnavailable
        ? "Unavailable"
        : nextAvailableSlot ||
          (avails.length === 0 ? "No schedule today" : "No more slots today"),
      email: f.email,
      todaySchedule: schedule,
    };
  });
}

module.exports = { getFacultyAvailabilityToday, formatTime };
