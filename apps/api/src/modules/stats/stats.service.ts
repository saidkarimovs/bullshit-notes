import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { resolveRange, type Bucket } from "../../lib/date-range";
import { SEVERITIES } from "./stats.constants";
import { computeFunnel, type FunnelRow } from "./funnel";
import {
  enumerateBuckets,
  zeroFillFindings,
  type FindingsBucket,
  type SparseFinding,
} from "./findings";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(from?: string, to?: string) {
    const { from: f, to: t } = resolveRange(from, to);

    const [
      totalReports,
      openReports,
      totalProjects,
      activeProjects,
      totalAssets,
      inScopeAssets,
      totalNotes,
      duplicateCount,
      submittedCount,
    ] = await Promise.all([
      this.prisma.report.count({ where: { createdAt: { gte: f, lte: t } } }),
      this.prisma.report.count({
        where: {
          createdAt: { gte: f, lte: t },
          status: { in: ["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED"] },
        },
      }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: "ACTIVE" } }),
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: "IN_SCOPE" } }),
      this.prisma.note.count(),
      this.prisma.report.count({
        where: { createdAt: { gte: f, lte: t }, status: "DUPLICATE" },
      }),
      this.prisma.report.count({
        where: { createdAt: { gte: f, lte: t }, submittedAt: { not: null } },
      }),
    ]);

    const earnings = await this.prisma.$queryRaw<
      { total: string | null; currency: string | null }[]
    >`
      SELECT COALESCE(SUM("bountyAmount"), 0)::text AS total,
             MIN("bountyCurrency") AS currency
      FROM "Report"
      WHERE "paidAt" IS NOT NULL AND "paidAt" BETWEEN ${f} AND ${t}
    `;

    const pending = await this.prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM("bountyAmount"), 0)::text AS total
      FROM "Report"
      WHERE "status" = 'ACCEPTED' AND "paidAt" IS NULL
    `;

    const triage = await this.prisma.$queryRaw<{ hours: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (e.first_triage - r."submittedAt")) / 3600.0) AS hours
      FROM "Report" r
      JOIN (
        SELECT "reportId", MIN("createdAt") AS first_triage
        FROM "ReportEvent"
        WHERE "toStatus" = 'TRIAGED'
        GROUP BY "reportId"
      ) e ON e."reportId" = r.id
      WHERE r."submittedAt" IS NOT NULL
        AND r."submittedAt" BETWEEN ${f} AND ${t}
    `;

    const avgTimeToTriageHours =
      triage[0]?.hours != null
        ? Math.round(Number(triage[0].hours) * 100) / 100
        : null;

    const duplicateRate =
      submittedCount > 0
        ? Math.round((duplicateCount / submittedCount) * 10000) / 100
        : 0;

    return {
      totalReports,
      openReports,
      totalProjects,
      activeProjects,
      totalAssets,
      inScopeAssets,
      totalNotes,
      totalEarnings: {
        amount: earnings[0]?.total ?? "0",
        currency: earnings[0]?.currency ?? "USD",
      },
      pendingEarnings: pending[0]?.total ?? "0",
      avgTimeToTriageHours,
      duplicateRate,
    };
  }

  async severity(from?: string, to?: string) {
    const { from: f, to: t } = resolveRange(from, to);
    const grouped = await this.prisma.report.groupBy({
      by: ["severity"],
      _count: { _all: true },
      where: { createdAt: { gte: f, lte: t } },
    });
    const map = new Map(grouped.map((g) => [g.severity, g._count._all]));
    return SEVERITIES.map((severity) => ({
      severity,
      count: map.get(severity) ?? 0,
    }));
  }

  async findingsOverTime(
    bucket: Bucket,
    from?: string,
    to?: string,
  ): Promise<FindingsBucket[]> {
    const { from: f, to: t } = resolveRange(from, to);
    // Zero-fill entirely in SQL via generate_series CROSS JOIN severities.
    const unit = bucket; // validated by zod enum; safe to inline
    const step =
      bucket === "day" ? "1 day" : bucket === "week" ? "1 week" : "1 month";
    const rows = await this.prisma.$queryRawUnsafe<SparseFinding[]>(
      `
      WITH buckets AS (
        SELECT generate_series(
          date_trunc('${unit}', $1::timestamptz),
          date_trunc('${unit}', $2::timestamptz),
          interval '${step}'
        ) AS b
      ),
      sev(severity) AS (
        VALUES ('INFO'),('LOW'),('MEDIUM'),('HIGH'),('CRITICAL')
      ),
      counts AS (
        SELECT date_trunc('${unit}', "createdAt") AS b,
               "severity"::text AS severity,
               COUNT(*)::int AS count
        FROM "Report"
        WHERE "createdAt" BETWEEN $1::timestamptz AND $2::timestamptz
        GROUP BY 1, 2
      )
      SELECT to_char(buckets.b, 'YYYY-MM-DD') AS date,
             sev.severity AS severity,
             COALESCE(counts.count, 0) AS count
      FROM buckets
      CROSS JOIN sev
      LEFT JOIN counts
        ON counts.b = buckets.b AND counts.severity = sev.severity
      ORDER BY buckets.b, sev.severity
      `,
      f,
      t,
    );

    // The SQL already zero-fills; fold rows into the per-bucket object shape.
    const buckets = enumerateBuckets(f, t, bucket);
    return zeroFillFindings(
      buckets,
      rows.map((r) => ({ ...r, count: Number(r.count) })),
    );
  }

  async statusFunnel(from?: string, to?: string): Promise<FunnelRow[]> {
    const { from: f, to: t } = resolveRange(from, to);
    const grouped = await this.prisma.report.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: f, lte: t } },
    });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count._all;
    return computeFunnel(counts);
  }

  async earnings(bucket: Bucket, from?: string, to?: string) {
    const { from: f, to: t } = resolveRange(from, to);
    const unit = bucket;
    const step =
      bucket === "day" ? "1 day" : bucket === "week" ? "1 week" : "1 month";
    const rows = await this.prisma.$queryRawUnsafe<
      { date: string; amount: string }[]
    >(
      `
      WITH buckets AS (
        SELECT generate_series(
          date_trunc('${unit}', $1::timestamptz),
          date_trunc('${unit}', $2::timestamptz),
          interval '${step}'
        ) AS b
      ),
      paid AS (
        SELECT date_trunc('${unit}', "paidAt") AS b,
               SUM("bountyAmount") AS amount
        FROM "Report"
        WHERE "paidAt" IS NOT NULL
          AND "paidAt" BETWEEN $1::timestamptz AND $2::timestamptz
        GROUP BY 1
      )
      SELECT to_char(buckets.b, 'YYYY-MM-DD') AS date,
             COALESCE(paid.amount, 0)::text AS amount
      FROM buckets
      LEFT JOIN paid ON paid.b = buckets.b
      ORDER BY buckets.b
      `,
      f,
      t,
    );

    // cumulative kept as an exact decimal string (money never becomes a float).
    let running = 0n;
    let runningFrac = 0; // cents accumulator
    const result: { date: string; amount: string; cumulative: string }[] = [];
    for (const r of rows) {
      const cents = toCents(r.amount);
      runningFrac += cents;
      running = BigInt(runningFrac);
      result.push({
        date: r.date,
        amount: r.amount,
        cumulative: fromCents(running),
      });
    }
    return result;
  }

  async activityHeatmap(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - (days - 1) * 86_400_000);
    const rows = await this.prisma.$queryRaw<{ date: string; count: number }[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc('day', ${from}::timestamptz),
          date_trunc('day', ${to}::timestamptz),
          interval '1 day'
        ) AS b
      ),
      logs AS (
        SELECT date_trunc('day', "createdAt") AS b, COUNT(*)::int AS count
        FROM "AuditLog"
        WHERE "createdAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
        GROUP BY 1
      )
      SELECT to_char(buckets.b, 'YYYY-MM-DD') AS date,
             COALESCE(logs.count, 0) AS count
      FROM buckets
      LEFT JOIN logs ON logs.b = buckets.b
      ORDER BY buckets.b
    `;
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  async byProject(from?: string, to?: string) {
    const { from: f, to: t } = resolveRange(from, to);
    const rows = await this.prisma.$queryRaw<
      {
        projectId: string;
        name: string;
        reports: number;
        critical: number;
        earnings: string;
      }[]
    >`
      SELECT p.id AS "projectId",
             p.name AS name,
             COUNT(r.id)::int AS reports,
             COUNT(r.id) FILTER (WHERE r.severity = 'CRITICAL')::int AS critical,
             COALESCE(SUM(r."bountyAmount") FILTER (WHERE r."paidAt" IS NOT NULL), 0)::text AS earnings
      FROM "Project" p
      LEFT JOIN "Report" r
        ON r."projectId" = p.id AND r."createdAt" BETWEEN ${f} AND ${t}
      GROUP BY p.id, p.name
      ORDER BY reports DESC
    `;
    return rows.map((r) => ({
      projectId: r.projectId,
      name: r.name,
      reports: Number(r.reports),
      critical: Number(r.critical),
      earnings: r.earnings,
    }));
  }
}

// Money arithmetic in integer cents so we never touch a float.
function toCents(decimalStr: string): number {
  const [whole, frac = ""] = decimalStr.split(".");
  const cents = (frac + "00").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const w = Math.abs(parseInt(whole || "0", 10));
  return sign * (w * 100 + parseInt(cents, 10));
}

function fromCents(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const whole = abs / 100n;
  const frac = abs % 100n;
  return `${neg ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}
