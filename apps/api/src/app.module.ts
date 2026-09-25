import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { ConfigModule } from "./config/config.module";
import { ENV_TOKEN, type Env } from "./config/env";

import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
import { StorageModule } from "./infra/storage/storage.module";
import { CryptoModule } from "./infra/crypto/crypto.module";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { FilesModule } from "./modules/files/files.module";
import { AuditModule } from "./modules/audit/audit.module";

// === PROMPT 2 MODULES GO HERE ===
import { JobsModule } from "./jobs/jobs.module";
import { SearchModule } from "./modules/search/search.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AiModule } from "./modules/ai/ai.module";
import { CveModule } from "./modules/cve/cve.module";
import { BountyModule } from "./modules/bounty/bounty.module";
import { VdpModule } from "./modules/vdp/vdp.module";
import { PayloadsModule } from "./modules/payloads/payloads.module";
import { ChecklistsModule } from "./modules/checklists/checklists.module";
import { VaultModule } from "./modules/vault/vault.module";
import { ExportModule } from "./modules/export/export.module";
import { ImportModule } from "./modules/import/import.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

@Module({
  imports: [
    // --- config + logging ---
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          redact: ["req.headers.authorization", 'req.headers.cookie'],
          transport:
            env.NODE_ENV === "development"
              ? { target: "pino-pretty", options: { singleLine: true } }
              : undefined,
        },
      }),
    }),

    // --- rate limiting: default 300 requests / 60s, keyed by IP ---
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 300 },
    ]),

    // --- infra (all @Global) ---
    PrismaModule,
    RedisModule,
    StorageModule,
    CryptoModule,

    // --- feature modules (Prompt 1 scope) ---
    AuthModule,
    UsersModule,
    ProjectsModule,
    ReportsModule,
    NotesModule,
    AssetsModule,
    FilesModule,
    AuditModule,

    // --- feature modules (Prompt 2 scope) ---
    // JobsModule is @Global and provides the BullMQ queues that CVE / VDP /
    // Export / Webhooks producers inject, so keep it first.
    JobsModule,
    SearchModule,
    StatsModule,
    AiModule,
    CveModule,
    BountyModule,
    VdpModule,
    PayloadsModule,
    ChecklistsModule,
    VaultModule,
    ExportModule,
    ImportModule,
    WebhooksModule,
  ],
  providers: [
    // Global rate limiter.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global JWT auth (bypassed by @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global response envelope + error mapping.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
