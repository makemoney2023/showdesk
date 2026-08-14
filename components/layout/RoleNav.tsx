import Link from "next/link";
import { cn } from "@/lib/utils";

export function RoleNav({
  items,
  activeHref,
  pendingCount = 0,
}: {
  items: { href: string; label: string }[];
  activeHref: string;
  pendingCount?: number;
}) {
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Secretary">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? activeHref === "/"
            : activeHref === item.href || activeHref.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-11 items-center px-3 text-sm transition-colors duration-[var(--duration-ui)]",
              active
                ? "border-b-2 border-sss-accent text-sss-text-primary"
                : "text-sss-text-secondary hover:text-sss-accent-deep",
            )}
          >
            {item.label}
            {item.href === "/admin/review" && pendingCount > 0 ? (
              <span className="ml-2 text-xs text-sss-accent-deep">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
