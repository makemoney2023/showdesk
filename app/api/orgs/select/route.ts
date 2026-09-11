import { NextResponse } from "next/server";
import { isApiUnauthorized, requireApiSession } from "@/lib/auth/api-guard";
import { writeActiveOrgId } from "@/lib/auth/org-cookie";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as { org_id?: string; slug?: string };
  const match = auth.user.orgs.find(
    (org) => org.id === body.org_id || (body.slug && org.slug === body.slug),
  );
  if (!match) {
    return NextResponse.json(
      { error: "You are not a member of that club" },
      { status: 403 },
    );
  }

  await writeActiveOrgId(match.id, request);
  const user = await getSessionUser();
  return NextResponse.json({ org: match, user });
}
