import { ok, handle } from "@/lib/api/respond";
import { clearedRefreshCookie } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return handle(async () => {
    const res = ok({ success: true });
    res.cookies.set(clearedRefreshCookie());
    return res;
  });
}
