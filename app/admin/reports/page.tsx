"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CritiqueRecord, RosterEntryRecord } from "@/lib/types";
import { StatusChip } from "@/components/status/StatusChip";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  labelDeliveryStatus,
} from "@/lib/domain/status-labels";

export default function AdminReportsPage() {
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [message, setMessage] = useState("");
  const [hasShow, setHasShow] = useState(true);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setMessage(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load reports",
      );
      return;
    }
    const showData = (await showRes.json()) as { active_show_id: string | null };
    if (!showData.active_show_id) {
      setHasShow(false);
      setCritiques([]);
      setEntries([]);
      return;
    }
    setHasShow(true);
    const [critRes, entryRes] = await Promise.all([
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
    ]);
    if (!critRes.ok || !entryRes.ok) {
      setMessage("Could not load critique delivery status");
      return;
    }
    setCritiques(((await critRes.json()) as { critiques: CritiqueRecord[] }).critiques);
    setEntries(((await entryRes.json()) as { entries: RosterEntryRecord[] }).entries);
    setMessage("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Reports
        </h1>
        <p className="text-sm text-sss-text-secondary">
          Delivery status per critique for active show.
        </p>
      </div>
      {message ? (
        <p className="border border-sss-border bg-sss-lifted px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      {!hasShow ? (
        <div className="space-y-3 border border-sss-border p-4">
          <p className="text-sm text-sss-text-muted">
            No active show. Create a show and process critiques first.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/entries">Go to Entries</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-sss-border">
          <table className="w-full text-sm">
            <thead className="bg-sss-lifted text-left">
              <tr>
                <th className="p-2">Dog</th>
                <th className="p-2">Status</th>
                <th className="p-2">Delivery</th>
                <th className="p-2">Approved</th>
              </tr>
            </thead>
            <tbody>
              {critiques.map((c) => {
                const e = entries.find((en) => en.id === c.entry_id);
                return (
                  <tr key={c.id} className="border-t border-sss-border">
                    <td className="p-2">{e?.dog_name ?? c.entry_id}</td>
                    <td className="p-2">
                      <StatusChip
                        label={labelCritiqueStatus(c.status)}
                        tone={critiqueChipTone(c.status)}
                      />
                    </td>
                    <td className="p-2">{labelDeliveryStatus(c.delivery_status)}</td>
                    <td className="p-2">{c.approved_at?.slice(0, 10) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {critiques.length === 0 ? (
            <p className="p-4 text-sm text-sss-text-muted">
              No critiques yet. Record from ringside, then review.
            </p>
          ) : null}
        </div>
      )}
      <Button variant="outline" onClick={() => void load()}>
        Refresh
      </Button>
    </div>
  );
}
