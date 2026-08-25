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

function firstFilled(
  current: string,
  next: string,
): string {
  return current || next;
}

/** Prefer the first non-empty value for each clearance across appearances. */
export function mergeHealthClearances(
  values: Array<Partial<DogHealthClearances> | null | undefined>,
): DogHealthClearances {
  return values.reduce<DogHealthClearances>((merged, value) => {
    const next = normalizeHealthClearances(value);
    return {
      hd: firstFilled(merged.hd, next.hd),
      ed: firstFilled(merged.ed, next.ed),
      eye: firstFilled(merged.eye, next.eye),
      heart: firstFilled(merged.heart, next.heart),
      registry: (firstFilled(merged.registry, next.registry) ||
        "") as DogHealthClearances["registry"],
      registry_status: firstFilled(merged.registry_status, next.registry_status),
      jlpp: firstFilled(merged.jlpp, next.jlpp),
      nad: firstFilled(merged.nad, next.nad),
    };
  }, emptyHealthClearances());
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

/** SE create requires every clearance field, including registry + status. */
export function seHealthRequirementError(
  health: Partial<DogHealthClearances> | null | undefined,
): string | null {
  const normalized = normalizeHealthClearances(health);
  const missing = [
    !normalized.hd ? "HD" : null,
    !normalized.ed ? "ED" : null,
    !normalized.eye ? "Eye" : null,
    !normalized.heart ? "Heart" : null,
    !normalized.registry ? "registry (OFA, ADRK, or Other)" : null,
    !normalized.registry_status ? "registry status" : null,
    !normalized.jlpp ? "JLPP" : null,
    !normalized.nad ? "NAD" : null,
  ].filter(Boolean);
  if (missing.length === 0) return null;
  return `SE requires ${missing.join(", ")}`;
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

export interface HealthClearanceRow {
  label: string;
  value: string;
}

/** Labeled rows for public results and roster display. Empty fields omitted. */
export function healthClearanceRows(
  health: DogHealthClearances,
): HealthClearanceRow[] {
  const registry = health.registry
    ? `${health.registry}${health.registry_status ? ` ${health.registry_status}` : ""}`
    : health.registry_status;
  return [
    { label: "HD", value: health.hd },
    { label: "ED", value: health.ed },
    { label: "Eye", value: health.eye },
    { label: "Heart", value: health.heart },
    { label: "Registry", value: registry },
    { label: "JLPP", value: health.jlpp },
    { label: "NAD", value: health.nad },
  ].filter((row): row is HealthClearanceRow => Boolean(row.value));
}

/** Compact line used by the SE form / legacy hd_ed_jlpp column. */
export function formatHealthClearances(
  health: DogHealthClearances,
): string {
  return healthClearanceRows(health)
    .map((row) =>
      row.label === "Registry" ? row.value : `${row.label}: ${row.value}`,
    )
    .join("; ");
}
