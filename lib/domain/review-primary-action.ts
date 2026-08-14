import type { CritiqueStatus } from "./critique-status";

export type ReviewPrimaryKind = "approve" | "processing" | "retry" | "reports";

export function reviewPrimaryAction(status: CritiqueStatus): {
  label: string;
  kind: ReviewPrimaryKind;
  disabled: boolean;
} {
  if (status === "PENDING_REVIEW") {
    return { label: "Approve & release", kind: "approve", disabled: false };
  }
  if (status === "PROCESSING") {
    return { label: "Processing…", kind: "processing", disabled: true };
  }
  if (status === "ERROR") {
    return { label: "Retry processing", kind: "retry", disabled: false };
  }
  return { label: "View in reports", kind: "reports", disabled: false };
}
