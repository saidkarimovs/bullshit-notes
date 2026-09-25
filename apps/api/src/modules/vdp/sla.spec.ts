import { describe, expect, it } from "vitest";
import { computeSla } from "./sla";

const submittedAt = new Date("2026-06-01T00:00:00Z");

// Helper: a `now` that is exactly `daysRemaining` before the 90-day deadline.
function nowFor(daysRemaining: number): Date {
  const deadline = new Date(submittedAt.getTime() + 90 * 86_400_000);
  return new Date(deadline.getTime() - daysRemaining * 86_400_000);
}

describe("VDP SLA state calculation", () => {
  it("is ON_TRACK at 15 days remaining", () => {
    const r = computeSla({ submittedAt, now: nowFor(15) });
    expect(r.daysRemaining).toBe(15);
    expect(r.slaState).toBe("ON_TRACK");
  });

  it("is DUE_SOON at exactly 14 days remaining", () => {
    const r = computeSla({ submittedAt, now: nowFor(14) });
    expect(r.daysRemaining).toBe(14);
    expect(r.slaState).toBe("DUE_SOON");
  });

  it("is DUE_SOON at 1 day remaining", () => {
    const r = computeSla({ submittedAt, now: nowFor(1) });
    expect(r.daysRemaining).toBe(1);
    expect(r.slaState).toBe("DUE_SOON");
  });

  it("is DUE_SOON at exactly 0 days remaining", () => {
    const r = computeSla({ submittedAt, now: nowFor(0) });
    expect(r.daysRemaining).toBe(0);
    expect(r.slaState).toBe("DUE_SOON");
  });

  it("is OVERDUE once the deadline has passed", () => {
    const r = computeSla({ submittedAt, now: nowFor(-1) });
    expect(r.daysRemaining).toBeLessThan(0);
    expect(r.slaState).toBe("OVERDUE");
  });

  it("is DISCLOSED whenever disclosedAt is set, regardless of the clock", () => {
    const r = computeSla({
      submittedAt,
      disclosedAt: new Date("2026-07-01T00:00:00Z"),
      now: nowFor(-30),
    });
    expect(r.slaState).toBe("DISCLOSED");
  });

  it("uses disclosureDeadline override when present", () => {
    const deadline = new Date("2026-06-20T00:00:00Z");
    const r = computeSla({
      submittedAt,
      disclosureDeadline: deadline,
      now: new Date("2026-06-19T00:00:00Z"),
    });
    expect(r.deadline?.toISOString()).toBe(deadline.toISOString());
    expect(r.daysRemaining).toBe(1);
    expect(r.slaState).toBe("DUE_SOON");
  });
});
