import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { ok, handle, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { mapNote, type NoteRow } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTE_COLUMNS = "id, project_id, title, body, tags, pinned, created_at, updated_at";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
});

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
    if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
    if (parsed.data.pinned !== undefined) patch.pinned = parsed.data.pinned;

    const { data, error } = await db
      .from("notes")
      .update(patch)
      .eq("owner_id", user.id)
      .eq("id", id)
      .select(NOTE_COLUMNS)
      .maybeSingle();
    if (error) throw new HttpError("INTERNAL_ERROR", error.message);
    if (!data) throw new HttpError("NOT_FOUND", "Note not found.");

    await db.from("audit_log").insert({
      owner_id: user.id,
      action: "updated",
      entity_type: "note",
      entity_id: id,
      title: data.title,
    });

    return ok(mapNote(data as NoteRow));
  });
}
