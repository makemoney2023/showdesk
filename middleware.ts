import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_SITE_ORIGIN, isPrivateVercelHost } from "@/lib/site-url";

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
  const host = request.headers.get("host") ?? request.nextUrl.host;
  if (
    process.env.VERCEL_ENV === "production" &&
    isPrivateVercelHost(host)
  ) {
    const publicUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      PUBLIC_SITE_ORIGIN,
    );
    return NextResponse.redirect(publicUrl, 308);
  }

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/ringside");
  if (!isProtected) return NextResponse.next();

  if (hasSession(request)) return NextResponse.next();

  // Anonymous visitors on the root see the public marketing page
  // (rewrite keeps the URL at "/"); app routes still require login.
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/home", request.url));
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/ringside",
    "/ringside/:path*",
    "/results",
    "/results/:path*",
  ],
};
