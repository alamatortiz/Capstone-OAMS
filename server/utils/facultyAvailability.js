const pool = require("../db");
const { getManilaDateString, getManilaTimeString, formatTime12h: formatTime } = require("./dateTime");

function toTimeStr(val) {
  if (!val) return "00:00:00";
  const s = String(val);
  return s.length === 8 ? s : s.slice(0, 8).padEnd(8, "0");
}

// Is this professor mid-appointment right now? Uses the *real* booked
// availability window's end time (any length), not a fixed guess -- an
// appointment only has a start time on its own, so this finds the
// faculty_availability slot it was booked into and uses that slot's actual
// end_time as the busy cutoff. Pure/exported for unit testing.
function computeIsBusy(avails, appts, currentTimeStr) {
  return appts.some((a) => {
    if (a.status !== "approved") return false;
    const apptTime = toTimeStr(a.appointment_time);
    const matchingSlot = avails.find((slot) => {
      const slotStart = toTimeStr(slot.start_time);
      const slotEnd = toTimeStr(slot.end_time);
      return apptTime >= slotStart && apptTime < slotEnd;
    });
    if (!matchingSlot) return false; // window no longer exists (e.g. deleted) -- don't guess
    const slotEnd = toTimeStr(matchingSlot.end_time);
    return currentTimeStr >= apptTime && currentTimeStr < slotEnd;
  });
}

// Single source of truth for "is this faculty member available right now" --
// a professor is unavailable if they've toggled themselves unavailable, or
// have no consultation-hours schedule for today's weekday; busy if currently
// in an approved appointment window; available otherwise. Used by both the
// admin dashboard summary and the dedicated Faculty Availability page so
// they can never disagree with each other.
async function getFacultyAvailabilityToday(deptId, { includeWeekly = false } = {}) {
  const [facultyList] = await pool.query(
    `SELECT
       f.faculty_id,
       CONCAT(f.first_name, ' ', f.last_name) AS name,
       f.position,
       f.specialization,
       f.email,
       f.availability_status,
       EXISTS (
         SELECT 1 FROM user_sessions us
         WHERE us.user_id = f.faculty_id
           AND us.logout_at IS NULL
           AND us.expires_at > NOW()
       ) AS has_active_session,
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

  // Full weekly consultation schedule (all weekdays, not just today) -- only
  // fetched when a caller needs it (the Faculty Availability page's day-grouped
  // card view), so the dashboard summary doesn't pay for a query it won't use.
  const weeklyMap = {};
  if (includeWeekly) {
    const [weeklyRows] = await pool.query(
      `SELECT faculty_id, day_of_week, start_time, end_time, location
       FROM faculty_availability
       WHERE faculty_id IN (?)
       ORDER BY faculty_id,
         FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'),
         start_time`,
      [facultyIds],
    );
    weeklyRows.forEach((row) => {
      if (!weeklyMap[row.faculty_id]) weeklyMap[row.faculty_id] = [];
      weeklyMap[row.faculty_id].push({
        day: row.day_of_week,
        timeStart: formatTime(row.start_time),
        timeEnd: formatTime(row.end_time),
        location: row.location ?? "TBA",
      });
    });
  }

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

    const isBusy = computeIsBusy(avails, appts, currentTimeStr);

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

    // Login-session-derived availability: a professor only reads as available
    // when they've toggled themselves available AND currently hold a live
    // (non-logged-out, unexpired) session. Logout / token expiry /
    // never-logged-in => unavailable. Their own "unavailable" toggle still wins
    // outright. "Busy" (mid approved-appointment) is an admin-only layer on top.
    const isPresent = !!f.has_active_session;
    const isToggledUnavailable = f.availability_status === "unavailable";

    const status =
      !isPresent || isToggledUnavailable
        ? "unavailable"
        : isBusy
        ? "busy"
        : "available";

    return {
      id: f.faculty_id,
      name: f.name,
      position: f.position,
      specialization: f.specialization,
      college: `${f.department_name} (${f.department_abbreviation})`,
      status,
      currentActivity: !isPresent
        ? "Currently offline"
        : isToggledUnavailable
        ? "Marked unavailable by professor"
        : isBusy
        ? "In consultation with student"
        : null,
      nextAvailableSlot:
        !isPresent || isToggledUnavailable
          ? "Unavailable"
          : nextAvailableSlot ||
            (avails.length === 0 ? "No schedule today" : "No more slots today"),
      email: f.email,
      todaySchedule: schedule,
      weeklyAvailability: weeklyMap[f.faculty_id] || [],
    };
  });
}

module.exports = { getFacultyAvailabilityToday, computeIsBusy };
