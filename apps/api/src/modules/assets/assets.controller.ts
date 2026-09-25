import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  assetQuerySchema,
  bulkAssetSchema,
  createAssetSchema,
  updateAssetSchema,
  type AssetQuery,
  type BulkAssetInput,
  type CreateAssetInput,
  type UpdateAssetInput,
} from "@bn/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AssetsService } from "./assets.service";

// Project-scoped asset routes.
@Controller("projects/:projectId/assets")
export class ProjectAssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(assetQuerySchema)) query: AssetQuery,
  ) {
    return this.assets.list(projectId, query);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createAssetSchema)) body: CreateAssetInput,
  ) {
    return this.assets.create(projectId, body);
  }

  @Post("bulk")
  bulk(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(bulkAssetSchema)) body: BulkAssetInput,
  ) {
    return this.assets.bulk(projectId, body);
  }
}

// Flat asset routes for update/delete by id.
@Controller("assets")
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAssetSchema)) body: UpdateAssetInput,
  ) {
    return this.assets.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.assets.remove(id);
    return { ok: true };
  }
}
