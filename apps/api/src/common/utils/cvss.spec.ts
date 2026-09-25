import { describe, expect, it } from "vitest";
import {
  computeCvss,
  parseCvssVector,
  severityFromScore,
} from "./cvss";

describe("CVSS 3.1 calculator", () => {
  const cases: { vector: string; score: number; severity: string }[] = [
    // Full RCE, scope unchanged.
    {
      vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      score: 9.8,
      severity: "CRITICAL",
    },
    // Full impact, scope changed -> capped at 10.0.
    {
      vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
      score: 10.0,
      severity: "CRITICAL",
    },
    // Classic local privilege escalation.
    {
      vector: "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      score: 7.8,
      severity: "HIGH",
    },
    // Network DoS (availability only).
    {
      vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
      score: 7.5,
      severity: "HIGH",
    },
    // Reflected XSS (scope changed, low C/I).
    {
      vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
      score: 6.1,
      severity: "MEDIUM",
    },
    // No impact -> 0.0.
    {
      vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
      score: 0.0,
      severity: "INFO",
    },
  ];

  for (const c of cases) {
    it(`scores ${c.vector} as ${c.score} (${c.severity})`, () => {
      const result = computeCvss(c.vector);
      expect(result.score).toBe(c.score);
      expect(result.severity).toBe(c.severity);
    });
  }

  it("parses a vector without the CVSS: prefix", () => {
    const parsed = parseCvssVector("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
    expect(parsed.AV).toBe("N");
    expect(parsed.S).toBe("U");
  });

  it("throws on a missing metric", () => {
    expect(() => computeCvss("CVSS:3.1/AV:N/AC:L")).toThrow();
  });

  it("throws on an invalid metric value", () => {
    expect(() =>
      computeCvss("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    ).toThrow();
  });

  it("maps scores to severities at the boundaries", () => {
    expect(severityFromScore(0)).toBe("INFO");
    expect(severityFromScore(0.1)).toBe("LOW");
    expect(severityFromScore(3.9)).toBe("LOW");
    expect(severityFromScore(4.0)).toBe("MEDIUM");
    expect(severityFromScore(6.9)).toBe("MEDIUM");
    expect(severityFromScore(7.0)).toBe("HIGH");
    expect(severityFromScore(8.9)).toBe("HIGH");
    expect(severityFromScore(9.0)).toBe("CRITICAL");
    expect(severityFromScore(10.0)).toBe("CRITICAL");
  });
});
