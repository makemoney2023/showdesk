import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export type ApiSessionOk = { user: SessionUser };

export function isApiUnauthorized(
  result: ApiSessionOk | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

/** Returns 401 Response when unauthenticated; otherwise `{ user }`. */
export async function requireApiSession(): Promise<ApiSessionOk | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}
