import { Global, Module } from "@nestjs/common";
import { ENV_TOKEN, loadEnv } from "./env";

// Provides the validated Env object app-wide.
@Global()
@Module({
  providers: [
    {
      provide: ENV_TOKEN,
      useFactory: () => loadEnv(),
    },
  ],
  exports: [ENV_TOKEN],
})
export class ConfigModule {}
