import { fail, handle } from "@/lib/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The frontend route exists, but two-factor is not enabled — login never
// triggers this path. Always reports that 2FA is unavailable.
export async function POST() {
  return handle(async () => fail("VALIDATION_ERROR", "Two-factor authentication is not enabled."));
}
