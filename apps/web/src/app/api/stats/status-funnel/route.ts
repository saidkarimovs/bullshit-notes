import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { FunnelPoint } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STAGES = ["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED", "PAID"];

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const { data, error } = await admin()
      .from("reports")
      .select("status")
      .eq("owner_id", user.id);
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      const s = r.status as string;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }

    const result: FunnelPoint[] = [];
    let prev = 0;
    STAGES.forEach((status, index) => {
      const count = counts.get(status) ?? 0;
      const dropOffPct = index === 0 || prev === 0 ? 0 : ((prev - count) / prev) * 100;
      result.push({ status, count, dropOffPct });
      prev = count;
    });
    return ok(result);
  });
}
