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
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { VdpService } from "./vdp.service";
import {
  createContactSchema,
  createEventSchema,
  discloseSchema,
  extendSchema,
  updateContactSchema,
  type CreateContactInput,
  type CreateEventInput,
  type DiscloseInput,
  type ExtendInput,
  type UpdateContactInput,
} from "./dto/vdp.dto";

@Controller("vdp")
export class VdpController {
  constructor(private readonly vdp: VdpService) {}

  @Get("pipeline")
  pipeline() {
    return this.vdp.pipeline();
  }

  @Get("reports/:id/events")
  listEvents(@Param("id") id: string) {
    return this.vdp.listEvents(id);
  }

  @Post("reports/:id/events")
  addEvent(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventInput,
  ) {
    return this.vdp.addEvent(id, body);
  }

  @Post("reports/:id/extend")
  extend(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(extendSchema)) body: ExtendInput,
  ) {
    return this.vdp.extend(id, body);
  }

  @Post("reports/:id/disclose")
  disclose(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(discloseSchema)) body: DiscloseInput,
  ) {
    return this.vdp.disclose(id, body);
  }

  // contacts
  @Get("contacts")
  listContacts(@Query("projectId") projectId?: string) {
    return this.vdp.listContacts(projectId);
  }

  @Post("contacts")
  createContact(
    @Body(new ZodValidationPipe(createContactSchema)) body: CreateContactInput,
  ) {
    return this.vdp.createContact(body);
  }

  @Patch("contacts/:id")
  updateContact(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateContactSchema)) body: UpdateContactInput,
  ) {
    return this.vdp.updateContact(id, body);
  }

  @Delete("contacts/:id")
  deleteContact(@Param("id") id: string) {
    return this.vdp.deleteContact(id);
  }
}
