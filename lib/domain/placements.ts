import {
  ADRK_FORMWERT_CODES,
  isValidFormwert,
  type AdrkClassId,
  type AdrkFormwertCode,
} from "./adrk-template";
import { type DogSex } from "./class-division";
import {
  competitionPoolKey,
  isConformationEntry,
  resolvedCatalogClass,
  type CatalogClassId,
  type CatalogEntryMetadata,
} from "./catalog-competition";
import { entriesForDog } from "./dog-identity";
import {
  canSyncSeIntoCritique,
  syncSeIntoDogCritiques,
} from "./se-to-critique";
import {
  normalizeTnrkSeForm,
  seedSeFormForEntry,
  seFormFormwert,
  type TnrkSeForm,
} from "./tnrk-se-form";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
} from "@/lib/types";

export interface PlacementInput {
  entry_id: string;
  placement: 1 | 2 | 3 | 4 | null;
}

export interface ResolvedPlacementInput extends PlacementInput {
  class_id: AdrkClassId;
  sex: DogSex;
  competition_day: string;
  catalog_class: CatalogClassId;
}

export function resolvePlacementInputs(
  rows: PlacementInput[],
  entries: Array<{
    id: string;
    show_id: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata>,
  showId: string,
):
  | { valid: true; rows: ResolvedPlacementInput[] }
  | { valid: false; error: string } {
  const byId = new Map(
    entries
      .filter((entry) => entry.show_id === showId)
      .map((entry) => [entry.id, entry]),
  );
  const entryIds = new Set<string>();
  const occupiedSlots = new Map<string, string>();
  const resolved: ResolvedPlacementInput[] = [];
  for (const row of rows) {
    const entry = byId.get(row.entry_id);
    if (!entry) {
      return { valid: false, error: `Unknown entry for this show: ${row.entry_id}` };
    }
    if (entryIds.has(row.entry_id)) {
      return {
        valid: false,
        error: `Duplicate placement row for entry ${row.entry_id}`,
      };
    }
    entryIds.add(row.entry_id);
    if (
      row.placement !== null &&
      !([1, 2, 3, 4] as const).includes(row.placement)
    ) {
      return { valid: false, error: "placement must be 1–4 or null" };
    }
    if (row.placement !== null) {
      if (!isConformationEntry(entry)) {
        return {
          valid: false,
          error: `Standard Evaluation entry cannot receive a placement: ${row.entry_id}`,
        };
      }
      const catalogClass = resolvedCatalogClass(entry);
      const pool = competitionPoolKey(entry);
      // Catalog-managed entries need a day so Saturday/Sunday pools never
      // collide. Legacy rows without catalog metadata keep their own "" day
      // pool; requiring a day roster-wide blocked every placement save as
      // soon as one catalog entry (e.g. a scratch add) joined a legacy roster.
      const requiresDay =
        entry.event_kind != null || entry.catalog_class != null;
      if (!catalogClass || !pool || (requiresDay && !entry.competition_day)) {
        return {
          valid: false,
          error: `Entry is missing catalog day/class: ${row.entry_id}`,
        };
      }
      const slot = `${pool}:${row.placement}`;
      const occupiedBy = occupiedSlots.get(slot);
      if (occupiedBy) {
        return {
          valid: false,
          error: `Place ${row.placement} is already assigned in ${pool}`,
        };
      }
      occupiedSlots.set(slot, row.entry_id);
    }
    const catalogClass =
      resolvedCatalogClass(entry) ??
      // Null-placement SE rows are accepted in a payload and skipped by
      // upsertPlacements. They do not enlarge the saved pool set.
      "open";
    resolved.push({
      ...row,
      class_id: entry.class_id,
      sex: entry.sex,
      competition_day: entry.competition_day ?? "",
      catalog_class: catalogClass,
    });
  }
  return { valid: true, rows: resolved };
}

/** @deprecated Compatibility boolean for older domain callers. */
export function placementEntriesBelongToShow(
  rows: Array<PlacementInput & { class_id?: AdrkClassId }>,
  entries: Array<{
    id: string;
    show_id: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata>,
  showId: string,
): { valid: true } | { valid: false; error: string } {
  for (const row of rows) {
    const entry = entries.find(
      (item) => item.id === row.entry_id && item.show_id === showId,
    );
    if (entry && row.class_id && entry.class_id !== row.class_id) {
      return {
        valid: false,
        error: `class_id mismatch for entry ${row.entry_id}`,
      };
    }
  }
  const resolved = resolvePlacementInputs(rows, entries, showId);
  return resolved.valid ? { valid: true } : resolved;
}

function resolvedPoolKey(
  row: Pick<
    ResolvedPlacementInput,
    "class_id" | "sex" | "competition_day" | "catalog_class"
  >,
): string | null {
  return competitionPoolKey({
    class_id: row.class_id,
    sex: row.sex,
    competition_day: row.competition_day,
    catalog_class: row.catalog_class,
    event_kind: "conformation",
  });
}

/** Pools the client is saving. Null-placement SE rows contribute no pool. */
export function submittedPlacementPoolKeys(
  rows: ResolvedPlacementInput[],
): Set<string> {
  return new Set(
    rows
      .map((row) => resolvedPoolKey(row))
      .filter((key): key is string => Boolean(key)),
  );
}

/**
 * A scoped save must include every dog in each submitted pool so a rank
 * cannot be left behind in that division. Other days/classes stay untouched.
 */
export function incompletePlacementScopeError(
  rows: ResolvedPlacementInput[],
  entries: Array<
    {
      id: string;
      show_id: string;
      class_id: AdrkClassId;
      sex: DogSex;
    } & CatalogEntryMetadata
  >,
  showId: string,
): string | null {
  const submittedIds = new Set(rows.map((row) => row.entry_id));
  const pools = submittedPlacementPoolKeys(rows);
  if (pools.size === 0) return null;
  for (const entry of entries) {
    if (entry.show_id !== showId) continue;
    const key = competitionPoolKey(entry);
    if (key && pools.has(key) && !submittedIds.has(entry.id)) {
      return "placements must include every dog in the saved division(s)";
    }
  }
  return null;
}

export function upsertPlacements(
  existing: PlacementRecord[],
  showId: string,
  rows: ResolvedPlacementInput[],
  newId: () => string,
): PlacementRecord[] {
  const affectedPools = submittedPlacementPoolKeys(rows);
  const kept = existing.filter((placement) => {
    if (placement.show_id !== showId) return true;
    const key = competitionPoolKey({
      class_id: placement.class_id,
      sex: placement.sex,
      competition_day: placement.competition_day,
      catalog_class: placement.catalog_class,
      event_kind: "conformation",
    });
    return !key || !affectedPools.has(key);
  });
  const added: PlacementRecord[] = [];
  for (const row of rows) {
    if (row.placement === null) continue;
    if (![1, 2, 3, 4].includes(row.placement)) continue;
    added.push({
      id: newId(),
      show_id: showId,
      class_id: row.class_id,
      sex: row.sex,
      competition_day: row.competition_day,
      catalog_class: row.catalog_class,
      entry_id: row.entry_id,
      placement: row.placement,
    });
  }
  return [...kept, ...added];
}

/** Pools whose current ranks differ from the last server snapshot. */
export function dirtyPlacementPoolKeys<
  T extends { id: string } & CatalogEntryMetadata & {
    class_id: AdrkClassId;
    sex: DogSex;
  },
>(
  entries: T[],
  current: Record<string, number | "">,
  saved: Record<string, number | "">,
): string[] {
  const dirty = new Set<string>();
  for (const entry of entries) {
    const key = competitionPoolKey(entry);
    if (!key) continue;
    if ((current[entry.id] ?? "") !== (saved[entry.id] ?? "")) {
      dirty.add(key);
    }
  }
  return [...dirty];
}

/** Placement payload for one or more competition pools (null clears a rank). */
export function placementRowsForPools<
  T extends { id: string } & CatalogEntryMetadata & {
    class_id: AdrkClassId;
    sex: DogSex;
  },
>(
  entries: T[],
  selections: Record<string, number | "">,
  poolKeys: Iterable<string>,
): PlacementInput[] {
  const wanted = new Set(poolKeys);
  return entries
    .filter((entry) => {
      const key = competitionPoolKey(entry);
      return Boolean(key && wanted.has(key));
    })
    .map((entry) => ({
      entry_id: entry.id,
      placement:
        selections[entry.id] === "" || selections[entry.id] == null
          ? null
          : (Number(selections[entry.id]) as 1 | 2 | 3 | 4),
    }));
}

/** Lower rank = better Formwert. Unrated / unknown sort last. */
export function formwertSortRank(
  code: AdrkFormwertCode | null | undefined,
): number {
  if (!code) return ADRK_FORMWERT_CODES.length;
  const index = ADRK_FORMWERT_CODES.indexOf(code);
  return index === -1 ? ADRK_FORMWERT_CODES.length : index;
}

export function resolveFormwertByEntryId(
  critiques: Array<{
    entry_id: string;
    updated_at: string;
    draft: { formwert: AdrkFormwertCode | null };
  }>,
  evaluations: Array<{
    entry_id: string;
    form: Pick<TnrkSeForm, "formwert">;
  }> = [],
  entries: Array<{
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    dog_name?: string;
    event_kind?: "se" | "conformation";
  }> = [],
): Record<string, AdrkFormwertCode | null> {
  const newest = new Map<
    string,
    { formwert: AdrkFormwertCode | null; updated_at: string }
  >();
  for (const critique of critiques) {
    const prev = newest.get(critique.entry_id);
    if (!prev || critique.updated_at > prev.updated_at) {
      newest.set(critique.entry_id, {
        formwert: critique.draft.formwert,
        updated_at: critique.updated_at,
      });
    }
  }
  const out: Record<string, AdrkFormwertCode | null> = {};
  for (const [entryId, value] of newest) {
    out[entryId] = value.formwert;
  }
  // SE form is the source of truth for ringside ratings. A saved SE Formwert
  // wins over a transcript guess and covers dogs that are not in review yet.
  for (const evaluation of evaluations) {
    const seRating = seFormFormwert(evaluation.form);
    if (seRating) out[evaluation.entry_id] = seRating;
  }
  if (entries.length === 0) return out;

  // Friday SE and Saturday/Sunday appearances share one official rating.
  const filled = { ...out };
  for (const entry of entries) {
    if (filled[entry.id]) continue;
    const siblings = entriesForDog(entries, entry);
    const ordered = [
      ...siblings.filter((item) => item.event_kind === "se"),
      ...siblings.filter((item) => item.event_kind !== "se"),
    ];
    const shared = ordered
      .map((item) => out[item.id])
      .find((code): code is AdrkFormwertCode => Boolean(code));
    if (shared) filled[entry.id] = shared;
  }
  return filled;
}

export interface FormwertInput {
  entry_id: string;
  formwert: AdrkFormwertCode | null;
}

export function resolveFormwertInputs(
  rows: FormwertInput[],
  entries: Array<{ id: string; show_id: string }>,
  showId: string,
):
  | { valid: true; rows: FormwertInput[] }
  | { valid: false; error: string } {
  const byId = new Map(
    entries
      .filter((entry) => entry.show_id === showId)
      .map((entry) => [entry.id, entry]),
  );
  const seen = new Set<string>();
  const resolved: FormwertInput[] = [];
  for (const row of rows) {
    if (!byId.has(row.entry_id)) {
      return { valid: false, error: `Unknown entry for this show: ${row.entry_id}` };
    }
    if (seen.has(row.entry_id)) {
      return {
        valid: false,
        error: `Duplicate rating row for entry ${row.entry_id}`,
      };
    }
    seen.add(row.entry_id);
    if (row.formwert !== null && !isValidFormwert(row.formwert)) {
      return { valid: false, error: "formwert must be a valid Formwert code or null" };
    }
    resolved.push({
      entry_id: row.entry_id,
      formwert: row.formwert,
    });
  }
  return { valid: true, rows: resolved };
}

export function dirtyFormwertEntryIds(
  current: Record<string, AdrkFormwertCode | null | undefined>,
  saved: Record<string, AdrkFormwertCode | null | undefined>,
  entryIds: Iterable<string>,
): string[] {
  const dirty: string[] = [];
  for (const id of entryIds) {
    if ((current[id] ?? null) !== (saved[id] ?? null)) dirty.push(id);
  }
  return dirty;
}

function stampCritiqueFormwert(
  critiques: CritiqueRecord[],
  entryIds: Set<string>,
  formwert: AdrkFormwertCode | null,
  now: string,
): CritiqueRecord[] {
  return critiques.map((critique) => {
    if (!entryIds.has(critique.entry_id)) return critique;
    if (!canSyncSeIntoCritique(critique)) return critique;
    if (critique.draft.formwert === formwert) return critique;
    return {
      ...critique,
      draft: {
        ...critique.draft,
        formwert,
        draftAssist: {
          ...critique.draft.draftAssist,
          se_formwert: formwert ?? "",
        },
      },
      updated_at: now,
    };
  });
}

function upsertEvaluationFormwert(
  evaluations: SeEvaluationRecord[],
  entry: RosterEntryRecord,
  showId: string,
  formwert: AdrkFormwertCode | null,
  show: { date?: string; judge?: string } | null | undefined,
  newId: () => string,
  now: string,
): { evaluations: SeEvaluationRecord[]; evaluation: SeEvaluationRecord } {
  const existing = evaluations.find(
    (evaluation) =>
      evaluation.entry_id === entry.id && evaluation.show_id === showId,
  );
  if (existing) {
    const next: SeEvaluationRecord = {
      ...existing,
      form: { ...normalizeTnrkSeForm(existing.form), formwert },
      updated_at: now,
    };
    return {
      evaluations: evaluations.map((evaluation) =>
        evaluation.id === existing.id ? next : evaluation,
      ),
      evaluation: next,
    };
  }
  const created: SeEvaluationRecord = {
    id: newId(),
    show_id: showId,
    entry_id: entry.id,
    form: { ...seedSeFormForEntry(entry, show), formwert },
    status: "draft",
    created_at: now,
    updated_at: now,
  };
  return { evaluations: [...evaluations, created], evaluation: created };
}

/**
 * Write a ringside Formwert onto the dog's SE form(s) and open critiques
 * so placements, SE, Review, certificates, and public results stay aligned.
 */
export function applyFormwertUpdates(
  input: {
    showId: string;
    entries: RosterEntryRecord[];
    evaluations: SeEvaluationRecord[];
    critiques: CritiqueRecord[];
    show?: { date?: string; judge?: string } | null;
    rows: FormwertInput[];
    newEvaluationId: () => string;
    newCritiqueId: () => string;
    now?: string;
  },
): { evaluations: SeEvaluationRecord[]; critiques: CritiqueRecord[] } {
  const now = input.now ?? new Date().toISOString();
  let evaluations = input.evaluations;
  let critiques = input.critiques;

  for (const row of input.rows) {
    const entry = input.entries.find(
      (item) => item.id === row.entry_id && item.show_id === input.showId,
    );
    if (!entry) continue;

    const siblings = entriesForDog(input.entries, entry);
    const seEntry = siblings.find((item) => item.event_kind === "se");
    const createIds = new Set(
      [entry.id, seEntry?.id].filter((id): id is string => Boolean(id)),
    );
    const updateExisting = siblings.filter(
      (item) =>
        !createIds.has(item.id) &&
        evaluations.some(
          (evaluation) =>
            evaluation.entry_id === item.id &&
            evaluation.show_id === input.showId,
        ),
    );

    const targets = siblings.filter(
      (item) =>
        createIds.has(item.id) ||
        updateExisting.some((other) => other.id === item.id),
    );
    let syncForm: TnrkSeForm | null = null;
    for (const target of targets) {
      const next = upsertEvaluationFormwert(
        evaluations,
        target,
        input.showId,
        row.formwert,
        input.show,
        input.newEvaluationId,
        now,
      );
      evaluations = next.evaluations;
      if (target.id === (seEntry?.id ?? entry.id)) {
        syncForm = next.evaluation.form;
      }
    }

    const syncEntryId = seEntry?.id ?? entry.id;
    if (syncForm) {
      critiques = syncSeIntoDogCritiques(
        critiques,
        input.entries,
        input.showId,
        syncEntryId,
        syncForm,
        {
          force: true,
          newId: input.newCritiqueId,
          now,
        },
      );
    }

    const stampIds = new Set(targets.map((item) => item.id));
    if (seEntry) {
      for (const sibling of siblings) {
        if (sibling.event_kind === "conformation") stampIds.add(sibling.id);
      }
    }
    critiques = stampCritiqueFormwert(
      critiques,
      stampIds,
      row.formwert,
      now,
    );
  }

  return { evaluations, critiques };
}

/** Sort dogs best Formwert first; ties by numeric armband; unrated last. */
export function sortDogsForPlacement<
  T extends { id: string; armband: string },
>(
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): T[] {
  return [...dogs].toSorted((a, b) => {
    const rankDiff =
      formwertSortRank(formwertByEntry[a.id]) -
      formwertSortRank(formwertByEntry[b.id]);
    if (rankDiff !== 0) return rankDiff;
    return a.armband.localeCompare(b.armband, undefined, { numeric: true });
  });
}

/**
 * Suggest placements 1–4 per class/sex division from Formwert order.
 * Only rated dogs receive a placement; unrated clear to null.
 */
/**
 * Assign a 1–4 place to a dog. Tapping the same place clears it.
 * If another dog in the division already holds that place, they swap.
 */
export function assignClassPlacement(
  current: Record<string, number | "">,
  entryId: string,
  place: 1 | 2 | 3 | 4,
  divisionEntryIds: string[],
): Record<string, number | ""> {
  const next: Record<string, number | ""> = { ...current };
  if (next[entryId] === place) {
    next[entryId] = "";
    return next;
  }
  const other = divisionEntryIds.find(
    (id) => id !== entryId && next[id] === place,
  );
  if (other) {
    next[other] = next[entryId] ?? "";
  }
  next[entryId] = place;
  return next;
}

/** Seed the placements UI: keep saved ranks, else fill 1–4 from ratings. */
export function initialPlacementSelections<
  T extends {
    id: string;
    armband: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata,
>(
  saved: Array<{ entry_id: string; placement: 1 | 2 | 3 | 4 }>,
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): Record<string, number | ""> {
  const next: Record<string, number | ""> = {};
  if (saved.length > 0) {
    for (const row of saved) {
      next[row.entry_id] = row.placement;
    }
    return next;
  }
  for (const row of placementsSuggestedFromFormwert(dogs, formwertByEntry)) {
    next[row.entry_id] = row.placement ?? "";
  }
  return next;
}

export function placementsSuggestedFromFormwert<
  T extends {
    id: string;
    armband: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata,
>(
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): PlacementInput[] {
  const byDivision = new Map<string, T[]>();
  for (const dog of dogs) {
    const key = competitionPoolKey(dog);
    if (!key) continue;
    const list = byDivision.get(key) ?? [];
    list.push(dog);
    byDivision.set(key, list);
  }

  const suggested: PlacementInput[] = [];
  for (const divisionDogs of byDivision.values()) {
    const ordered = sortDogsForPlacement(divisionDogs, formwertByEntry);
    const rated = ordered.filter((dog) => formwertByEntry[dog.id]);
    const placementById = new Map<string, 1 | 2 | 3 | 4>();
    rated.slice(0, 4).forEach((dog, index) => {
      placementById.set(dog.id, (index + 1) as 1 | 2 | 3 | 4);
    });
    for (const dog of ordered) {
      suggested.push({
        entry_id: dog.id,
        placement: placementById.get(dog.id) ?? null,
      });
    }
  }
  return suggested;
}
