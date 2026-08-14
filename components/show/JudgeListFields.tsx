"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JudgeListFields({
  judges,
  onChange,
  idPrefix,
}: {
  judges: string[];
  onChange: (judges: string[]) => void;
  idPrefix: string;
}) {
  const rows = judges.length > 0 ? judges : [""];

  return (
    <div className="space-y-2 sm:col-span-2">
      {rows.map((name, index) => (
        <div key={`${idPrefix}-${index}`} className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {index === 0 ? (
              <Label htmlFor={`${idPrefix}-0`}>Judge</Label>
            ) : (
              <Label htmlFor={`${idPrefix}-${index}`} className="sr-only">
                Judge {index + 1}
              </Label>
            )}
            <Input
              id={`${idPrefix}-${index}`}
              value={name}
              onChange={(e) => {
                const next = [...rows];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder="Judge name"
            />
          </div>
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...rows, ""])}
      >
        Add judge
      </Button>
    </div>
  );
}
