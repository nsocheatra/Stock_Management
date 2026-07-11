import { NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/api/telegram-webhook",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/icon-",
  "/manifest.json",
  "/sw.js",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (publicPaths.some((p) => pathname.startsWith(p))) return response;
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") return response;

  const session = request.cookies.get("session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js).*)",
  ],
};
