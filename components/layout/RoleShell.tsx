"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pendingReviewCount } from "@/lib/domain/critique-status";
import { syncShowJudges } from "@/lib/domain/show-judges";
import {
  stickyJudgeForShow,
  writeStickyJudge,
} from "@/lib/client/sticky-judge";
import { ToastHost } from "@/components/feedback/toast";
import {
  secretaryNavItems,
  shellForPath,
} from "@/lib/domain/role-shell";
import { labelQueuedItem } from "@/lib/domain/show-day";
import { listQueuedRecordings } from "@/lib/offline/queue";
import { isDemoMode } from "@/lib/supabase/config";
import type { CritiqueRecord, RosterEntryRecord, Show } from "@/lib/types";
import { AccountMenu } from "./AccountMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleNav } from "./RoleNav";
import { ShowChip } from "./ShowChip";
import { StewardNav } from "./StewardNav";
import { SyncChip } from "./SyncChip";

export function RoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const kind = shellForPath(pathname);
  const [show, setShow] = useState<Show | null>(null);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [queueItems, setQueueItems] = useState<
    Awaited<ReturnType<typeof listQueuedRecordings>>
  >([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const queueCount = queueItems.length;

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
      setPendingCount(0);
      setEntries([]);
      return;
    }
    const [critRes, entryRes] = await Promise.all([
      fetch(`/api/critiques?show_id=${active.id}`),
      fetch(`/api/entries?show_id=${active.id}`),
    ]);
    if (entryRes.ok) {
      const entryData = (await entryRes.json()) as {
        entries: RosterEntryRecord[];
      };
      setEntries(entryData.entries);
    }
    if (!critRes.ok) return;
    const critData = (await critRes.json()) as { critiques: CritiqueRecord[] };
    setPendingCount(pendingReviewCount(critData.critiques.map((c) => c.status)));
  }, []);

  const refreshQueue = useCallback(async () => {
    const items = await listQueuedRecordings();
    setQueueItems(items);
  }, []);

  useEffect(() => {
    void load();
    void refreshQueue();
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [load, refreshQueue]);

  if (kind === "minimal") {
    return (
      <>
        <ToastHost />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </>
    );
  }

  if (kind === "steward") {
    return (
      <div className="min-h-dvh">
        <ToastHost />
        <header className="sss-paper sticky top-0 z-30">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
            <Link
              href="/ringside"
              className="font-[family-name:var(--font-fraunces)] text-base font-semibold"
            >
              Ringside
            </Link>
            <ShowChip name={show?.name ?? null} date={show?.date ?? null} compact />
            <StewardJudgeSelect show={show} />
            <div className="flex items-center gap-2">
              <SyncChip online={online} queueCount={queueCount} />
              <AccountMenu kind={kind} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-4 pb-28">{children}</main>
        <StewardNav
          activeHref={pathname}
          onQueue={() => {
            void refreshQueue();
            setQueueOpen(true);
          }}
        />
        <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Offline queue</DialogTitle>
            </DialogHeader>
            {queueCount === 0 ? (
              <p className="text-sm text-sss-text-secondary">
                No recordings waiting to sync.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {queueItems.map((item) => {
                  const labeled = labelQueuedItem(item, entries, Date.now());
                  return (
                    <li key={item.id} className="sss-tray px-3 py-2">
                      <p className="font-medium">{labeled.title}</p>
                      <p className="text-xs text-sss-text-muted">
                        {labeled.subtitle}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button asChild variant="outline">
              <Link href="/ringside" onClick={() => setQueueOpen(false)}>
                Back to dogs
              </Link>
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <ToastHost />
      <header className="sss-paper sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight"
            >
              Show Desk
            </Link>
            <ShowChip name={show?.name ?? null} date={show?.date ?? null} />
            {isDemoMode() ? (
              <span className="rounded-md border border-sss-accent px-2 py-0.5 text-xs font-medium text-sss-accent-deep">
                DEMO
              </span>
            ) : null}
          </div>
          <RoleNav
            items={secretaryNavItems()}
            activeHref={pathname}
            pendingCount={pendingCount}
          />
          <AccountMenu kind={kind} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function StewardJudgeSelect({ show }: { show: Show | null }) {
  const judges = syncShowJudges(show ?? {}).judges;
  const [selected, setSelected] = useState("");

  const judgeKey = judges.join("\0");
  useEffect(() => {
    if (!show) {
      setSelected("");
      return;
    }
    setSelected(stickyJudgeForShow(show.id, judges) ?? "");
  }, [show, judgeKey, judges]);

  if (!show || judges.length === 0) return null;

  return (
    <select
      aria-label="Judge"
      className="min-h-11 max-w-[12rem] rounded-md border border-sss-border bg-sss-paper px-2 text-sm"
      value={selected}
      onChange={(e) => {
        setSelected(e.target.value);
        writeStickyJudge(show.id, e.target.value);
      }}
    >
      <option value="">Select a judge</option>
      {judges.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
