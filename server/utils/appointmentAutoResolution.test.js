const {
  formatGraceLabel,
  addMinutesToTime,
  buildScheduleLabel,
  buildUnansweredRejectReason,
  buildNoActionsCancelReason,
  buildAutoResolutionNotifications,
} = require("./appointmentAutoResolution");
const { formatManilaDateLabel } = require("./dateTime");

// mysql2 hands DATE columns back as UTC midnight (db.js runs in "Z" mode).
const DATE = new Date("2026-10-05T00:00:00Z");

const fullCtx = {
  trackingNumber: "APT-00012",
  studentName: "Maria Santos",
  facultyName: "Juan Dela Cruz",
  serviceName: "Thesis Consultation",
  appointmentDate: DATE,
  windowStart: "14:17:00",
  windowEnd: "20:00:00",
  appointmentTime: "14:17:00",
};

const bareCtx = {
  trackingNumber: null,
  studentName: "Maria Santos",
  facultyName: "Juan Dela Cruz",
  serviceName: null,
  appointmentDate: "2026-10-05",
  windowStart: null,
  windowEnd: null,
  appointmentTime: "09:00:00",
};

describe("formatManilaDateLabel", () => {
  test("formats a mysql2 DATE and a plain string the same way", () => {
    expect(formatManilaDateLabel(DATE)).toBe("Mon, Oct 5, 2026");
    expect(formatManilaDateLabel("2026-10-05")).toBe("Mon, Oct 5, 2026");
  });
});

describe("formatGraceLabel", () => {
  test.each([
    [60, "1 hour"],
    [120, "2 hours"],
    [30, "30 minutes"],
    [1, "1 minute"],
  ])("%i -> %s", (minutes, label) => {
    expect(formatGraceLabel(minutes)).toBe(label);
  });
});

describe("addMinutesToTime", () => {
  test("adds within the day", () => {
    expect(addMinutesToTime("20:00:00", 60)).toBe("21:00:00");
  });
  test("wraps past midnight", () => {
    expect(addMinutesToTime("23:30:00", 60)).toBe("00:30:00");
  });
});

describe("buildScheduleLabel", () => {
  test("uses the full window when known", () => {
    expect(buildScheduleLabel(fullCtx)).toBe("Mon, Oct 5, 2026, 2:17 PM – 8:00 PM");
  });
  test("falls back to the appointment time", () => {
    expect(buildScheduleLabel(bareCtx)).toBe("Mon, Oct 5, 2026 at 9:00 AM");
  });
});

describe("stored reasons", () => {
  test("unanswered rejection reason", () => {
    expect(buildUnansweredRejectReason(fullCtx)).toBe(
      "This request was not approved before its scheduled time (Mon, Oct 5, 2026, 2:17 PM – 8:00 PM) ended, so the system rejected it automatically.",
    );
  });
  test("no-actions cancel reason", () => {
    expect(buildNoActionsCancelReason(fullCtx, 60)).toBe(
      "This appointment was approved, but no actions taken were recorded within 1 hour after its scheduled time (Mon, Oct 5, 2026, 2:17 PM – 8:00 PM) ended, so the system cancelled it automatically.",
    );
  });
});

describe("buildAutoResolutionNotifications", () => {
  test("unanswered, with tracking number and type", () => {
    const { student, faculty } = buildAutoResolutionNotifications("unanswered", fullCtx, 60);
    expect(student).toBe(
      "Your appointment request APT-00012 with Juan Dela Cruz (Thesis Consultation · Mon, Oct 5, 2026, 2:17 PM – 8:00 PM) was automatically rejected because it was not approved before its scheduled time ended. You can book another slot anytime.",
    );
    expect(faculty).toContain("The appointment request APT-00012 from Maria Santos (Thesis Consultation");
  });

  test("unanswered, without tracking number or type", () => {
    const { student } = buildAutoResolutionNotifications("unanswered", bareCtx, 60);
    expect(student).toBe(
      "Your appointment request with Juan Dela Cruz (Mon, Oct 5, 2026 at 9:00 AM) was automatically rejected because it was not approved before its scheduled time ended. You can book another slot anytime.",
    );
  });

  test("no actions taken gives the professor the exact deadline", () => {
    const { student, faculty } = buildAutoResolutionNotifications("no_actions_taken", fullCtx, 60);
    expect(student).toContain("was automatically cancelled because no actions taken were recorded within 1 hour");
    expect(faculty).toContain("no actions taken were recorded by 9:00 PM (1 hour after its scheduled time ended).");
  });

  test("completed", () => {
    const { student, faculty } = buildAutoResolutionNotifications("completed", fullCtx, 60);
    expect(student).toContain("automatically marked as completed using the actions taken the professor recorded");
    expect(faculty).toContain("Your appointment APT-00012 with Maria Santos");
  });

  test("rejects an unknown outcome", () => {
    expect(() => buildAutoResolutionNotifications("bogus", fullCtx)).toThrow();
  });
});
