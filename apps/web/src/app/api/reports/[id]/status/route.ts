import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Status = "DRAFT" | "SUBMITTED" | "TRIAGED" | "ACCEPTED" | "DUPLICATE" | "REJECTED" | "PAID";

const TRANSITIONS: Record<Status, Status[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["TRIAGED", "REJECTED", "DUPLICATE"],
  TRIAGED: ["ACCEPTED", "REJECTED", "DUPLICATE"],
  ACCEPTED: ["PAID"],
  PAID: [],
  REJECTED: [],
  DUPLICATE: [],
};

const schema = z.object({
  toStatus: z.enum(["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED", "DUPLICATE", "REJECTED", "PAID"]),
  note: z.string().optional(),
  duplicateOfId: z.string().optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError("VALIDATION_ERROR", "A valid target status is required.");
    }
    const { toStatus, note } = parsed.data;
    const db = admin();

    const { data: current, error: fetchError } = await db
      .from("reports")
      .select("id, status, title")
      .eq("owner_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new HttpError("INTERNAL_ERROR", fetchError.message);
    if (!current) throw new HttpError("NOT_FOUND", "Report not found.");

    const fromStatus = current.status as Status;
    if (!TRANSITIONS[fromStatus].includes(toStatus)) {
      throw new HttpError("CONFLICT", `Cannot move a report from ${fromStatus} to ${toStatus}.`);
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { status: toStatus };
    if (toStatus === "SUBMITTED") patch.submitted_at = nowIso;
    if (["TRIAGED", "ACCEPTED", "REJECTED", "DUPLICATE"].includes(toStatus)) patch.resolved_at = nowIso;
    if (toStatus === "PAID") patch.paid_at = nowIso;

    const { error: updateError } = await db
      .from("reports")
      .update(patch)
      .eq("owner_id", user.id)
      .eq("id", id);
    if (updateError) throw new HttpError("INTERNAL_ERROR", updateError.message);

    await db.from("report_events").insert({
      owner_id: user.id,
      report_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      note: note ?? null,
    });

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "status_changed",
      entity_type: "report",
      entity_id: id,
      title: current.title as string,
    });

    return ok({ success: true });
  });
}
