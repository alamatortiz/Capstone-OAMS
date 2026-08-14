const { computeIsBusy } = require("./facultyAvailability");

describe("computeIsBusy", () => {
  test("busy inside a short (30 min) window, using the window's real end time", () => {
    const avails = [{ start_time: "13:00:00", end_time: "13:30:00" }];
    const appts = [{ appointment_time: "13:00:00", status: "approved" }];

    expect(computeIsBusy(avails, appts, "13:15:00")).toBe(true);
    // Old hardcoded +1hr logic would have still said "busy" here -- the
    // window actually ended at 13:30.
    expect(computeIsBusy(avails, appts, "13:45:00")).toBe(false);
  });

  test("stays busy for the whole length of a long (multi-hour) window", () => {
    const avails = [{ start_time: "09:00:00", end_time: "13:00:00" }];
    const appts = [{ appointment_time: "09:00:00", status: "approved" }];

    // Old hardcoded +1hr logic would have said "available" here, even
    // though the actual booked window is still running.
    expect(computeIsBusy(avails, appts, "11:30:00")).toBe(true);
    expect(computeIsBusy(avails, appts, "13:00:00")).toBe(false);
  });

  test("not busy before the appointment starts", () => {
    const avails = [{ start_time: "13:00:00", end_time: "14:00:00" }];
    const appts = [{ appointment_time: "13:00:00", status: "approved" }];

    expect(computeIsBusy(avails, appts, "12:59:00")).toBe(false);
  });

  test("ignores non-approved appointments", () => {
    const avails = [{ start_time: "13:00:00", end_time: "14:00:00" }];
    const appts = [{ appointment_time: "13:00:00", status: "pending" }];

    expect(computeIsBusy(avails, appts, "13:15:00")).toBe(false);
  });

  test("does not guess when the matching availability window no longer exists", () => {
    // e.g. the professor deleted/edited the schedule slot this appointment
    // was booked into (see professorRoutes.js DELETE/PATCH /availability/:id)
    const avails = [];
    const appts = [{ appointment_time: "13:00:00", status: "approved" }];

    expect(computeIsBusy(avails, appts, "13:15:00")).toBe(false);
  });
});
