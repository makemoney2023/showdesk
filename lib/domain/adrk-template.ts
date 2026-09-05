/** ADRK exhibition class templates (Stand 08/2023 research note). English UI labels. */
export const ADRK_CLASSES = [
  { id: "babyklasse", label: "Baby Class", note: "4–6 mo." },
  { id: "juengstenklasse", label: "Puppy Class", note: "6–9 mo." },
  { id: "jugendklasse-i", label: "Youth Class I", note: "9–15 mo." },
  { id: "jugendklasse-ii", label: "Youth Class II", note: "12–18 mo." },
  { id: "zwischenklasse", label: "Intermediate Class", note: "15–24 mo." },
  { id: "offene-klasse", label: "Open Class", note: "from 15 mo." },
  { id: "gebrauchshundklasse", label: "Working Dog Class", note: "from 15 mo." },
  { id: "championklasse", label: "Champion Class", note: "from 15 mo." },
  { id: "veteranenklasse", label: "Veteran Class", note: "from 8 years" },
] as const;

export type AdrkClassId = (typeof ADRK_CLASSES)[number]["id"];

/** Formwert codes on official ADRK Richterbericht (keep official abbreviations). */
export const ADRK_FORMWERT_CODES = [
  "vv",
  "V",
  "vsp",
  "Sg",
  "wv",
  "G",
  "disq.",
  "Ggd",
  "oB",
  "zgz",
  "ne",
] as const;

export type AdrkFormwertCode = (typeof ADRK_FORMWERT_CODES)[number];

/** English glosses for Formwert codes (codes stay official). */
export const ADRK_FORMWERT_LABELS: Record<AdrkFormwertCode, string> = {
  vv: "Excellent plus",
  V: "Excellent",
  vsp: "Excellent (special)",
  Sg: "Very good",
  wv: "Very promising",
  G: "Good",
  "disq.": "Disqualified",
  Ggd: "Sufficient",
  oB: "Without evaluation",
  zgz: "Pulled",
  ne: "Not exhibited",
};

/** Title / Anwartschaft checkboxes on Richterbericht (official abbreviations). */
export const ADRK_TITLE_OPTIONS = [
  "Anw.Dt.Ch.VDH",
  "Res.Anw.Dt.Ch.VDH",
  "Anw.Dt.Jgd.-Ch.VDH",
  "Res.Anw.Dt.Jgd.-Ch.VDH",
  "Anw.Dt.Vet.-Ch.VDH",
  "Res.Anw.Dt.Vet.-Ch.VDH",
  "CAC",
  "Res.CAC",
  "Jgd.-CAC",
  "Res.Jgd.-CAC",
  "BOB",
  "BOS",
  "KS",
  "KJS",
  "ALS",
  "ALJS",
  "VetS",
  "Kombi-S",
  "Sonstige Titel",
] as const;

export type AdrkTitleOption = (typeof ADRK_TITLE_OPTIONS)[number];

export type RulebookTemplate = "adrk" | "usrc" | "rkna" | "other";

export interface DraftCritiqueSchema {
  /** Free-form English narrative — NOT frozen anatomical keys. */
  narrative: string;
  formwert: AdrkFormwertCode | null;
  placement: 1 | 2 | 3 | 4 | null;
  titles: AdrkTitleOption[];
  /** Optional draft assist buckets — not official ADRK form fields. */
  draftAssist?: Record<string, string>;
}

export function createEmptyDraft(): DraftCritiqueSchema {
  return {
    narrative: "",
    formwert: null,
    placement: null,
    titles: [],
    draftAssist: {},
  };
}

export function isValidAdrkClassId(id: string): id is AdrkClassId {
  return ADRK_CLASSES.some((c) => c.id === id);
}

export function isValidFormwert(code: string): code is AdrkFormwertCode {
  return (ADRK_FORMWERT_CODES as readonly string[]).includes(code);
}

export function getAdrkClassLabel(id: AdrkClassId): string {
  const found = ADRK_CLASSES.find((c) => c.id === id);
  return found?.label ?? id;
}

export type FormwertScale = "puppy" | "adult";

const PUPPY_CATALOG_CLASSES = new Set([
  "puppy-i",
  "puppy-ii",
  "puppy-iii",
]);
const PUPPY_ADRK_CLASSES = new Set(["babyklasse", "juengstenklasse"]);

/** Puppy I–III use promising ratings; youth and older use V / SG / G. */
export function formwertScaleForEntry(entry: {
  catalog_class?: string | null;
  class_id?: string | null;
}): FormwertScale {
  if (entry.catalog_class && PUPPY_CATALOG_CLASSES.has(entry.catalog_class)) {
    return "puppy";
  }
  if (entry.class_id && PUPPY_ADRK_CLASSES.has(entry.class_id)) {
    return "puppy";
  }
  return "adult";
}

export const PUPPY_FORMWERT_CODES: AdrkFormwertCode[] = [
  "vv",
  "V",
  "wv",
  "oB",
  "zgz",
  "ne",
  "disq.",
];

export const ADULT_FORMWERT_CODES: AdrkFormwertCode[] = [
  "V",
  "vsp",
  "Sg",
  "G",
  "Ggd",
  "oB",
  "zgz",
  "ne",
  "disq.",
];

export function formwertCodesForScale(
  scale: FormwertScale,
): AdrkFormwertCode[] {
  return scale === "puppy" ? PUPPY_FORMWERT_CODES : ADULT_FORMWERT_CODES;
}

export function formwertSelectCodes(
  scale: FormwertScale,
  current?: AdrkFormwertCode | null,
): AdrkFormwertCode[] {
  const codes = [...formwertCodesForScale(scale)];
  if (current && !codes.includes(current)) codes.unshift(current);
  return codes;
}

export function getAdrkFormwertLabel(
  code: AdrkFormwertCode,
  scale: FormwertScale = "adult",
): string {
  if (scale === "puppy") {
    if (code === "vv") return "Very promising";
    if (code === "V") return "Promising";
    if (code === "wv") return "Little promising";
  }
  return ADRK_FORMWERT_LABELS[code];
}

export function formatAdrkFormwert(
  code: AdrkFormwertCode | null,
  scale: FormwertScale = "adult",
): string {
  if (!code) return "—";
  return `${code} (${getAdrkFormwertLabel(code, scale)})`;
}

/** Compact rating for the critique certificate (code + English gloss). */
export function critiqueCertificateRating(
  code: AdrkFormwertCode | null | undefined,
  scale: FormwertScale = "adult",
): string {
  if (!code || !isValidFormwert(code)) return "";
  return `${code} ${getAdrkFormwertLabel(code, scale)}`;
}

/** Dog name with optional compact rating (legacy helper). */
export function critiqueCertificateNameLine(
  dogName: string,
  code: AdrkFormwertCode | null | undefined,
  scale: FormwertScale = "adult",
): string {
  const name = dogName.trim();
  const rating = critiqueCertificateRating(code, scale);
  if (!name) return rating;
  if (!rating) return name;
  return `${name}  ·  ${rating}`;
}
