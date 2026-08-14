import type { CritiqueStatus } from "./critique-status";

export type CritiqueUiStatus = CritiqueStatus | "none";
export type ChipTone = "muted" | "warning" | "pending" | "success" | "error";

const CRITIQUE_LABELS: Record<CritiqueUiStatus, string> = {
  none: "Not started",
  PROCESSING: "Processing",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  ERROR: "Needs attention",
};

const CRITIQUE_TONES: Record<CritiqueUiStatus, ChipTone> = {
  none: "muted",
  PROCESSING: "warning",
  PENDING_REVIEW: "pending",
  APPROVED: "success",
  ERROR: "error",
};

export function labelCritiqueStatus(status: CritiqueUiStatus): string {
  return CRITIQUE_LABELS[status];
}

export function labelSeStatus(status: "draft" | "complete"): string {
  return status === "complete" ? "SE complete" : "Draft";
}

export function labelOffline(online: boolean): string {
  return online ? "Online" : "Offline";
}

const DELIVERY_LABELS: Record<
  "pending" | "sent" | "failed" | "blocked",
  string
> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
  blocked: "Held",
};

export function labelDeliveryStatus(
  status: "pending" | "sent" | "failed" | "blocked",
): string {
  return DELIVERY_LABELS[status];
}

export function critiqueChipTone(status: CritiqueUiStatus): ChipTone {
  return CRITIQUE_TONES[status];
}
