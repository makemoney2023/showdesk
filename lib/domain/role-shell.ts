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
    { href: "/ringside", label: "Ringside" },
  ];
}

export function stewardNavItems(): { href: string; label: string }[] {
  return [
    { href: "/ringside", label: "Dogs" },
    { href: "/ringside/placements", label: "Placements" },
    { href: "/", label: "Desk" },
  ];
}
