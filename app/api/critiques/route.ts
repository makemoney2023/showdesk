import { NextResponse } from "next/server";
import {
  readStore,
  updateStore,
  newId,
  writeCritiqueAudio,
  readCritiqueAudio,
} from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import { processCritique } from "@/lib/pipeline/process-critique";
import { canTransition } from "@/lib/domain/critique-status";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";
import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";

const MAX_AUDIO_BASE64_CHARS = 20 * 1024 * 1024;

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const store = await readStore();
  const activeShow = showId ?? store.active_show_id;
  if (!activeShow) return NextResponse.json({ critiques: [] });
  return NextResponse.json({
    critiques: filterByShow(store.critiques, activeShow),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    entry_id: string;
    audio_base64?: string;
    live_transcript?: string;
    judge?: string;
  }>(request);
  if (!body?.show_id || !body.entry_id) {
    return NextResponse.json(
      { error: "show_id and entry_id required" },
      { status: 400 },
    );
  }
  if (
    body.audio_base64 &&
    body.audio_base64.length > MAX_AUDIO_BASE64_CHARS
  ) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === body.entry_id && e.show_id === body.show_id,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const critiqueId = newId("critique");
  const now = new Date().toISOString();

  await updateStore((s) => ({
    ...s,
    critiques: [
      ...s.critiques,
      {
        id: critiqueId,
        show_id: body.show_id,
        entry_id: body.entry_id,
        status: "PROCESSING",
        transcript: "",
        draft: { narrative: "", formwert: null, placement: null, titles: [] },
        delivery_status: "blocked",
        created_at: now,
        updated_at: now,
        judge: (body.judge ?? "").trim() || undefined,
      },
    ],
  }));

  try {
    let audioPath: string | undefined;
    if (body.audio_base64) {
      audioPath = await writeCritiqueAudio({
        showId: body.show_id,
        critiqueId,
        base64: body.audio_base64,
      });
    }

    const result = await processCritique({
      audioBase64: body.audio_base64,
      liveTranscript: body.live_transcript,
      entryId: body.entry_id,
      showId: body.show_id,
    });

    const placement = (await readStore()).placements.find(
      (p) => p.entry_id === body.entry_id && p.show_id === body.show_id,
    );

    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === critiqueId
          ? {
              ...c,
              status: "PENDING_REVIEW" as const,
              transcript: result.transcript,
              draft: {
                ...result.draft,
                placement: placement?.placement ?? result.draft.placement,
              },
              audio_path: audioPath,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    }));

    return NextResponse.json({
      id: critiqueId,
      status: "PENDING_REVIEW",
      mock: result.mock,
      source: result.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === critiqueId
          ? {
              ...c,
              status: "ERROR" as const,
              error_message: message,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    }));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    critique_id: string;
    action: "update_draft" | "rerun" | "approve";
    draft?: DraftCritiqueSchema;
    audio_base64?: string;
  }>(request);
  if (!body?.show_id || !body.critique_id || !body.action) {
    return NextResponse.json(
      { error: "show_id, critique_id, and action required" },
      { status: 400 },
    );
  }

  const store = await readStore();
  const critique = store.critiques.find(
    (c) => c.id === body.critique_id && c.show_id === body.show_id,
  );
  if (!critique) {
    return NextResponse.json({ error: "Critique not found" }, { status: 404 });
  }

  if (body.action === "update_draft" && body.draft) {
    if (critique.status === "APPROVED") {
      return NextResponse.json(
        { error: "Approved critiques cannot be edited" },
        { status: 409 },
      );
    }
    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === body.critique_id
          ? {
              ...c,
              draft: body.draft as typeof c.draft,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    }));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rerun") {
    if (!canTransition(critique.status, "PROCESSING")) {
      return NextResponse.json(
        { error: `Cannot rerun from ${critique.status}` },
        { status: 409 },
      );
    }
    try {
      let audioBase64 = body.audio_base64;
      if (!audioBase64 && critique.audio_path) {
        const buf = await readCritiqueAudio(critique.audio_path);
        audioBase64 = buf.toString("base64");
      }
      const result = await processCritique({
        audioBase64,
        liveTranscript: critique.transcript || undefined,
        entryId: critique.entry_id,
        showId: body.show_id,
      });
      const placement = (await readStore()).placements.find(
        (p) => p.entry_id === critique.entry_id && p.show_id === body.show_id,
      );
      await updateStore((s) => ({
        ...s,
        critiques: s.critiques.map((c) =>
          c.id === body.critique_id
            ? {
                ...c,
                status: "PENDING_REVIEW" as const,
                transcript: result.transcript,
                draft: {
                  ...result.draft,
                  placement: placement?.placement ?? result.draft.placement,
                },
                error_message: undefined,
                updated_at: new Date().toISOString(),
              }
            : c,
        ),
      }));
      return NextResponse.json({ ok: true, mock: result.mock });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      await updateStore((s) => ({
        ...s,
        critiques: s.critiques.map((c) =>
          c.id === body.critique_id
            ? {
                ...c,
                status: "ERROR" as const,
                error_message: message,
                updated_at: new Date().toISOString(),
              }
            : c,
        ),
      }));
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (body.action === "approve") {
    if (!canTransition(critique.status, "APPROVED")) {
      return NextResponse.json(
        { error: `Cannot approve from ${critique.status}` },
        { status: 409 },
      );
    }
    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === body.critique_id
          ? {
              ...c,
              status: "APPROVED" as const,
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              delivery_status: "pending" as const,
            }
          : c,
      ),
    }));
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
