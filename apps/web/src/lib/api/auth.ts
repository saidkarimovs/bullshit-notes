import "server-only";
import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { HttpError } from "./respond";

export const REFRESH_COOKIE = "bn_rt";
export const REFRESH_COOKIE_PATH = "/";

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Resolve the authenticated user from the `Authorization: Bearer <token>`
 * header. The token is a Supabase access JWT; we verify it with the admin
 * client (which calls Supabase's `getUser`). Throws UNAUTHENTICATED when the
 * header is missing or the token is invalid/expired — the frontend then runs
 * its one-shot refresh against `/api/auth/refresh`.
 */
export async function requireUser(request: NextRequest): Promise<AuthedUser> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) {
    throw new HttpError("UNAUTHENTICATED", "Missing access token.");
  }

  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError("UNAUTHENTICATED", "Invalid or expired session.");
  }

  const user = data.user;
  const name =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  return { id: user.id, email: user.email ?? "", name };
}

/** Cookie options for the httpOnly refresh cookie. */
export function refreshCookie(value: string, maxAgeSeconds: number) {
  return {
    name: REFRESH_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  };
}

export function clearedRefreshCookie() {
  return {
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  };
}
