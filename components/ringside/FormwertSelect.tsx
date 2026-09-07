"use client";

import {
  formatAdrkFormwert,
  formwertSelectCodes,
  type AdrkFormwertCode,
  type FormwertScale,
} from "@/lib/domain/adrk-template";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FormwertSelect({
  value,
  scale,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: {
  value: AdrkFormwertCode | null;
  scale: FormwertScale;
  onChange: (value: AdrkFormwertCode | null) => void;
  disabled?: boolean;
  id?: string;
  "aria-label": string;
  className?: string;
}) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(next) =>
        onChange(next === "none" ? null : (next as AdrkFormwertCode))
      }
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("min-w-44", className)}
      >
        <SelectValue placeholder="Select rating" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {formwertSelectCodes(scale, value).map((code) => (
          <SelectItem key={code} value={code}>
            {formatAdrkFormwert(code, scale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
