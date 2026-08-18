"use client";

import Link from "next/link";
import { stewardNavItems } from "@/lib/domain/role-shell";
import { cn } from "@/lib/utils";

export function StewardNav({
  activeHref,
  onQueue,
}: {
  activeHref: string;
  onQueue: () => void;
}) {
  const items = stewardNavItems();
  return (
    <nav
      className="sss-paper fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(2.75rem+env(safe-area-inset-bottom))] justify-around pt-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Ringside"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? activeHref === "/"
            : item.href === "/ringside"
              ? activeHref === "/ringside"
              : activeHref.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center text-sm",
              active ? "text-sss-accent-deep" : "text-sss-text-secondary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onQueue}
        className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center text-sm text-sss-text-secondary"
      >
        Queue
      </button>
    </nav>
  );
}
