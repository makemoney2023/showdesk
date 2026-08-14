/** ADRK exhibition class templates (Stand 08/2023 research note). */
export const ADRK_CLASSES = [
  { id: "babyklasse", label: "Babyklasse", note: "4–6 Mon." },
  { id: "juengstenklasse", label: "Jüngstenklasse", note: "6–9 Mon." },
  { id: "jugendklasse-i", label: "Jugendklasse I", note: "9–15 Mon." },
  { id: "jugendklasse-ii", label: "Jugendklasse II", note: "12–18 Mon." },
  { id: "zwischenklasse", label: "Zwischenklasse", note: "15–24 Mon." },
  { id: "offene-klasse", label: "Offene Klasse", note: "ab 15 Mon." },
  { id: "gebrauchshundklasse", label: "Gebrauchshundklasse", note: "ab 15 Mon." },
  { id: "championklasse", label: "Championklasse", note: "ab 15 Mon." },
  { id: "veteranenklasse", label: "Veteranenklasse", note: "ab 8 Jahre" },
] as const;

export type AdrkClassId = (typeof ADRK_CLASSES)[number]["id"];

/** Formwert codes on official ADRK Richterbericht. */
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

/** Title / Anwartschaft checkboxes on Richterbericht. */
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
  /** Free-form German narrative — NOT frozen anatomical keys. */
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
