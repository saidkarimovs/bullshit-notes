import type { NextRequest } from "next/server";
import { z } from "zod";
import { anonClient } from "@/lib/supabase/admin";
import { ok, fail, handle } from "@/lib/api/respond";
import { refreshCookie } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().optional(),
});

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("UNAUTHENTICATED", "Invalid email or password.");
    }
    const { email, password } = parsed.data;

    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return fail("UNAUTHENTICATED", "Invalid email or password.");
    }

    const res = ok({ accessToken: data.session.access_token });
    res.cookies.set(refreshCookie(data.session.refresh_token, REFRESH_MAX_AGE));
    return res;
  });
}
