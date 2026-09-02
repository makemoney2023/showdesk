import { describe, expect, it, vi } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import { createEmptyDraft } from "@/lib/domain/adrk-template";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import { toEntryRow, toPlacementRow, toShowRow } from "./row-mappers";
import {
  assembleStore,
  newId,
  planStoreWrite,
  sbPurgeShowData,
  sbReadStore,
  sbUpdateStore,
  STORE_BUSY_MESSAGE,
  toAppStateRow,
} from "./supabase-store";

const show: Show = {
  id: "show-1",
  name: "TNRK Spring Sieger",
  date: "2026-04-12",
  venue: "Harrisburg",
  judge: "Jane Doe",
  rulebook: "adrk",
  created_at: "2026-03-01T12:00:00.000Z",
};

const entry: RosterEntryRecord = {
  id: "entry-1",
  show_id: "show-1",
  armband: "12",
  dog_name: "Rex vom Haus",
  zb_number: "ADRK-123",
  wt: "2023-01-15",
  owner: "Pat Owner",
  sex: "R",
  class_id: "zwischenklasse",
  event_kind: "conformation",
  competition_day: "2026-09-05",
  catalog_class: "youth-i",
  email: "pat@example.com",
};

const critique: CritiqueRecord = {
  id: "crit-1",
  show_id: "show-1",
  entry_id: "entry-1",
  status: "PENDING_REVIEW",
  transcript: "Strong head.",
  draft: { ...createEmptyDraft(), narrative: "Strong head." },
  delivery_status: "pending",
  created_at: "2026-04-12T14:00:00.000Z",
  updated_at: "2026-04-12T14:05:00.000Z",
};

const placement: PlacementRecord = {
  id: "place-1",
  show_id: "show-1",
  class_id: "zwischenklasse",
  sex: "R",
  competition_day: "2026-09-05",
  catalog_class: "youth-i",
  entry_id: "entry-1",
  placement: 1,
};

const seEvaluation: SeEvaluationRecord = {
  id: "se-1",
  show_id: "show-1",
  entry_id: "entry-1",
  form: { ...createEmptyTnrkSeForm(), dog_name: "Rex vom Haus" },
  status: "draft",
  created_at: "2026-04-12T13:00:00.000Z",
  updated_at: "2026-04-12T13:30:00.000Z",
};

type Row = Record<string, unknown>;

