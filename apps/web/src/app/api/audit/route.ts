import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { ActivityItem } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const perPageParam = Number(request.nextUrl.searchParams.get("perPage"));
    const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.min(Math.floor(perPageParam), 100) : 20;

    const { data, error } = await admin()
      .from("audit_log")
      .select("id, action, entity_type, title, actor, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(perPage);
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    const items: ActivityItem[] = (data ?? []).map(row => ({
      id: row.id as string,
      action: row.action as string,
      entityType: row.entity_type as string,
      title: (row.title as string) ?? "",
      createdAt: row.created_at as string,
      actor: (row.actor as string) ?? "You",
    }));
    return ok(items);
  });
}
