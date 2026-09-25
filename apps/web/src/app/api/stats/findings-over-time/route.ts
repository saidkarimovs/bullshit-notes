import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { FindingsPoint, Severity } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;
const SEVERITIES: Severity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const params = request.nextUrl.searchParams;

    const now = new Date();
    const toParam = params.get("to");
    const fromParam = params.get("from");
    const to = toParam ? new Date(toParam + "T00:00:00.000Z") : new Date(dayKey(now) + "T00:00:00.000Z");
    const from = fromParam
      ? new Date(fromParam + "T00:00:00.000Z")
      : new Date(to.getTime() - 29 * DAY);

    const { data, error } = await admin()
      .from("reports")
      .select("severity, created_at")
      .eq("owner_id", user.id)
      .gte("created_at", from.toISOString())
      .lt("created_at", new Date(to.getTime() + DAY).toISOString());
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    // Zero-filled buckets for every day in range.
    const buckets = new Map<string, FindingsPoint>();
    for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
      const key = dayKey(new Date(t));
      buckets.set(key, { date: key, INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
    }

    for (const r of data ?? []) {
      const key = String(r.created_at).slice(0, 10);
      const point = buckets.get(key);
      const severity = r.severity as Severity;
      if (point && SEVERITIES.includes(severity)) point[severity] += 1;
    }

    return ok(Array.from(buckets.values()));
  });
}
