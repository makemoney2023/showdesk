/** TNRK Standard Prüfung (SE) — Official Evaluation Form fields (2026 pack page 2). */

export const HEAD_SHAPE_OPTIONS = [
  "too_small",
  "slight_narrow",
  "sufficient_strong",
  "strong_typey",
  "too_large",
] as const;

export const CHEEK_BONE_OPTIONS = [
  "lacking",
  "slight",
  "medium",
  "distinct",
  "too_strong",
] as const;

export const BONE_STRENGTH_OPTIONS = [
  "fine",
  "sufficient",
  "medium",
  "strong",
  "coarse",
] as const;

export const BEHAVIOR_OPTIONS = [
  "fearful_shy",
  "reserved",
  "calm_neutral",
  "self_confident",
  "uncontrollable",
] as const;

export const GUNFIRE_OPTIONS = ["no_reaction", "sensitive", "shy"] as const;

export const BITE_OPTIONS = ["correct_scissor", "other"] as const;

export const FINAL_RESULT_OPTIONS = ["pass", "fail"] as const;

export type HeadShapeOption = (typeof HEAD_SHAPE_OPTIONS)[number];
export type CheekBoneOption = (typeof CHEEK_BONE_OPTIONS)[number];
export type BoneStrengthOption = (typeof BONE_STRENGTH_OPTIONS)[number];
export type BehaviorOption = (typeof BEHAVIOR_OPTIONS)[number];
export type GunfireOption = (typeof GUNFIRE_OPTIONS)[number];
export type BiteOption = (typeof BITE_OPTIONS)[number];
export type FinalResultOption = (typeof FINAL_RESULT_OPTIONS)[number];

export interface TnrkSeMeasurements {
  height: string;
  chest_depth: string;
  weight: string;
  body_length: string;
  chest_circumference: string;
  eye_color: string;
  muzzle_length: string;
  skull: string;
  legible_tattoo: string;
}

export interface TnrkSeForm {
  date: string;
  club: string;
  judge: string;
  dog_name: string;
  sex: "male" | "female" | null;
  registration_number: string;
  date_of_birth: string;
  microchip_nr: string;
  tattoo_nr: string;
  sire: string;
  sire_reg: string;
  dam: string;
  dam_reg: string;
  breeder: string;
  hd_ed_jlpp_nr: string;
  owner_co_owner: string;
  email: string;
  address: string;
  handler: string;
  phone: string;
  measurements: TnrkSeMeasurements;
  bite: BiteOption | null;
  bite_other: string;
  overall_appearance: string;
  head_shape: HeadShapeOption | null;
  cheek_bone: CheekBoneOption | null;
  bone_strength: BoneStrengthOption | null;
  general_behavior: BehaviorOption | null;
  gunfire: GunfireOption | null;
  comments: string;
  final_result: FinalResultOption | null;
  judge_signature: string;
  event_secretary: string;
  signature_date: string;
}

export interface SeEntrySeed {
  dog_name: string;
  armband: string;
  owner: string;
  email: string;
  sex: "R" | "H";
  zb_number: string;
  wt: string;
}

export function createEmptyTnrkSeForm(): TnrkSeForm {
  return {
    date: "",
    club: "True North Rottweiler Klub",
    judge: "",
    dog_name: "",
    sex: null,
    registration_number: "",
    date_of_birth: "",
    microchip_nr: "",
    tattoo_nr: "",
    sire: "",
    sire_reg: "",
    dam: "",
    dam_reg: "",
    breeder: "",
    hd_ed_jlpp_nr: "",
    owner_co_owner: "",
    email: "",
    address: "",
    handler: "",
    phone: "",
    measurements: {
      height: "",
      chest_depth: "",
      weight: "",
      body_length: "",
      chest_circumference: "",
      eye_color: "",
      muzzle_length: "",
      skull: "",
      legible_tattoo: "",
    },
    bite: null,
    bite_other: "",
    overall_appearance: "",
    head_shape: null,
    cheek_bone: null,
    bone_strength: null,
    general_behavior: null,
    gunfire: null,
    comments: "",
    final_result: null,
    judge_signature: "",
    event_secretary: "",
    signature_date: "",
  };
}

export function mergeEntryIntoSeForm(
  form: TnrkSeForm,
  entry: SeEntrySeed,
): TnrkSeForm {
  return {
    ...form,
    dog_name: entry.dog_name || form.dog_name,
    registration_number: entry.zb_number || form.registration_number,
    date_of_birth: entry.wt || form.date_of_birth,
    sex: entry.sex === "R" ? "male" : entry.sex === "H" ? "female" : form.sex,
    owner_co_owner: entry.owner || form.owner_co_owner,
    email: entry.email || form.email,
  };
}

export function validateTnrkSeFormForPass(form: TnrkSeForm): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!form.dog_name.trim()) errors.push("dog_name");
  if (!form.final_result) errors.push("final_result");
  if (!form.judge.trim()) errors.push("judge");
  return { ok: errors.length === 0, errors };
}

const SE_FIELD_LABELS: Record<string, string> = {
  dog_name: "Dog name",
  final_result: "Final result (Pass/Fail)",
  judge: "Judge",
};

/** Human-readable labels for SE completion errors (shown next to Save / Mark complete). */
export function formatSeMissingFields(missing: string[]): string {
  if (missing.length === 0) return "Missing required fields";
  return missing.map((key) => SE_FIELD_LABELS[key] ?? key).join(", ");
}

/** TNRK Critique / Richterbericht header fields (2026 pack page 1). */
export interface TnrkCritiqueForm {
  dog_name: string;
  dob: string;
  armband: string;
  narrative: string;
  class_and_rating: string;
  date: string;
  owner: string;
  co_owner: string;
  judge_signature: string;
}

export function createEmptyTnrkCritiqueForm(): TnrkCritiqueForm {
  return {
    dog_name: "",
    dob: "",
    armband: "",
    narrative: "",
    class_and_rating: "",
    date: "",
    owner: "",
    co_owner: "",
    judge_signature: "",
  };
}
