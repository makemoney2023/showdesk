import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import {
  normalizeTnrkSeForm,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import {
  emptyHealthClearances,
  normalizeHealthClearances,
  type DogHealthClearances,
} from "@/lib/domain/health-clearances";
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

/** Postgres `entries` pedigree columns are NOT NULL DEFAULT ''. */
function requiredText(value: string | null | undefined): string {
  return value ?? "";
}

function optionalDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
    results_published_at: show.results_published_at ?? null,
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
    ...(optionalText(row.results_published_at)
      ? { results_published_at: optionalText(row.results_published_at) }
      : {}),
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
    competition_day: optionalDate(entry.competition_day),
    catalog_class: entry.catalog_class ?? null,
    photo_path: entry.photo_path ?? null,
    sire: requiredText(entry.sire),
    dam: requiredText(entry.dam),
    breeder: requiredText(entry.breeder),
    address: requiredText(entry.address),
    hd_ed_jlpp: requiredText(entry.hd_ed_jlpp),
    dog_id: entry.dog_id ?? null,
    date_of_birth: requiredText(entry.date_of_birth),
    prefix_titles: requiredText(entry.prefix_titles),
    suffix_titles: requiredText(entry.suffix_titles),
    microchip: requiredText(entry.microchip),
    registration_club: requiredText(entry.registration_club),
    co_owner: requiredText(entry.co_owner),
    kennel_name: requiredText(entry.kennel_name),
    health: normalizeHealthClearances(entry.health),
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
    ...(row.dog_id ? { dog_id: row.dog_id } : {}),
    ...(row.date_of_birth ? { date_of_birth: row.date_of_birth } : {}),
    ...(row.prefix_titles ? { prefix_titles: row.prefix_titles } : {}),
    ...(row.suffix_titles ? { suffix_titles: row.suffix_titles } : {}),
    ...(row.microchip ? { microchip: row.microchip } : {}),
    ...(row.registration_club
      ? { registration_club: row.registration_club }
      : {}),
    ...(row.co_owner ? { co_owner: row.co_owner } : {}),
    ...(row.kennel_name ? { kennel_name: row.kennel_name } : {}),
    ...(healthFromRow(row.health)
      ? { health: healthFromRow(row.health) }
      : {}),
  };
}

function healthFromRow(
  value: DogHealthClearances | string | null | undefined,
): DogHealthClearances | undefined {
  if (!value) return undefined;
  const parsed =
    typeof value === "string"
      ? (parseJsonb<DogHealthClearances>(value) ?? emptyHealthClearances())
      : value;
  const health = normalizeHealthClearances(parsed);
  return Object.values(health).some(Boolean) ? health : undefined;
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
    form: normalizeTnrkSeForm(parseJsonb<TnrkSeForm>(row.form)),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
