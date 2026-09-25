import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CveService } from "./cve.service";
import {
  createBookmarkSchema,
  createWatchSchema,
  cveQuerySchema,
  type CreateBookmarkInput,
  type CreateWatchInput,
  type CveQuery,
} from "./dto/cve.dto";

@Controller("cve")
export class CveController {
  constructor(private readonly cve: CveService) {}

  @Get()
  list(@Query(new ZodValidationPipe(cveQuerySchema)) query: CveQuery) {
    return this.cve.list(query);
  }

  @Get("stats")
  stats() {
    return this.cve.stats();
  }

  @Post("sync")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  sync() {
    return this.cve.triggerSync();
  }

  // watches
  @Get("watches")
  listWatches(@CurrentUser("id") userId: string) {
    return this.cve.listWatches(userId);
  }

  @Post("watches")
  createWatch(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createWatchSchema)) body: CreateWatchInput,
  ) {
    return this.cve.createWatch(userId, body);
  }

  @Delete("watches/:id")
  deleteWatch(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.cve.deleteWatch(userId, id);
  }

  // bookmarks
  @Get("bookmarks")
  listBookmarks(@CurrentUser("id") userId: string) {
    return this.cve.listBookmarks(userId);
  }

  @Post("bookmarks")
  createBookmark(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createBookmarkSchema)) body: CreateBookmarkInput,
  ) {
    return this.cve.createBookmark(userId, body);
  }

  @Delete("bookmarks/:id")
  deleteBookmark(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.cve.deleteBookmark(userId, id);
  }

  // Keep the parametrised route last so it doesn't shadow the static ones.
  @Get(":cveId")
  get(@Param("cveId") cveId: string) {
    return this.cve.get(cveId);
  }
}
