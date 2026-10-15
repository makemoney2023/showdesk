"use client";

import { REPORT_UNASSIGNED_JUDGE } from "@/lib/domain/report-filters";
import { cn } from "@/lib/utils";

export function judgeFilterLabel(value: string): string {
  return value === REPORT_UNASSIGNED_JUDGE ? "No judge" : value;
}

export function JudgeFilterChips({
  judges,
  counts,
  total,
  value,
  onChange,
}: {
  judges: string[];
  counts: ReadonlyMap<string, number>;
  total: number;
  value: string;
  onChange: (value: string) => void;
}) {
  if (judges.length === 0 && total === 0) return null;

  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by judge"
    >
      <JudgeChip
        pressed={value === "all"}
        onClick={() => onChange("all")}
        label={`All judges (${total})`}
      />
      {judges.map((name) => (
        <JudgeChip
          key={name}
          pressed={value === name}
          onClick={() => onChange(name)}
          label={`${judgeFilterLabel(name)} (${counts.get(name) ?? 0})`}
        />
      ))}
    </div>
  );
}

function JudgeChip({
  pressed,
  onClick,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "min-h-11 shrink-0 rounded-sss-md px-3 text-sm",
        pressed
          ? "bg-sss-ink text-[var(--sss-paper)] shadow-sss-card"
          : "sss-paper text-sss-text-secondary",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
