import type { AdrkClassId } from "./adrk-template";
import { isValidAdrkClassId } from "./adrk-template";
import { normalizeDogSex, type DogSex } from "./class-division";
import {
  isCatalogClassId,
  type CatalogClassId,
  type CatalogEventKind,
} from "./catalog-competition";

export interface RosterEntry {
  id: string;
  show_id: string;
  armband: string;
  dog_name: string;
  zb_number: string;
  wt: string;
  owner: string;
  sex: DogSex;
  class_id: AdrkClassId;
  event_kind?: CatalogEventKind;
  competition_day?: string;
  catalog_class?: CatalogClassId | "standard-evaluation";
  email: string;
  photo_path?: string;
  sire?: string;
  dam?: string;
  breeder?: string;
  address?: string;
  hd_ed_jlpp?: string;
}

export interface RosterParseResult {
  entries: Omit<RosterEntry, "id" | "show_id">[];
  errors: string[];
}

const REQUIRED_HEADERS = [
  "armband",
  "dog_name",
  "zb_number",
  "wt",
  "owner",
  "sex",
  "class_id",
  "email",
] as const;

const OPTIONAL_HEADERS = [
  "sire",
  "dam",
  "breeder",
  "address",
  "hd_ed_jlpp",
  "event_kind",
  "competition_day",
  "catalog_class",
] as const;

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export function parseRosterCsv(csv: string): RosterParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { entries: [], errors: ["CSV is empty"] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { entries: [], errors: [`Missing headers: ${missing.join(", ")}`] };
  }

  const entries: Omit<RosterEntry, "id" | "show_id">[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    const sex = normalizeDogSex(row.sex);
    if (!sex) {
      errors.push(
        `Row ${i + 1}: sex must be R/H, male/female, or Rüde/Hündin (received "${row.sex}")`,
      );
      continue;
    }

    const eventKind = (row.event_kind ?? "").trim();
    if (eventKind && eventKind !== "se" && eventKind !== "conformation") {
      errors.push(`Row ${i + 1}: event_kind must be se or conformation`);
      continue;
    }
    const competitionDay = (row.competition_day ?? "").trim();
    if (competitionDay && !isIsoCalendarDate(competitionDay)) {
      errors.push(
        `Row ${i + 1}: competition_day must be a valid YYYY-MM-DD date`,
      );
      continue;
    }
    const catalogClass = (row.catalog_class ?? "").trim();
    if (
      catalogClass &&
      catalogClass !== "standard-evaluation" &&
      !isCatalogClassId(catalogClass)
    ) {
      errors.push(`Row ${i + 1}: invalid catalog_class: ${catalogClass}`);
      continue;
    }

    const entry = {
      armband: row.armband,
      dog_name: row.dog_name,
      zb_number: row.zb_number,
      wt: row.wt,
      owner: row.owner,
      sex,
      class_id: row.class_id as AdrkClassId,
      email: row.email,
      ...(eventKind
        ? { event_kind: eventKind as CatalogEventKind }
        : {}),
      ...(competitionDay ? { competition_day: competitionDay } : {}),
      ...(catalogClass
        ? {
            catalog_class: catalogClass as
              | CatalogClassId
              | "standard-evaluation",
          }
        : {}),
      ...(OPTIONAL_HEADERS.reduce(
        (acc, key) => {
          if (
            key === "event_kind" ||
            key === "competition_day" ||
            key === "catalog_class"
          ) {
            return acc;
          }
          const value = (row[key] ?? "").trim();
          if (value) acc[key] = value;
          return acc;
        },
        {} as Partial<
          Pick<RosterEntry, "sire" | "dam" | "breeder" | "address" | "hd_ed_jlpp">
        >,
      )),
    };

    const validation = validateRosterEntry(entry);
    if (!validation.valid) {
      errors.push(`Row ${i + 1}: ${validation.error}`);
      continue;
    }
    entries.push(entry);
  }

  return { entries, errors };
}

export function validateRosterEntry(
  entry: Omit<RosterEntry, "id" | "show_id">,
): { valid: true } | { valid: false; error: string } {
  if (!entry.armband.trim()) return { valid: false, error: "armband required" };
  if (!entry.dog_name.trim()) return { valid: false, error: "dog_name required" };
  if (!entry.owner.trim()) return { valid: false, error: "owner required" };
  if (entry.sex !== "R" && entry.sex !== "H") {
    return { valid: false, error: "sex must be R or H" };
  }
  if (!isValidAdrkClassId(entry.class_id)) {
    return { valid: false, error: `invalid class_id: ${entry.class_id}` };
  }
  if (
    entry.event_kind &&
    entry.event_kind !== "se" &&
    entry.event_kind !== "conformation"
  ) {
    return { valid: false, error: "event_kind must be se or conformation" };
  }
  if (
    entry.competition_day &&
    !isIsoCalendarDate(entry.competition_day)
  ) {
    return {
      valid: false,
      error: "competition_day must be a valid YYYY-MM-DD date",
    };
  }
  if (
    entry.catalog_class &&
    entry.catalog_class !== "standard-evaluation" &&
    !isCatalogClassId(entry.catalog_class)
  ) {
    return {
      valid: false,
      error: `invalid catalog_class: ${entry.catalog_class}`,
    };
  }
  if (entry.email && !entry.email.includes("@")) {
    return { valid: false, error: "invalid email" };
  }
  return { valid: true };
}

/** Validate a full entry record for PUT updates (includes id + show_id). */
export function validateRosterEntryUpdate(
  entry: RosterEntry,
): { valid: true } | { valid: false; error: string } {
  if (!entry.id?.trim()) return { valid: false, error: "id required" };
  if (!entry.show_id?.trim()) return { valid: false, error: "show_id required" };
  return validateRosterEntry(entry);
}

export function rosterCsvTemplate(): string {
  return `${[...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].join(",")}\n101,Rex vom Test,DE-12345,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com,Sire Name,Dam Name,Breeder Name,123 Main St,Hips: Excellent,conformation,2026-09-05,youth-i`;
}

/**
 * Re-importing the same CSV should update existing armbands, not duplicate dogs.
 */
export function mergeImportedEntries<T extends RosterEntry>(
  existing: T[],
  incoming: Omit<T, "id">[],
  newId: () => string,
): {
  entries: T[];
  added: number;
  updated: number;
  changedDivisionEntryIds: string[];
} {
  const next = [...existing];
  let added = 0;
  let updated = 0;
  const changedDivisionEntryIds: string[] = [];
  for (const row of incoming) {
    const idx = next.findIndex(
      (entry) =>
        entry.show_id === row.show_id &&
        entry.armband.trim() === row.armband.trim(),
    );
    if (idx === -1) {
      next.push({ ...row, id: newId() } as T);
      added += 1;
    } else {
      const previous = next[idx];
      if (
        previous.class_id !== row.class_id ||
        previous.sex !== row.sex ||
        previous.event_kind !== row.event_kind ||
        previous.competition_day !== row.competition_day ||
        previous.catalog_class !== row.catalog_class
      ) {
        changedDivisionEntryIds.push(previous.id);
      }
      next[idx] = {
        ...previous,
        ...row,
        id: previous.id,
        photo_path: previous.photo_path,
      };
      updated += 1;
    }
  }
  return { entries: next, added, updated, changedDivisionEntryIds };
}
