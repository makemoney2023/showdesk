import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DogAvatar } from "@/components/desk/DogAvatar";
import { StatusChip } from "@/components/status/StatusChip";
import type { ChipTone } from "@/lib/domain/status-labels";

export function DogTile({
  entryId,
  armband,
  dogName,
  classLabel,
  divisionKey,
  statusLabel,
  statusTone,
  photoHref,
}: {
  entryId: string;
  armband: string;
  dogName: string;
  classLabel: string;
  divisionKey?: string;
  statusLabel: string;
  statusTone: ChipTone;
  photoHref?: string;
}) {
  return (
    <li className="sss-paper sss-interactive overflow-hidden">
      <Link
        href={`/ringside/record/${entryId}${divisionKey ? `?division=${encodeURIComponent(divisionKey)}` : ""}`}
        className="block p-4"
        aria-label={`Record critique for ${dogName}`}
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
          Record critique →
        </p>
      </Link>
      <div className="border-t border-sss-border px-4 py-2">
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/ringside/se/${entryId}${divisionKey ? `?division=${encodeURIComponent(divisionKey)}` : ""}`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            SE form
          </Link>
        </Button>
      </div>
    </li>
  );
}
