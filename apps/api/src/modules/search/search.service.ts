import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import type { SearchHit, SearchType } from "./dto/search.dto";

const MIN_FTS_LEN = 3;
const HEADLINE_OPTS =
  "StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10, ShortWord=2, MaxFragments=2";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    q: string,
    types: SearchType[],
    limit: number,
  ): Promise<Record<SearchType, SearchHit[]>> {
    const out: Record<SearchType, SearchHit[]> = {
      report: [],
      note: [],
      project: [],
      asset: [],
    };
    const useFts = q.trim().length >= MIN_FTS_LEN;

    await Promise.all(
      types.map(async (type) => {
        out[type] = await this.searchOne(type, q, limit, useFts);
      }),
    );
    return out;
  }

  private async searchOne(
    type: SearchType,
    q: string,
    limit: number,
    useFts: boolean,
  ): Promise<SearchHit[]> {
    switch (type) {
      case "report":
        return this.searchReports(q, limit, useFts);
      case "note":
        return this.searchNotes(q, limit, useFts);
      case "project":
        return this.searchProjects(q, limit);
      case "asset":
        return this.searchAssets(q, limit);
    }
  }

  private async searchReports(
    q: string,
    limit: number,
    useFts: boolean,
  ): Promise<SearchHit[]> {
    if (useFts) {
      const rows = await this.prisma.$queryRaw<
        {
          id: string;
          title: string;
          snippet: string;
          score: number;
          projectname: string | null;
        }[]
      >`
        SELECT r.id,
               r.title,
               ts_headline('english', coalesce(r."bodyMd", r.title),
                 websearch_to_tsquery('english', ${q}),
                 ${HEADLINE_OPTS}) AS snippet,
               ts_rank_cd(r.search_vector, websearch_to_tsquery('english', ${q})) AS score,
               p.name AS projectname
        FROM "Report" r
        LEFT JOIN "Project" p ON p.id = r."projectId"
        WHERE r.search_vector @@ websearch_to_tsquery('english', ${q})
        ORDER BY score DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        id: r.id,
        type: "report" as const,
        title: r.title,
        snippet: r.snippet,
        score: Number(r.score),
        projectName: r.projectname ?? undefined,
      }));
    }
    return this.trigram("Report", q, limit, "report", true);
  }

  private async searchNotes(
    q: string,
    limit: number,
    useFts: boolean,
  ): Promise<SearchHit[]> {
    if (useFts) {
      const rows = await this.prisma.$queryRaw<
        {
          id: string;
          title: string;
          snippet: string;
          score: number;
          projectname: string | null;
        }[]
      >`
        SELECT n.id,
               n.title,
               ts_headline('english', coalesce(n."bodyMd", n.title),
                 websearch_to_tsquery('english', ${q}),
                 ${HEADLINE_OPTS}) AS snippet,
               ts_rank_cd(n.search_vector, websearch_to_tsquery('english', ${q})) AS score,
               p.name AS projectname
        FROM "Note" n
        LEFT JOIN "Project" p ON p.id = n."projectId"
        WHERE n.search_vector @@ websearch_to_tsquery('english', ${q})
        ORDER BY score DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        id: r.id,
        type: "note" as const,
        title: r.title,
        snippet: r.snippet,
        score: Number(r.score),
        projectName: r.projectname ?? undefined,
      }));
    }
    return this.trigram("Note", q, limit, "note", true);
  }

  private async searchProjects(q: string, limit: number): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<
      { id: string; title: string; score: number }[]
    >`
      SELECT id, name AS title, similarity(name, ${q}) AS score
      FROM "Project"
      WHERE name % ${q} OR name ILIKE ${"%" + q + "%"}
      ORDER BY score DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      type: "project" as const,
      title: r.title,
      snippet: r.title,
      score: Number(r.score),
    }));
  }

  private async searchAssets(q: string, limit: number): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        title: string;
        score: number;
        projectname: string | null;
      }[]
    >`
      SELECT a.id, a.value AS title, similarity(a.value, ${q}) AS score,
             p.name AS projectname
      FROM "Asset" a
      LEFT JOIN "Project" p ON p.id = a."projectId"
      WHERE a.value % ${q} OR a.value ILIKE ${"%" + q + "%"}
      ORDER BY score DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      type: "asset" as const,
      title: r.title,
      snippet: r.title,
      score: Number(r.score),
      projectName: r.projectname ?? undefined,
    }));
  }

  // Trigram fallback on title only (used when q is shorter than 3 chars).
  private async trigram(
    table: "Report" | "Note",
    q: string,
    limit: number,
    type: "report" | "note",
    withProject: boolean,
  ): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: string;
        title: string;
        score: number;
        projectname: string | null;
      }[]
    >(
      `
      SELECT t.id, t.title, similarity(t.title, $1) AS score,
             ${withProject ? "p.name" : "NULL"} AS projectname
      FROM "${table}" t
      ${withProject ? `LEFT JOIN "Project" p ON p.id = t."projectId"` : ""}
      WHERE t.title % $1 OR t.title ILIKE $2
      ORDER BY score DESC
      LIMIT $3
      `,
      q,
      `%${q}%`,
      limit,
    );
    return rows.map((r) => ({
      id: r.id,
      type,
      title: r.title,
      snippet: r.title,
      score: Number(r.score),
      projectName: r.projectname ?? undefined,
    }));
  }
}
