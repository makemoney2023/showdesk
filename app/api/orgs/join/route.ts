import { NextResponse } from "next/server";
import { isApiUnauthorized, requireApiSession } from "@/lib/auth/api-guard";
import { joinClubByInvite } from "@/lib/auth/org-service";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as { invite_code?: string };
  const result = await joinClubByInvite({
    userId: auth.user.id,
    inviteCode: body.invite_code,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const user = await getSessionUser();
  return NextResponse.json({ org: result.org, user });
}