function createMockClient(
  seed?: {
    shows?: Row[];
    entries?: Row[];
    critiques?: Row[];
    placements?: Row[];
    se_evaluations?: Row[];
    app_state?: { id: 1; active_show_id: string | null };
  },
  lock?: {
    /** Successive acquire results; exhausted entries default to granted. */
    grants?: boolean[];
    /** Acquire RPC returns this error (e.g. migration not applied). */
    errorMessage?: string;
    /** Simulate an older duck-typed client without rpc support. */
    omitRpc?: boolean;
  },
) {
  const tables: Record<string, Map<string, Row>> = {
    shows: new Map((seed?.shows ?? []).map((r) => [String(r.id), r])),
    entries: new Map((seed?.entries ?? []).map((r) => [String(r.id), r])),
    critiques: new Map((seed?.critiques ?? []).map((r) => [String(r.id), r])),
    placements: new Map((seed?.placements ?? []).map((r) => [String(r.id), r])),
    se_evaluations: new Map(
      (seed?.se_evaluations ?? []).map((r) => [String(r.id), r]),
    ),
    dog_documents: new Map(),
  };
  let appState = seed?.app_state ?? { id: 1 as const, active_show_id: null };
  const ops: { op: string; table: string; payload?: unknown }[] = [];
  let acquireCalls = 0;

  const rpc = lock?.omitRpc
    ? {}
    : {
        async rpc(fn: string, args: Record<string, unknown>) {
          ops.push({ op: "rpc", table: fn, payload: args });
          if (fn === "acquire_store_lock") {
            if (lock?.errorMessage) {
              return { data: null, error: { message: lock.errorMessage } };
            }
            const grants = lock?.grants ?? [];
            const granted =
              acquireCalls < grants.length ? grants[acquireCalls] : true;
            acquireCalls += 1;
            return { data: granted, error: null };
          }
          return { data: null, error: null };
        },
      };

  return {
    ops,
    ...rpc,
    from(table: string) {
      return {
        select(_cols?: string) {
          return {
            eq(col: string, val: unknown) {
              return {
                async maybeSingle() {
                  if (table === "app_state" && col === "id" && val === 1) {
                    return { data: appState, error: null };
                  }
                  const rows = [...(tables[table]?.values() ?? [])].filter(
                    (r) => r[col] === val,
                  );
                  return { data: rows[0] ?? null, error: null };
                },
              };
            },
            then(
              onfulfilled: (value: { data: unknown; error: null }) => unknown,
            ) {
              const data =
                table === "app_state"
                  ? [appState]
                  : [...(tables[table]?.values() ?? [])];
              return Promise.resolve({ data, error: null }).then(onfulfilled);
            },
          };
        },
        async upsert(rows: Row | Row[]) {
          const list = Array.isArray(rows) ? rows : [rows];
          ops.push({ op: "upsert", table, payload: list });
          if (table === "app_state") {
            appState = list[0] as typeof appState;
            return { data: list, error: null };
          }
          for (const row of list) {
            tables[table]?.set(String(row.id), row);
          }
          return { data: list, error: null };
        },
        delete() {
          return {
            async in(col: string, ids: string[]) {
              ops.push({ op: "delete", table, payload: { col, ids } });
              if (col === "id") {
                for (const id of ids) tables[table]?.delete(id);
              }
              return { data: null, error: null };
            },
            async eq(col: string, val: unknown) {
              ops.push({ op: "delete", table, payload: { col, val } });
              if (col === "id") tables[table]?.delete(String(val));
              if (col === "show_id") {
                for (const [id, row] of tables[table] ?? []) {
                  if (row.show_id === val) tables[table]?.delete(id);
                }
              }
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
}

describe("toAppStateRow", () => {
  it("maps an active-show update onto the singleton app_state row", () => {
    expect(toAppStateRow("show-1")).toEqual({
      id: 1,
      active_show_id: "show-1",
    });
    expect(toAppStateRow(null)).toEqual({ id: 1, active_show_id: null });
  });
});

describe("planStoreWrite — active show + entry insert", () => {
  it("emits only an app_state upsert when active_show_id changes", () => {
    const before = { ...EMPTY_STORE, shows: [show], active_show_id: null };
    const after = { ...before, active_show_id: "show-1" };
    const plan = planStoreWrite(before, after);

    expect(plan.appState).toEqual({ id: 1, active_show_id: "show-1" });
    expect(plan.upsertShows).toEqual([]);
    expect(plan.upsertEntries).toEqual([]);
    expect(plan.deleteShowIds).toEqual([]);
    expect(plan.deleteEntryIds).toEqual([]);
  });

  it("maps a new roster entry through toEntryRow for upsert", () => {
    const before = { ...EMPTY_STORE, shows: [show] };
    const after = { ...before, entries: [entry] };
    const plan = planStoreWrite(before, after);

    expect(plan.upsertEntries).toEqual([toEntryRow(entry)]);
    expect(plan.deleteEntryIds).toEqual([]);
    expect(plan.appState).toBeNull();
  });
});

describe("assembleStore", () => {
  it("maps table rows and app_state into AppStore, keeping demo users", () => {
    const store = assembleStore({
      shows: [toShowRow(show)],
      entries: [toEntryRow(entry)],
      critiques: [],
      placements: [],
      se_evaluations: [],
      active_show_id: "show-1",
    });

    expect(store.shows).toEqual([show]);
    expect(store.entries).toEqual([entry]);
    expect(store.active_show_id).toBe("show-1");
    expect(store.demo_users).toEqual(EMPTY_STORE.demo_users);
  });
});

describe("sbReadStore / sbUpdateStore / sbPurgeShowData", () => {
  it("assembles AppStore from parallel table reads", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      entries: [toEntryRow(entry)],
      app_state: { id: 1, active_show_id: "show-1" },
    });

    const store = await sbReadStore(client);

    expect(store.shows).toHaveLength(1);
    expect(store.entries[0]?.dog_name).toBe("Rex vom Haus");
    expect(store.active_show_id).toBe("show-1");
  });

  it("persists an active-show update to app_state", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      app_state: { id: 1, active_show_id: null },
    });

    const next = await sbUpdateStore(client, (s) => ({
      ...s,
      active_show_id: "show-1",
    }));

    expect(next.active_show_id).toBe("show-1");
    expect(client.ops).toContainEqual({
      op: "upsert",
      table: "app_state",
      payload: [{ id: 1, active_show_id: "show-1" }],
    });
  });

  it("persists a new entry using the entry row mapper", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
    });

    const next = await sbUpdateStore(client, (s) => ({
      ...s,
      entries: [...s.entries, entry],
    }));

    expect(next.entries).toEqual([entry]);
    expect(client.ops).toContainEqual({
      op: "upsert",
      table: "entries",
      payload: [toEntryRow(entry)],
    });
  });

  it("purges show-scoped rows and clears active_show_id when it matches", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      entries: [toEntryRow(entry)],
      critiques: [
        {
          id: critique.id,
          show_id: critique.show_id,
          entry_id: critique.entry_id,
          status: critique.status,
          transcript: critique.transcript,
          draft: critique.draft,
          audio_path: null,
          delivery_status: critique.delivery_status,
          error_message: null,
          created_at: critique.created_at,
          updated_at: critique.updated_at,
          approved_at: null,
        },
      ],
      placements: [placement],
      se_evaluations: [
        {
          id: seEvaluation.id,
          show_id: seEvaluation.show_id,
          entry_id: seEvaluation.entry_id,
          form: seEvaluation.form,
          status: seEvaluation.status,
          created_at: seEvaluation.created_at,
          updated_at: seEvaluation.updated_at,
        },
      ],
      app_state: { id: 1, active_show_id: "show-1" },
    });

    const next = await sbPurgeShowData(client, "show-1");

    expect(next.shows).toEqual([]);
    expect(next.entries).toEqual([]);
    expect(next.critiques).toEqual([]);
    expect(next.placements).toEqual([]);
    expect(next.se_evaluations).toEqual([]);
    expect(next.active_show_id).toBeNull();
  });

  it("deletes the old placement before upserting a replacement for the same show_id+entry_id", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      entries: [toEntryRow(entry)],
      placements: [placement],
    });
    const replacement = { ...placement, id: "place-2", placement: 2 };

    await sbUpdateStore(client, (s) => ({
      ...s,
      placements: [replacement],
    }));

    const placementOps = client.ops.filter((op) => op.table === "placements");
    const deleteIdx = placementOps.findIndex((op) => op.op === "delete");
    const upsertIdx = placementOps.findIndex((op) => op.op === "upsert");

    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(upsertIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeLessThan(upsertIdx);
    expect(placementOps[deleteIdx]?.payload).toEqual({
      col: "id",
      ids: ["place-1"],
    });
    expect(placementOps[upsertIdx]?.payload).toEqual([toPlacementRow(replacement)]);
  });

  it("persists in-place mutators that return void", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      app_state: { id: 1, active_show_id: null },
    });

    const next = await sbUpdateStore(client, (s) => {
      s.active_show_id = "show-1";
    });

    expect(next.active_show_id).toBe("show-1");
    expect(client.ops).toContainEqual({
      op: "upsert",
      table: "app_state",
      payload: [{ id: 1, active_show_id: "show-1" }],
    });
  });
});

