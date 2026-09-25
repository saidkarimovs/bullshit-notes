import type { NextRequest } from "next/server";
import { z } from "zod";
import { admin, anonClient } from "@/lib/supabase/admin";
import { ok, fail, handle, HttpError } from "@/lib/api/respond";
import { refreshCookie } from "@/lib/api/auth";
import { seedForUser } from "@/lib/api/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/\d/, "Include a digit"),
});

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(
        "VALIDATION_ERROR",
        "Please check the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const { name, email, password } = parsed.data;

    const db = admin();
    const { data: createdUser, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError || !createdUser.user) {
      const message = createError?.message ?? "";
      const status = (createError as { status?: number } | null)?.status;
      if (status === 422 || /already|exists|registered/i.test(message)) {
        return fail("CONFLICT", "An account with this email already exists.");
      }
      throw new HttpError("INTERNAL_ERROR", "Could not create the account.");
    }

    // Seed starter data (never allowed to break signup).
    await seedForUser(db, createdUser.user.id);

    const { data: signIn, error: signInError } = await anonClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signIn.session) {
      // Account exists but session mint failed — let the user sign in.
      return ok({ accessToken: null });
    }

    const res = ok({ accessToken: signIn.session.access_token });
    res.cookies.set(refreshCookie(signIn.session.refresh_token, REFRESH_MAX_AGE));
    return res;
  });
}
