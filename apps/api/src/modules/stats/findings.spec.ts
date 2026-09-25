import { describe, expect, it } from "vitest";
import { enumerateBuckets, zeroFillFindings } from "./findings";

describe("findings-over-time zero-fill", () => {
  it("enumerates every day bucket in range inclusively", () => {
    const buckets = enumerateBuckets(
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-05T12:00:00Z"),
      "day",
    );
    expect(buckets).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("enumerates month buckets", () => {
    const buckets = enumerateBuckets(
      new Date("2026-01-15T00:00:00Z"),
      new Date("2026-04-02T00:00:00Z"),
      "month",
    );
    expect(buckets).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
    ]);
  });

  it("fills missing buckets with zeros and all five severities", () => {
    const buckets = ["2026-09-01", "2026-09-02", "2026-09-03"];
    const rows = zeroFillFindings(buckets, [
      { date: "2026-09-01", severity: "HIGH", count: 2 },
      { date: "2026-09-01", severity: "LOW", count: 1 },
      { date: "2026-09-03", severity: "CRITICAL", count: 5 },
    ]);

    expect(rows).toHaveLength(3);
    // Present severities all appear on every bucket, defaulting to 0.
    expect(rows[0]).toEqual({
      date: "2026-09-01",
      INFO: 0,
      LOW: 1,
      MEDIUM: 0,
      HIGH: 2,
      CRITICAL: 0,
    });
    // Middle bucket had no rows -> fully zero-filled.
    expect(rows[1]).toEqual({
      date: "2026-09-02",
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    });
    expect(rows[2].CRITICAL).toBe(5);
  });

  it("ignores rows for unknown severities or out-of-range buckets", () => {
    const rows = zeroFillFindings(["2026-09-01"], [
      { date: "2026-09-01", severity: "BOGUS", count: 9 },
      { date: "1999-01-01", severity: "HIGH", count: 9 },
    ]);
    expect(rows[0]).toEqual({
      date: "2026-09-01",
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    });
  });
});
