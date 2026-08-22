"use client";

import {
  divisionLabel,
  type ClassDivision,
  type DivisionKey,
} from "@/lib/domain/class-division";
import { cn } from "@/lib/utils";

type PopulatedDivision = ClassDivision & {
  key: DivisionKey;
  count: number;
};

export function DivisionFilterChips({
  divisions,
  value,
  onChange,
}: {
  divisions: PopulatedDivision[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (divisions.length === 0) return null;

  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by class and sex division"
    >
      <DivisionChip
        pressed={value === "all"}
        onClick={() => onChange("all")}
        label="All divisions"
      />
      {divisions.map((division) => (
        <DivisionChip
          key={division.key}
          pressed={value === division.key}
          onClick={() => onChange(division.key)}
          label={`${divisionLabel(division, "short")} (${division.count})`}
        />
      ))}
    </div>
  );
}

function DivisionChip({
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
