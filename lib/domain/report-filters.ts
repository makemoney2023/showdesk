export type ReportDeskFilter = "all" | "ready" | "missing" | "delivery_failed";

export function reportDeskRowKind(input: {
  documents: { available: boolean }[];
  deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
}): Exclude<ReportDeskFilter, "all">[] {
  const kinds: Exclude<ReportDeskFilter, "all">[] = [];
  if (input.documents.length > 0 && input.documents.every((doc) => doc.available)) {
    kinds.push("ready");
  }
  if (input.documents.some((doc) => !doc.available)) {
    kinds.push("missing");
  }
  if (input.deliveryStatus === "failed") {
    kinds.push("delivery_failed");
  }
  return kinds;
}

export function reportRowMatchesFilter(
  input: {
    documents: { available: boolean }[];
    deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
  },
  filter: ReportDeskFilter,
): boolean {
  if (filter === "all") return true;
  return reportDeskRowKind(input).includes(filter);
}
