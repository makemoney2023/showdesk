import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { updateStore, readStore } from "./file-store";
import { EMPTY_STORE } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), ".data", "store.json");

describe("file-store concurrency", () => {
  let backup: string | null = null;

  beforeEach(async () => {
    try {
      backup = await fs.readFile(STORE_PATH, "utf-8");
    } catch {
      backup = null;
    }
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2));
  });

  afterEach(async () => {
    if (backup != null) {
      await fs.writeFile(STORE_PATH, backup);
    }
  });

  it("does not lose shows when concurrent updates add show then entries", async () => {
    await Promise.all([
      updateStore((s) => ({
        ...s,
        shows: [
          {
            id: "show-1",
            name: "Race Show",
            date: "2026-08-13",
            venue: "A",
            judge: "B",
            rulebook: "adrk",
            created_at: new Date().toISOString(),
          },
        ],
        active_show_id: "show-1",
      })),
      updateStore((s) => ({
        ...s,
        entries: [
          {
            id: "entry-1",
            show_id: "show-1",
            armband: "1",
            dog_name: "Rex",
            zb_number: "Z",
            wt: "2024-01-01",
            owner: "O",
            sex: "R",
            class_id: "zwischenklasse",
            email: "a@b.c",
          },
        ],
      })),
    ]);

    const store = await readStore();
    expect(store.shows).toHaveLength(1);
    expect(store.shows[0]?.name).toBe("Race Show");
    expect(store.entries).toHaveLength(1);
    expect(store.active_show_id).toBe("show-1");
  });

  it("adds the default steward demo user to older stores", async () => {
    await fs.writeFile(
      STORE_PATH,
      JSON.stringify(
        {
          ...EMPTY_STORE,
          demo_users: [
            {
              id: "demo-secretary",
              email: "secretary@demo.local",
              password: "demo1234",
              name: "Demo Secretary",
            },
          ],
        },
        null,
        2,
      ),
    );
    const store = await readStore();
    expect(store.demo_users.map((user) => user.id)).toEqual([
      "demo-secretary",
      "demo-steward",
    ]);
    expect(store.demo_users.find((user) => user.id === "demo-secretary")?.role).toBe(
      "secretary",
    );
  });
});
