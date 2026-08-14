"use client";

import { useCallback, useEffect, useState } from "react";
import { ADRK_CLASSES } from "@/lib/domain/adrk-template";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  type CritiqueUiStatus,
} from "@/lib/domain/status-labels";
import { DogTile } from "@/components/desk/DogTile";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import type { CritiqueRecord, RosterEntryRecord } from "@/lib/types";

function statusForEntry(
  entryId: string,
  critiques: CritiqueRecord[],
): CritiqueUiStatus {
  const list = critiques
    .filter((c) => c.entry_id === entryId)
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at));
  return list[0]?.status ?? "none";
}

export default function RingsidePage() {
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) return;
    const showData = (await showRes.json()) as { active_show_id: string | null };
    if (!showData.active_show_id) return;
    const [entryRes, critRes] = await Promise.all([
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
    ]);
    setEntries(((await entryRes.json()) as { entries: RosterEntryRecord[] }).entries);
    setCritiques(
      ((await critRes.json()) as { critiques: CritiqueRecord[] }).critiques,
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    classFilter === "all"
      ? entries
      : entries.filter((e) => e.class_id === classFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Dogs
        </h1>
        <p className="text-sm text-sss-text-secondary">Class / armband picker</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`min-h-11 px-3 text-sm ${
            classFilter === "all"
              ? "sss-paper text-sss-text-primary"
              : "text-sss-text-secondary"
          }`}
          onClick={() => setClassFilter("all")}
        >
          All classes
        </button>
        {ADRK_CLASSES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`min-h-11 px-3 text-sm ${
              classFilter === c.id
                ? "sss-paper text-sss-text-primary"
                : "text-sss-text-secondary"
            }`}
            onClick={() => setClassFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((e) => {
          const status = statusForEntry(e.id, critiques);
          return (
            <DogTile
              key={e.id}
              entryId={e.id}
              armband={e.armband}
              dogName={e.dog_name}
              classLabel={
                ADRK_CLASSES.find((c) => c.id === e.class_id)?.label ?? e.class_id
              }
              statusLabel={labelCritiqueStatus(status)}
              statusTone={critiqueChipTone(status)}
            />
          );
        })}
      </ul>
      {filtered.length === 0 ? <EmptyDesk variant="no-entries" /> : null}
    </div>
  );
}