describe("sbUpdateStore — store write lease", () => {
  const fastLock = { attempts: 3, retryDelayMs: 1, ttlMs: 500 };

  it("acquires the lease before writing and releases it after", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      app_state: { id: 1, active_show_id: null },
    });

    await sbUpdateStore(
      client,
      (s) => ({ ...s, active_show_id: "show-1" }),
      fastLock,
    );

    const acquireIdx = client.ops.findIndex(
      (op) => op.op === "rpc" && op.table === "acquire_store_lock",
    );
    const upsertIdx = client.ops.findIndex((op) => op.op === "upsert");
    const releaseIdx = client.ops.findIndex(
      (op) => op.op === "rpc" && op.table === "release_store_lock",
    );
    expect(acquireIdx).toBeGreaterThanOrEqual(0);
    expect(upsertIdx).toBeGreaterThan(acquireIdx);
    expect(releaseIdx).toBeGreaterThan(upsertIdx);

    const acquireArgs = client.ops[acquireIdx]?.payload as {
      p_owner: string;
      p_ttl_ms: number;
    };
    const releaseArgs = client.ops[releaseIdx]?.payload as { p_owner: string };
    expect(acquireArgs.p_ttl_ms).toBe(500);
    expect(releaseArgs.p_owner).toBe(acquireArgs.p_owner);
  });

  it("retries while another writer holds the lease", async () => {
    const client = createMockClient(
      {
        shows: [toShowRow(show)],
        app_state: { id: 1, active_show_id: null },
      },
      { grants: [false, false] },
    );

    const next = await sbUpdateStore(
      client,
      (s) => ({ ...s, active_show_id: "show-1" }),
      fastLock,
    );

    expect(next.active_show_id).toBe("show-1");
    const acquires = client.ops.filter(
      (op) => op.op === "rpc" && op.table === "acquire_store_lock",
    );
    expect(acquires).toHaveLength(3);
  });

  it("gives up without writing when the lease never frees", async () => {
    const client = createMockClient(
      {
        shows: [toShowRow(show)],
        app_state: { id: 1, active_show_id: null },
      },
      { grants: [false, false, false] },
    );

    await expect(
      sbUpdateStore(
        client,
        (s) => ({ ...s, active_show_id: "show-1" }),
        fastLock,
      ),
    ).rejects.toThrow(STORE_BUSY_MESSAGE);
    expect(client.ops.filter((op) => op.op === "upsert")).toHaveLength(0);
  });

  it("still writes when the lock migration is not applied yet", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = createMockClient(
      {
        shows: [toShowRow(show)],
        app_state: { id: 1, active_show_id: null },
      },
      {
        errorMessage:
          "Could not find the function public.acquire_store_lock in the schema cache",
      },
    );

    const next = await sbUpdateStore(
      client,
      (s) => ({ ...s, active_show_id: "show-1" }),
      fastLock,
    );
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();

    expect(next.active_show_id).toBe("show-1");
    expect(client.ops).toContainEqual({
      op: "upsert",
      table: "app_state",
      payload: [{ id: 1, active_show_id: "show-1" }],
    });
  });

  it("writes without the lease on older clients that lack rpc", async () => {
    const client = createMockClient(
      {
        shows: [toShowRow(show)],
        app_state: { id: 1, active_show_id: null },
      },
      { omitRpc: true },
    );

    const next = await sbUpdateStore(
      client,
      (s) => ({ ...s, active_show_id: "show-1" }),
      fastLock,
    );

    expect(next.active_show_id).toBe("show-1");
    expect(client.ops.filter((op) => op.op === "rpc")).toHaveLength(0);
  });

  it("releases the lease when the mutator throws", async () => {
    const client = createMockClient({
      shows: [toShowRow(show)],
      app_state: { id: 1, active_show_id: null },
    });

    await expect(
      sbUpdateStore(
        client,
        () => {
          throw new Error("mutator exploded");
        },
        fastLock,
      ),
    ).rejects.toThrow("mutator exploded");

    expect(
      client.ops.some(
        (op) => op.op === "rpc" && op.table === "release_store_lock",
      ),
    ).toBe(true);
  });
});

describe("newId", () => {
  it("reuses the file-store id helper prefix", () => {
    expect(newId("entry")).toMatch(/^entry-\d+-[a-z0-9]+$/);
  });
});
