import { Global, Module, OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";
import { ENV_TOKEN, type Env } from "../../config/env";

export const REDIS = "REDIS";

// Exposes a raw ioredis client. Connection only — no BullMQ queues here.
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV_TOKEN],
      useFactory: (env: Env): Redis => {
        return new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // client is disposed by ioredis GC; nothing queue-related to tear down.
  }
}
