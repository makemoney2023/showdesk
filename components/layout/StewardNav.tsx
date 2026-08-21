"use client";

import Link from "next/link";
import { Inbox, LayoutDashboard, PawPrint, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stewardNavItems } from "@/lib/domain/role-shell";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof PawPrint> = {
  "/ringside": PawPrint,
  "/ringside/placements": Trophy,
  "/": LayoutDashboard,
};

export function RingsideDesktopNav({
  activeHref,
  onQueue,
  queueCount = 0,
}: {
  activeHref: string;
  onQueue: () => void;
  queueCount?: number;
}) {
  const items = stewardNavItems();
  return (
    <nav
      className="hidden gap-1 md:flex"
      aria-label="Ringside desktop"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? activeHref === "/"
            : item.href === "/ringside"
              ? activeHref === "/ringside"
              : activeHref.startsWith(item.href);
        const Icon = ICONS[item.href] ?? PawPrint;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-sss-md px-3 text-sm",
              active
                ? "bg-sss-lifted text-sss-accent-deep shadow-sss-card"
                : "text-sss-text-secondary hover:bg-sss-lifted/70",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onQueue}
        className="inline-flex min-h-11 items-center gap-2 rounded-sss-md px-3 text-sm text-sss-text-secondary hover:bg-sss-lifted/70"
      >
        <Inbox className="h-4 w-4" aria-hidden />
        Queue
        {queueCount > 0 ? <Badge>{queueCount}</Badge> : null}
      </button>
    </nav>
  );
}

export function StewardNav({
  activeHref,
  onQueue,
  queueCount = 0,
}: {
  activeHref: string;
  onQueue: () => void;
  queueCount?: number;
}) {
  const items = stewardNavItems();
  return (
    <nav
      className="sss-paper fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(3.75rem+env(safe-area-inset-bottom))] justify-around rounded-none border-x-0 border-b-0 pt-1.5 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Ringside"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? activeHref === "/"
            : item.href === "/ringside"
              ? activeHref === "/ringside"
              : activeHref.startsWith(item.href);
        const Icon = ICONS[item.href] ?? PawPrint;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-sss-accent-deep" : "text-sss-text-secondary",
            )}
          >
            <span
              className={cn(
                "inline-flex h-8 w-10 items-center justify-center rounded-sss-md",
                active && "bg-sss-lifted",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onQueue}
        className="inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-sss-text-secondary"
      >
        <span className="relative inline-flex h-8 w-10 items-center justify-center rounded-sss-md">
          <Inbox className="h-4 w-4" aria-hidden />
          {queueCount > 0 ? (
            <Badge className="absolute -top-0.5 -right-1">{queueCount}</Badge>
          ) : null}
        </span>
        Queue
      </button>
    </nav>
  );
}
