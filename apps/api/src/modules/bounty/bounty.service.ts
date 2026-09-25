import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { resolveRange } from "../../lib/date-range";
import type {
  LeaderboardQuery,
  SessionsQuery,
  StartSessionInput,
} from "./dto/bounty.dto";

@Injectable()
export class BountyService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const [
      earnedAgg,
      pendingAgg,
      submitted,
      accepted,
      duplicate,
      highest,
      sessions,
    ] = await Promise.all([
        this.prisma.report.aggregate({
          where: { authorId: userId, paidAt: { not: null } },
          _sum: { bountyAmount: true },
        }),
        this.prisma.report.aggregate({
          where: { authorId: userId, status: "ACCEPTED", paidAt: null },
          _sum: { bountyAmount: true },
        }),
        this.prisma.report.count({
          where: { authorId: userId, submittedAt: { not: null } },
        }),
        this.prisma.report.count({
          where: { authorId: userId, status: { in: ["ACCEPTED", "PAID"] } },
        }),
        this.prisma.report.count({
          where: { authorId: userId, status: "DUPLICATE" },
        }),
        this.prisma.report.aggregate({
          where: { authorId: userId, paidAt: { not: null } },
          _max: { bountyAmount: true },
        }),
        this.prisma.huntSession.aggregate({
          where: { userId },
          _sum: { durationSec: true },
        }),
      ]);

    const earned = earnedAgg._sum.bountyAmount?.toString() ?? "0.00";
    const pending = pendingAgg._sum.bountyAmount?.toString() ?? "0.00";

    const paidCount = await this.prisma.report.count({
      where: { authorId: userId, paidAt: { not: null } },
    });

    const avgBounty =
      paidCount > 0 ? divideMoney(earned, paidCount) : "0.00";
    const acceptanceRate =
      submitted > 0 ? Math.round((accepted / submitted) * 10000) / 100 : 0;
    const duplicateRate =
      submitted > 0 ? Math.round((duplicate / submitted) * 10000) / 100 : 0;

    const totalSec = sessions._sum.durationSec ?? 0;
    const earningsPerHour =
      totalSec > 0
        ? divideMoney(earned, totalSec / 3600)
        : null; // null (not 0) when there are no sessions

    const avgHoursToFirstResponse = await this.avgHoursToFirstResponse(userId);

    return {
      totalEarned: earned,
      pendingPayout: pending,
      avgBounty,
      highestBounty: highest._max.bountyAmount?.toString() ?? "0.00",
      acceptanceRate,
      duplicateRate,
      reportsSubmitted: submitted,
      avgHoursToFirstResponse,
      earningsPerHour,
    };
  }

  private async avgHoursToFirstResponse(userId: string): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ hours: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (e.first_event - r."submittedAt")) / 3600.0) AS hours
      FROM "Report" r
      JOIN (
        SELECT "reportId", MIN("createdAt") AS first_event
        FROM "ReportEvent"
        WHERE "toStatus" IN ('TRIAGED', 'ACCEPTED', 'REJECTED', 'DUPLICATE')
        GROUP BY "reportId"
      ) e ON e."reportId" = r.id
      WHERE r."authorId" = ${userId} AND r."submittedAt" IS NOT NULL
    `;
    return rows[0]?.hours != null
      ? Math.round(Number(rows[0].hours) * 100) / 100
      : null;
  }

  async programs(userId: string) {
    const rows = await this.prisma.$queryRaw<
      {
        projectId: string;
        name: string;
        reports: number;
        accepted: number;
        submitted: number;
        earnings: string;
      }[]
    >`
      SELECT p.id AS "projectId",
             p.name AS name,
             COUNT(r.id)::int AS reports,
             COUNT(r.id) FILTER (WHERE r.status IN ('ACCEPTED','PAID'))::int AS accepted,
             COUNT(r.id) FILTER (WHERE r."submittedAt" IS NOT NULL)::int AS submitted,
             COALESCE(SUM(r."bountyAmount") FILTER (WHERE r."paidAt" IS NOT NULL), 0)::text AS earnings
      FROM "Project" p
      LEFT JOIN "Report" r ON r."projectId" = p.id AND r."authorId" = ${userId}
      WHERE p.type = 'BOUNTY_PROGRAM'
      GROUP BY p.id, p.name
      ORDER BY earnings DESC
    `;
    return rows.map((r) => ({
      projectId: r.projectId,
      name: r.name,
      reports: Number(r.reports),
      earnings: r.earnings,
      acceptanceRate:
        Number(r.submitted) > 0
          ? Math.round((Number(r.accepted) / Number(r.submitted)) * 10000) / 100
          : 0,
    }));
  }

  async leaderboard(userId: string, query: LeaderboardQuery) {
    const unit = query.bucket;
    const metric =
      query.by === "count"
        ? `COUNT(r.id) FILTER (WHERE r."paidAt" IS NOT NULL)::int`
        : `COALESCE(SUM(r."bountyAmount") FILTER (WHERE r."paidAt" IS NOT NULL), 0)`;
    const rows = await this.prisma.$queryRawUnsafe<
      { bucket: string; value: string }[]
    >(
      `
      SELECT to_char(date_trunc('${unit}', r."paidAt"), 'YYYY-MM-DD') AS bucket,
             ${metric}::text AS value
      FROM "Report" r
      WHERE r."authorId" = $1 AND r."paidAt" IS NOT NULL
      GROUP BY 1
      ORDER BY 1 DESC
      `,
      userId,
    );
    return rows.map((r) => ({ bucket: r.bucket, value: r.value }));
  }

  async startSession(userId: string, input: StartSessionInput) {
    // Refuse to open a second concurrent session.
    const open = await this.prisma.huntSession.findFirst({
      where: { userId, endedAt: null },
    });
    if (open) {
      throw new ConflictException("An open hunt session already exists");
    }
    return this.prisma.huntSession.create({
      data: {
        userId,
        projectId: input.projectId ?? null,
        startedAt: new Date(),
      },
    });
  }

  async stopSession(userId: string, id: string) {
    const session = await this.prisma.huntSession.findUnique({ where: { id } });
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Session not found");
    }
    if (session.endedAt) {
      throw new ConflictException("Session already stopped");
    }
    const endedAt = new Date();
    const durationSec = Math.round(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    return this.prisma.huntSession.update({
      where: { id },
      data: { endedAt, durationSec },
    });
  }

  listSessions(userId: string, query: SessionsQuery) {
    const { from, to } = resolveRange(query.from, query.to);
    return this.prisma.huntSession.findMany({
      where: { userId, startedAt: { gte: from, lte: to } },
      orderBy: { startedAt: "desc" },
    });
  }
}

// Money divided by an integer count, kept as a two-decimal string via cents.
function divideMoney(total: string, divisor: number): string {
  const cents = toCents(total);
  if (divisor === 0) return "0.00";
  const result = Math.round(cents / divisor);
  return fromCents(result);
}

function toCents(decimalStr: string): number {
  const [whole, frac = ""] = decimalStr.split(".");
  const cents = (frac + "00").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const w = Math.abs(parseInt(whole || "0", 10));
  return sign * (w * 100 + parseInt(cents, 10));
}

function fromCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${neg ? "-" : ""}${whole}.${String(frac).padStart(2, "0")}`;
}
