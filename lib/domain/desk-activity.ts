import {
  labelCritiqueStatus,
  type CritiqueUiStatus,
} from "./status-labels";

export type DeskActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export function recentDeskActivity(
  critiques: {
    id: string;
    entry_id: string;
    status: CritiqueUiStatus;
    updated_at: string;
  }[],
  entries: { id: string; dog_name: string; armband: string }[],
  limit = 5,
): DeskActivityItem[] {
  return [...critiques]
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, Math.max(0, limit))
    .map((critique) => {
      const entry = entries.find((item) => item.id === critique.entry_id);
      return {
        id: critique.id,
        title: entry
          ? `#${entry.armband} ${entry.dog_name}`
          : "Unknown dog",
        subtitle: labelCritiqueStatus(critique.status),
        href: "/admin/review",
      };
    });
}
