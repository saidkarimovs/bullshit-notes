import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  cloneItems,
  SEED_TEMPLATES,
  type ChecklistItem,
} from "./checklists.seed";
import type {
  CreateChecklistInput,
  CreateTemplateInput,
  UpdateItemInput,
} from "./dto/checklists.dto";

@Injectable()
export class ChecklistsService implements OnModuleInit {
  private readonly logger = new Logger(ChecklistsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Seed the built-in templates once (idempotent on framework name).
  async onModuleInit(): Promise<void> {
    try {
      for (const tpl of SEED_TEMPLATES) {
        const exists = await this.prisma.checklistTemplate.findFirst({
          where: { framework: tpl.framework, isBuiltIn: true },
          select: { id: true },
        });
        if (exists) continue;
        await this.prisma.checklistTemplate.create({
          data: {
            name: tpl.name,
            framework: tpl.framework,
            description: tpl.description,
            items: tpl.items as unknown as Prisma.InputJsonValue,
            isBuiltIn: true,
          },
        });
      }
      this.logger.log("Built-in checklist templates ensured");
    } catch (err) {
      this.logger.warn(`Template seed skipped: ${(err as Error).message}`);
    }
  }

  listTemplates() {
    return this.prisma.checklistTemplate.findMany({
      orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
    });
  }

  createTemplate(userId: string, input: CreateTemplateInput) {
    return this.prisma.checklistTemplate.create({
      data: {
        name: input.name,
        framework: input.framework,
        description: input.description,
        items: input.items as unknown as Prisma.InputJsonValue,
        isBuiltIn: false,
        ownerId: userId,
      },
    });
  }

  listChecklists(projectId?: string) {
    return this.prisma.checklist.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async createChecklist(input: CreateChecklistInput) {
    let items: ChecklistItem[] = [];
    let name = input.name ?? "Checklist";
    if (input.templateId) {
      const tpl = await this.prisma.checklistTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!tpl) throw new NotFoundException("Template not found");
      items = cloneItems(tpl.items);
      if (!input.name) name = tpl.name;
    }
    return this.prisma.checklist.create({
      data: {
        templateId: input.templateId ?? null,
        projectId: input.projectId,
        name,
        items: items as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateItem(
    checklistId: string,
    itemId: string,
    input: UpdateItemInput,
  ) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
    });
    if (!checklist) throw new NotFoundException("Checklist not found");

    const items = (checklist.items as unknown as ChecklistItem[]) ?? [];
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) throw new NotFoundException("Checklist item not found");

    items[idx] = {
      ...items[idx],
      state: input.state,
      noteId: input.noteId ?? items[idx].noteId,
      updatedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.checklist.update({
      where: { id: checklistId },
      data: { items: items as unknown as Prisma.InputJsonValue },
    });
    return updated;
  }

  async progress(checklistId: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
    });
    if (!checklist) throw new NotFoundException("Checklist not found");
    const items = (checklist.items as unknown as ChecklistItem[]) ?? [];
    const total = items.length;
    const pass = items.filter((i) => i.state === "pass").length;
    const fail = items.filter((i) => i.state === "fail").length;
    const na = items.filter((i) => i.state === "na").length;
    const todo = items.filter((i) => i.state === "todo").length;
    // Completion excludes N/A items from the denominator.
    const considered = total - na;
    const pct =
      considered > 0 ? Math.round(((pass + fail) / considered) * 10000) / 100 : 0;
    return { total, pass, fail, na, todo, pct };
  }
}
