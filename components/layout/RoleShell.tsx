"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isReviewable } from "@/lib/domain/critique-status";
import {
  secretaryNavItems,
  shellForPath,
} from "@/lib/domain/role-shell";
import { listQueuedRecordings } from "@/lib/offline/queue";
import { isDemoMode } from "@/lib/supabase/config";
import type { CritiqueRecord, Show } from "@/lib/types";
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
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

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
      return;
    }
    const critRes = await fetch(`/api/critiques?show_id=${active.id}`);
    if (!critRes.ok) return;
    const critData = (await critRes.json()) as { critiques: CritiqueRecord[] };
    setPendingCount(critData.critiques.filter((c) => isReviewable(c.status)).length);
  }, []);

  const refreshQueue = useCallback(async () => {
    const items = await listQueuedRecordings();
    setQueueCount(items.length);
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    );
  }

  if (kind === "steward") {
    return (
      <div className="min-h-dvh">
        <header className="sss-paper sticky top-0 z-30">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
            <Link
              href="/ringside"
              className="font-[family-name:var(--font-fraunces)] text-base font-semibold"
            >
              Ringside
            </Link>
            <ShowChip name={show?.name ?? null} date={show?.date ?? null} compact />
            <SyncChip online={online} queueCount={queueCount} />
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
            <p className="text-sm text-sss-text-secondary">
              {queueCount === 0
                ? "No recordings waiting to sync."
                : `${queueCount} recording(s) stored on this device. Open Record to sync.`}
            </p>
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
      <header className="sss-paper sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight"
            >
              Sieger Show Secretary
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
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm text-sss-text-secondary hover:text-sss-accent-deep"
          >
            Account
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
