import { ADRK_CLASSES, type AdrkClassId } from "./adrk-template";
import type { RoleShellKind } from "./role-shell";
import type { TnrkSeForm } from "./tnrk-se-form";

export function classesWithDogs(
  entries: { class_id: string }[],
): AdrkClassId[] {
  const present = new Set(entries.map((e) => e.class_id));
  return ADRK_CLASSES.map((c) => c.id).filter((id) => present.has(id));
}

export function nextDogAfter(
  entries: { id: string; armband: string }[],
  currentId: string,
): string | null {
  const sorted = entries.toSorted((a, b) =>
    a.armband.localeCompare(b.armband, undefined, { numeric: true }),
  );
  const index = sorted.findIndex((e) => e.id === currentId);
  if (index < 0 || index === sorted.length - 1) return null;
  return sorted[index + 1]?.id ?? null;
}

/** Display-only date: "Aug 21, 2026". Keep ISO in form inputs. */
export function formatDisplayDate(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function queueAgeLabel(createdAt: string, nowMs: number): string {
  const elapsed = Math.max(0, nowMs - Date.parse(createdAt));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  return `${minutes} min ago`;
}

export function labelQueuedItem(
  item: {
    entryId: string;
    createdAt: string;
    kind?: "recording" | "se";
  },
  entries: { id: string; dog_name: string; armband: string }[],
  nowMs: number,
): { title: string; subtitle: string } {
  const entry = entries.find((e) => e.id === item.entryId);
  const age = queueAgeLabel(item.createdAt, nowMs);
  const kindLabel =
    item.kind === "se"
      ? "SE draft"
      : item.kind === "recording"
        ? "Recording"
        : null;
  return {
    title: entry ? `#${entry.armband} ${entry.dog_name}` : "Unknown dog",
    subtitle: kindLabel ? `${kindLabel} · ${age}` : age,
  };
}

/** Open Review for queued critiques; SE drafts stay on the ringside form. */
export function queuedItemHref(item: {
  entryId: string;
  kind?: "recording" | "se";
}): string {
  return item.kind === "se"
    ? `/ringside/se/${item.entryId}`
    : `/admin/review?entry=${encodeURIComponent(item.entryId)}`;
}

export function queuedItemReviewLabel(): string {
  return "Back to review";
}

function filledCount(values: Array<string | null | undefined>): {
  filled: number;
  total: number;
} {
  return {
    filled: values.filter((v) => Boolean(v && String(v).trim())).length,
    total: values.length,
  };
}

export function seSectionProgress(form: TnrkSeForm): {
  id: string;
  label: string;
  filled: number;
  total: number;
}[] {
  return [
    {
      id: "identification",
      label: "ID",
      ...filledCount([
        form.date,
        form.club,
        form.judge,
        form.dog_name,
        form.sex,
        form.registration_number,
        form.date_of_birth,
        form.microchip_nr,
        form.tattoo_nr,
      ]),
    },
    {
      id: "pedigree",
      label: "Pedigree",
      ...filledCount([
        form.sire,
        form.sire_reg,
        form.dam,
        form.dam_reg,
        form.breeder,
        form.hd_ed_jlpp_nr,
        form.owner_co_owner,
        form.email,
        form.address,
        form.handler,
        form.phone,
      ]),
    },
    {
      id: "measurements",
      label: "Measure",
      ...filledCount(Object.values(form.measurements)),
    },
    {
      id: "bite",
      label: "Bite",
      ...filledCount(
        form.bite === "other" ? [form.bite, form.bite_other] : [form.bite],
      ),
    },
    {
      id: "appearance",
      label: "Notes",
      ...filledCount([form.overall_appearance]),
    },
    {
      id: "ratings",
      label: "Ratings",
      ...filledCount([
        form.head_shape,
        form.cheek_bone,
        form.bone_strength,
        form.general_behavior,
      ]),
    },
    {
      id: "result",
      label: "Result",
      ...filledCount([
        form.gunfire,
        form.comments,
        form.final_result,
        form.formwert,
        form.judge_signature,
        form.event_secretary,
        form.signature_date,
      ]),
    },
  ];
}

export function accountRoleLabel(
  kind: RoleShellKind,
): "Secretary" | "Steward" | null {
  if (kind === "secretary") return "Secretary";
  if (kind === "steward") return "Steward";
  return null;
}
