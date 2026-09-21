"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  catalogCompetitionLabel,
  isConformationEntry,
} from "@/lib/domain/catalog-competition";
import {
  awardsForEntry,
  normalizeShowAwards,
  toggleShowAward,
} from "@/lib/domain/show-awards";
import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import type { RosterEntryRecord } from "@/lib/types";

export function PlacementAwardFields({
  entry,
  draft,
  disabled,
  onChange,
}: {
  entry?: RosterEntryRecord;
  draft: DraftCritiqueSchema;
  disabled?: boolean;
  onChange: (next: DraftCritiqueSchema) => void;
}) {
  if (!entry || !isConformationEntry(entry)) return null;
  const awards = awardsForEntry(entry);
  const selectedAwards = normalizeShowAwards(draft.awards);

  return (
    <>
      <div className="space-y-2">
        <Label>Class place</Label>
        <p className="text-xs text-sss-text-muted">
          Places 1–4 in {catalogCompetitionLabel(entry)}. Tap the same place
          to clear it. If another dog already holds that place, they swap.
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Class place"
        >
          {([1, 2, 3, 4] as const).map((place) => {
            const selected = draft.placement === place;
            return (
              <Button
                key={place}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() =>
                  onChange({
                    ...draft,
                    placement: selected ? null : place,
                  })
                }
              >
                {place}
              </Button>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || draft.placement == null}
            onClick={() => onChange({ ...draft, placement: null })}
          >
            Clear
          </Button>
        </div>
      </div>
      {awards.length > 0 ? (
        <div className="space-y-2">
          <Label>Awards</Label>
          <p className="text-xs text-sss-text-muted">
            Check the specials this dog won. Best of Breed and Best Opposite
            Sex are available in every conformation class.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {awards.map((award) => {
              const checked = selectedAwards.includes(award.id);
              const id = `review-award-${award.id}`;
              return (
                <label
                  key={award.id}
                  htmlFor={id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() =>
                      onChange({
                        ...draft,
                        awards: toggleShowAward(selectedAwards, award.id),
                      })
                    }
                  />
                  <span>{award.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
