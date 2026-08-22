import fs from "fs/promises";
import path from "path";
import { parseDeskRole } from "@/lib/auth/roles";
import type { AppStore } from "@/lib/types";
import { EMPTY_STORE } from "@/lib/types";
import { demoWritesBlocked } from "@/lib/supabase/config";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIR, "store.json");

/** Serialize all read-modify-write cycles so concurrent API calls cannot clobber each other. */
let storeMutex: Promise<void> = Promise.resolve();

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeMutex.then(fn, fn);
  storeMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function withDefaultDemoUsers(store: AppStore): AppStore {
  const byId = new Map(store.demo_users.map((user) => [user.id, user]));
  for (const user of EMPTY_STORE.demo_users) {
    if (!byId.has(user.id)) byId.set(user.id, user);
  }
  return {
    ...store,
    demo_users: [...byId.values()].map((user) => ({
      ...user,
      role: parseDeskRole(user.role),
    })),
  };
}

async function readStoreUnlocked(): Promise<AppStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    return withDefaultDemoUsers({
      ...EMPTY_STORE,
      ...parsed,
      se_evaluations: parsed.se_evaluations ?? [],
      demo_users: parsed.demo_users ?? EMPTY_STORE.demo_users,
    });
  } catch {
    if (demoWritesBlocked()) {
      return withDefaultDemoUsers(structuredClone(EMPTY_STORE));
    }
    await ensureStoreDir();
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2));
    return withDefaultDemoUsers(structuredClone(EMPTY_STORE));
  }
}

export async function readStore(): Promise<AppStore> {
  return withStoreLock(() => readStoreUnlocked());
}

export async function writeStore(store: AppStore): Promise<void> {
  if (demoWritesBlocked()) {
    throw new Error("Demo mode is read-only on this host");
  }
  await withStoreLock(async () => {
    await ensureStoreDir();
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
  });
}

export async function updateStore(
  updater: (store: AppStore) => AppStore | void,
): Promise<AppStore> {
  return withStoreLock(async () => {
    const store = await readStoreUnlocked();
    if (demoWritesBlocked()) {
      throw new Error("Demo mode is read-only on this host");
    }
    const next = updater(store) ?? store;
    await ensureStoreDir();
    await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2));
    return next;
  });
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function purgeShowData(showId: string): Promise<AppStore> {
  return updateStore((store) => ({
    ...store,
    entries: store.entries.filter((e) => e.show_id !== showId),
    critiques: store.critiques.filter((c) => c.show_id !== showId),
    placements: store.placements.filter((p) => p.show_id !== showId),
    se_evaluations: (store.se_evaluations ?? []).filter(
      (e) => e.show_id !== showId,
    ),
    shows: store.shows.filter((s) => s.id !== showId),
    active_show_id:
      store.active_show_id === showId ? null : store.active_show_id,
  }));
}
