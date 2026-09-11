import { NextResponse } from "next/server";
import { lookupPublicOrg } from "@/lib/auth/org-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const org = await lookupPublicOrg(slug);
  if (!org) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }
  return NextResponse.json({ org });
}
