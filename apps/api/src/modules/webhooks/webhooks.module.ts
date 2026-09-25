import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { WebhooksWorker } from "./webhooks.worker";

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksWorker],
  exports: [WebhooksService],
})
export class WebhooksModule {}
