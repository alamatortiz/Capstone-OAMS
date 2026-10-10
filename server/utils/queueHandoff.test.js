const { queueLanePredicate } = require("./queueDisplay");
const { resolveClosedStatus } = require("./queueSlotSettlement");

describe("queueLanePredicate", () => {
  const sql = queueLanePredicate("q2", "q");

  test("office line is the same slot with no professor", () => {
    expect(sql).toContain("WHEN q.assigned_faculty_id IS NULL");
    expect(sql).toContain("q2.slot_id = q.slot_id AND q2.assigned_faculty_id IS NULL");
  });

  test("a professor's line is keyed on the professor alone, across slots", () => {
    expect(sql).toContain("ELSE q2.assigned_faculty_id = q.assigned_faculty_id");
    // The professor branch must NOT also require the same slot.
    const elseBranch = sql.slice(sql.indexOf("ELSE"));
    expect(elseBranch).not.toContain("slot_id");
  });

  test("uses the aliases it is given", () => {
    expect(queueLanePredicate("a", "b")).toContain("a.assigned_faculty_id = b.assigned_faculty_id");
  });
});

describe("resolveClosedStatus", () => {
  test("completed only when nobody was cancelled, nobody is pending, and someone was served", () => {
    expect(resolveClosedStatus({ officeCancelled: 0, laneUnserved: 0, served: 3 })).toBe("completed");
  });

  test("closed when office-line students were force-cancelled", () => {
    expect(resolveClosedStatus({ officeCancelled: 1, laneUnserved: 0, served: 3 })).toBe("closed");
  });

  test("closed while professors still have passed students to finish", () => {
    expect(resolveClosedStatus({ officeCancelled: 0, laneUnserved: 2, served: 3 })).toBe("closed");
  });

  test("closed when nobody was ever served (zero activity isn't an accomplishment)", () => {
    expect(resolveClosedStatus({ officeCancelled: 0, laneUnserved: 0, served: 0 })).toBe("closed");
  });
});
