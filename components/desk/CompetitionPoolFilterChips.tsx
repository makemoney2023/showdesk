"use client";

import type { CompetitionPool } from "@/lib/domain/catalog-competition";
import { cn } from "@/lib/utils";

export function CompetitionPoolFilterChips({
  pools,
  value,
  onChange,
}: {
  pools: CompetitionPool[];
  value: string;
  onChange: (pool: string) => void;
}) {
  if (pools.length === 0) return null;
  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by published class and sex"
    >
      <PoolChip
        label="All divisions"
        pressed={value === "all"}
        onClick={() => onChange("all")}
      />
      {pools.map((pool) => (
        <PoolChip
          key={pool.key}
          label={`${pool.label} (${pool.count})`}
          pressed={value === pool.key}
          onClick={() => onChange(pool.key)}
        />
      ))}
    </div>
  );
}

function PoolChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
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
