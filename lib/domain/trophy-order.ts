import {
  competitionDayLabel,
  competitionPoolKey,
  competitionPoolsWithDogs,
} from "./catalog-competition";
import { dogSexLabel, type DogSex } from "./class-division";
import type { RosterEntryRecord } from "@/lib/types";

export interface TrophyOrderDog {
  armband: string;
  dog_name: string;
  owner: string;
}

export interface TrophyOrderGroup {
  kind: "conformation" | "se";
  day: string;
  dayLabel: string;
  catalogClass: string;
  classLabel: string;
  sex: DogSex | "";
  sexLabel: string;
  count: number;
  dogs: TrophyOrderDog[];
}

function compareArmbands(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function dogsInPool(
  entries: RosterEntryRecord[],
  match: (entry: RosterEntryRecord) => boolean,
): TrophyOrderDog[] {
  return entries
    .filter(match)
    .map((entry) => ({
      armband: entry.armband,
      dog_name: entry.dog_name,
      owner: entry.owner,
    }))
    .toSorted((a, b) => compareArmbands(a.armband, b.armband));
}

/** Conformation classes that place for trophies, plus an SE count sheet. */
export function buildTrophyOrder(
  entries: RosterEntryRecord[],
): TrophyOrderGroup[] {
  const seEntries = entries.filter((entry) => entry.event_kind === "se");
  const seGroups: TrophyOrderGroup[] = [];
  if (seEntries.length > 0) {
    const day = seEntries[0]?.competition_day ?? "";
    const dogs = dogsInPool(seEntries, () => true);
    seGroups.push({
      kind: "se",
      day,
      dayLabel: day ? competitionDayLabel(day) : "Standard Evaluation",
      catalogClass: "standard-evaluation",
      classLabel: "Standard Evaluation (SE)",
      sex: "",
      sexLabel: "",
      count: dogs.length,
      dogs,
    });
  }

  const conformation = competitionPoolsWithDogs(entries).map((pool) => {
    const dogs = dogsInPool(
      entries,
      (entry) => competitionPoolKey(entry) === pool.key,
    );
    return {
      kind: "conformation" as const,
      day: pool.competitionDay,
      dayLabel: pool.dayLabel,
      catalogClass: pool.catalogClass,
      classLabel: pool.label,
      sex: pool.sex,
      sexLabel: dogSexLabel(pool.sex, "short"),
      count: dogs.length,
      dogs,
    };
  });

  return [...seGroups, ...conformation];
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function trophyOrderCsv(groups: TrophyOrderGroup[]): string {
  const header = [
    "kind",
    "day",
    "day_label",
    "class",
    "class_label",
    "sex",
    "sex_label",
    "entry_count",
    "armband",
    "dog_name",
    "owner",
  ];
  const rows = [header.join(",")];
  for (const group of groups) {
    rows.push(
      [
        group.kind,
        group.day,
        group.dayLabel,
        group.catalogClass,
        group.classLabel,
        group.sex,
        group.sexLabel,
        group.count,
        "",
        "",
        "",
      ].map(csvCell).join(","),
    );
    for (const dog of group.dogs) {
      rows.push(
        [
          "dog",
          group.day,
          group.dayLabel,
          group.catalogClass,
          group.classLabel,
          group.sex,
          group.sexLabel,
          "",
          dog.armband,
          dog.dog_name,
          dog.owner,
        ].map(csvCell).join(","),
      );
    }
  }
  return `${rows.join("\n")}\n`;
}

export function trophyOrderPrintHtml(input: {
  showName: string;
  displayDate?: string;
  groups: TrophyOrderGroup[];
}): string {
  const title = [input.showName, "trophy order", input.displayDate]
    .filter(Boolean)
    .join(" — ");
  const sections = input.groups
    .map((group) => {
      const heading = [group.dayLabel, group.classLabel, group.sexLabel]
        .filter(Boolean)
        .join(" · ");
      const rows = group.dogs
        .map(
          (dog) =>
            `<tr><td>#${escapeHtml(dog.armband)}</td><td>${escapeHtml(dog.dog_name)}</td><td>${escapeHtml(dog.owner)}</td></tr>`,
        )
        .join("");
      return `<section>
        <h2>${escapeHtml(heading)} <span>(${group.count})</span></h2>
        <table>
          <thead><tr><th>Armband</th><th>Dog</th><th>Owner</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font: 14px/1.4 system-ui, sans-serif; color: #141210; margin: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    h2 span { font-weight: normal; color: #555; }
    p { color: #555; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; text-align: left; padding: 6px 8px; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Counts by day and class for trophy orders. SE is listed for the weekend sheet; conformation classes place 1–4.</p>
  ${sections || "<p>No dogs in this selection.</p>"}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
