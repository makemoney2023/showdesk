import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import type {
  CritiqueRow,
  EntryRow,
  PlacementRow,
  SeEvaluationRow,
  ShowRow,
} from "./store-port";

function parseJsonb<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function optionalText(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function optionalStringArray(
  value: string[] | string | null | undefined,
): string[] | undefined {
  if (value == null) return undefined;
  const parsed = parseJsonb<string[]>(value);
  return parsed;
}

export function toShowRow(show: Show): ShowRow {
  return {
    id: show.id,
    name: show.name,
    date: show.date,
    venue: show.venue,
    judge: show.judge,
    judges: show.judges ?? null,
    rulebook: show.rulebook,
    logo_url: show.logo_url ?? null,
    created_at: show.created_at,
  };
}

export function mapShowRow(row: ShowRow): Show {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    venue: row.venue,
    judge: row.judge,
    judges: optionalStringArray(row.judges),
    rulebook: row.rulebook,
    logo_url: optionalText(row.logo_url),
    created_at: row.created_at,
  };
}

export function toEntryRow(entry: RosterEntryRecord): EntryRow {
  return {
    id: entry.id,
    show_id: entry.show_id,
    armband: entry.armband,
    dog_name: entry.dog_name,
    zb_number: entry.zb_number,
    wt: entry.wt,
    owner: entry.owner,
    email: entry.email,
    sex: entry.sex,
    class_id: entry.class_id,
    event_kind: entry.event_kind ?? null,
    competition_day: entry.competition_day ?? null,
    catalog_class: entry.catalog_class ?? null,
    photo_path: entry.photo_path ?? null,
    sire: entry.sire ?? null,
    dam: entry.dam ?? null,
    breeder: entry.breeder ?? null,
    address: entry.address ?? null,
    hd_ed_jlpp: entry.hd_ed_jlpp ?? null,
  };
}

export function mapEntryRow(row: EntryRow): RosterEntryRecord {
  return {
    id: row.id,
    show_id: row.show_id,
    armband: row.armband,
    dog_name: row.dog_name,
    zb_number: row.zb_number,
    wt: row.wt,
    owner: row.owner,
    email: row.email,
    sex: row.sex,
    class_id: row.class_id,
    ...(row.event_kind ? { event_kind: row.event_kind } : {}),
    ...(row.competition_day
      ? { competition_day: row.competition_day }
      : {}),
    ...(row.catalog_class ? { catalog_class: row.catalog_class } : {}),
    photo_path: optionalText(row.photo_path),
    ...(row.sire ? { sire: row.sire } : {}),
    ...(row.dam ? { dam: row.dam } : {}),
    ...(row.breeder ? { breeder: row.breeder } : {}),
    ...(row.address ? { address: row.address } : {}),
    ...(row.hd_ed_jlpp ? { hd_ed_jlpp: row.hd_ed_jlpp } : {}),
  };
}

export function toCritiqueRow(critique: CritiqueRecord): CritiqueRow {
  return {
    id: critique.id,
    show_id: critique.show_id,
    entry_id: critique.entry_id,
    status: critique.status,
    transcript: critique.transcript,
    draft: critique.draft,
    audio_path: critique.audio_path ?? null,
    delivery_status: critique.delivery_status,
    error_message: critique.error_message ?? null,
    created_at: critique.created_at,
    updated_at: critique.updated_at,
    approved_at: critique.approved_at ?? null,
    judge: critique.judge ?? null,
  };
}

export function mapCritiqueRow(row: CritiqueRow): CritiqueRecord {
  return {
    id: row.id,
    show_id: row.show_id,
    entry_id: row.entry_id,
    status: row.status,
    transcript: row.transcript,
    draft: parseJsonb<DraftCritiqueSchema>(row.draft),
    audio_path: optionalText(row.audio_path),
    delivery_status: row.delivery_status,
    error_message: optionalText(row.error_message),
    created_at: row.created_at,
    updated_at: row.updated_at,
    approved_at: optionalText(row.approved_at),
    judge: optionalText(row.judge),
  };
}

export function toPlacementRow(placement: PlacementRecord): PlacementRow {
  return {
    id: placement.id,
    show_id: placement.show_id,
    class_id: placement.class_id,
    sex: placement.sex,
    competition_day: placement.competition_day ?? null,
    catalog_class: placement.catalog_class ?? null,
    entry_id: placement.entry_id,
    placement: placement.placement,
  };
}

export function mapPlacementRow(row: PlacementRow): PlacementRecord {
  return {
    id: row.id,
    show_id: row.show_id,
    class_id: row.class_id,
    sex: row.sex,
    ...(row.competition_day
      ? { competition_day: row.competition_day }
      : {}),
    ...(row.catalog_class ? { catalog_class: row.catalog_class } : {}),
    entry_id: row.entry_id,
    placement: row.placement,
  };
}

export function toSeEvaluationRow(evaluation: SeEvaluationRecord): SeEvaluationRow {
  return {
    id: evaluation.id,
    show_id: evaluation.show_id,
    entry_id: evaluation.entry_id,
    form: evaluation.form,
    status: evaluation.status,
    created_at: evaluation.created_at,
    updated_at: evaluation.updated_at,
  };
}

export function mapSeEvaluationRow(row: SeEvaluationRow): SeEvaluationRecord {
  return {
    id: row.id,
    show_id: row.show_id,
    entry_id: row.entry_id,
    form: parseJsonb<TnrkSeForm>(row.form),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
