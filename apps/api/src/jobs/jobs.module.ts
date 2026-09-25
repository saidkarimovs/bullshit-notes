import {
  Global,
  Logger,
  Module,
  OnApplicationBootstrap,
  Provider,
} from "@nestjs/common";
import { Queue } from "bullmq";
import { BullConnection } from "./bull-connection";
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  QUEUE_TOKEN,
} from "./queue.constants";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";

// One Queue provider per queue name. Producers inject by token.
function queueProvider(token: string, name: string): Provider {
  return {
    provide: token,
    inject: [BullConnection],
    useFactory: (bc: BullConnection): Queue =>
      new Queue(name, {
        connection: bc.create(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
  };
}

const queueProviders: Provider[] = [
  queueProvider(QUEUE_TOKEN.CVE_SYNC, QUEUE_NAMES.CVE_SYNC),
  queueProvider(QUEUE_TOKEN.PDF_RENDER, QUEUE_NAMES.PDF_RENDER),
  queueProvider(QUEUE_TOKEN.SLA_CHECK, QUEUE_NAMES.SLA_CHECK),
  queueProvider(QUEUE_TOKEN.WEBHOOK_DISPATCH, QUEUE_NAMES.WEBHOOK_DISPATCH),
  queueProvider(QUEUE_TOKEN.NOTE_EMBED, QUEUE_NAMES.NOTE_EMBED),
];

@Global()
@Module({
  controllers: [JobsController],
  providers: [BullConnection, JobsService, ...queueProviders],
  exports: [
    BullConnection,
    JobsService,
    QUEUE_TOKEN.CVE_SYNC,
    QUEUE_TOKEN.PDF_RENDER,
    QUEUE_TOKEN.SLA_CHECK,
    QUEUE_TOKEN.WEBHOOK_DISPATCH,
    QUEUE_TOKEN.NOTE_EMBED,
  ],
})
export class JobsModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsModule.name);

  constructor(private readonly jobs: JobsService) {}

  // Register repeatable jobs once everything is wired.
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.jobs.registerRepeatables();
    } catch (err) {
      this.logger.warn(
        `Could not register repeatable jobs: ${(err as Error).message}`,
      );
    }
  }
}
