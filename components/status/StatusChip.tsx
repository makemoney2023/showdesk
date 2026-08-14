import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/domain/status-labels";

const TONE_CLASS: Record<ChipTone, string> = {
  muted: "bg-sss-lifted text-sss-text-secondary",
  warning: "bg-sss-lifted text-sss-warning",
  pending: "bg-sss-accent-soft/50 text-sss-accent-deep",
  success: "bg-sss-lifted text-sss-success",
  error: "bg-sss-lifted text-sss-error",
};

export function StatusChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
