/** Accept only CSV-like uploads for roster import. */
export function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return true;
  // Some browsers omit extension on drag; allow known CSV MIME types only.
  if (name.includes(".")) return false;
  const type = file.type.toLowerCase();
  return type === "text/csv" || type === "text/plain";
}

export async function readCsvFileText(file: File): Promise<string> {
  if (!isCsvFile(file)) {
    throw new Error("Please choose a .csv file");
  }
  const text = await file.text();
  if (!text.trim()) {
    throw new Error("CSV file is empty");
  }
  return text;
}
