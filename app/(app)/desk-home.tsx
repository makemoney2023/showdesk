"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  FileSearch,
  Mic,
  PawPrint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import {
  deskNextAction,
  deskSecondaryActions,
} from "@/lib/domain/desk-next-action";
import { deskAttentionCount } from "@/lib/domain/critique-status";
import { visibleReviewCritiques } from "@/lib/domain/se-to-critique";
import { recentDeskActivity } from "@/lib/domain/desk-activity";
import { formatDisplayDate } from "@/lib/domain/show-day";
import { formatShowJudges, syncShowJudges } from "@/lib/domain/show-judges";
import { demoWritesBlocked, isDemoMode } from "@/lib/supabase/config";
import type { CritiqueRecord, RosterEntryRecord, Show } from "@/lib/types";

export function DeskHome() {
  const [show, setShow] = useState<Show | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [gapCount, setGapCount] = useState(0);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);

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
      setEntries([]);
      setCritiques([]);
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
    setEntries(entries);
    const reviewCritiques = visibleReviewCritiques(critiques, entries);
    setCritiques(reviewCritiques);
    setEntryCount(entries.length);
    setPendingCount(deskAttentionCount(reviewCritiques.map((c) => c.status)));
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
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Show Desk
            </h1>
            {isDemoMode() ? (
              <span className="rounded-full border border-sss-accent px-2 py-0.5 text-xs font-medium text-sss-accent-soft">
                {demoWritesBlocked() ? "DEMO · read-only" : "DEMO"}
              </span>
            ) : null}
          </div>
          {show ? (
            <div className="max-w-xl space-y-2">
              <p className="sss-eyebrow text-sss-accent-soft">Active show</p>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
                {show.name}
              </h2>
              <p className="text-sm text-[var(--sss-paper)]/75">
                {formatDisplayDate(show.date)} · {show.venue || "Venue TBD"} ·{" "}
                {formatShowJudges(syncShowJudges(show).judges)} ·{" "}
                {show.rulebook.toUpperCase()}
              </p>
            </div>
          ) : (
            <p className="max-w-xl text-base text-[var(--sss-paper)]/80">
              Capture critiques ringside, structure ADRK drafts, review and approve
              before PDF delivery to owners.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={next.href}>
                {next.href === "/ringside" ? <Mic className="h-4 w-4" /> : null}
                {next.label}
              </Link>
            </Button>
            {secondaries.map((action) => (
              <Button
                key={action.label}
                asChild
                variant="outline"
                className="border-[var(--sss-paper)]/25 bg-transparent text-[var(--sss-paper)] hover:bg-[var(--sss-paper)]/10"
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {!show ? <EmptyDesk variant="no-show" /> : null}

      {show ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Pending review"
            value={pendingCount}
            href="/admin/review"
            cta="Open review"
            icon={<FileSearch className="h-4 w-4" />}
            warning={pendingCount > 0}
          />
          <Metric
            label="Roster gaps"
            value={gapCount}
            href="/admin/entries"
            cta="View roster"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <Metric
            label="Entries"
            value={entryCount}
            href="/admin/entries"
            cta="Manage roster"
            icon={<PawPrint className="h-4 w-4" />}
          />
        </section>
      ) : null}

      {show ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
            Recent activity
          </h2>
          {recentDeskActivity(critiques, entries).length === 0 ? (
            <p className="text-sm text-sss-text-muted">
              No critiques yet — record ringside or complete an SE form.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentDeskActivity(critiques, entries).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="sss-tray sss-interactive flex items-center justify-between gap-3 p-3"
                  >
                    <span>
                      <span className="block font-medium">{item.title}</span>
                      <span className="text-xs text-sss-text-muted">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="text-sm text-sss-accent-deep">Review →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  href,
  cta,
  icon,
  warning,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`sss-tray sss-interactive block space-y-2 p-4 ${
        warning ? "border-sss-warning/40 bg-sss-warning-soft/40" : ""
      }`}
    >
      <p className="sss-eyebrow inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">
        {value}
      </p>
      <span className="text-sm text-sss-accent-deep">
        {cta} →
      </span>
    </Link>
  );
}
