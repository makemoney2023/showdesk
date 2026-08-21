export type RoleShellKind = "secretary" | "steward" | "minimal";

export function shellForPath(pathname: string): RoleShellKind {
  if (pathname === "/login" || pathname.startsWith("/login/")) return "minimal";
  if (pathname === "/ringside" || pathname.startsWith("/ringside/")) {
    return "steward";
  }
  return "secretary";
}

export function secretaryNavItems(): { href: string; label: string }[] {
  return [
    { href: "/", label: "Desk" },
    { href: "/admin/entries", label: "Roster" },
    { href: "/admin/review", label: "Review" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/settings", label: "Settings" },
  ];
}

export function secretaryRingsideSwitch(): { href: string; label: string } {
  return { href: "/ringside", label: "Open ringside" };
}

export function stewardNavItems(): { href: string; label: string }[] {
  return [
    { href: "/ringside", label: "Dogs" },
    { href: "/ringside/placements", label: "Placements" },
    { href: "/", label: "Desk" },
  ];
}

/** Dogs stays active on record/SE; Placements is its own destination. */
export function stewardNavItemActive(
  href: string,
  activeHref: string,
): boolean {
  if (href === "/") return activeHref === "/";
  if (href === "/ringside") {
    return (
      activeHref === "/ringside" ||
      activeHref.startsWith("/ringside/record/") ||
      activeHref.startsWith("/ringside/se/")
    );
  }
  return activeHref === href || activeHref.startsWith(`${href}/`);
}
