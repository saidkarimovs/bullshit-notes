import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { computeSla } from "./sla";
import type {
  CreateContactInput,
  CreateEventInput,
  DiscloseInput,
  ExtendInput,
  UpdateContactInput,
} from "./dto/vdp.dto";

@Injectable()
export class VdpService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/vdp/pipeline — all VDP reports with the disclosure clock.
  async pipeline() {
    const reports = await this.prisma.report.findMany({
      where: { type: "VDP" },
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        severity: true,
        submittedAt: true,
        disclosureDeadline: true,
        disclosedAt: true,
        projectId: true,
      },
    });
    return reports.map((r) => {
      const sla = computeSla({
        submittedAt: r.submittedAt,
        disclosureDeadline: r.disclosureDeadline,
        disclosedAt: r.disclosedAt,
      });
      return { ...r, ...sla };
    });
  }

  private async requireVdpReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || report.type !== "VDP") {
      throw new NotFoundException("VDP report not found");
    }
    return report;
  }

  async listEvents(reportId: string) {
    await this.requireVdpReport(reportId);
    return this.prisma.vdpEvent.findMany({
      where: { reportId },
      orderBy: { occurredAt: "asc" },
    });
  }

  async addEvent(reportId: string, input: CreateEventInput) {
    await this.requireVdpReport(reportId);
    return this.prisma.vdpEvent.create({
      data: {
        reportId,
        kind: input.kind,
        body: input.body,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      },
    });
  }

  async extend(reportId: string, input: ExtendInput) {
    const report = await this.requireVdpReport(reportId);
    const base =
      report.disclosureDeadline ??
      (report.submittedAt
        ? new Date(report.submittedAt.getTime() + 90 * 86_400_000)
        : new Date());
    const newDeadline = new Date(base.getTime() + input.days * 86_400_000);

    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { disclosureDeadline: newDeadline },
      }),
      this.prisma.vdpEvent.create({
        data: {
          reportId,
          kind: "EXTENSION_GRANTED",
          body: `Extended by ${input.days} days. ${input.reason}`.trim(),
          occurredAt: new Date(),
        },
      }),
    ]);
    return {
      id: updated.id,
      disclosureDeadline: updated.disclosureDeadline,
    };
  }

  async disclose(reportId: string, input: DiscloseInput) {
    await this.requireVdpReport(reportId);
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { disclosedAt: now },
      }),
      this.prisma.vdpEvent.create({
        data: {
          reportId,
          kind: "DISCLOSED",
          body: input.publicUrl
            ? `Publicly disclosed: ${input.publicUrl}`
            : "Publicly disclosed",
          occurredAt: now,
        },
      }),
    ]);
    return { id: updated.id, disclosedAt: updated.disclosedAt };
  }

  // --- contacts -------------------------------------------------------------

  listContacts(projectId?: string) {
    return this.prisma.vdpContact.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  createContact(input: CreateContactInput) {
    return this.prisma.vdpContact.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        email: input.email,
        role: input.role ?? null,
      },
    });
  }

  async updateContact(id: string, input: UpdateContactInput) {
    await this.requireContact(id);
    return this.prisma.vdpContact.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        lastContactedAt: input.lastContactedAt
          ? new Date(input.lastContactedAt)
          : undefined,
      },
    });
  }

  async deleteContact(id: string) {
    await this.requireContact(id);
    await this.prisma.vdpContact.delete({ where: { id } });
    return { ok: true };
  }

  private async requireContact(id: string) {
    const c = await this.prisma.vdpContact.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("Contact not found");
    return c;
  }
}
