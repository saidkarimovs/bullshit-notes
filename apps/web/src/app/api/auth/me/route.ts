import type { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser(request);
    return ok({ id: user.id, email: user.email, name: user.name });
  });
}
