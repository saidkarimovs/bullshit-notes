import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { VdpPipelineItem } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;
const POLICY_DAYS = 90;
// The schema has no explicit "disclosed" flag, so a VDP report is treated as
// disclosed once it reaches a terminal state (published / closed out).
const TERMINAL = ["PAID", "REJECTED", "DUPLICATE"];

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const { data, error } = await admin()
      .from("reports")
      .select("id, title, status, submitted_at, created_at, disclosure_deadline")
      .eq("owner_id", user.id)
      .eq("type", "VDP");
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    const now = Date.now();
    const items: VdpPipelineItem[] = [];
    for (const r of data ?? []) {
      const disclosed = TERMINAL.includes(r.status as string);
      if (disclosed) continue; // "not disclosed" filter

      const startMs = new Date((r.submitted_at as string | null) ?? (r.created_at as string)).getTime();
      const deadlineMs = r.disclosure_deadline
        ? new Date(r.disclosure_deadline as string).getTime()
        : startMs + POLICY_DAYS * DAY;

      const daysElapsed = Math.floor((now - startMs) / DAY);
      const daysRemaining = Math.ceil((deadlineMs - now) / DAY);
      const slaState: VdpPipelineItem["slaState"] =
        daysRemaining < 0 ? "OVERDUE" : daysRemaining <= 14 ? "DUE_SOON" : "ON_TRACK";

      items.push({ id: r.id as string, title: r.title as string, slaState, daysRemaining, daysElapsed });
    }

    // Most urgent first.
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return ok(items);
  });
}
