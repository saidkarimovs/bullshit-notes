import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { BullConnection } from "../../jobs/bull-connection";
import { QUEUE_NAMES } from "../../jobs/queue.constants";
import { CveSyncService } from "./cve-sync.service";

// Consumes the "cve-sync" queue (scheduled every 6h + manual triggers).
@Injectable()
export class CveWorker implements OnModuleInit {
  private readonly logger = new Logger(CveWorker.name);

  constructor(
    private readonly bull: BullConnection,
    private readonly sync: CveSyncService,
  ) {}

  onModuleInit(): void {
    const worker = new Worker(
      QUEUE_NAMES.CVE_SYNC,
      async (job) => {
        this.logger.log(`cve-sync running (job ${job.id})`);
        const since = (job.data as { since?: string })?.since;
        return this.sync.runSync(since);
      },
      { connection: this.bull.create(), concurrency: 1 },
    );
    worker.on("failed", (job, err) =>
      this.logger.error(`cve-sync job ${job?.id} failed: ${err.message}`),
    );
    this.bull.registerWorker(worker);
  }
}
