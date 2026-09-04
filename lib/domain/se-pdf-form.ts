import { seEvaluationForEntry } from "@/lib/domain/se-to-critique";
import {
  mergeSeFormPreferFilled,
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
  }>;
}): TnrkSeForm {
  const entry = input.entries.find(
    (item) => item.id === input.evaluation?.entry_id,
  );
  const preferred = seEvaluationForEntry(input.evaluations, input.entries, entry);
  return mergeSeFormPreferFilled(
    preferred?.form as TnrkSeForm | undefined,
    mergeSeFormPreferFilled(
      input.evaluation?.form as TnrkSeForm | undefined,
      input.incoming,
    ),
  );
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
