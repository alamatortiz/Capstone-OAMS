import { describe, test, expect, vi } from "vitest";
import { getWeekRange, getMonthRange, isWithinRange, filterByRange } from "./dateRange";

// Wed, Jan 10 2024 -- used as a fixed "today" so filterByRange's default
// (no explicit `now`) is deterministic instead of depending on the real clock.
vi.mock("./dateTime", () => ({
  getManilaTodayAsLocalDate: () => new Date(2024, 0, 10),
}));

describe("getWeekRange", () => {
  test("starts on Sunday and ends on Saturday, matching the booking calendar's convention", () => {
    const { start, end } = getWeekRange(new Date(2024, 0, 10)); // Wed
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(7);
    expect(end.getDate()).toBe(13);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  test("a Sunday's own week starts on itself", () => {
    const { start } = getWeekRange(new Date(2024, 0, 7)); // Sunday
    expect(start.getDate()).toBe(7);
  });
});

describe("getMonthRange", () => {
  test("spans the full calendar month, including a leap-year February", () => {
    const { start, end } = getMonthRange(new Date(2024, 1, 15));
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(1);
    expect(end.getDate()).toBe(29);
    expect(end.getMonth()).toBe(1);
  });
});

describe("isWithinRange", () => {
  const range = getWeekRange(new Date(2024, 0, 10));

  test("includes both range boundaries", () => {
    expect(isWithinRange("2024-01-07", range)).toBe(true);
    expect(isWithinRange("2024-01-13", range)).toBe(true);
  });

  test("excludes dates outside the range", () => {
    expect(isWithinRange("2024-01-06", range)).toBe(false);
    expect(isWithinRange("2024-01-14", range)).toBe(false);
  });
});

describe("filterByRange", () => {
  const items = [
    { date: "2024-01-06" }, // Sat, previous week
    { date: "2024-01-08" }, // Mon, this week
    { date: "2024-01-13" }, // Sat, this week (end boundary)
    { date: "2024-01-20" }, // next week, still this month
    { date: "2024-02-01" }, // next month
  ];

  test("'all' returns every item unfiltered", () => {
    expect(filterByRange(items, "all")).toEqual(items);
  });

  test("'week' keeps only items within the current Manila week", () => {
    expect(filterByRange(items, "week")).toEqual([
      { date: "2024-01-08" },
      { date: "2024-01-13" },
    ]);
  });

  test("'month' keeps only items within the current Manila month", () => {
    expect(filterByRange(items, "month")).toEqual([
      { date: "2024-01-06" },
      { date: "2024-01-08" },
      { date: "2024-01-13" },
      { date: "2024-01-20" },
    ]);
  });

  test("supports a custom date field name", () => {
    const custom = [{ appointmentDate: "2024-01-08" }, { appointmentDate: "2024-02-01" }];
    expect(filterByRange(custom, "week", "appointmentDate")).toEqual([
      { appointmentDate: "2024-01-08" },
    ]);
  });
});
