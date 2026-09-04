import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  createEmptyTnrkSeForm,
  mergeEntryIntoSeForm,
  mergeSeFormPreferFilled,
  validateTnrkSeFormForPass,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import { openCritiqueForEntry } from "@/lib/domain/entry-cascade";
import { syncSeIntoDogCritiques } from "@/lib/domain/se-to-critique";
import {
  requireApiSession,
  requireApiWrite,
  isApiUnauthorized,
} from "@/lib/auth/api-guard";

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
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id: string;
    entry_id: string;
    judge?: string;
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
      judge: (body.judge ?? "").trim() || show.judge || form.judge,
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

export async function PATCH(request: Request) {
  const auth = await requireApiWrite();
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

  const nextForm = mergeSeFormPreferFilled(evaluation.form, body.form);
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
    const critiques = syncSeIntoDogCritiques(
      s.critiques,
      s.entries,
      body.show_id,
      evaluation.entry_id,
      nextForm,
      {
        force: nextStatus === "complete",
        newId: () => newId("critique"),
      },
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
  const syncedCritique = openCritiqueForEntry(
    storeAfter.critiques,
    evaluation.entry_id,
    body.show_id,
  );
  return NextResponse.json({
    evaluation: updated,
    critique: syncedCritique ?? null,
  });
}
