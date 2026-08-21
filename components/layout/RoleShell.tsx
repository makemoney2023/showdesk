"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Mic } from "lucide-react";
import { pendingReviewCount } from "@/lib/domain/critique-status";
import { syncShowJudges } from "@/lib/domain/show-judges";
import {
  stickyJudgeForShow,
  writeStickyJudge,
} from "@/lib/client/sticky-judge";
import { ToastHost } from "@/components/feedback/toast";
import {
  secretaryNavItems,
  secretaryRingsideSwitch,
  shellForPath,
} from "@/lib/domain/role-shell";
import { labelQueuedItem } from "@/lib/domain/show-day";
import { listQueuedRecordings } from "@/lib/offline/queue";
import {
  formatQueueSyncStatus,
  syncQueuedRecordings,
} from "@/lib/offline/sync";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const [queueBusy, setQueueBusy] = useState(false);
  const queueCount = queueItems.length;
  const ringside = secretaryRingsideSwitch();

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
        <header className="sss-paper sticky top-0 z-30 rounded-none border-x-0 border-t-0">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
            <Link
              href="/ringside"
              className="shrink-0 font-[family-name:var(--font-fraunces)] text-base font-semibold"
            >
              Ringside
            </Link>
            <div className="hidden min-w-0 truncate sm:block">
              <ShowChip name={show?.name ?? null} date={show?.date ?? null} compact />
            </div>
            <StewardJudgeSelect show={show} />
            <div className="ml-auto flex items-center gap-2">
              <SyncChip online={online} queueCount={queueCount} />
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/">Back to desk</Link>
              </Button>
              <AccountMenu kind={kind} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-4 pb-28">{children}</main>
        <StewardNav
          activeHref={pathname}
          queueCount={queueCount}
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
            {queueStatus ? (
              <p className="text-sm text-sss-text-secondary">{queueStatus}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={queueBusy || queueCount === 0}
                onClick={() => {
                  if (!navigator.onLine) {
                    setQueueStatus("Still offline");
                    return;
                  }
                  setQueueBusy(true);
                  void syncQueuedRecordings()
                    .then(async (result) => {
                      await refreshQueue();
                      setQueueStatus(formatQueueSyncStatus(result));
                    })
                    .finally(() => setQueueBusy(false));
                }}
              >
                {queueBusy ? "Syncing…" : "Sync queue"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/ringside" onClick={() => setQueueOpen(false)}>
                  Back to dogs
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <ToastHost />
      <header className="sss-paper sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight"
              >
                Show Desk
              </Link>
              <ShowChip name={show?.name ?? null} date={show?.date ?? null} />
              {isDemoMode() ? (
                <span className="hidden rounded-full border border-sss-accent px-2 py-0.5 text-xs font-medium text-sss-accent-deep sm:inline">
                  DEMO
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={ringside.href}>
                  <Mic className="h-4 w-4" />
                  {ringside.label}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <AccountMenu kind={kind} />
            </div>
          </div>
          <div className="hidden border-t border-sss-border py-1 md:block">
            <RoleNav
              items={secretaryNavItems()}
              activeHref={pathname}
              pendingCount={pendingCount}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Navigate</DialogTitle>
          </DialogHeader>
          <RoleNav
            items={secretaryNavItems()}
            activeHref={pathname}
            pendingCount={pendingCount}
            orientation="vertical"
            onNavigate={() => setMenuOpen(false)}
          />
          <Button asChild>
            <Link href={ringside.href} onClick={() => setMenuOpen(false)}>
              <Mic className="h-4 w-4" />
              {ringside.label}
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
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
      className="min-h-11 max-w-[12rem] rounded-sss-md border border-sss-border bg-sss-paper px-2 text-sm hover:border-sss-accent-soft"
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
