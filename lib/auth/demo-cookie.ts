/** Long enough to survive a full show weekend without re-login. */
export const DEMO_SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;

export function demoSessionCookieOptions(request: Request) {
  const forwardedHttps = request.headers.get("x-forwarded-proto") === "https";
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: forwardedHttps || production,
    // Session cookies vanish when a phone kills the browser between classes;
    // a mid-show logout at ringside is a showstopper.
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
  };
}
