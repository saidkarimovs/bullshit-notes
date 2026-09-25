import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { StorageService } from "../../infra/storage/storage.service";
import { BullConnection } from "../../jobs/bull-connection";
import { QUEUE_NAMES } from "../../jobs/queue.constants";
import { renderMarkdown } from "../../lib/markdown";
import { PdfRendererService } from "./pdf-renderer.service";
import { renderCover, wrapDocument, type CoverMeta } from "./print-template";

export interface PdfJobData {
  kind: "report" | "note" | "project";
  id: string;
  userId: string;
  template?: "default" | "client" | "minimal";
}

export interface PdfJobResult {
  storageKey: string;
  downloadUrl: string;
}

@Injectable()
export class ExportWorker implements OnModuleInit {
  private readonly logger = new Logger(ExportWorker.name);

  constructor(
    private readonly bull: BullConnection,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly renderer: PdfRendererService,
  ) {}

  onModuleInit(): void {
    const worker = new Worker<PdfJobData, PdfJobResult>(
      QUEUE_NAMES.PDF_RENDER,
      async (job) => this.process(job),
      { connection: this.bull.create(), concurrency: 2 },
    );
    worker.on("failed", (job, err) =>
      this.logger.error(`pdf-render job ${job?.id} failed: ${err.message}`),
    );
    this.bull.registerWorker(worker);
  }

  private async process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    const { kind, id, userId } = job.data;
    await job.updateProgress(10);

    const { html, title } = await this.buildHtml(kind, id);
    await job.updateProgress(50);

    const pdf = await this.renderer.renderPdf(html);
    await job.updateProgress(80);

    const storageKey = `exports/${userId}/${randomUUID()}.pdf`;
    // Upload via a presigned PUT so the worker never streams through the API.
    const uploadUrl = await this.storage.presignPut(storageKey, "application/pdf");
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "application/pdf" },
      body: pdf,
    });
    if (!put.ok) {
      throw new Error(`Upload failed: HTTP ${put.status}`);
    }
    await job.updateProgress(95);

    const downloadUrl = await this.storage.presignGet(storageKey, 3600);
    this.logger.log(`Rendered ${kind} ${id} -> ${storageKey} (${title})`);
    return { storageKey, downloadUrl };
  }

  private async buildHtml(
    kind: PdfJobData["kind"],
    id: string,
  ): Promise<{ html: string; title: string }> {
    if (kind === "report") return this.buildReport(id);
    if (kind === "note") return this.buildNote(id);
    return this.buildProject(id);
  }

  private async buildReport(id: string): Promise<{ html: string; title: string }> {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!report) throw new Error("Report not found");
    const cover: CoverMeta = {
      title: report.title,
      subtitle: report.project?.name ?? undefined,
      severity: report.severity,
      cvssVector: report.cvssVector,
      target: report.project?.name ?? null,
      date: report.createdAt.toISOString().slice(0, 10),
    };
    const body = await renderMarkdown(report.bodyMd || "_No content._");
    return {
      html: wrapDocument(report.title, renderCover(cover), body),
      title: report.title,
    };
  }

  private async buildNote(id: string): Promise<{ html: string; title: string }> {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!note) throw new Error("Note not found");
    const cover: CoverMeta = {
      title: note.title,
      subtitle: note.project?.name ?? undefined,
      date: note.createdAt.toISOString().slice(0, 10),
    };
    const body = await renderMarkdown(note.bodyMd || "_No content._");
    return {
      html: wrapDocument(note.title, renderCover(cover), body),
      title: note.title,
    };
  }

  private async buildProject(id: string): Promise<{ html: string; title: string }> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error("Project not found");
    const assets = await this.prisma.asset.findMany({
      where: { projectId: id },
      orderBy: { value: "asc" },
    });
    const reports = await this.prisma.report.findMany({
      where: { projectId: id },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    const sections: string[] = [];
    sections.push(`<h1>${escapeHtml(project.name)} — Engagement Report</h1>`);
    sections.push(await renderMarkdown(project.scopeNotesMd || "_No scope notes._"));

    sections.push("<h2>Scope</h2>");
    sections.push(this.assetTable(assets));

    sections.push("<h2>Findings</h2>");
    for (const r of reports) {
      sections.push(`<h3>[${escapeHtml(r.severity)}] ${escapeHtml(r.title)}</h3>`);
      sections.push(await renderMarkdown(r.bodyMd || "_No content._"));
    }

    sections.push("<h2>Appendix: Assets</h2>");
    sections.push(this.assetTable(assets));

    const cover: CoverMeta = {
      title: project.name,
      subtitle: "Security Engagement Report",
      target: project.platform ?? null,
      date: new Date().toISOString().slice(0, 10),
    };
    return {
      html: wrapDocument(project.name, renderCover(cover), sections.join("\n")),
      title: project.name,
    };
  }

  private assetTable(assets: Asset[]): string {
    if (assets.length === 0) return "<p>No assets recorded.</p>";
    const rows = assets
      .map(
        (a) =>
          `<tr><td>${escapeHtml(a.kind)}</td><td>${escapeHtml(a.value)}</td><td>${escapeHtml(
            a.status,
          )}</td></tr>`,
      )
      .join("");
    return `<table><thead><tr><th>Kind</th><th>Value</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

type Asset = { kind: string; value: string; status: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
