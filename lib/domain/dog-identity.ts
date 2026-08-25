import type { AdrkClassId } from "./adrk-template";
import type {
  CatalogClassId,
  CatalogEventKind,
} from "./catalog-competition";
import type { DogSex } from "./class-division";
import type { AssignedArmbands, EntryDays } from "./armband-assignment";
import type { ShowWeekend } from "./show-weekend";
import {
  formatHealthClearances,
  healthClearancesHaveValues,
  normalizeHealthClearances,
  type DogHealthClearances,
} from "./health-clearances";
import type { RosterEntryRecord } from "@/lib/types";

export interface DogIdentityFields {
  dog_name: string;
  zb_number: string;
  wt: string;
  date_of_birth?: string;
  owner: string;
  co_owner?: string;
  email: string;
  sex: DogSex;
  sire?: string;
  dam?: string;
  breeder?: string;
  kennel_name?: string;
  address?: string;
  prefix_titles?: string;
  suffix_titles?: string;
  microchip?: string;
  registration_club?: string;
  hd_ed_jlpp?: string;
  health?: DogHealthClearances;
  photo_path?: string;
}

const CATALOG_TO_ADRK: Record<CatalogClassId, AdrkClassId> = {
  "puppy-i": "babyklasse",
  "puppy-ii": "juengstenklasse",
  "puppy-iii": "jugendklasse-i",
  "youth-i": "jugendklasse-i",
  "youth-ii": "jugendklasse-ii",
  open: "offene-klasse",
  champion: "championklasse",
  working: "gebrauchshundklasse",
  veteran: "veteranenklasse",
};

export function adrkClassForCatalog(
  catalogClass: CatalogClassId | "standard-evaluation" | undefined,
  fallback: AdrkClassId = "zwischenklasse",
): AdrkClassId {
  if (!catalogClass || catalogClass === "standard-evaluation") return fallback;
  return CATALOG_TO_ADRK[catalogClass] ?? fallback;
}

export function dogKey(entry: {
  dog_id?: string;
  zb_number?: string;
  microchip?: string;
  id: string;
}): string {
  if (entry.dog_id?.trim()) return entry.dog_id.trim();
  const registration = entry.zb_number?.trim().toLowerCase();
  if (registration) return `reg:${registration}`;
  const chip = entry.microchip?.trim().toLowerCase();
  if (chip) return `chip:${chip}`;
  return `entry:${entry.id}`;
}

export function entriesForDog<T extends { dog_id?: string; id: string; show_id: string }>(
  entries: T[],
  entry: T,
): T[] {
  const key = dogKey(entry);
  return entries.filter(
    (item) => item.show_id === entry.show_id && dogKey(item) === key,
  );
}

export function conformationDaysForDog<
  T extends {
    dog_id?: string;
    id: string;
    show_id: string;
    event_kind?: CatalogEventKind;
    competition_day?: string;
  },
>(
  entries: T[],
  entry: T,
  weekend: ShowWeekend,
): Array<"saturday" | "sunday"> {
  const days = new Set<"saturday" | "sunday">();
  for (const item of entriesForDog(entries, entry)) {
    if (item.event_kind === "se") continue;
    if (item.competition_day === weekend.saturday) days.add("saturday");
    if (item.competition_day === weekend.sunday) days.add("sunday");
  }
  return [...days];
}

export function seConformationAsterisk(
  days: Array<"saturday" | "sunday">,
): string | null {
  if (days.length === 0) return null;
  if (days.includes("saturday") && days.includes("sunday")) {
    return "Also in conformation Saturday and Sunday";
  }
  if (days.includes("saturday")) return "Also in conformation Saturday";
  return "Also in conformation Sunday";
}

export function identityFromEntry(
  entry: DogIdentityFields,
): DogIdentityFields {
  const dateOfBirth = entry.date_of_birth?.trim() || entry.wt;
  const health = normalizeHealthClearances(entry.health);
  return {
    dog_name: entry.dog_name,
    zb_number: entry.zb_number,
    wt: dateOfBirth,
    date_of_birth: dateOfBirth,
    owner: entry.owner,
    co_owner: entry.co_owner ?? "",
    email: entry.email,
    sex: entry.sex,
    sire: entry.sire ?? "",
    dam: entry.dam ?? "",
    breeder: entry.breeder ?? "",
    kennel_name: entry.kennel_name ?? "",
    address: entry.address ?? "",
    prefix_titles: entry.prefix_titles ?? "",
    suffix_titles: entry.suffix_titles ?? "",
    microchip: entry.microchip ?? "",
    registration_club: entry.registration_club ?? "",
    hd_ed_jlpp: healthClearancesHaveValues(health)
      ? formatHealthClearances(health)
      : (entry.hd_ed_jlpp ?? ""),
    health,
    photo_path: entry.photo_path,
  };
}

export function applyIdentity(
  entry: RosterEntryRecord,
  identity: DogIdentityFields,
): RosterEntryRecord {
  const next = identityFromEntry(identity);
  return {
    ...entry,
    ...next,
  };
}

export function syncIdentityToDog(
  entries: RosterEntryRecord[],
  source: RosterEntryRecord,
): RosterEntryRecord[] {
  const identity = identityFromEntry(source);
  const key = dogKey(source);
  return entries.map((entry) =>
    entry.show_id === source.show_id && dogKey(entry) === key
      ? applyIdentity(entry, identity)
      : entry,
  );
}

export function buildDogAppearances(input: {
  dogId: string;
  showId: string;
  identity: DogIdentityFields;
  catalogClass: CatalogClassId;
  classId?: AdrkClassId;
  weekend: ShowWeekend;
  days: EntryDays;
  armbands: AssignedArmbands;
  newId: () => string;
}): RosterEntryRecord[] {
  const identity = identityFromEntry(input.identity);
  const classId =
    input.classId ?? adrkClassForCatalog(input.catalogClass);
  const rows: RosterEntryRecord[] = [];

  const push = (
    eventKind: CatalogEventKind,
    day: string,
    armband: string,
    catalogClass: CatalogClassId | "standard-evaluation",
  ) => {
    rows.push({
      id: input.newId(),
      show_id: input.showId,
      dog_id: input.dogId,
      armband,
      class_id: classId,
      event_kind: eventKind,
      competition_day: day,
      catalog_class: catalogClass,
      ...identity,
    });
  };

  if (input.days.saturday && input.armbands.saturday) {
    push(
      "conformation",
      input.weekend.saturday,
      input.armbands.saturday,
      input.catalogClass,
    );
  }
  if (input.days.sunday && input.armbands.sunday) {
    push(
      "conformation",
      input.weekend.sunday,
      input.armbands.sunday,
      input.catalogClass,
    );
  }
  if (input.days.se && input.armbands.se) {
    push("se", input.weekend.se, input.armbands.se, "standard-evaluation");
  }
  return rows;
}
