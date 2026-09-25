import { Inject, Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUE_NAMES, QUEUE_TOKEN } from "./queue.constants";

export interface QueueCounts {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(QUEUE_TOKEN.CVE_SYNC) private readonly cveSync: Queue,
    @Inject(QUEUE_TOKEN.PDF_RENDER) private readonly pdfRender: Queue,
    @Inject(QUEUE_TOKEN.SLA_CHECK) private readonly slaCheck: Queue,
    @Inject(QUEUE_TOKEN.WEBHOOK_DISPATCH) private readonly webhook: Queue,
    @Inject(QUEUE_TOKEN.NOTE_EMBED) private readonly noteEmbed: Queue,
  ) {}

  private get queues(): Queue[] {
    return [
      this.cveSync,
      this.pdfRender,
      this.slaCheck,
      this.webhook,
      this.noteEmbed,
    ];
  }

  /** Repeatable schedules: cve-sync every 6h, sla-check daily 08:00 UTC. */
  async registerRepeatables(): Promise<void> {
    await this.cveSync.add(
      "scheduled-sync",
      { reason: "scheduled" },
      {
        repeat: { every: 6 * 60 * 60 * 1000 },
        jobId: "cve-sync:repeat",
      },
    );
    await this.slaCheck.add(
      "scheduled-sla",
      { reason: "scheduled" },
      {
        repeat: { pattern: "0 8 * * *", tz: "UTC" },
        jobId: "sla-check:repeat",
      },
    );
  }

  async status(): Promise<QueueCounts[]> {
    return Promise.all(
      this.queues.map(async (q) => {
        const c = await q.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
          "paused",
        );
        return {
          name: q.name,
          waiting: c.waiting ?? 0,
          active: c.active ?? 0,
          completed: c.completed ?? 0,
          failed: c.failed ?? 0,
          delayed: c.delayed ?? 0,
          paused: c.paused ?? 0,
        };
      }),
    );
  }

  queueByName(name: string): Queue | undefined {
    switch (name) {
      case QUEUE_NAMES.CVE_SYNC:
        return this.cveSync;
      case QUEUE_NAMES.PDF_RENDER:
        return this.pdfRender;
      case QUEUE_NAMES.SLA_CHECK:
        return this.slaCheck;
      case QUEUE_NAMES.WEBHOOK_DISPATCH:
        return this.webhook;
      case QUEUE_NAMES.NOTE_EMBED:
        return this.noteEmbed;
      default:
        return undefined;
    }
  }
}
