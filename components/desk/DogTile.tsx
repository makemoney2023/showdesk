import Link from "next/link";
import { ClipboardList, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DogAvatar } from "@/components/desk/DogAvatar";
import { StatusChip } from "@/components/status/StatusChip";
import type { ChipTone } from "@/lib/domain/status-labels";
import type { CatalogEventKind } from "@/lib/domain/catalog-competition";

export function DogTile({
  entryId,
  armband,
  dogName,
  classLabel,
  contextQuery,
  eventKind,
  statusLabel,
  statusTone,
  photoHref,
}: {
  entryId: string;
  armband: string;
  dogName: string;
  classLabel: string;
  contextQuery?: string;
  eventKind?: CatalogEventKind;
  statusLabel: string;
  statusTone: ChipTone;
  photoHref?: string;
}) {
  const query = contextQuery ? `?${contextQuery}` : "";
  const seOnly = eventKind === "se";
  const seHref = `/ringside/se/${entryId}${query}`;
  const recordHref = `/ringside/record/${entryId}${query}`;
  return (
    <li className="sss-paper overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <DogAvatar src={photoHref} />
            <div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
                #{armband}
              </div>
              <div className="font-medium">{dogName}</div>
              <div className="text-sm text-sss-text-muted">{classLabel}</div>
            </div>
          </div>
          <StatusChip label={statusLabel} tone={statusTone} />
        </div>
      </div>
      <div className="space-y-2 border-t border-sss-border px-4 py-3">
        {seOnly ? (
          <Button asChild className="w-full">
            <Link href={seHref} aria-label={`Open SE form for ${dogName}`}>
              <ClipboardList className="h-3.5 w-3.5" />
              Open SE form
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild className="w-full">
              <Link
                href={recordHref}
                aria-label={`Record critique for ${dogName}`}
              >
                <Mic className="h-3.5 w-3.5" />
                Record critique
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={seHref} aria-label={`Open SE form for ${dogName}`}>
                <ClipboardList className="h-3.5 w-3.5" />
                SE form
              </Link>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
