import type { RulebookTemplate } from "./adrk-template";
import { syncShowJudges } from "./show-judges";

export interface ShowCreateInput {
  name: string;
  date: string;
  venue: string;
  judge: string;
  judges: string[];
  rulebook: RulebookTemplate;
}

export function blankShowDraft(): ShowCreateInput {
  return {
    name: "",
    date: new Date().toISOString().slice(0, 10),
    venue: "",
    judge: "",
    judges: [""],
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
  if (syncShowJudges(input).judges.length === 0) {
    return { valid: false, error: "Add at least one judge." };
  }
  return { valid: true };
}
