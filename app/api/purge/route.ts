import { NextResponse } from "next/server";
import { purgeShowData, deleteShowAudio } from "@/lib/store";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as { show_id: string; confirm: string };
  if (body.confirm !== "PURGE") {
    return NextResponse.json(
      { error: 'Send confirm: "PURGE" to delete show data' },
      { status: 400 },
    );
  }
  if (!body.show_id) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  await deleteShowAudio(body.show_id);
  const store = await purgeShowData(body.show_id);
  return NextResponse.json({
    ok: true,
    remaining_shows: store.shows.length,
    active_show_id: store.active_show_id,
  });
}
