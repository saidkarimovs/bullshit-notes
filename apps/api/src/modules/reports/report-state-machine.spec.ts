import { describe, expect, it } from "vitest";
import type { ReportStatus } from "@prisma/client";
import {
  canTransition,
  REPORT_TRANSITIONS,
  timestampField,
} from "./report-state-machine";

describe("report status state machine", () => {
  it("allows the documented transitions", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "TRIAGED")).toBe(true);
    expect(canTransition("SUBMITTED", "REJECTED")).toBe(true);
    expect(canTransition("SUBMITTED", "DUPLICATE")).toBe(true);
    expect(canTransition("TRIAGED", "ACCEPTED")).toBe(true);
    expect(canTransition("TRIAGED", "REJECTED")).toBe(true);
    expect(canTransition("TRIAGED", "DUPLICATE")).toBe(true);
    expect(canTransition("ACCEPTED", "PAID")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransition("DRAFT", "TRIAGED")).toBe(false);
    expect(canTransition("DRAFT", "PAID")).toBe(false);
    expect(canTransition("SUBMITTED", "ACCEPTED")).toBe(false);
    expect(canTransition("SUBMITTED", "PAID")).toBe(false);
    expect(canTransition("TRIAGED", "PAID")).toBe(false);
    expect(canTransition("ACCEPTED", "REJECTED")).toBe(false);
  });

  it("treats PAID, REJECTED and DUPLICATE as terminal", () => {
    const terminal: ReportStatus[] = ["PAID", "REJECTED", "DUPLICATE"];
    for (const s of terminal) {
      expect(REPORT_TRANSITIONS[s]).toEqual([]);
      expect(canTransition(s, "SUBMITTED")).toBe(false);
    }
  });

  it("maps transitions to the right timestamp column", () => {
    expect(timestampField("SUBMITTED")).toBe("submittedAt");
    expect(timestampField("ACCEPTED")).toBe("resolvedAt");
    expect(timestampField("REJECTED")).toBe("resolvedAt");
    expect(timestampField("DUPLICATE")).toBe("resolvedAt");
    expect(timestampField("PAID")).toBe("paidAt");
    expect(timestampField("TRIAGED")).toBeNull();
  });
});
