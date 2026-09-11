import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/org";
import { demoSessionCookieOptions } from "@/lib/auth/demo-cookie";

export async function readActiveOrgId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_ORG_COOKIE)?.value?.trim();
  return value || null;
}

export async function writeActiveOrgId(
  orgId: string,
  request?: Request,
): Promise<void> {
  const store = await cookies();
  store.set(
    ACTIVE_ORG_COOKIE,
    orgId,
    request
      ? demoSessionCookieOptions(request)
      : {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 3 * 24 * 60 * 60,
        },
  );
}

export async function clearActiveOrgId(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_ORG_COOKIE);
}
