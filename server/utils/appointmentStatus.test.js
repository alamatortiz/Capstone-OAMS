const { isValidTransition } = require("./appointmentStatus");

describe("isValidTransition", () => {
  test.each([
    ["pending", "approved"],
    ["pending", "rejected"],
    ["pending", "cancelled"],
    ["approved", "completed"],
    ["approved", "cancelled"],
  ])("allows %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  test.each([
    ["cancelled", "approved"],
    ["rejected", "approved"],
    ["completed", "approved"],
    ["completed", "cancelled"],
    ["pending", "completed"],
    ["approved", "pending"],
    ["approved", "rejected"],
    ["pending", "pending"],
    ["approved", "approved"],
  ])("rejects %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  test("rejects an unknown starting status", () => {
    expect(isValidTransition("bogus", "approved")).toBe(false);
  });
});
