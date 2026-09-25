import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase clients.
 *
 * - `admin` uses the SERVICE ROLE key and bypasses Row Level Security. It is
 *   used inside route handlers where ownership is enforced explicitly in code
 *   (every query is filtered by `owner_id = <authenticated user>`). It must
 *   never be imported into a client component — `server-only` guarantees a
 *   build error if that happens.
 * - `anonClient()` builds a fresh client with the ANON key for auth operations
 *   (sign in / sign up / refresh) that should run against the public API.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && serviceKey && anonKey);
}

let cachedAdmin: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedAdmin;
}

export function anonClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
