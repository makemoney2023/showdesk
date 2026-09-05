import { seEvaluationForEntry } from "@/lib/domain/se-to-critique";
import {
  mergeEntryIntoSeForm,
  mergeSeFormPreferFilled,
  type SeEntrySeed,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";

/** Pick the SE form that should print for this evaluation, including siblings. */
export function resolveSeFormForPdf(input: {
  evaluation?: { entry_id: string; form?: unknown } | null;
  incoming?: TnrkSeForm | null;
  evaluations: Array<{
    entry_id: string;
    form?: unknown;
    status?: string;
    updated_at?: string;
  }>;
  entries: Array<{
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
    dog_name?: string;
    armband?: string;
    owner?: string;
    email?: string;
    sex?: "R" | "H";
    wt?: string;
    sire?: string;
    dam?: string;
    breeder?: string;
    address?: string;
    hd_ed_jlpp?: string;
    date_of_birth?: string;
    co_owner?: string;
    kennel_name?: string;
  }>;
}): TnrkSeForm {
  const entry = input.entries.find(
    (item) => item.id === input.evaluation?.entry_id,
  );
  const preferred = seEvaluationForEntry(input.evaluations, input.entries, entry);
  const merged = mergeSeFormPreferFilled(
    preferred?.form as TnrkSeForm | undefined,
    mergeSeFormPreferFilled(
      input.evaluation?.form as TnrkSeForm | undefined,
      input.incoming,
    ),
  );
  if (!entry) return merged;
  const seed: SeEntrySeed = {
    dog_name: entry.dog_name ?? "",
    armband: entry.armband ?? "",
    owner: entry.owner ?? "",
    email: entry.email ?? "",
    sex: entry.sex === "H" ? "H" : "R",
    zb_number: entry.zb_number ?? "",
    wt: entry.wt ?? "",
    sire: entry.sire,
    dam: entry.dam,
    breeder: entry.breeder,
    address: entry.address,
    hd_ed_jlpp: entry.hd_ed_jlpp,
    date_of_birth: entry.date_of_birth,
    microchip: entry.microchip,
    co_owner: entry.co_owner,
    kennel_name: entry.kennel_name,
  };
  return mergeEntryIntoSeForm(merged, seed);
}

export function resolveSeEvaluationForPdf<
  TEvaluation extends {
    entry_id: string;
    form?: unknown;
    status?: string;
    updated_at?: string;
  },
  TEntry extends {
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
  },
>(
  evaluations: TEvaluation[],
  entries: TEntry[],
  entry: TEntry | undefined,
): TEvaluation | undefined {
  return seEvaluationForEntry(evaluations, entries, entry);
}
