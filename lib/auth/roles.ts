export const DESK_ROLES = ["secretary", "steward"] as const;

export type DeskRole = (typeof DESK_ROLES)[number];

/** Missing or unknown claims default to secretary so existing accounts keep desk access. */
export function parseDeskRole(value: unknown): DeskRole {
  return value === "steward" ? "steward" : "secretary";
}

export function isSecretaryRole(role: DeskRole): boolean {
  return role === "secretary";
}
