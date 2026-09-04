"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeStepper({
  sections,
  activeId,
}: {
  sections: { id: string; label: string; filled: number; total: number }[];
  activeId: string;
}) {
  const index = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );
  const prev = sections[index - 1];
  const next = sections[index + 1];

  return (
    <div className="sticky top-[6.5rem] z-20 -mx-4 space-y-2 bg-sss-ground/90 px-4 py-2 backdrop-blur md:top-[8.25rem]">
      <ol className="flex flex-nowrap gap-2 overflow-x-auto text-xs">
        {sections.map((section) => {
          const complete = section.filled === section.total && section.total > 0;
          const current = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#se-${section.id}`}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-3",
                  current
                    ? "bg-sss-accent text-sss-ink"
                    : complete
                      ? "bg-sss-success-soft text-sss-success"
                      : "sss-tray text-sss-text-secondary",
                )}
              >
                {section.label} {section.filled}/{section.total}
              </a>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2">
        {prev ? (
          <Button asChild variant="outline" size="sm">
            <a href={`#se-${prev.id}`}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </a>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>
        )}
        {next ? (
          <Button asChild variant="outline" size="sm">
            <a href={`#se-${next.id}`}>
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
