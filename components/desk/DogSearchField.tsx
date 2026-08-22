"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DogSearchField({
  value,
  onChange,
  "aria-label": ariaLabel,
  placeholder = "Search armband, dog, or owner",
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-60 flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sss-text-muted"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="pl-9"
        />
      </div>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
        >
          Clear search
        </Button>
      ) : null}
    </div>
  );
}
