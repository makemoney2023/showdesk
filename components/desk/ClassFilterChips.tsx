"use client";

import { ADRK_CLASSES, type AdrkClassId } from "@/lib/domain/adrk-template";
import { cn } from "@/lib/utils";

export function ClassFilterChips({
  classIds,
  value,
  onChange,
}: {
  classIds: AdrkClassId[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (classIds.length === 0) return null;

  return (
    <div
      className="flex w-max max-w-full gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter by class"
    >
      <ClassChip
        pressed={value === "all"}
        onClick={() => onChange("all")}
        label="All classes"
      />
      {ADRK_CLASSES.filter((item) => classIds.includes(item.id)).map((item) => (
        <ClassChip
          key={item.id}
          pressed={value === item.id}
          onClick={() => onChange(item.id)}
          label={item.label}
        />
      ))}
    </div>
  );
}

function ClassChip({
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
