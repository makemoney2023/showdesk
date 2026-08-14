"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ADRK_CLASSES } from "@/lib/domain/adrk-template";
import { pushToast } from "@/components/feedback/toast";
import type { PlacementRecord, RosterEntryRecord } from "@/lib/types";

export default function PlacementsPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [placements, setPlacements] = useState<Record<string, number | "">>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setStatus(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load placements",
      );
      return;
    }
    const showData = (await showRes.json()) as { active_show_id: string | null };
    if (!showData.active_show_id) {
      setStatus("No active show — create one on Roster.");
      setShowId(null);
      setEntries([]);
      return;
    }
    setShowId(showData.active_show_id);
    const [entryRes, placeRes] = await Promise.all([
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/placements?show_id=${showData.active_show_id}`),
    ]);
    if (!entryRes.ok || !placeRes.ok) {
      setStatus("Could not load roster or placements");
      return;
    }
    const entryData = (await entryRes.json()) as { entries: RosterEntryRecord[] };
    const placeData = (await placeRes.json()) as { placements: PlacementRecord[] };
    setEntries(entryData.entries);
    const map: Record<string, number | ""> = {};
    for (const p of placeData.placements) {
      map[p.entry_id] = p.placement;
    }
    setPlacements(map);
    setStatus("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (busy) return;
    if (!showId) {
      setStatus("No active show — create one on Roster.");
      return;
    }
    setBusy(true);
    const payload = entries.map((e) => ({
      entry_id: e.id,
      class_id: e.class_id,
      placement:
        placements[e.id] === "" || placements[e.id] == null
          ? null
          : (Number(placements[e.id]) as 1 | 2 | 3 | 4),
    }));
    const res = await fetch("/api/placements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, placements: payload }),
    });
    const ok = res.ok;
    setStatus(ok ? "Placements saved" : "Save failed");
    pushToast(ok ? "Placements saved" : "Save failed", ok ? "ok" : "error");
    setBusy(false);
    await load();
  }

  const byClass = ADRK_CLASSES.map((cls) => ({
    ...cls,
    dogs: entries.filter((e) => e.class_id === cls.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
            Class placements
          </h1>
          <p className="text-sm text-sss-text-secondary">
            Placements (1–4) are separate from per-dog Formwert rating.
          </p>
        </div>
        <Button disabled={busy} onClick={() => void save()}>
          Save placements
        </Button>
      </div>
      {status ? <p className="text-sm text-sss-accent-deep">{status}</p> : null}
      {byClass.map((cls) =>
        cls.dogs.length > 0 ? (
          <section key={cls.id} className="border border-sss-border p-4">
            <h2 className="font-medium">{cls.label}</h2>
            <ul className="mt-2 space-y-2">
              {cls.dogs.map((dog) => (
                <li key={dog.id} className="flex items-center gap-3 text-sm">
                  <span className="w-16">#{dog.armband}</span>
                  <span className="flex-1">{dog.dog_name}</span>
                  <select
                    className="rounded border border-sss-border px-2 py-1"
                    value={placements[dog.id] ?? ""}
                    onChange={(e) =>
                      setPlacements((p) => ({
                        ...p,
                        [dog.id]: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
