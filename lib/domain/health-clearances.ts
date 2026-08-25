export const HEALTH_REGISTRY_OPTIONS = ["OFA", "ADRK", "Other"] as const;

export type HealthRegistry = (typeof HEALTH_REGISTRY_OPTIONS)[number];

export interface DogHealthClearances {
  hd: string;
  ed: string;
  eye: string;
  heart: string;
  registry: HealthRegistry | "";
  registry_status: string;
  jlpp: string;
  nad: string;
}

export function emptyHealthClearances(): DogHealthClearances {
  return {
    hd: "",
    ed: "",
    eye: "",
    heart: "",
    registry: "",
    registry_status: "",
    jlpp: "",
    nad: "",
  };
}

export function normalizeHealthClearances(
  value: Partial<DogHealthClearances> | null | undefined,
): DogHealthClearances {
  const empty = emptyHealthClearances();
  if (!value) return empty;
  const registry = value.registry ?? "";
  return {
    hd: value.hd?.trim() ?? "",
    ed: value.ed?.trim() ?? "",
    eye: value.eye?.trim() ?? "",
    heart: value.heart?.trim() ?? "",
    registry:
      registry === "OFA" || registry === "ADRK" || registry === "Other"
        ? registry
        : "",
    registry_status: value.registry_status?.trim() ?? "",
    jlpp: value.jlpp?.trim() ?? "",
    nad: value.nad?.trim() ?? "",
  };
}

export function healthClearancesHaveValues(
  health: DogHealthClearances,
): boolean {
  return Boolean(
    health.hd ||
      health.ed ||
      health.eye ||
      health.heart ||
      health.registry ||
      health.registry_status ||
      health.jlpp ||
      health.nad,
  );
}

/** Compact line used by the SE form / legacy hd_ed_jlpp column. */
export function formatHealthClearances(
  health: DogHealthClearances,
): string {
  const parts = [
    health.hd ? `HD: ${health.hd}` : null,
    health.ed ? `ED: ${health.ed}` : null,
    health.eye ? `Eye: ${health.eye}` : null,
    health.heart ? `Heart: ${health.heart}` : null,
    health.registry
      ? `${health.registry}${health.registry_status ? ` ${health.registry_status}` : ""}`
      : health.registry_status || null,
    health.jlpp ? `JLPP: ${health.jlpp}` : null,
    health.nad ? `NAD: ${health.nad}` : null,
  ].filter(Boolean);
  return parts.join("; ");
}
