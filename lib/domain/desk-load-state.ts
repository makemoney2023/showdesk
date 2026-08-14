export type DeskLoadState =
  | { kind: "loading" }
  | { kind: "unauthorized" }
  | { kind: "no-show" }
  | { kind: "ready"; showId: string };

export function deskLoadState(input: {
  fetchFailed: boolean;
  status?: number;
  activeShowId: string | null;
  loaded: boolean;
}): DeskLoadState {
  if (!input.loaded) return { kind: "loading" };
  if (input.fetchFailed && input.status === 401) return { kind: "unauthorized" };
  if (!input.activeShowId) return { kind: "no-show" };
  return { kind: "ready", showId: input.activeShowId };
}
