import {
  ADRK_CLASSES,
  getAdrkClassLabel,
  type AdrkClassId,
} from "./adrk-template";

export const DOG_SEXES = ["R", "H"] as const;
export type DogSex = (typeof DOG_SEXES)[number];
export type DivisionKey = `${AdrkClassId}:${DogSex}`;
export type DivisionFilter = "all" | DivisionKey;

export interface ClassDivision {
  class_id: AdrkClassId;
  sex: DogSex;
}

const SEX_LABELS: Record<DogSex, { short: string; full: string }> = {
  R: { short: "Male", full: "Male (Rüde)" },
  H: { short: "Female", full: "Female (Hündin)" },
};

const MALE_ALIASES = new Set(["R", "RÜDE", "RUEDE", "MALE", "M"]);
const FEMALE_ALIASES = new Set([
  "H",
  "HÜNDIN",
  "HUENDIN",
  "FEMALE",
  "F",
]);

export function normalizeDogSex(value: unknown): DogSex | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleUpperCase("de-DE");
  if (MALE_ALIASES.has(normalized)) return "R";
  if (FEMALE_ALIASES.has(normalized)) return "H";
  return null;
}

export function dogSexLabel(
  sex: DogSex,
  style: "short" | "full" = "full",
): string {
  return SEX_LABELS[sex][style];
}

export function divisionKey(
  input: Pick<ClassDivision, "class_id" | "sex">,
): DivisionKey {
  return `${input.class_id}:${input.sex}`;
}

export function parseDivisionKey(value: string): ClassDivision | null {
  const [classId, sex, extra] = value.split(":");
  if (extra || !classId || !sex) return null;
  const validClass = ADRK_CLASSES.some((item) => item.id === classId);
  const validSex = DOG_SEXES.includes(sex as DogSex);
  if (!validClass || !validSex) return null;
  return { class_id: classId as AdrkClassId, sex: sex as DogSex };
}

export function divisionLabel(
  input: Pick<ClassDivision, "class_id" | "sex">,
  style: "short" | "full" = "full",
): string {
  return `${getAdrkClassLabel(input.class_id)} — ${dogSexLabel(input.sex, style)}`;
}

export function divisionsWithDogs(
  entries: Array<Pick<ClassDivision, "class_id" | "sex">>,
): Array<ClassDivision & { key: DivisionKey; count: number }> {
  const counts = new Map<DivisionKey, number>();
  for (const entry of entries) {
    const key = divisionKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return ADRK_CLASSES.flatMap((item) =>
    DOG_SEXES.flatMap((sex) => {
      const key = divisionKey({ class_id: item.id, sex });
      const count = counts.get(key) ?? 0;
      return count > 0 ? [{ class_id: item.id, sex, key, count }] : [];
    }),
  );
}

export function entryMatchesDivision(
  entry: Pick<ClassDivision, "class_id" | "sex">,
  filter: string,
): boolean {
  if (filter === "all") return true;
  return divisionKey(entry) === filter;
}

export function classDivisionIndex(
  entry: Pick<ClassDivision, "class_id" | "sex">,
): number {
  const classIndex = ADRK_CLASSES.findIndex(
    (item) => item.id === entry.class_id,
  );
  const safeClassIndex = classIndex < 0 ? ADRK_CLASSES.length : classIndex;
  const sexIndex = DOG_SEXES.indexOf(entry.sex);
  return safeClassIndex * DOG_SEXES.length + Math.max(0, sexIndex);
}

export function nextDogInDivision<
  T extends Pick<ClassDivision, "class_id" | "sex"> & {
    id: string;
    armband: string;
  },
>(entries: T[], currentId: string): string | null {
  const current = entries.find((entry) => entry.id === currentId);
  if (!current) return null;
  const ordered = entries
    .filter(
      (entry) =>
        entry.class_id === current.class_id && entry.sex === current.sex,
    )
    .toSorted((a, b) =>
      a.armband.localeCompare(b.armband, undefined, { numeric: true }),
    );
  const index = ordered.findIndex((entry) => entry.id === currentId);
  return index < 0 ? null : (ordered[index + 1]?.id ?? null);
}
