import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { EarningsPoint } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const { data, error } = await admin()
      .from("reports")
      .select("bounty_amount, paid_at")
      .eq("owner_id", user.id)
      .eq("status", "PAID")
      .not("paid_at", "is", null);
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    // Sum bounties into month buckets.
    const totals = new Map<string, number>();
    for (const r of data ?? []) {
      if (!r.paid_at || r.bounty_amount == null) continue;
      const d = new Date(r.paid_at as string);
      const key = monthKey(d.getFullYear(), d.getMonth());
      totals.set(key, (totals.get(key) ?? 0) + Number(r.bounty_amount));
    }

    // Zero-filled for the last 12 months (oldest → newest), with cumulative.
    const now = new Date();
    const result: EarningsPoint[] = [];
    let cumulative = 0;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const amount = totals.get(monthKey(d.getFullYear(), d.getMonth())) ?? 0;
      cumulative += amount;
      result.push({ date: d.toISOString(), amount: String(amount), cumulative: String(cumulative) });
    }
    return ok(result);
  });
}
