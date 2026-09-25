import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { DashboardOverview } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPEN_STATUSES = ["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED"];

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const db = admin();

    const [totalRes, openRes, assetsRes, paidRes] = await Promise.all([
      db.from("reports").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      db
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .in("status", OPEN_STATUSES),
      db.from("assets").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      db.from("reports").select("bounty_amount").eq("owner_id", user.id).eq("status", "PAID"),
    ]);
    if (totalRes.error) throw new HttpError("INTERNAL_ERROR", totalRes.error.message);

    const totalEarned = (paidRes.data ?? []).reduce(
      (sum, r) => sum + (r.bounty_amount != null ? Number(r.bounty_amount) : 0),
      0,
    );

    const overview: DashboardOverview = {
      totalFindings: totalRes.count ?? 0,
      openFindings: openRes.count ?? 0,
      activeTargets: assetsRes.count ?? 0,
      totalEarned: String(totalEarned),
    };
    return ok(overview);
  });
}
