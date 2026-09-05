"use client";

import type { CompetitionDaySummary } from "@/lib/domain/catalog-competition";
import { cn } from "@/lib/utils";

export function CompetitionDayFilter({
  days,
  value,
  onChange,
  allCount,
}: {
  days: CompetitionDaySummary[];
  value: string;
  onChange: (day: string) => void;
  /** When set, show an All dates chip so SE stays visible with Sat/Sun. */
  allCount?: number;
}) {
  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by competition date"
    >
      {allCount !== undefined ? (
        <DayChip
          pressed={value === "all"}
          onClick={() => onChange("all")}
          label="All dates"
          detail={`SE and conformation · ${allCount}`}
        />
      ) : null}
      {days.map((day) => (
        <DayChip
          key={day.day || "unscheduled"}
          pressed={value === day.day}
          onClick={() => onChange(day.day)}
          label={day.label}
          detail={`${
            day.eventKind === "se" ? "Standard Evaluation" : "Conformation"
          } · ${day.count}`}
        />
      ))}
    </div>
  );
}

function DayChip({
  pressed,
  onClick,
  label,
  detail,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-sss-md px-3 py-1 text-left text-sm",
        pressed
          ? "bg-sss-ink text-[var(--sss-paper)] shadow-sss-card"
          : "sss-paper text-sss-text-secondary",
      )}
    >
      <span className="block font-medium">{label}</span>
      <span className="block text-xs opacity-75">{detail}</span>
    </button>
  );
}
