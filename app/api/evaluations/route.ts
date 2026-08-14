import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store/file-store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  createEmptyTnrkSeForm,
  mergeEntryIntoSeForm,
  validateTnrkSeFormForPass,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import {
  canSyncSeIntoCritique,
  critiqueDraftFromSeForm,
  mergeSeIntoCritiqueDraft,
  narrativeFromSeForm,
} from "@/lib/domain/se-to-critique";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import type { CritiqueRecord } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const entryId = searchParams.get("entry_id");
  const store = await readStore();
  const activeShow = showId ?? store.active_show_id;
  if (!activeShow) return NextResponse.json({ evaluations: [] });

  let evaluations = filterByShow(store.se_evaluations ?? [], activeShow);
  if (entryId) {
    evaluations = evaluations.filter((e) => e.entry_id === entryId);
  }
  return NextResponse.json({ evaluations });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id: string;
    entry_id: string;
  };

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === body.entry_id && e.show_id === body.show_id,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const existing = (store.se_evaluations ?? []).find(
    (e) => e.entry_id === body.entry_id && e.show_id === body.show_id,
  );
  if (existing) {
    return NextResponse.json({ evaluation: existing });
  }

  const show = store.shows.find((s) => s.id === body.show_id);
  const now = new Date().toISOString();
  let form = mergeEntryIntoSeForm(createEmptyTnrkSeForm(), entry);
  if (show) {
    form = {
      ...form,
      date: show.date || form.date,
      judge: show.judge || form.judge,
    };
  }

  const evaluation = {
    id: newId("se"),
    show_id: body.show_id,
    entry_id: body.entry_id,
    form,
    status: "draft" as const,
    created_at: now,
    updated_at: now,
  };

  await updateStore((s) => ({
    ...s,
    se_evaluations: [...(s.se_evaluations ?? []), evaluation],
  }));

  return NextResponse.json({ evaluation }, { status: 201 });
}

function findSeSyncTarget(
  critiques: CritiqueRecord[],
  showId: string,
  entryId: string,
): CritiqueRecord | undefined {
  const forEntry = critiques.filter(
    (c) => c.entry_id === entryId && c.show_id === showId,
  );
  // Prefer an open review item; never mutate an already-approved critique.
  return (
    forEntry.find((c) => c.status === "PENDING_REVIEW") ??
    forEntry.find((c) => c.status === "PROCESSING" || c.status === "ERROR") ??
    forEntry.find((c) => canSyncSeIntoCritique(c))
  );
}

function withSeSyncedCritique(
  critiques: CritiqueRecord[],
  showId: string,
  entryId: string,
  form: TnrkSeForm,
  force: boolean,
): CritiqueRecord[] {
  const existing = findSeSyncTarget(critiques, showId, entryId);

  const seText = narrativeFromSeForm(form);
  // Skip creating empty stubs until steward has typed something or completed.
  if (!seText.trim() && !force) return critiques;

  const draft = existing
    ? mergeSeIntoCritiqueDraft(existing.draft, form)
    : critiqueDraftFromSeForm(form);

  const now = new Date().toISOString();
  if (!existing) {
    const created: CritiqueRecord = {
      id: newId("critique"),
      show_id: showId,
      entry_id: entryId,
      status: "PENDING_REVIEW",
      transcript: "Ringside SE form",
      draft,
      delivery_status: "pending",
      created_at: now,
      updated_at: now,
    };
    return [...critiques, created];
  }

  return critiques.map((c) =>
    c.id === existing.id
      ? {
          ...c,
          draft,
          transcript:
            c.transcript && !c.transcript.startsWith("Ringside SE")
              ? c.transcript
              : "Ringside SE form",
          status: c.status === "ERROR" ? "PENDING_REVIEW" : c.status,
          updated_at: now,
        }
      : c,
  );
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id: string;
    evaluation_id: string;
    form?: TnrkSeForm;
    mark_complete?: boolean;
  };

  const store = await readStore();
  const evaluation = (store.se_evaluations ?? []).find(
    (e) => e.id === body.evaluation_id && e.show_id === body.show_id,
  );
  if (!evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  const nextForm = body.form ?? evaluation.form;
  let nextStatus = evaluation.status;
  if (body.mark_complete) {
    const check = validateTnrkSeFormForPass(nextForm);
    if (!check.ok) {
      return NextResponse.json(
        { error: "Incomplete SE form", missing: check.errors },
        { status: 400 },
      );
    }
    nextStatus = "complete";
  }

  const storeAfter = await updateStore((s) => {
    const se_evaluations = (s.se_evaluations ?? []).map((e) =>
      e.id === body.evaluation_id
        ? {
            ...e,
            form: nextForm,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          }
        : e,
    );
    const critiques = withSeSyncedCritique(
      s.critiques,
      body.show_id,
      evaluation.entry_id,
      nextForm,
      nextStatus === "complete",
    );
    return { ...s, se_evaluations, critiques };
  });

  const updated = (storeAfter.se_evaluations ?? []).find(
    (e) => e.id === body.evaluation_id,
  );
  if (!updated) {
    return NextResponse.json(
      { error: "Evaluation update failed" },
      { status: 500 },
    );
  }
  const syncedCritique = findSeSyncTarget(
    storeAfter.critiques,
    body.show_id,
    evaluation.entry_id,
  );
  return NextResponse.json({
    evaluation: updated,
    critique: syncedCritique ?? null,
  });
}
