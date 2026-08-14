import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_COOKIE = "sss-demo-session";

function hasSession(request: NextRequest): boolean {
  if (request.cookies.get(DEMO_COOKIE)?.value) return true;
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth")),
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/admin") || pathname.startsWith("/ringside");
  if (!isProtected) return NextResponse.next();

  if (hasSession(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/ringside", "/ringside/:path*"],
};
