export interface DogSearchRecord {
  dog_name?: string;
  armband?: string;
  owner?: string;
}

/** Roster / reports / ringside dog finder (armband, name, owner). */
export function dogRecordMatchesSearch(
  query: string,
  entry: DogSearchRecord,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [entry.dog_name, entry.armband, entry.owner].some((value) =>
    value?.toLowerCase().includes(normalized),
  );
}
