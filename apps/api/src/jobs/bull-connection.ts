import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { Worker } from "bullmq";
import { REDIS } from "../infra/redis/redis.module";

// BullMQ requires a connection with maxRetriesPerRequest: null. We never
// mutate the shared "REDIS" client — we duplicate() it and set the option on
// the copy. Every Queue / Worker created through this provider is tracked so
// it can be torn down on shutdown.
@Injectable()
export class BullConnection implements OnModuleDestroy {
  private readonly logger = new Logger(BullConnection.name);
  private readonly connections: Redis[] = [];
  private readonly workers: Worker[] = [];

  constructor(@Inject(REDIS) private readonly shared: Redis) {}

  /** A fresh, BullMQ-safe connection derived from the shared client. */
  create(): Redis {
    const conn = this.shared.duplicate({ maxRetriesPerRequest: null });
    conn.on("error", (err) =>
      this.logger.warn(`BullMQ redis connection error: ${err.message}`),
    );
    this.connections.push(conn);
    return conn;
  }

  /** Register a worker so it is closed cleanly on shutdown. */
  registerWorker(worker: Worker): void {
    this.workers.push(worker);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.workers.map((w) => w.close()));
    await Promise.allSettled(this.connections.map((c) => c.quit()));
  }
}
