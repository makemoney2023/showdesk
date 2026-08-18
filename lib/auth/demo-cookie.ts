export function demoSessionCookieOptions(request: Request) {
  const forwardedHttps = request.headers.get("x-forwarded-proto") === "https";
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: forwardedHttps || production,
  };
}
