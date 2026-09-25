import { Controller, Get, Query } from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SearchService } from "./search.service";
import { searchQuerySchema, type SearchQuery } from "./dto/search.dto";

@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  // GET /api/search?q=&types=report,note,project,asset&limit=20
  @Get()
  run(@Query(new ZodValidationPipe(searchQuerySchema)) q: SearchQuery) {
    return this.search.search(q.q, q.types, q.limit);
  }
}
