import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  // Validate env before anything else; crash loudly on a missing var.
  const env = loadEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: true },
  );

  // Structured logging via pino.
  app.useLogger(app.get(Logger));

  // Cookies (refresh token lives in an httpOnly cookie).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyCookie as any);

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.enableShutdownHooks();

  await app.listen(env.PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`[bullshit-notes] API listening on :${env.PORT}`);
}

void bootstrap();
