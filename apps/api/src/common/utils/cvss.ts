// CVSS 3.1 base score calculator. No external package.
// Spec: https://www.first.org/cvss/v3.1/specification-document

import type { Severity } from "@prisma/client";

export interface CvssResult {
  score: number;
  severity: Severity;
  vector: string;
}

type Scope = "U" | "C";

// Metric weight tables.
const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC: Record<string, number> = { L: 0.77, H: 0.44 };
const UI: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };
// Privileges Required depends on Scope.
const PR_UNCHANGED: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
const PR_CHANGED: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 };

const REQUIRED = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"] as const;
type MetricKey = (typeof REQUIRED)[number];

const ALLOWED: Record<MetricKey, string[]> = {
  AV: ["N", "A", "L", "P"],
  AC: ["L", "H"],
  PR: ["N", "L", "H"],
  UI: ["N", "R"],
  S: ["U", "C"],
  C: ["H", "L", "N"],
  I: ["H", "L", "N"],
  A: ["H", "L", "N"],
};

export function parseCvssVector(vector: string): Record<MetricKey, string> {
  const trimmed = vector.trim();
  const parts = trimmed.split("/").filter(Boolean);
  const map: Partial<Record<MetricKey, string>> = {};

  let start = 0;
  if (parts[0] && parts[0].toUpperCase().startsWith("CVSS:")) {
    const version = parts[0].split(":")[1];
    if (version !== "3.1" && version !== "3.0") {
      throw new Error(`Unsupported CVSS version "${version}"`);
    }
    start = 1;
  }

  for (let i = start; i < parts.length; i += 1) {
    const [rawKey, rawVal] = parts[i].split(":");
    if (!rawKey || !rawVal) continue;
    const key = rawKey.toUpperCase() as MetricKey;
    if ((REQUIRED as readonly string[]).includes(key)) {
      map[key] = rawVal.toUpperCase();
    }
  }

  for (const key of REQUIRED) {
    const val = map[key];
    if (!val || !ALLOWED[key].includes(val)) {
      throw new Error(`Invalid or missing CVSS metric ${key}`);
    }
  }
  return map as Record<MetricKey, string>;
}

// CVSS 3.1 roundup: round to one decimal, always up on any remainder.
function roundup(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) {
    return intInput / 100000;
  }
  return (Math.floor(intInput / 10000) + 1) / 10;
}

export function severityFromScore(score: number): Severity {
  if (score <= 0) return "INFO";
  if (score < 4.0) return "LOW";
  if (score < 7.0) return "MEDIUM";
  if (score < 9.0) return "HIGH";
  return "CRITICAL";
}

export function computeCvss(vector: string): CvssResult {
  const m = parseCvssVector(vector);
  const scope = m.S as Scope;

  const prTable = scope === "C" ? PR_CHANGED : PR_UNCHANGED;

  const av = AV[m.AV];
  const ac = AC[m.AC];
  const pr = prTable[m.PR];
  const ui = UI[m.UI];
  const cImp = CIA[m.C];
  const iImp = CIA[m.I];
  const aImp = CIA[m.A];

  const iss = 1 - (1 - cImp) * (1 - iImp) * (1 - aImp);

  let impact: number;
  if (scope === "C") {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  } else {
    impact = 6.42 * iss;
  }

  const exploitability = 8.22 * av * ac * pr * ui;

  let score: number;
  if (impact <= 0) {
    score = 0;
  } else if (scope === "C") {
    score = roundup(Math.min(1.08 * (impact + exploitability), 10));
  } else {
    score = roundup(Math.min(impact + exploitability, 10));
  }

  return {
    score,
    severity: severityFromScore(score),
    vector: `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`,
  };
}
