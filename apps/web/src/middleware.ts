import { NextRequest, NextResponse } from "next/server";

const protectedPaths = /^\/(dashboard|reports|projects|notes|assets|bounty|vdp|cve|payloads|checklists|vault|tools|timeline|settings|style-guide)(\/|$)/;

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.next();
  if (protectedPaths.test(request.nextUrl.pathname) && !request.cookies.has("bn_rt")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico|api).*)"] };
