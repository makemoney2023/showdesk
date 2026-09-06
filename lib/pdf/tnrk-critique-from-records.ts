import {
  formwertScaleForEntry,
  tnrkRatingPlacementLabel,
  type AdrkFormwertCode,
} from "@/lib/domain/adrk-template";
import { catalogDivisionLabel } from "@/lib/domain/catalog-competition";
import { critiqueLetterForCertificate } from "@/lib/domain/se-to-critique";
import { seFormFormwert } from "@/lib/domain/tnrk-se-form";
import { resolvePdfJudge } from "@/lib/domain/show-judges";
import type {
  CritiqueRecord,
  PlacementRecord,
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

/** Saved class place, then the draft place if the steward has not saved yet. */
export function critiqueCertificatePlacement(
  entryId: string,
  critique?: Pick<CritiqueRecord, "draft"> | null,
  placements?: Array<Pick<PlacementRecord, "entry_id" | "placement">>,
): 1 | 2 | 3 | 4 | null {
  return (
    placements?.find((row) => row.entry_id === entryId)?.placement ??
    critique?.draft.placement ??
    null
  );
}

/** Klass line: division plus TNRK rating and place, e.g. "Puppy Class I — Females — VP 4". */
export function critiqueClassAndRatingLine(
  entry: Parameters<typeof catalogDivisionLabel>[0] &
    Parameters<typeof formwertScaleForEntry>[0],
  formwert: AdrkFormwertCode | null,
  placement: 1 | 2 | 3 | 4 | null,
): string {
  const rating = tnrkRatingPlacementLabel(
    formwert,
    placement,
    formwertScaleForEntry(entry),
  );
  return [catalogDivisionLabel(entry), rating].filter(Boolean).join(" — ");
}

/** Same TNRK critique certificate as `/api/pdf/tnrk?kind=critique`. */
export async function buildTnrkCritiquePdfForRecords(input: {
  show: Show;
  entry: RosterEntryRecord;
  critique?: CritiqueRecord | null;
  se?: SeEvaluationRecord | null;
  placements?: Array<Pick<PlacementRecord, "entry_id" | "placement">>;
}): Promise<Uint8Array> {
  const { show, entry, critique, se, placements } = input;
  const narrative = critiqueLetterForCertificate(critique);
  const dogName = se?.form.dog_name?.trim() || entry.dog_name;
  const formwert = critique?.draft.formwert ?? seFormFormwert(se?.form) ?? null;
  const placement = critiqueCertificatePlacement(
    entry.id,
    critique,
    placements,
  );

  return buildTnrkCritiquePdf({
    dog_name: dogName,
    dob: se?.form.date_of_birth?.trim() || entry.wt,
    armband: entry.armband,
    narrative,
    class_and_rating: critiqueClassAndRatingLine(entry, formwert, placement),
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
