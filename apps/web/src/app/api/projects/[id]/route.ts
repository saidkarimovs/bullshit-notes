import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapProject, type ProjectRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROJECT_COLUMNS = "id, name, type, status, platform, description";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await context.params;
    const db = admin();

    const { data, error } = await db
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("owner_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    if (!data) throw new HttpError("NOT_FOUND", "Project not found.");

    const [reportsRes, assetsRes] = await Promise.all([
      db.from("reports").select("status, bounty_amount").eq("owner_id", user.id).eq("project_id", id),
      db.from("assets").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("project_id", id),
    ]);

    const reportRows = reportsRes.data ?? [];
    const totalEarned = reportRows
      .filter(r => r.status === "PAID" && r.bounty_amount != null)
      .reduce((sum, r) => sum + Number(r.bounty_amount), 0);

    return ok(
      mapProject(data as ProjectRow, {
        reportCount: reportRows.length,
        assetCount: assetsRes.count ?? 0,
        totalEarned: String(totalEarned),
      }),
    );
  });
}
