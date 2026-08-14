import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store/file-store";
import { ADRK_CLASSES } from "@/lib/domain/adrk-template";
import { validateShowCreate } from "@/lib/domain/show-draft";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import type { Show } from "@/lib/types";

export async function GET() {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const store = await readStore();
  return NextResponse.json({
    shows: store.shows,
    active_show_id: store.active_show_id,
    adrk_classes: ADRK_CLASSES,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    name?: string;
    date?: string;
    venue?: string;
    judge?: string;
    rulebook?: "adrk" | "usrc" | "rkna" | "other";
  };

  const input = {
    name: body.name ?? "",
    date: body.date ?? new Date().toISOString().slice(0, 10),
    venue: body.venue ?? "",
    judge: body.judge ?? "",
    rulebook: body.rulebook ?? ("adrk" as const),
  };
  const validation = validateShowCreate(input);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const show: Show = {
    id: newId("show"),
    name: input.name.trim(),
    date: input.date,
    venue: input.venue.trim(),
    judge: input.judge.trim(),
    rulebook: input.rulebook,
    created_at: new Date().toISOString(),
  };

  const store = await updateStore((s) => ({
    ...s,
    shows: [...s.shows, show],
    active_show_id: show.id,
  }));

  return NextResponse.json({ show, active_show_id: store.active_show_id });
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    active_show_id?: string;
    show?: Partial<Show> & { id: string };
  };

  if (body.show?.id) {
    const store = await readStore();
    const existing = store.shows.find((s) => s.id === body.show!.id);
    if (!existing) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }
    const updated: Show = {
      ...existing,
      name: body.show.name ?? existing.name,
      date: body.show.date ?? existing.date,
      venue: body.show.venue ?? existing.venue,
      judge: body.show.judge ?? existing.judge,
      rulebook: body.show.rulebook ?? existing.rulebook,
      logo_url: body.show.logo_url ?? existing.logo_url,
    };
    await updateStore((s) => ({
      ...s,
      shows: s.shows.map((sShow) => (sShow.id === updated.id ? updated : sShow)),
      ...(body.active_show_id
        ? { active_show_id: body.active_show_id }
        : {}),
    }));
    return NextResponse.json({ show: updated });
  }

  if (!body.active_show_id) {
    return NextResponse.json(
      { error: "active_show_id or show required" },
      { status: 400 },
    );
  }
  const store = await updateStore((s) => ({
    ...s,
    active_show_id: body.active_show_id!,
  }));
  return NextResponse.json({ active_show_id: store.active_show_id });
}
