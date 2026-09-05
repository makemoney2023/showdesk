import { catalogDivisionLabel } from "@/lib/domain/catalog-competition";
import {
  critiqueCertificateRating,
  formwertScaleForEntry,
} from "@/lib/domain/adrk-template";
import { critiqueLetterForCertificate } from "@/lib/domain/se-to-critique";
import { seFormFormwert } from "@/lib/domain/tnrk-se-form";
import { resolvePdfJudge } from "@/lib/domain/show-judges";
import type {
  CritiqueRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import { buildTnrkCritiquePdf } from "./tnrk-critique-pdf";

export function seNarrativeFromForm(
  se: SeEvaluationRecord | null | undefined,
): string {
  if (!se) return "";
  return [
    se.form.overall_appearance,
    se.form.comments,
    se.form.final_result
      ? `SE result: ${se.form.final_result.toUpperCase()}`
      : "",
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Same TNRK critique certificate as `/api/pdf/tnrk?kind=critique`. */
export async function buildTnrkCritiquePdfForRecords(input: {
  show: Show;
  entry: RosterEntryRecord;
  critique?: CritiqueRecord | null;
  se?: SeEvaluationRecord | null;
}): Promise<Uint8Array> {
  const { show, entry, critique, se } = input;
  const narrative = critiqueLetterForCertificate(critique);
  const dogName = se?.form.dog_name?.trim() || entry.dog_name;
  const formwert = critique?.draft.formwert ?? seFormFormwert(se?.form) ?? null;
  const scale = formwertScaleForEntry(entry);

  return buildTnrkCritiquePdf({
    dog_name: dogName,
    dob: se?.form.date_of_birth?.trim() || entry.wt,
    armband: entry.armband,
    narrative,
    rating: critiqueCertificateRating(formwert, scale),
    class_and_rating: [catalogDivisionLabel(entry), formwert ?? ""]
      .filter(Boolean)
      .join(" — "),
    date: se?.form.date?.trim() || entry.competition_day || show.date,
    owner: se?.form.owner_co_owner?.trim() || entry.owner,
    co_owner: "",
    judge_signature:
      se?.form.judge_signature?.trim() ||
      resolvePdfJudge({
        critiqueJudge: critique?.judge,
        seJudge: se?.form.judge,
        showJudge: show.judge,
      }),
  });
}
