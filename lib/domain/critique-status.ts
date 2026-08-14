export const CRITIQUE_STATUSES = [
  "PROCESSING",
  "PENDING_REVIEW",
  "APPROVED",
  "ERROR",
] as const;

export type CritiqueStatus = (typeof CRITIQUE_STATUSES)[number];

const TRANSITIONS: Record<CritiqueStatus, CritiqueStatus[]> = {
  PROCESSING: ["PENDING_REVIEW", "ERROR"],
  PENDING_REVIEW: ["PROCESSING", "APPROVED", "ERROR"],
  APPROVED: [],
  ERROR: ["PROCESSING"],
};

export function canTransition(
  from: CritiqueStatus,
  to: CritiqueStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canRelease(status: CritiqueStatus): boolean {
  return status === "APPROVED";
}

export function isReviewable(status: CritiqueStatus): boolean {
  return status === "PENDING_REVIEW";
}

export function assertTransition(
  from: CritiqueStatus,
  to: CritiqueStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid critique status transition: ${from} → ${to}`);
  }
}
