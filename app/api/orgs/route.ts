import { NextResponse } from "next/server";
import {
  isApiUnauthorized,
  requireApiSession,
  requireSecretaryWrite,
} from "@/lib/auth/api-guard";
import { createClubForUser, rotateInviteCode } from "@/lib/auth/org-service";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;
  return NextResponse.json({
    org: auth.user.org,
    orgs: auth.user.orgs,
    needsClub: auth.user.orgs.length === 0,
    needsClubSelect: auth.user.orgs.length > 1 && !auth.user.org,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as { name?: string };
  const result = await createClubForUser({
    userId: auth.user.id,
    name: body.name,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const user = await getSessionUser();
  return NextResponse.json({ org: result.org, user });
}

export async function PATCH(request: Request) {
  const auth = await requireSecretaryWrite();
  if (isApiUnauthorized(auth)) return auth;
  if (!auth.user.org) {
    return NextResponse.json({ error: "Select a club first" }, { status: 409 });
  }

  const body = (await request.json()) as { rotate_invite?: boolean };
  if (!body.rotate_invite) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await rotateInviteCode(auth.user.org.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const user = await getSessionUser();
  return NextResponse.json({ org: result.org, user });
}
