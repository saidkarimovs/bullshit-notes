import { Controller, Get, Query } from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { StatsService } from "./stats.service";
import {
  bucketQuerySchema,
  earningsQuerySchema,
  heatmapQuerySchema,
  rangeQuerySchema,
  type BucketQuery,
  type EarningsQuery,
  type HeatmapQuery,
  type RangeQuery,
} from "./dto/stats.dto";

@Controller("stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get("overview")
  overview(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.stats.overview(q.from, q.to);
  }

  @Get("severity")
  severity(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.stats.severity(q.from, q.to);
  }

  @Get("findings-over-time")
  findings(@Query(new ZodValidationPipe(bucketQuerySchema)) q: BucketQuery) {
    return this.stats.findingsOverTime(q.bucket, q.from, q.to);
  }

  @Get("status-funnel")
  funnel(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.stats.statusFunnel(q.from, q.to);
  }

  @Get("earnings")
  earnings(@Query(new ZodValidationPipe(earningsQuerySchema)) q: EarningsQuery) {
    return this.stats.earnings(q.bucket, q.from, q.to);
  }

  @Get("activity-heatmap")
  heatmap(@Query(new ZodValidationPipe(heatmapQuerySchema)) q: HeatmapQuery) {
    return this.stats.activityHeatmap(q.days);
  }

  @Get("by-project")
  byProject(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.stats.byProject(q.from, q.to);
  }
}
