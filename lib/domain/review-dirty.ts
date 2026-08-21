export function reviewDraftFingerprint(draft: {
  narrative: string;
  formwert: string | null;
}): string {
  return `${draft.narrative}\0${draft.formwert ?? ""}`;
}

export function isReviewDraftDirty(
  saved: { narrative: string; formwert: string | null },
  current: { narrative: string; formwert: string | null },
): boolean {
  return reviewDraftFingerprint(saved) !== reviewDraftFingerprint(current);
}
