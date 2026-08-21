import { Wifi, WifiOff } from "lucide-react";
import { labelOffline } from "@/lib/domain/status-labels";

export function SyncChip({
  online,
  queueCount,
}: {
  online: boolean;
  queueCount: number;
}) {
  const Icon = online ? Wifi : WifiOff;
  return (
    <span
      className={
        online
          ? "inline-flex items-center gap-1.5 rounded-full border border-sss-border px-2 py-1 text-xs text-sss-text-secondary"
          : "inline-flex items-center gap-1.5 rounded-full border border-sss-offline px-2 py-1 text-xs text-sss-offline"
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {labelOffline(online)}
      {queueCount > 0 ? ` · ${queueCount} queued` : ""}
    </span>
  );
}
