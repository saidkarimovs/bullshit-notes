import { describe, expect, it } from "vitest";
import { computeFunnel } from "./funnel";

describe("status-funnel drop-off maths", () => {
  it("computes cumulative counts and stage-to-stage drop-off", () => {
    // 10 drafts, then progressively fewer reach each later stage.
    const rows = computeFunnel({
      DRAFT: 4, // still in draft
      SUBMITTED: 2, // sitting at submitted
      TRIAGED: 1,
      ACCEPTED: 1,
      PAID: 2,
    });
    // Cumulative: DRAFT reached by all 10; SUBMITTED by 6; TRIAGED 4; ACCEPTED 3; PAID 2.
    expect(rows.map((r) => r.count)).toEqual([10, 6, 4, 3, 2]);

    // First stage drop-off is always 0.
    expect(rows[0].dropOffPct).toBe(0);
    // SUBMITTED: (10-6)/10 = 40%
    expect(rows[1].dropOffPct).toBe(40);
    // TRIAGED: (6-4)/6 = 33.33%
    expect(rows[2].dropOffPct).toBe(33.33);
    // ACCEPTED: (4-3)/4 = 25%
    expect(rows[3].dropOffPct).toBe(25);
    // PAID: (3-2)/3 = 33.33%
    expect(rows[4].dropOffPct).toBe(33.33);
  });

  it("returns the fixed stage order even with no data", () => {
    const rows = computeFunnel({});
    expect(rows.map((r) => r.status)).toEqual([
      "DRAFT",
      "SUBMITTED",
      "TRIAGED",
      "ACCEPTED",
      "PAID",
    ]);
    expect(rows.every((r) => r.count === 0 && r.dropOffPct === 0)).toBe(true);
  });

  it("counts terminal off-ramps toward the stages they passed through", () => {
    const rows = computeFunnel({ DUPLICATE: 3, REJECTED: 1, PAID: 1 });
    // All 5 reached DRAFT and SUBMITTED; only PAID reached the rest.
    expect(rows[0].count).toBe(5); // DRAFT
    expect(rows[1].count).toBe(5); // SUBMITTED
    expect(rows[2].count).toBe(1); // TRIAGED
    expect(rows[4].count).toBe(1); // PAID
    expect(rows[1].dropOffPct).toBe(0); // 5 -> 5
    expect(rows[2].dropOffPct).toBe(80); // (5-1)/5
  });
});
