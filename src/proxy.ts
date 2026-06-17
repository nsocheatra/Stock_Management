import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/api/telegram-webhook", "/api/upload"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/sw.js" || pathname === "/manifest.json" || pathname.startsWith("/icon-")) return NextResponse.next();

  const session = request.cookies.get("session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
