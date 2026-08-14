"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import {
  deskNextAction,
  deskSecondaryActions,
} from "@/lib/domain/desk-next-action";
import { pendingReviewCount } from "@/lib/domain/critique-status";
import { formatShowJudges, syncShowJudges } from "@/lib/domain/show-judges";
import { isDemoMode } from "@/lib/supabase/config";
import type { CritiqueRecord, RosterEntryRecord, Show } from "@/lib/types";

export function DeskHome() {
  const [show, setShow] = useState<Show | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [gapCount, setGapCount] = useState(0);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) return;
    const showData = (await showRes.json()) as {
      shows: Show[];
      active_show_id: string | null;
    };
    const active =
      showData.shows.find((s) => s.id === showData.active_show_id) ?? null;
    setShow(active);
    if (!active) {
      setEntryCount(0);
      setPendingCount(0);
      setGapCount(0);
      return;
    }
    const [entryRes, critRes] = await Promise.all([
      fetch(`/api/entries?show_id=${active.id}`),
      fetch(`/api/critiques?show_id=${active.id}`),
    ]);
    const entries = entryRes.ok
      ? ((await entryRes.json()) as { entries: RosterEntryRecord[] }).entries
      : [];
    const critiques = critRes.ok
      ? ((await critRes.json()) as { critiques: CritiqueRecord[] }).critiques
      : [];
    setEntryCount(entries.length);
    setPendingCount(pendingReviewCount(critiques.map((c) => c.status)));
    const critByEntry = new Set(critiques.map((c) => c.entry_id));
    setGapCount(entries.filter((e) => !critByEntry.has(e.id)).length);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nextInput = {
    hasShow: Boolean(show),
    entryCount,
    pendingCount,
  };
  const next = deskNextAction(nextInput);
  const secondaries = deskSecondaryActions(nextInput);

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-8 border-b border-sss-border bg-sss-ink px-4 py-10 text-[var(--sss-paper)] sm:-mx-4">
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Show Desk
            </h1>
            {isDemoMode() ? (
              <span className="rounded-md border border-sss-accent px-2 py-0.5 text-xs font-medium text-sss-accent-soft">
                DEMO
              </span>
            ) : null}
          </div>
          <p className="max-w-xl text-base text-[var(--sss-paper)]/80">
            Capture critiques ringside, structure ADRK drafts, review and approve
            before PDF delivery to owners.
          </p>
        </div>
      </section>

      {!show ? (
        <EmptyDesk variant="no-show" />
      ) : (
        <section className="sss-paper space-y-2 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sss-text-muted">
            Active show
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
            {show.name}
          </h2>
          <p className="text-sm text-sss-text-secondary">
            {show.date} · {show.venue || "Venue TBD"} ·{" "}
            {formatShowJudges(syncShowJudges(show).judges)} ·{" "}
            {show.rulebook.toUpperCase()}
          </p>
        </section>
      )}

      {show ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Pending review"
            value={pendingCount}
            href="/admin/review"
            cta="Open review"
          />
          <Metric
            label="Roster gaps"
            value={gapCount}
            href="/admin/entries"
            cta="View roster"
          />
          <Metric
            label="Entries"
            value={entryCount}
            href="/admin/entries"
            cta="Manage roster"
          />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={next.href}>{next.label}</Link>
        </Button>
        {secondaries.map((action) => (
          <Button key={action.label} asChild variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
  cta,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
}) {
  return (
    <div className="sss-tray space-y-2 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-sss-text-muted">
        {label}
      </p>
      <p className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">
        {value}
      </p>
      <Link
        href={href}
        className="text-sm text-sss-accent-deep hover:underline"
      >
        {cta} →
      </Link>
    </div>
  );
}
