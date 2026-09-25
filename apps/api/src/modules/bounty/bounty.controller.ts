import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BountyService } from "./bounty.service";
import {
  leaderboardQuerySchema,
  sessionsQuerySchema,
  startSessionSchema,
  type LeaderboardQuery,
  type SessionsQuery,
  type StartSessionInput,
} from "./dto/bounty.dto";

@Controller("bounty")
export class BountyController {
  constructor(private readonly bounty: BountyService) {}

  @Get("overview")
  overview(@CurrentUser("id") userId: string) {
    return this.bounty.overview(userId);
  }

  @Get("programs")
  programs(@CurrentUser("id") userId: string) {
    return this.bounty.programs(userId);
  }

  @Get("leaderboard")
  leaderboard(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(leaderboardQuerySchema)) q: LeaderboardQuery,
  ) {
    return this.bounty.leaderboard(userId, q);
  }

  @Post("sessions/start")
  start(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(startSessionSchema)) body: StartSessionInput,
  ) {
    return this.bounty.startSession(userId, body);
  }

  @Post("sessions/:id/stop")
  stop(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.bounty.stopSession(userId, id);
  }

  @Get("sessions")
  sessions(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(sessionsQuerySchema)) q: SessionsQuery,
  ) {
    return this.bounty.listSessions(userId, q);
  }
}
