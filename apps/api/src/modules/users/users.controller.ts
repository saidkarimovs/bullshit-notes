import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import {
  updateMeSchema,
  updateUserSchema,
  userQuerySchema,
  type UpdateMeInput,
  type UpdateUserInput,
  type UserQuery,
} from "./dto/user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  list(
    @Query(new ZodValidationPipe(userQuerySchema)) query: UserQuery,
  ) {
    return this.users.list(query);
  }

  @Patch("me")
  updateMe(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ) {
    return this.users.updateMe(userId, body);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.users.updateByAdmin(id, body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  async remove(@Param("id") id: string) {
    await this.users.remove(id);
    return { ok: true };
  }
}
