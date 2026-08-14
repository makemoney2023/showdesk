import type { RulebookTemplate } from "./adrk-template";

export interface ShowCreateInput {
  name: string;
  date: string;
  venue: string;
  judge: string;
  rulebook: RulebookTemplate;
}

export function blankShowDraft(): ShowCreateInput {
  return {
    name: "",
    date: new Date().toISOString().slice(0, 10),
    venue: "",
    judge: "",
    rulebook: "adrk",
  };
}

export function validateShowCreate(
  input: ShowCreateInput,
): { valid: true } | { valid: false; error: string } {
  if (!input.name.trim()) return { valid: false, error: "Show name required" };
  if (!input.date.trim()) return { valid: false, error: "Show date required" };
  if (!["adrk", "usrc", "rkna", "other"].includes(input.rulebook)) {
    return { valid: false, error: "Invalid rulebook" };
  }
  return { valid: true };
}
