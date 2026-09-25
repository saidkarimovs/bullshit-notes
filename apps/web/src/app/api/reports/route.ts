import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, created, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapReport, type ReportRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPORT_COLUMNS =
  "id, project_id, title, type, severity, status, target, cvss_score, bounty_amount, body, submitted_at, resolved_at, paid_at, disclosure_deadline, created_at, updated_at";

const createSchema = z.object({
  title: z.string().min(1, "Enter a title"),
  target: z.string().optional(),
  type: z.enum(["CVE", "BBP", "VDP", "PENTEST", "INTERNAL"]).optional(),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED", "DUPLICATE", "REJECTED", "PAID"]).optional(),
  projectId: z.string().optional().nullable(),
  body: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const projectId = request.nextUrl.searchParams.get("projectId");
    const db = admin();

    let query = db
      .from("reports")
      .select(REPORT_COLUMNS)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    return ok((data as ReportRow[] | null ?? []).map(mapReport));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(
        "VALIDATION_ERROR",
        "Please check the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const db = admin();

    // Only keep projectId when it references one of the user's own projects.
    let projectId: string | null = null;
    if (parsed.data.projectId) {
      const { data: project } = await db
        .from("projects")
        .select("id")
        .eq("owner_id", user.id)
        .eq("id", parsed.data.projectId)
        .maybeSingle();
      projectId = project ? (project.id as string) : null;
    }

    const { data, error } = await db
      .from("reports")
      .insert({
        owner_id: user.id,
        project_id: projectId,
        title: parsed.data.title,
        target: parsed.data.target ?? "",
        type: parsed.data.type ?? "BBP",
        severity: parsed.data.severity ?? "INFO",
        status: parsed.data.status ?? "DRAFT",
        body: parsed.data.body ?? "",
      })
      .select(REPORT_COLUMNS)
      .single();
    if (error || !data) throw new HttpError("INTERNAL_ERROR", error?.message ?? "Insert failed.");

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "created",
      entity_type: "report",
      entity_id: data.id,
      title: data.title,
    });

    return created(mapReport(data as ReportRow));
  });
}
