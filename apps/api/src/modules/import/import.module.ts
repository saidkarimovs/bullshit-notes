import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";

@Module({
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule implements OnModuleInit {
  private readonly logger = new Logger(ImportModule.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  // Register @fastify/multipart on the running Fastify instance. Done here so
  // the shared main.ts (owned by Prompt 1) does not need editing. Registration
  // happens during module init, before app.listen().
  async onModuleInit(): Promise<void> {
    try {
      const instance = this.adapterHost.httpAdapter?.getInstance?.();
      if (!instance) return;
      // Avoid double registration if another module already added it.
      if (instance.hasContentTypeParser?.("multipart/form-data")) return;
      const multipart = await import("@fastify/multipart");
      await instance.register(multipart.default ?? multipart, {
        limits: { fileSize: 25 * 1024 * 1024, files: 1 },
      });
      this.logger.log("@fastify/multipart registered for /api/import");
    } catch (err) {
      this.logger.warn(
        `Could not register multipart plugin: ${(err as Error).message}`,
      );
    }
  }
}
