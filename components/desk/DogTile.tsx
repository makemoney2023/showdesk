import Link from "next/link";
import { ClipboardList } from "lucide-react";
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
  const primaryHref = seOnly
    ? `/ringside/se/${entryId}${query}`
    : `/ringside/record/${entryId}${query}`;
  return (
    <li className="sss-paper sss-interactive overflow-hidden">
      <Link
        href={primaryHref}
        className="block p-4"
        aria-label={
          seOnly ? `Open SE form for ${dogName}` : `Record critique for ${dogName}`
        }
      >
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
        <p className="mt-3 text-sm font-medium text-sss-accent-deep">
          {seOnly ? "Open SE form →" : "Record critique →"}
        </p>
      </Link>
      {!seOnly ? (
        <div className="border-t border-sss-border px-4 py-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/ringside/se/${entryId}${query}`}>
            <ClipboardList className="h-3.5 w-3.5" />
            SE form
          </Link>
        </Button>
        </div>
      ) : null}
    </li>
  );
}
