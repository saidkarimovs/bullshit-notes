import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { HeatmapPoint } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const daysParam = Number(request.nextUrl.searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.floor(daysParam) : 365;

    const now = new Date();
    const to = new Date(dayKey(now) + "T00:00:00.000Z");
    const from = new Date(to.getTime() - (days - 1) * DAY);

    const { data, error } = await admin()
      .from("audit_log")
      .select("created_at")
      .eq("owner_id", user.id)
      .gte("created_at", from.toISOString())
      .lt("created_at", new Date(to.getTime() + DAY).toISOString());
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const key = String(row.created_at).slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const result: HeatmapPoint[] = [];
    for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
      const key = dayKey(new Date(t));
      result.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return ok(result);
  });
}
