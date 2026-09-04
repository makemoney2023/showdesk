/** Stable, per-dog control ids so SE forms do not share browser autofill state. */

export function seFieldSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function seFieldId(entryId: string, label: string): string {
  return `se-${entryId}-field-${seFieldSlug(label)}`;
}

export function seRadioName(entryId: string, group: string): string {
  return `se-${entryId}-${seFieldSlug(group)}`;
}
