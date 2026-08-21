import { Calendar } from "lucide-react";
import { formatDisplayDate } from "@/lib/domain/show-day";

export function ShowChip({
  name,
  date,
  compact = false,
}: {
  name: string | null;
  date: string | null;
  compact?: boolean;
}) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-sss-text-muted">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        {compact ? "No show" : "No active show"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-sss-text-secondary">
      <Calendar className="h-3.5 w-3.5 text-sss-accent-deep" aria-hidden />
      <span className="font-medium text-sss-text-primary">{name}</span>
      {date ? (
        <span className="text-sss-text-muted"> · {formatDisplayDate(date)}</span>
      ) : null}
    </span>
  );
}
