import type { AdrkClassId } from "./adrk-template";
import { isValidAdrkClassId } from "./adrk-template";

export interface RosterEntry {
  id: string;
  show_id: string;
  armband: string;
  dog_name: string;
  zb_number: string;
  wt: string;
  owner: string;
  sex: "R" | "H";
  class_id: AdrkClassId;
  email: string;
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

    const entry = {
      armband: row.armband,
      dog_name: row.dog_name,
      zb_number: row.zb_number,
      wt: row.wt,
      owner: row.owner,
      sex: row.sex.toUpperCase() === "H" ? ("H" as const) : ("R" as const),
      class_id: row.class_id as AdrkClassId,
      email: row.email,
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
  return `${REQUIRED_HEADERS.join(",")}\n101,Rex vom Test,DE-12345,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com`;
}
