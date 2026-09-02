import { EMPTY_STORE, type AppStore } from "@/lib/types";
import type {
  AppStateRow,
  CritiqueRow,
  DogDocumentRow,
  EntryRow,
  PlacementRow,
  SeEvaluationRow,
  ShowRow,
} from "./store-port";
import {
  mapCritiqueRow,
  mapEntryRow,
  mapPlacementRow,
  mapSeEvaluationRow,
  mapShowRow,
  toCritiqueRow,
  toEntryRow,
  toPlacementRow,
  toSeEvaluationRow,
  toShowRow,
} from "./row-mappers";

export { newId } from "./file-store";

type QueryError = { message: string } | null | undefined;

/** Duck-typed subset of supabase-js used by this store. Inject the user-scoped server client. */
export interface SupabaseStoreClient {
  from(table: string): {
    select(columns?: string): PromiseLike<{ data: unknown; error: QueryError }> & {
      eq(
        column: string,
        value: unknown,
      ): {
        maybeSingle(): Promise<{ data: unknown; error: QueryError }>;
      };
    };
    upsert(rows: unknown): Promise<{ error: QueryError }>;
    delete(): {
      in(column: string, values: string[]): Promise<{ error: QueryError }>;
      eq(column: string, value: unknown): Promise<{ error: QueryError }>;
    };
  };
  /** Optional so older duck-typed clients keep working without the lease lock. */
  rpc?(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: QueryError }>;
}

export interface StoreWritePlan {
  upsertShows: ShowRow[];
  upsertEntries: EntryRow[];
  upsertCritiques: CritiqueRow[];
  upsertPlacements: PlacementRow[];
  upsertSeEvaluations: SeEvaluationRow[];
  upsertDogDocuments: DogDocumentRow[];
  deleteCritiqueIds: string[];
  deletePlacementIds: string[];
  deleteSeEvaluationIds: string[];
  deleteDogDocumentIds: string[];
  deleteEntryIds: string[];
  deleteShowIds: string[];
  /** Null when `active_show_id` is unchanged. */
  appState: AppStateRow | null;
}

export function toAppStateRow(active_show_id: string | null): AppStateRow {
  return { id: 1, active_show_id };
}

