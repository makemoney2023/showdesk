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
      <span className="text-xs text-sss-text-muted">
        {compact ? "No show" : "No active show"}
      </span>
    );
  }
  return (
    <span className="text-xs text-sss-text-secondary">
      <span className="font-medium text-sss-text-primary">{name}</span>
      {date ? <span className="text-sss-text-muted"> · {date}</span> : null}
    </span>
  );
}
