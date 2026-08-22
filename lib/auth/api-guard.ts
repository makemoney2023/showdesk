import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isSecretaryRole } from "@/lib/auth/roles";
import {
  DEMO_WRITES_BLOCKED_MESSAGE,
  demoWritesBlocked,
} from "@/lib/supabase/config";

export type ApiSessionOk = { user: SessionUser };

export function isApiUnauthorized(
  result: ApiSessionOk | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

function demoWriteBlockedResponse(): NextResponse {
  return NextResponse.json(
    { error: DEMO_WRITES_BLOCKED_MESSAGE },
    { status: 403 },
  );
}

/** Returns 401 Response when unauthenticated; otherwise `{ user }`. */
export async function requireApiSession(): Promise<ApiSessionOk | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}

/** Session plus a hosted-demo write check. Use on mutating routes. */
export async function requireApiWrite(): Promise<ApiSessionOk | NextResponse> {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;
  if (demoWritesBlocked()) return demoWriteBlockedResponse();
  return auth;
}

/** Desk-admin mutations: secretary only, and not on hosted read-only demo. */
export async function requireSecretaryWrite(): Promise<
  ApiSessionOk | NextResponse
> {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;
  if (!isSecretaryRole(auth.user.role)) {
    return NextResponse.json(
      { error: "Secretary role required" },
      { status: 403 },
    );
  }
  return auth;
}
