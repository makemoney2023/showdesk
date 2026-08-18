export type AuthCredentialsResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAuthCredentials(body: {
  email?: string;
  password?: string;
}): AuthCredentialsResult {
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";

  if (!email) {
    return { ok: false, error: "Email is required" };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }

  return { ok: true, email, password };
}
