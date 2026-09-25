import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import type { Severity, SeverityCount } from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const { data, error } = await admin()
      .from("reports")
      .select("severity")
      .eq("owner_id", user.id);
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);

    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      const s = r.severity as string;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }

    const result: SeverityCount[] = ORDER.map(severity => ({
      severity,
      count: counts.get(severity) ?? 0,
    }));
    return ok(result);
  });
}
