import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/status/StatusChip";
import type { ChipTone } from "@/lib/domain/status-labels";

export function DogTile({
  entryId,
  armband,
  dogName,
  classLabel,
  statusLabel,
  statusTone,
  photoHref,
}: {
  entryId: string;
  armband: string;
  dogName: string;
  classLabel: string;
  statusLabel: string;
  statusTone: ChipTone;
  photoHref?: string;
}) {
  return (
    <li className="sss-paper p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {photoHref ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoHref}
              alt=""
              className="h-14 w-14 rounded-md object-cover"
            />
          ) : null}
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
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link href={`/ringside/record/${entryId}`}>Record critique</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/ringside/se/${entryId}`}>SE form</Link>
        </Button>
      </div>
    </li>
  );
}
