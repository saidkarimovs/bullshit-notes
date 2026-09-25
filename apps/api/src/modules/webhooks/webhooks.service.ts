import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Queue } from "bullmq";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { QUEUE_TOKEN } from "../../jobs/queue.constants";
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
} from "./dto/webhooks.dto";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_TOKEN.WEBHOOK_DISPATCH) private readonly queue: Queue,
  ) {}

  list(userId: string) {
    return this.prisma.webhook.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  create(userId: string, input: CreateWebhookInput) {
    return this.prisma.webhook.create({
      data: {
        ownerId: userId,
        url: input.url,
        kind: input.kind,
        events: input.events,
        secret: input.secret ?? randomBytes(24).toString("hex"),
      },
    });
  }

  async update(userId: string, id: string, input: UpdateWebhookInput) {
    await this.requireOwned(userId, id);
    return this.prisma.webhook.update({
      where: { id },
      data: {
        url: input.url,
        kind: input.kind,
        events: input.events,
        active: input.active,
        secret: input.secret,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.webhook.delete({ where: { id } });
    return { ok: true };
  }

  // Enqueue a synthetic event to exercise the delivery path.
  async test(userId: string, id: string) {
    const webhook = await this.requireOwned(userId, id);
    const job = await this.queue.add("test", {
      event: webhook.events[0] ?? "report.created",
      webhookId: webhook.id,
      userId,
      title: "Test event from bullshit notes",
      severity: "MEDIUM",
    });
    return { enqueued: true, jobId: job.id };
  }

  private async requireOwned(userId: string, id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException("Webhook not found");
    if (webhook.ownerId !== userId) {
      throw new ForbiddenException("Not your webhook");
    }
    return webhook;
  }
}
