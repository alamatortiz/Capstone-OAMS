-- ─────────────────────────────────────────────────────────────
-- Appointment "Report as Not Served" + drop unused pending_nudge_sent_at
-- ─────────────────────────────────────────────────────────────
-- Two independent, unrelated schema tweaks bundled into one file since both
-- are small (same pattern as 2026-09_appointment_approved_completed_at.sql
-- bundling two unrelated new columns together).
--
-- 1) Drops appointments.pending_nudge_sent_at. It backed the 48-hour
--    "pending request unanswered" nudge sweep, which has been fully removed
--    from appointmentReminderSweeper.js (the function, its call site, and
--    its constant are all gone) -- the column was deliberately left behind
--    at the time and is now dropped outright. Confirmed nothing under
--    server/ reads or writes it anymore.
--
-- 2) Backs the student's new "Report as Not Served" action (PATCH
--    /api/student/appointments/:id/report-not-served) -- lets a student
--    flag that a professor never actually served them on an approved
--    appointment:
--      * appointments.cancelled_by gains a 5th ENUM member,
--        'student_no_show', alongside student/faculty/system/
--        system_expired -- a student-triggered cancellation, but
--        distinguished from a plain 'student' cancel for activity-feed/
--        admin display purposes.
--      * appointments.cancel_reason (TEXT NULL) is a NEW column: the
--        optional free-text reason a student can attach to that report.
--        Deliberately a separate column from the existing rejection_reason
--        -- that column's own doc comment scopes it to the FACULTY
--        member's rejection reason, and a 'rejected' row (rejection_reason)
--        and a 'cancelled'+student_no_show row (cancel_reason) could
--        otherwise coexist in ways that would make a shared column
--        ambiguous about which actor/flow wrote it.
--
-- Both halves are ALSO reflected in server/oams_db.sql, so a fresh
-- `docker compose down -v && up` already has the final shape. This file is
-- only for an existing dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_appointment_not_served_and_pending_nudge_cleanup.sql
-- Re-running is safe: the DROP COLUMN errors with "check that column/key
-- exists" and the ADD COLUMN errors with "Duplicate column name" once
-- already applied -- both are fine, they just mean it's already applied.
-- The MODIFY on cancelled_by is naturally idempotent (re-stating the same
-- enum list errors on nothing).

ALTER TABLE appointments
    DROP COLUMN pending_nudge_sent_at;

ALTER TABLE appointments
    MODIFY COLUMN cancelled_by ENUM('student','faculty','system','system_expired','student_no_show') NULL,
    ADD COLUMN cancel_reason TEXT NULL AFTER rejection_reason;
