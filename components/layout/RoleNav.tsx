import Link from "next/link";
import {
  ClipboardList,
  Files,
  FileSearch,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard,
  "/admin/entries": ClipboardList,
  "/admin/review": FileSearch,
  "/admin/reports": Files,
  "/admin/settings": Settings,
};

export function RoleNav({
  items,
  activeHref,
  pendingCount = 0,
  orientation = "horizontal",
  onNavigate,
}: {
  items: { href: string; label: string }[];
  activeHref: string;
  pendingCount?: number;
  orientation?: "horizontal" | "vertical" | "dock";
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : orientation === "dock"
            ? "sss-paper fixed inset-x-0 bottom-0 z-50 flex min-h-[calc(3.75rem+env(safe-area-inset-bottom))] justify-around rounded-none border-x-0 border-b-0 pt-1.5 pb-[env(safe-area-inset-bottom)] md:hidden"
            : "flex flex-wrap gap-1",
      )}
      aria-label="Secretary"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? activeHref === "/"
            : activeHref === item.href || activeHref.startsWith(`${item.href}/`);
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              orientation === "dock"
                ? "inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
                : "inline-flex min-h-11 items-center gap-2 rounded-sss-md px-3 text-sm transition-colors duration-[var(--duration-ui)]",
              orientation === "vertical" && "w-full",
              active
                ? orientation === "dock"
                  ? "text-sss-accent-deep"
                  : "bg-sss-lifted text-sss-text-primary shadow-sss-card"
                : "text-sss-text-secondary hover:bg-sss-lifted/70 hover:text-sss-accent-deep",
            )}
          >
            {orientation === "dock" ? (
              <span
                className={cn(
                  "relative inline-flex h-8 w-10 items-center justify-center rounded-sss-md",
                  active && "bg-sss-lifted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.href === "/admin/review" && pendingCount > 0 ? (
                  <Badge className="absolute -top-0.5 -right-1">
                    {pendingCount}
                  </Badge>
                ) : null}
              </span>
            ) : (
              <Icon className="h-4 w-4" aria-hidden />
            )}
            {item.label}
            {orientation !== "dock" &&
            item.href === "/admin/review" &&
            pendingCount > 0 ? (
              <Badge>{pendingCount}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
