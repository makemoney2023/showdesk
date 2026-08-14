export function deskNextAction(input: {
  hasShow: boolean;
  entryCount: number;
  pendingCount: number;
}): { href: string; label: string } {
  if (!input.hasShow) {
    return { href: "/admin/entries", label: "Create show" };
  }
  if (input.entryCount === 0) {
    return { href: "/admin/entries", label: "Import roster" };
  }
  if (input.pendingCount > 0) {
    return {
      href: "/admin/review",
      label: `Review ${input.pendingCount} pending`,
    };
  }
  return { href: "/ringside", label: "Open ringside" };
}

export function deskSecondaryActions(input: {
  hasShow: boolean;
  entryCount: number;
  pendingCount: number;
}): { href: string; label: string }[] {
  if (!input.hasShow) return [];
  if (input.entryCount === 0) {
    return [{ href: "/admin/entries", label: "Add entry" }];
  }
  if (input.pendingCount > 0) {
    return [{ href: "/ringside", label: "Open ringside" }];
  }
  return [{ href: "/admin/entries", label: "Import CSV" }];
}
