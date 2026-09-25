import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, type Queue } from "bullmq";
import type { Redis } from "ioredis";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { REDIS } from "../../infra/redis/redis.module";
import { BullConnection } from "../../jobs/bull-connection";
import { QUEUE_NAMES, QUEUE_TOKEN } from "../../jobs/queue.constants";
import { computeSla } from "./sla";

const THRESHOLDS = [14, 7, 1, 0];

// Consumes the "sla-check" queue (daily 08:00 UTC). For each VDP report it
// notifies once per crossed threshold, deduping via a Redis set so the same
// threshold never fires twice for a report.
@Injectable()
export class VdpSlaWorker implements OnModuleInit {
  private readonly logger = new Logger(VdpSlaWorker.name);

  constructor(
    private readonly bull: BullConnection,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(QUEUE_TOKEN.WEBHOOK_DISPATCH) private readonly webhookQueue: Queue,
  ) {}

  onModuleInit(): void {
    const worker = new Worker(
      QUEUE_NAMES.SLA_CHECK,
      async () => this.runCheck(),
      { connection: this.bull.create(), concurrency: 1 },
    );
    worker.on("failed", (job, err) =>
      this.logger.error(`sla-check job ${job?.id} failed: ${err.message}`),
    );
    this.bull.registerWorker(worker);
  }

  async runCheck(): Promise<{ notified: number }> {
    const reports = await this.prisma.report.findMany({
      where: { type: "VDP", disclosedAt: null },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        disclosureDeadline: true,
        disclosedAt: true,
        projectId: true,
        authorId: true,
      },
    });

    let notified = 0;
    for (const r of reports) {
      const sla = computeSla({
        submittedAt: r.submittedAt,
        disclosureDeadline: r.disclosureDeadline,
        disclosedAt: r.disclosedAt,
      });
      // Find the tightest threshold this report has crossed.
      const crossed = THRESHOLDS.find((t) => sla.daysRemaining <= t);
      if (crossed === undefined) continue;

      const dedupeKey = `vdp:sla:${r.id}:${crossed}`;
      const isNew = await this.redis.set(dedupeKey, "1", "EX", 60 * 86_400, "NX");
      if (isNew !== "OK") continue; // already notified for this threshold

      await this.webhookQueue.add(
        sla.slaState === "OVERDUE" ? "vdp.overdue" : "vdp.sla_warning",
        {
          event: sla.slaState === "OVERDUE" ? "vdp.overdue" : "vdp.sla_warning",
          userId: r.authorId,
          reportId: r.id,
          title: r.title,
          projectId: r.projectId,
          daysRemaining: sla.daysRemaining,
          threshold: crossed,
        },
      );
      // Also record the notification on the timeline.
      await this.prisma.vdpEvent.create({
        data: {
          reportId: r.id,
          kind: "TRIAGE_UPDATE",
          body: `SLA threshold crossed: ${crossed} day(s) remaining (${sla.slaState}).`,
          occurredAt: new Date(),
        },
      });
      notified += 1;
    }
    this.logger.log(`sla-check notified ${notified} threshold crossings`);
    return { notified };
  }
}
