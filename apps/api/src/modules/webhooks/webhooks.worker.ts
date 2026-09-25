import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import type { Webhook } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { BullConnection } from "../../jobs/bull-connection";
import { QUEUE_NAMES } from "../../jobs/queue.constants";
import { fetchWithTimeout } from "../../lib/http";
import {
  formatDiscord,
  formatGeneric,
  formatSlack,
  formatTelegram,
  signBody,
  type WebhookEvent,
} from "./format";

const MAX_FAILURES = 10; // consecutive failures -> disable

// Consumes "webhook-dispatch". Job data is a WebhookEvent plus an optional
// userId (owner scope) and optional webhookId (targeted, e.g. test).
@Injectable()
export class WebhooksWorker implements OnModuleInit {
  private readonly logger = new Logger(WebhooksWorker.name);

  private get timeoutMs(): number {
    return Number(process.env.WEBHOOK_TIMEOUT_MS ?? 10_000);
  }

  constructor(
    private readonly bull: BullConnection,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const worker = new Worker(
      QUEUE_NAMES.WEBHOOK_DISPATCH,
      async (job) => this.dispatch(job.data as DispatchJob),
      { connection: this.bull.create(), concurrency: 5 },
    );
    worker.on("failed", (job, err) =>
      this.logger.warn(`webhook-dispatch job ${job?.id} failed: ${err.message}`),
    );
    this.bull.registerWorker(worker);
  }

  private async dispatch(data: DispatchJob): Promise<{ delivered: number }> {
    const targets = await this.resolveTargets(data);
    let delivered = 0;
    for (const webhook of targets) {
      const ok = await this.deliver(webhook, data);
      if (ok) delivered += 1;
    }
    return { delivered };
  }

  private async resolveTargets(data: DispatchJob): Promise<Webhook[]> {
    if (data.webhookId) {
      const w = await this.prisma.webhook.findUnique({
        where: { id: data.webhookId },
      });
      return w && w.active ? [w] : [];
    }
    return this.prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: data.event },
        ...(data.userId ? { ownerId: data.userId } : {}),
      },
    });
  }

  private async deliver(webhook: Webhook, evt: WebhookEvent): Promise<boolean> {
    try {
      const { body, headers } = this.buildRequest(webhook, evt);
      const res = await fetchWithTimeout(webhook.url, {
        method: "POST",
        headers,
        body,
        timeoutMs: this.timeoutMs,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastFiredAt: new Date(), failureCount: 0 },
      });
      return true;
    } catch (err) {
      const failureCount = webhook.failureCount + 1;
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount,
          active: failureCount >= MAX_FAILURES ? false : webhook.active,
        },
      });
      this.logger.warn(
        `Webhook ${webhook.id} delivery failed (${failureCount}): ${(err as Error).message}`,
      );
      // Re-throw so BullMQ retries per the queue's attempts/backoff policy.
      throw err;
    }
  }

  private buildRequest(
    webhook: Webhook,
    evt: WebhookEvent,
  ): { body: string; headers: Record<string, string> } {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    let payload: object;
    switch (webhook.kind) {
      case "DISCORD":
        payload = formatDiscord(evt);
        break;
      case "SLACK":
        payload = formatSlack(evt);
        break;
      case "TELEGRAM":
        // For Telegram, `secret` carries the chat_id and `url` is the bot's
        // sendMessage endpoint.
        payload = formatTelegram(evt, webhook.secret);
        break;
      default:
        payload = formatGeneric(evt);
        break;
    }
    const body = JSON.stringify(payload);
    if (webhook.kind === "GENERIC") {
      headers["X-BN-Signature"] = signBody(body, webhook.secret);
    }
    return { body, headers };
  }
}

interface DispatchJob extends WebhookEvent {
  event: string;
  userId?: string;
  webhookId?: string;
}
