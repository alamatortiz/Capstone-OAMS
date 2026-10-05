const { formatTrackingNumber, nextTrackingNumber } = require("./trackingNumber");

describe("formatTrackingNumber", () => {
  test("pads to five digits", () => {
    expect(formatTrackingNumber("APT", 3)).toBe("APT-00003");
  });
  test("never truncates larger numbers", () => {
    expect(formatTrackingNumber("REQ", 123456)).toBe("REQ-123456");
  });
});

// Minimal fake connection: answers the counter SELECT/UPDATE in order.
function fakeConn(lastValue) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("SELECT last_number")) {
        return [lastValue === null ? [] : [{ last_number: lastValue }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
}

describe("nextTrackingNumber", () => {
  test("locks the counter row and increments it", async () => {
    const conn = fakeConn(41);
    await expect(nextTrackingNumber(conn, "APT")).resolves.toBe("APT-00042");
    expect(conn.calls[0].sql).toContain("FOR UPDATE");
    expect(conn.calls[1].params).toEqual([42, "APT"]);
  });
});
