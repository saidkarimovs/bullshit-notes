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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PayloadsService } from "./payloads.service";
import {
  createPayloadSchema,
  payloadQuerySchema,
  renderPayloadSchema,
  updatePayloadSchema,
  type CreatePayloadInput,
  type PayloadQuery,
  type RenderPayloadInput,
  type UpdatePayloadInput,
} from "./dto/payloads.dto";

@Controller("payloads")
export class PayloadsController {
  constructor(private readonly payloads: PayloadsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(payloadQuerySchema)) q: PayloadQuery) {
    return this.payloads.list(q);
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createPayloadSchema)) body: CreatePayloadInput,
  ) {
    return this.payloads.create(userId, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.payloads.get(id);
  }

  @Patch(":id")
  update(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePayloadSchema)) body: UpdatePayloadInput,
  ) {
    return this.payloads.update(userId, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.payloads.remove(userId, id);
  }

  @Post(":id/render")
  render(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(renderPayloadSchema)) body: RenderPayloadInput,
  ) {
    return this.payloads.render(id, body);
  }

  @Post(":id/used")
  used(@Param("id") id: string) {
    return this.payloads.markUsed(id);
  }
}
