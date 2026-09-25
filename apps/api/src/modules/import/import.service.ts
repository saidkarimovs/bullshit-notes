import { Injectable } from "@nestjs/common";
import type { Severity } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { slugify, uniqueSlug } from "../../common/utils/slug";
import { pdfTextToMarkdown } from "./pdf-to-markdown";
import type { ImportNucleiInput, ImportReconInput } from "./dto/import.dto";

export interface ParsedMarkdownDoc {
  title: string;
  bodyMd: string;
  tags: string[];
  project?: string;
  severity?: string;
  type?: string;
  sourceFile: string;
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  // --- PDF -> Markdown (no save) --------------------------------------------
  async importPdf(
    buffer: Buffer,
  ): Promise<{ markdown: string; pageCount: number; warnings: string[] }> {
    const mod = await import("pdf-parse");
    const pdfParse = (mod.default ?? mod) as (b: Buffer) => Promise<{
      text: string;
      numpages: number;
    }>;
    const parsed = await pdfParse(buffer);
    const { markdown, warnings } = pdfTextToMarkdown(parsed.text ?? "");
    return { markdown, pageCount: parsed.numpages ?? 0, warnings };
  }

  // --- Markdown (with frontmatter) -> parsed docs (no save) -----------------
  async importMarkdown(
    files: { name: string; content: string }[],
  ): Promise<{ documents: ParsedMarkdownDoc[]; warnings: string[] }> {
    const grayMatterMod = await import("gray-matter");
    const matter = (grayMatterMod.default ??
      grayMatterMod) as (input: string) => {
      data: Record<string, unknown>;
      content: string;
    };
    const warnings: string[] = [];
    const documents: ParsedMarkdownDoc[] = [];

    for (const f of files) {
      try {
        const { data, content } = matter(f.content);
        const title =
          (data.title as string) ||
          firstHeading(content) ||
          f.name.replace(/\.md$/i, "");
        documents.push({
          title,
          bodyMd: content.trim(), // [[wikilinks]] preserved as-is
          tags: normalizeTags(data.tags),
          project: data.project as string | undefined,
          severity: data.severity as string | undefined,
          type: data.type as string | undefined,
          sourceFile: f.name,
        });
      } catch (err) {
        warnings.push(`${f.name}: ${(err as Error).message}`);
      }
    }
    return { documents, warnings };
  }

  // --- nuclei -jsonl -> Reports (DRAFT) + Assets ----------------------------
  async importNuclei(userId: string, input: ImportNucleiInput) {
    // De-duplicate on template-id + host.
    const seen = new Set<string>();
    let created = 0;
    let assetsUpserted = 0;

    for (const r of input.results) {
      const templateId = r["template-id"] ?? r.templateID ?? "unknown-template";
      const host = r.host ?? r["matched-at"] ?? "unknown-host";
      const key = `${templateId}::${host}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const severity = mapNucleiSeverity(r.info?.severity);
      const title = `${r.info?.name ?? templateId} @ ${host}`;
      const slug = await uniqueSlug(title, async (c) =>
        Boolean(await this.prisma.report.findUnique({ where: { slug: c }, select: { id: true } })),
      );

      await this.prisma.report.create({
        data: {
          title,
          slug,
          type: "PENTEST",
          status: "DRAFT",
          severity,
          bodyMd: buildNucleiBody(r, templateId, host),
          projectId: input.projectId,
          authorId: userId,
        },
      });
      created += 1;

      const upserted = await this.upsertHostAsset(input.projectId, host);
      if (upserted) assetsUpserted += 1;
    }
    return { created, assetsUpserted };
  }

  // --- recon tool output -> bulk-upsert Assets ------------------------------
  async importRecon(input: ImportReconInput) {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const values = [...new Set(input.lines.map(cleanReconLine).filter(Boolean))];
    for (const value of values) {
      const existing = await this.prisma.asset.findUnique({
        where: { projectId_value: { projectId: input.projectId, value } },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.asset.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        });
        updated += 1;
      } else {
        try {
          await this.prisma.asset.create({
            data: {
              projectId: input.projectId,
              kind: input.kind,
              value,
              status: "UNVERIFIED",
            },
          });
          created += 1;
        } catch {
          skipped += 1;
        }
      }
    }
    return { created, updated, skipped };
  }

  private async upsertHostAsset(
    projectId: string,
    host: string,
  ): Promise<boolean> {
    const value = cleanReconLine(host);
    if (!value) return false;
    try {
      await this.prisma.asset.upsert({
        where: { projectId_value: { projectId, value } },
        create: {
          projectId,
          kind: value.includes("/") ? "URL" : "SUBDOMAIN",
          value,
          status: "UNVERIFIED",
        },
        update: { lastSeenAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function firstHeading(md: string): string | undefined {
  const m = md.match(/^#{1,6}\s+(.+)$/m);
  return m?.[1]?.trim();
}

function mapNucleiSeverity(sev?: string): Severity {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
      return "LOW";
    default:
      return "INFO";
  }
}

function buildNucleiBody(
  r: { info?: { description?: string }; "matched-at"?: string },
  templateId: string,
  host: string,
): string {
  const lines = [
    `## Summary`,
    r.info?.description ?? `Nuclei finding from template \`${templateId}\`.`,
    ``,
    `## Details`,
    `- Template: \`${templateId}\``,
    `- Host: ${host}`,
  ];
  if (r["matched-at"]) lines.push(`- Matched at: ${r["matched-at"]}`);
  return lines.join("\n");
}

function cleanReconLine(line: string): string {
  return line
    .trim()
    .replace(/\s+\[.*$/, "") // strip httpx-style trailing annotations
    .replace(/^\s*[-*]\s+/, "")
    .trim();
}