export function assembleStore(input: {
  shows: ShowRow[];
  entries: EntryRow[];
  critiques: CritiqueRow[];
  placements: PlacementRow[];
  se_evaluations: SeEvaluationRow[];
  dog_documents?: DogDocumentRow[];
  active_show_id: string | null;
}): AppStore {
  return {
    shows: input.shows.map(mapShowRow),
    entries: input.entries.map(mapEntryRow),
    critiques: input.critiques.map(mapCritiqueRow),
    placements: input.placements.map(mapPlacementRow),
    se_evaluations: input.se_evaluations.map(mapSeEvaluationRow),
    dog_documents: input.dog_documents ?? [],
    active_show_id: input.active_show_id,
    demo_users: EMPTY_STORE.demo_users,
  };
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function rowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffById<TDomain extends { id: string }, TRow extends { id: string }>(
  before: TDomain[],
  after: TDomain[],
  toRow: (item: TDomain) => TRow,
): { upsert: TRow[]; deleteIds: string[] } {
  const beforeMap = indexById(before);
  const afterMap = indexById(after);
  const upsert: TRow[] = [];
  const deleteIds: string[] = [];

  for (const item of after) {
    const prev = beforeMap.get(item.id);
    const nextRow = toRow(item);
    if (!prev || !rowEqual(toRow(prev), nextRow)) {
      upsert.push(nextRow);
    }
  }

  for (const item of before) {
    if (!afterMap.has(item.id)) deleteIds.push(item.id);
  }

  return { upsert, deleteIds };
}

/**
 * Diff two AppStore snapshots into row upserts/deletes.
 * Preserves file-store mutator semantics without rewriting unchanged rows.
 */
export function planStoreWrite(before: AppStore, after: AppStore): StoreWritePlan {
  const shows = diffById(before.shows, after.shows, toShowRow);
  const entries = diffById(before.entries, after.entries, toEntryRow);
  const critiques = diffById(before.critiques, after.critiques, toCritiqueRow);
  const placements = diffById(before.placements, after.placements, toPlacementRow);
  const evaluations = diffById(
    before.se_evaluations ?? [],
    after.se_evaluations ?? [],
    toSeEvaluationRow,
  );
  const documents = diffById(
    before.dog_documents ?? [],
    after.dog_documents ?? [],
    (document) => document,
  );

  return {
    upsertShows: shows.upsert,
    upsertEntries: entries.upsert,
    upsertCritiques: critiques.upsert,
    upsertPlacements: placements.upsert,
    upsertSeEvaluations: evaluations.upsert,
    upsertDogDocuments: documents.upsert,
    deleteCritiqueIds: critiques.deleteIds,
    deletePlacementIds: placements.deleteIds,
    deleteSeEvaluationIds: evaluations.deleteIds,
    deleteDogDocumentIds: documents.deleteIds,
    deleteEntryIds: entries.deleteIds,
    deleteShowIds: shows.deleteIds,
    appState:
      before.active_show_id === after.active_show_id
        ? null
        : toAppStateRow(after.active_show_id),
  };
}

function throwIfError(error: QueryError, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function applyPlan(
  client: SupabaseStoreClient,
  plan: StoreWritePlan,
): Promise<void> {
  if (plan.upsertShows.length > 0) {
    const { error } = await client.from("shows").upsert(plan.upsertShows);
    throwIfError(error, "upsert shows");
  }
  if (plan.upsertEntries.length > 0) {
    const { error } = await client.from("entries").upsert(plan.upsertEntries);
    throwIfError(error, "upsert entries");
  }

  // Delete children first so a replacement id for the same (show_id, entry_id)
  // does not hit UNIQUE (show_id, entry_id) on upsert.
  const childDeletes = [
    plan.deleteCritiqueIds.length > 0
      ? client.from("critiques").delete().in("id", plan.deleteCritiqueIds)
      : null,
    plan.deletePlacementIds.length > 0
      ? client.from("placements").delete().in("id", plan.deletePlacementIds)
      : null,
    plan.deleteSeEvaluationIds.length > 0
      ? client.from("se_evaluations").delete().in("id", plan.deleteSeEvaluationIds)
      : null,
    plan.deleteDogDocumentIds.length > 0
      ? client.from("dog_documents").delete().in("id", plan.deleteDogDocumentIds)
      : null,
  ].filter((job): job is Promise<{ error: QueryError }> => job != null);

  if (childDeletes.length > 0) {
    const results = await Promise.all(childDeletes);
    for (const result of results) {
      throwIfError(result.error, "delete child rows");
    }
  }

  const childUpserts = [
    plan.upsertCritiques.length > 0
      ? client.from("critiques").upsert(plan.upsertCritiques)
      : null,
    plan.upsertPlacements.length > 0
      ? client.from("placements").upsert(plan.upsertPlacements)
      : null,
    plan.upsertSeEvaluations.length > 0
      ? client.from("se_evaluations").upsert(plan.upsertSeEvaluations)
      : null,
    plan.upsertDogDocuments.length > 0
      ? client.from("dog_documents").upsert(plan.upsertDogDocuments)
      : null,
  ].filter((job): job is Promise<{ error: QueryError }> => job != null);

  if (childUpserts.length > 0) {
    const results = await Promise.all(childUpserts);
    throwIfError(results[0]?.error, "upsert child rows");
    for (const result of results.slice(1)) {
      throwIfError(result.error, "upsert child rows");
    }
  }

  // Update active show after parent rows exist and before deleting the old show.
  if (plan.appState) {
    const { error } = await client.from("app_state").upsert(plan.appState);
    throwIfError(error, "upsert app_state");
  }

  if (plan.deleteEntryIds.length > 0) {
    const { error } = await client
      .from("entries")
      .delete()
      .in("id", plan.deleteEntryIds);
    throwIfError(error, "delete entries");
  }
  if (plan.deleteShowIds.length > 0) {
    const { error } = await client
      .from("shows")
      .delete()
      .in("id", plan.deleteShowIds);
    throwIfError(error, "delete shows");
  }
}

export interface StoreLockOptions {
  /** Lease lifetime — a crashed writer's lock self-expires after this. */
  ttlMs?: number;
  /** Acquisition attempts before giving up with "store is busy". */
  attempts?: number;
  /** Base delay between attempts (jittered up to 2x). */
  retryDelayMs?: number;
}

export const STORE_BUSY_MESSAGE =
  "Another desk write is in progress — try again";

const ACQUIRE_STORE_LOCK = "acquire_store_lock";
const RELEASE_STORE_LOCK = "release_store_lock";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serialize read-modify-write cycles across serverless instances with a
 * self-expiring lease on the app_state singleton. PostgREST cannot hold an
 * advisory lock across calls, so acquisition is an atomic SQL function.
 * Degrades to the pre-lock behavior when the migration is not applied yet
 * (missing function) or the RPC errors — availability over strict ordering.
 */
async function withStoreWriteLock<T>(
  client: SupabaseStoreClient,
  fn: () => Promise<T>,
  options?: StoreLockOptions,
): Promise<T> {
  const rpc = client.rpc?.bind(client);
  if (!rpc) return fn();

  const ttlMs = options?.ttlMs ?? 15_000;
  const attempts = options?.attempts ?? 20;
  const retryDelayMs = options?.retryDelayMs ?? 150;
  const owner = `desk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let acquired = false;
  for (let attempt = 0; attempt < attempts && !acquired; attempt++) {
    let granted: { data: unknown; error: QueryError };
    try {
      granted = await rpc(ACQUIRE_STORE_LOCK, {
        p_owner: owner,
        p_ttl_ms: ttlMs,
      });
    } catch (error) {
      granted = {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "rpc failed",
        },
      };
    }
    if (granted.error) {
      console.warn(
        `Store write lock unavailable (${granted.error.message}) — writing without serialization`,
      );
      return fn();
    }
    if (granted.data === true) {
      acquired = true;
      break;
    }
    await sleep(retryDelayMs + Math.random() * retryDelayMs);
  }
  if (!acquired) {
    throw new Error(STORE_BUSY_MESSAGE);
  }

  try {
    return await fn();
  } finally {
    // Best effort — the lease expires on its own if release fails.
    try {
      await rpc(RELEASE_STORE_LOCK, { p_owner: owner });
    } catch {
      /* lease self-expires */
    }
  }
}

/** Read shows/entries/critiques/placements/se_evaluations + app_state.active_show_id. */
export async function sbReadStore(
  client: SupabaseStoreClient,
): Promise<AppStore> {
  const [shows, entries, critiques, placements, evaluations, documents, appState] =
    await Promise.all([
      client.from("shows").select("*"),
      client.from("entries").select("*"),
      client.from("critiques").select("*"),
      client.from("placements").select("*"),
      client.from("se_evaluations").select("*"),
      client.from("dog_documents").select("*"),
      client.from("app_state").select("active_show_id").eq("id", 1).maybeSingle(),
    ]);

  throwIfError(shows.error, "read shows");
  throwIfError(entries.error, "read entries");
  throwIfError(critiques.error, "read critiques");
  throwIfError(placements.error, "read placements");
  throwIfError(evaluations.error, "read se_evaluations");
  throwIfError(documents.error, "read dog_documents");
  throwIfError(appState.error, "read app_state");

  return assembleStore({
    shows: (shows.data as ShowRow[] | null) ?? [],
    entries: (entries.data as EntryRow[] | null) ?? [],
    critiques: (critiques.data as CritiqueRow[] | null) ?? [],
    placements: (placements.data as PlacementRow[] | null) ?? [],
    se_evaluations: (evaluations.data as SeEvaluationRow[] | null) ?? [],
    dog_documents: (documents.data as DogDocumentRow[] | null) ?? [],
    active_show_id:
      (appState.data as AppStateRow | null)?.active_show_id ?? null,
  });
}

export async function sbWriteStore(
  client: SupabaseStoreClient,
  store: AppStore,
  lockOptions?: StoreLockOptions,
): Promise<void> {
  await withStoreWriteLock(
    client,
    async () => {
      const before = await sbReadStore(client);
      await applyPlan(client, planStoreWrite(before, store));
    },
    lockOptions,
  );
}

/**
 * File-store compatible read → mutate-in-memory → persist deltas.
 * Callers inject createSupabaseServerClient() (admin only if A1 is insufficient).
 *
 * The read → mutate → apply cycle runs inside a database lease lock
 * (acquire_store_lock / release_store_lock) so overlapping updateStore calls
 * from different serverless instances serialize instead of losing updates —
 * the Supabase counterpart of the file-store mutex. Child deletes still run
 * before child upserts (UNIQUE show_id+entry_id).
 */
export async function sbUpdateStore(
  client: SupabaseStoreClient,
  updater: (store: AppStore) => AppStore | void,
  lockOptions?: StoreLockOptions,
): Promise<AppStore> {
  return withStoreWriteLock(
    client,
    async () => {
      const before = structuredClone(await sbReadStore(client));
      const working = structuredClone(before);
      const next = updater(working) ?? working;
      await applyPlan(client, planStoreWrite(before, next));
      return next;
    },
    lockOptions,
  );
}

export async function sbPurgeShowData(
  client: SupabaseStoreClient,
  showId: string,
): Promise<AppStore> {
  return sbUpdateStore(client, (store) => ({
    ...store,
    entries: store.entries.filter((entry) => entry.show_id !== showId),
    critiques: store.critiques.filter((critique) => critique.show_id !== showId),
    placements: store.placements.filter(
      (placement) => placement.show_id !== showId,
    ),
    se_evaluations: (store.se_evaluations ?? []).filter(
      (evaluation) => evaluation.show_id !== showId,
    ),
    dog_documents: (store.dog_documents ?? []).filter(
      (document) => document.show_id !== showId,
    ),
    shows: store.shows.filter((show) => show.id !== showId),
    active_show_id:
      store.active_show_id === showId ? null : store.active_show_id,
  }));
}
