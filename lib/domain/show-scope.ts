export interface ShowScoped {
  show_id: string;
}

export function filterByShow<T extends ShowScoped>(
  items: T[],
  showId: string,
): T[] {
  return items.filter((item) => item.show_id === showId);
}

export function assertShowScope(
  item: ShowScoped,
  showId: string,
): void {
  if (item.show_id !== showId) {
    throw new Error(
      `Cross-show data leak: expected show_id ${showId}, got ${item.show_id}`,
    );
  }
}

export function withShowId<T extends object>(
  data: T,
  showId: string,
): T & ShowScoped {
  return { ...data, show_id: showId };
}

export function requireShowId(showId: string | null | undefined): string {
  if (!showId?.trim()) {
    throw new Error("show_id is required");
  }
  return showId;
}
