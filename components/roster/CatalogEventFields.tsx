"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/domain/show-day";
import type { CatalogClassId } from "@/lib/domain/catalog-competition";
import { catalogClassOptionLabel } from "@/lib/domain/class-eligibility";
import type { DogSex } from "@/lib/domain/class-division";
import type { ShowWeekend } from "@/lib/domain/show-weekend";

export function CatalogEventFields({
  mode,
  seChecked,
  onSeChange,
  conformationChecked,
  onConformationChange,
  saturdayChecked,
  sundayChecked,
  onSaturdayChange,
  onSundayChange,
  weekend,
  catalogClass,
  onCatalogClassChange,
  eligibleClasses,
  sex,
  classWarning,
  competitionDay,
  onCompetitionDayChange,
  dobMissing,
}: {
  mode: "create" | "edit";
  seChecked: boolean;
  onSeChange: (checked: boolean) => void;
  conformationChecked: boolean;
  onConformationChange: (checked: boolean) => void;
  saturdayChecked?: boolean;
  sundayChecked?: boolean;
  onSaturdayChange?: (checked: boolean) => void;
  onSundayChange?: (checked: boolean) => void;
  weekend?: ShowWeekend;
  catalogClass: CatalogClassId | "standard-evaluation" | undefined;
  onCatalogClassChange: (value: CatalogClassId) => void;
  eligibleClasses: CatalogClassId[];
  sex: DogSex | "";
  classWarning: string | null;
  competitionDay?: string;
  onCompetitionDayChange?: (value: string) => void;
  dobMissing: boolean;
}) {
  const classValue =
    catalogClass && catalogClass !== "standard-evaluation"
      ? catalogClass
      : undefined;

  return (
    <div className="space-y-3 rounded-sss-md border border-sss-border p-3">
      <Label>Catalog events</Label>
      <p className="text-xs text-sss-text-muted">
        Check every event this dog should enter. Options appear after you check
        a box.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={seChecked}
          onCheckedChange={(checked) => onSeChange(checked === true)}
        />
        Standard Evaluation
        {mode === "create" && weekend?.se
          ? ` — Friday ${formatDisplayDate(weekend.se)}`
          : null}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={conformationChecked}
          onCheckedChange={(checked) =>
            onConformationChange(checked === true)
          }
        />
        Conformation
      </label>
      {conformationChecked ? (
        <div className="space-y-3 border-l border-sss-border pl-4">
          {mode === "create" && weekend ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={saturdayChecked === true}
                  onCheckedChange={(checked) =>
                    onSaturdayChange?.(checked === true)
                  }
                />
                Saturday {formatDisplayDate(weekend.saturday)}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={sundayChecked === true}
                  onCheckedChange={(checked) =>
                    onSundayChange?.(checked === true)
                  }
                />
                Sunday {formatDisplayDate(weekend.sunday)}
              </label>
            </>
          ) : null}
          {mode === "edit" && onCompetitionDayChange ? (
            <div className="space-y-1">
              <Label htmlFor="competition_day">Competition day (required)</Label>
              <Input
                id="competition_day"
                type="date"
                value={competitionDay ?? ""}
                onChange={(event) =>
                  onCompetitionDayChange(event.target.value)
                }
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Published catalog class</Label>
            {dobMissing ? (
              <p className="text-sm text-sss-text-muted">
                Enter the dog&apos;s date of birth and sex to see eligible
                classes.
              </p>
            ) : (
              <Select
                value={classValue}
                onValueChange={(value) =>
                  onCatalogClassChange(value as CatalogClassId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select eligible class" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleClasses.map((id) => (
                    <SelectItem key={id} value={id}>
                      {catalogClassOptionLabel(id, sex)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {classWarning ? (
              <p className="text-sm text-amber-800">{classWarning}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
