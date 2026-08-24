export function isDemoMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getDemoSessionCookieName() {
  return "sss-demo-session";
}

export function allowDemoWrites(): boolean {
  return (
    process.env.ALLOW_DEMO_WRITES === "1" ||
    process.env.NEXT_PUBLIC_ALLOW_DEMO_WRITES === "1"
  );
}

function vercelEnv(): string {
  return process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || "";
}

/** Preview or production Vercel deploys. Local next dev is not hosted. */
export function isHostedVercel(): boolean {
  return vercelEnv() === "production" || vercelEnv() === "preview";
}

/** Git-branch preview deploys. Used to show sample results when none are published. */
export function isVercelPreview(): boolean {
  return vercelEnv() === "preview";
}

/**
 * File-backed demo writes die on every Vercel deploy. Block them on hosted
 * demo unless an operator explicitly allows writes.
 */
export function demoWritesBlocked(): boolean {
  return isDemoMode() && isHostedVercel() && !allowDemoWrites();
}

export const DEMO_WRITES_BLOCKED_MESSAGE =
  "Demo mode is read-only on this host";

