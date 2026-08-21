import {
  AlertCircle,
  Check,
  Circle,
  CircleDot,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/domain/status-labels";

const TONE_CLASS: Record<ChipTone, string> = {
  muted: "bg-sss-lifted text-sss-text-secondary",
  warning: "bg-sss-warning-soft text-sss-warning",
  pending: "bg-sss-accent-soft/45 text-sss-accent-deep",
  success: "bg-sss-success-soft text-sss-success",
  error: "bg-sss-error-soft text-sss-error",
};

const TONE_ICON: Record<ChipTone, typeof Circle> = {
  muted: Circle,
  warning: Clock,
  pending: CircleDot,
  success: Check,
  error: AlertCircle,
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
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
