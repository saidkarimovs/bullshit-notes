import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, created, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapProject, type ProjectRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROJECT_COLUMNS = "id, name, type, status, platform, description";

const createSchema = z.object({
  name: z.string().min(1, "Enter a project name"),
  type: z.enum(["BOUNTY_PROGRAM", "PENTEST_CLIENT", "PERSONAL_RESEARCH"]),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"]).optional(),
  platform: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const db = admin();

    const [projectsRes, reportsRes, assetsRes] = await Promise.all([
      db.from("projects").select(PROJECT_COLUMNS).eq("owner_id", user.id).order("created_at", { ascending: false }),
      db.from("reports").select("project_id, status, bounty_amount").eq("owner_id", user.id),
      db.from("assets").select("project_id").eq("owner_id", user.id),
    ]);
    if (projectsRes.error) throw new HttpError("INTERNAL_ERROR", projectsRes.error.message);

    const reportCounts = new Map<string, number>();
    const earned = new Map<string, number>();
    for (const r of reportsRes.data ?? []) {
      const pid = (r.project_id as string | null) ?? "";
      if (!pid) continue;
      reportCounts.set(pid, (reportCounts.get(pid) ?? 0) + 1);
      if (r.status === "PAID" && r.bounty_amount != null) {
        earned.set(pid, (earned.get(pid) ?? 0) + Number(r.bounty_amount));
      }
    }
    const assetCounts = new Map<string, number>();
    for (const a of assetsRes.data ?? []) {
      const pid = (a.project_id as string | null) ?? "";
      if (!pid) continue;
      assetCounts.set(pid, (assetCounts.get(pid) ?? 0) + 1);
    }

    const projects = (projectsRes.data as ProjectRow[] | null ?? []).map(row =>
      mapProject(row, {
        reportCount: reportCounts.get(row.id) ?? 0,
        assetCount: assetCounts.get(row.id) ?? 0,
        totalEarned: String(earned.get(row.id) ?? 0),
      }),
    );
    return ok(projects);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(
        "VALIDATION_ERROR",
        "Please check the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const db = admin();
    const { data, error } = await db
      .from("projects")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        status: parsed.data.status ?? "ACTIVE",
        platform: parsed.data.platform ?? null,
        description: parsed.data.description ?? "",
      })
      .select(PROJECT_COLUMNS)
      .single();
    if (error || !data) throw new HttpError("INTERNAL_ERROR", error?.message ?? "Insert failed.");

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "created",
      entity_type: "project",
      entity_id: data.id,
      title: data.name,
    });

    return created(mapProject(data as ProjectRow, { reportCount: 0, assetCount: 0, totalEarned: "0" }));
  });
}
