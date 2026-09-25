import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Matches the SearchResult shape consumed by command-palette.tsx.
type SearchResult = { id: string; title: string; type: string; projectName?: string; href?: string };

const LIMIT = 20;

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q) return ok<SearchResult[]>([]);

    const db = admin();
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;

    const [projectsRes, reportsRes, notesRes] = await Promise.all([
      db.from("projects").select("id, name").eq("owner_id", user.id).ilike("name", like).limit(LIMIT),
      db.from("reports").select("id, title, project_id").eq("owner_id", user.id).ilike("title", like).limit(LIMIT),
      db.from("notes").select("id, title, project_id").eq("owner_id", user.id).ilike("title", like).limit(LIMIT),
    ]);
    if (projectsRes.error) throw new HttpError("INTERNAL_ERROR", projectsRes.error.message);

    // Project id → name, for annotating reports/notes.
    const projectNames = new Map<string, string>();
    for (const p of projectsRes.data ?? []) projectNames.set(p.id as string, p.name as string);

    const results: SearchResult[] = [];
    for (const p of projectsRes.data ?? []) {
      results.push({ id: p.id as string, title: p.name as string, type: "project", href: `/projects/${p.id}` });
    }
    for (const r of reportsRes.data ?? []) {
      const pid = r.project_id as string | null;
      results.push({
        id: r.id as string,
        title: r.title as string,
        type: "report",
        href: `/reports/${r.id}`,
        ...(pid && projectNames.has(pid) ? { projectName: projectNames.get(pid) } : {}),
      });
    }
    for (const n of notesRes.data ?? []) {
      const pid = n.project_id as string | null;
      results.push({
        id: n.id as string,
        title: n.title as string,
        type: "note",
        href: `/notes/${n.id}`,
        ...(pid && projectNames.has(pid) ? { projectName: projectNames.get(pid) } : {}),
      });
    }

    return ok(results.slice(0, LIMIT));
  });
}
