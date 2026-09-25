import type { NextRequest } from "next/server";
import { anonClient } from "@/lib/supabase/admin";
import { ok, fail, handle } from "@/lib/api/respond";
import { refreshCookie, clearedRefreshCookie, REFRESH_COOKIE } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      return fail("UNAUTHENTICATED", "No active session.");
    }

    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      const res = fail("UNAUTHENTICATED", "Session expired.");
      res.cookies.set(clearedRefreshCookie());
      return res;
    }

    // Rotate the cookie with the freshly issued refresh token.
    const res = ok({ accessToken: data.session.access_token });
    res.cookies.set(refreshCookie(data.session.refresh_token, REFRESH_MAX_AGE));
    return res;
  });
}
