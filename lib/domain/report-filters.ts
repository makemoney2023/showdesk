export type ReportDeskFilter =
  | "all"
  | "ready"
  | "missing"
  | "delivery_failed"
  | "delivery_blocked";

export function reportDeskRowKind(input: {
  documents: { available: boolean; printable?: boolean }[];
  deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
}): Exclude<ReportDeskFilter, "all">[] {
  const kinds: Exclude<ReportDeskFilter, "all">[] = [];
  if (input.documents.some((doc) => doc.printable)) {
    kinds.push("ready");
  }
  if (input.documents.some((doc) => !doc.available)) {
    kinds.push("missing");
  }
  if (input.deliveryStatus === "failed") {
    kinds.push("delivery_failed");
  }
  if (input.deliveryStatus === "blocked") {
    kinds.push("delivery_blocked");
  }
  return kinds;
}

export function reportRowMatchesFilter(
  input: {
    documents: { available: boolean; printable?: boolean }[];
    deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
  },
  filter: ReportDeskFilter,
): boolean {
  if (filter === "all") return true;
  return reportDeskRowKind(input).includes(filter);
}

/** Reports date chips. `"all"` keeps SE + Saturday + Sunday visible. */
export function reportRowMatchesDay(
  entry: { competition_day?: string },
  selectedDay: string,
): boolean {
  if (!selectedDay || selectedDay === "all") return true;
  return (entry.competition_day ?? "") === selectedDay;
}

/** Search looks across the weekend; date chips apply only while browsing. */
export function reportBrowseDay(
  selectedDay: string,
  search: string,
): string {
  return search.trim() ? "all" : selectedDay;
}
