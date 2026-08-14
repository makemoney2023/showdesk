import { labelOffline } from "@/lib/domain/status-labels";

export function SyncChip({
  online,
  queueCount,
}: {
  online: boolean;
  queueCount: number;
}) {
  return (
    <span
      className={
        online
          ? "border border-sss-border px-2 py-1 text-xs text-sss-text-secondary"
          : "border border-sss-offline px-2 py-1 text-xs text-sss-offline"
      }
    >
      {labelOffline(online)}
      {queueCount > 0 ? ` · ${queueCount} queued` : ""}
    </span>
  );
}
