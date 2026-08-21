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
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        orientation === "vertical" ? "flex flex-col gap-1" : "flex flex-wrap gap-1",
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
              "inline-flex min-h-11 items-center gap-2 rounded-sss-md px-3 text-sm transition-colors duration-[var(--duration-ui)]",
              orientation === "vertical" && "w-full",
              active
                ? "bg-sss-lifted text-sss-text-primary shadow-sss-card"
                : "text-sss-text-secondary hover:bg-sss-lifted/70 hover:text-sss-accent-deep",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
            {item.href === "/admin/review" && pendingCount > 0 ? (
              <Badge>{pendingCount}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
