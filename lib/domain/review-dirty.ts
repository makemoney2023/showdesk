import { critiqueLetterWithoutSeSection } from "./se-to-critique";
import { normalizeShowAwards } from "./show-awards";

export function reviewDraftFingerprint(draft: {
  narrative: string;
  formwert: string | null;
  placement?: 1 | 2 | 3 | 4 | null;
  awards?: Iterable<string | null | undefined> | null;
}): string {
  const awards = normalizeShowAwards(draft.awards).join(",");
  return `${critiqueLetterWithoutSeSection(draft.narrative)}\0${draft.formwert ?? ""}\0${draft.placement ?? ""}\0${awards}`;
}

export function isReviewDraftDirty(
  saved: {
    narrative: string;
    formwert: string | null;
    placement?: 1 | 2 | 3 | 4 | null;
    awards?: Iterable<string | null | undefined> | null;
  },
  current: {
    narrative: string;
    formwert: string | null;
    placement?: 1 | 2 | 3 | 4 | null;
    awards?: Iterable<string | null | undefined> | null;
  },
): boolean {
  return reviewDraftFingerprint(saved) !== reviewDraftFingerprint(current);
}
