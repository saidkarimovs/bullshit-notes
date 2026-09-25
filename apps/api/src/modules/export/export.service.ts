import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { QUEUE_TOKEN } from "../../jobs/queue.constants";
import type { PdfJobData, PdfJobResult } from "./export.worker";

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_TOKEN.PDF_RENDER) private readonly pdfQueue: Queue,
  ) {}

  async enqueue(
    kind: PdfJobData["kind"],
    id: string,
    userId: string,
    template: PdfJobData["template"] = "default",
  ): Promise<{ jobId: string }> {
    // Validate the target exists and belongs to the requester where relevant.
    await this.assertExists(kind, id);
    const job = await this.pdfQueue.add(`${kind}:${id}`, {
      kind,
      id,
      userId,
      template,
    } satisfies PdfJobData);
    return { jobId: String(job.id) };
  }

  async jobStatus(jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) throw new NotFoundException("Export job not found");
    const state = await job.getState();
    const progress =
      typeof job.progress === "number" ? job.progress : 0;
    const result = job.returnvalue as PdfJobResult | undefined;
    return {
      state,
      progress,
      downloadUrl: result?.downloadUrl,
    };
  }

  private async assertExists(kind: PdfJobData["kind"], id: string) {
    let found: unknown;
    if (kind === "report") {
      found = await this.prisma.report.findUnique({ where: { id }, select: { id: true } });
    } else if (kind === "note") {
      found = await this.prisma.note.findUnique({ where: { id }, select: { id: true } });
    } else {
      found = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    }
    if (!found) throw new NotFoundException(`${kind} not found`);
  }

  // Full account export as a zip buffer (backup feature).
  async dataExport(
    userId: string,
    format: "json" | "markdown",
  ): Promise<Buffer> {
    const JSZipMod = await import("jszip");
    const JSZip = JSZipMod.default ?? (JSZipMod as unknown as typeof import("jszip"));
    const zip = new JSZip();

    const [notes, reports, projects] = await Promise.all([
      this.prisma.note.findMany({ where: { authorId: userId } }),
      this.prisma.report.findMany({ where: { authorId: userId } }),
      this.prisma.project.findMany({ where: { ownerId: userId } }),
    ]);

    const ext = format === "json" ? "json" : "md";

    for (const n of notes) {
      const fm = {
        id: n.id,
        title: n.title,
        type: "note",
        projectId: n.projectId ?? null,
        pinned: n.pinned,
        createdAt: n.createdAt.toISOString(),
      };
      zip.file(
        `notes/${safeName(n.slug || n.id)}.${ext}`,
        format === "json"
          ? JSON.stringify({ ...fm, bodyMd: n.bodyMd }, null, 2)
          : withFrontmatter(fm, n.bodyMd),
      );
    }

    for (const r of reports) {
      const fm = {
        id: r.id,
        title: r.title,
        type: r.type,
        severity: r.severity,
        status: r.status,
        projectId: r.projectId ?? null,
        bountyAmount: r.bountyAmount ? r.bountyAmount.toString() : null,
        createdAt: r.createdAt.toISOString(),
      };
      zip.file(
        `reports/${safeName(r.slug || r.id)}.${ext}`,
        format === "json"
          ? JSON.stringify({ ...fm, bodyMd: r.bodyMd }, null, 2)
          : withFrontmatter(fm, r.bodyMd),
      );
    }

    const manifest = {
      exportedAt: new Date().toISOString(),
      userId,
      format,
      counts: {
        notes: notes.length,
        reports: reports.length,
        projects: projects.length,
      },
      projects: projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    return zip.generateAsync({ type: "nodebuffer" });
  }
}

// Build a YAML frontmatter block + body without pulling in a YAML lib.
function withFrontmatter(meta: Record<string, unknown>, body: string): string {
  const lines = Object.entries(meta).map(([k, v]) => {
    const val =
      v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v);
    return `${k}: ${val}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
