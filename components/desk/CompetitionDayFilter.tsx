"use client";

import type { CompetitionDaySummary } from "@/lib/domain/catalog-competition";
import { cn } from "@/lib/utils";

export function CompetitionDayFilter({
  days,
  value,
  onChange,
}: {
  days: CompetitionDaySummary[];
  value: string;
  onChange: (day: string) => void;
}) {
  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by competition date"
    >
      {days.map((day) => (
        <button
          key={day.day || "unscheduled"}
          type="button"
          aria-pressed={value === day.day}
          onClick={() => onChange(day.day)}
          className={cn(
            "min-h-11 shrink-0 rounded-sss-md px-3 py-1 text-left text-sm",
            value === day.day
              ? "bg-sss-ink text-[var(--sss-paper)] shadow-sss-card"
              : "sss-paper text-sss-text-secondary",
          )}
        >
          <span className="block font-medium">{day.label}</span>
          <span className="block text-xs opacity-75">
            {day.eventKind === "se" ? "Standard Evaluation" : "Conformation"} ·{" "}
            {day.count}
          </span>
        </button>
      ))}
    </div>
  );
}
