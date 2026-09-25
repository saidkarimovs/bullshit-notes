import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapReport, type ReportRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPORT_COLUMNS =
  "id, project_id, title, type, severity, status, target, cvss_score, bounty_amount, body, submitted_at, resolved_at, paid_at, disclosure_deadline, created_at, updated_at";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  target: z.string().optional(),
  type: z.enum(["CVE", "BBP", "VDP", "PENTEST", "INTERNAL"]).optional(),
  bountyAmount: z.union([z.string(), z.number(), z.null()]).optional(),
  cvssScore: z.union([z.number(), z.null()]).optional(),
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await context.params;
    const { data, error } = await admin()
      .from("reports")
      .select(REPORT_COLUMNS)
      .eq("owner_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    if (!data) throw new HttpError("NOT_FOUND", "Report not found.");
    return ok(mapReport(data as ReportRow));
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(
        "VALIDATION_ERROR",
        "Please check the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const db = admin();

    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.body !== undefined) patch.body = parsed.data.body;
    if (parsed.data.severity !== undefined) patch.severity = parsed.data.severity;
    if (parsed.data.target !== undefined) patch.target = parsed.data.target;
    if (parsed.data.type !== undefined) patch.type = parsed.data.type;
    if (parsed.data.bountyAmount !== undefined) {
      patch.bounty_amount = parsed.data.bountyAmount === null ? null : Number(parsed.data.bountyAmount);
    }
    if (parsed.data.cvssScore !== undefined) patch.cvss_score = parsed.data.cvssScore;

    const { data, error } = await db
      .from("reports")
      .update(patch)
      .eq("owner_id", user.id)
      .eq("id", id)
      .select(REPORT_COLUMNS)
      .maybeSingle();
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    if (!data) throw new HttpError("NOT_FOUND", "Report not found.");

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "updated",
      entity_type: "report",
      entity_id: id,
      title: data.title,
    });

    return ok(mapReport(data as ReportRow));
  });
}
