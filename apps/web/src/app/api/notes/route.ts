import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, created, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapNote, type NoteRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTE_COLUMNS = "id, project_id, title, body, tags, pinned, created_at, updated_at";

const createSchema = z.object({
  title: z.string().min(1, "Enter a title"),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional().nullable(),
  pinned: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    const projectId = request.nextUrl.searchParams.get("projectId");
    const db = admin();

    let query = db
      .from("notes")
      .select(NOTE_COLUMNS)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    return ok((data as NoteRow[] | null ?? []).map(mapNote));
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
      .from("notes")
      .insert({
        owner_id: user.id,
        project_id: projectId,
        title: parsed.data.title,
        body: parsed.data.body ?? "",
        tags: parsed.data.tags ?? [],
        pinned: parsed.data.pinned ?? false,
      })
      .select(NOTE_COLUMNS)
      .single();
    if (error || !data) throw new HttpError("INTERNAL_ERROR", error?.message ?? "Insert failed.");

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "created",
      entity_type: "note",
      entity_id: data.id,
      title: data.title,
    });

    return created(mapNote(data as NoteRow));
  });
}
