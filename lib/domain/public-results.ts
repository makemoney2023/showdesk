import {
  ADRK_FORMWERT_LABELS,
  formatAdrkFormwert,
  getAdrkClassLabel,
  type AdrkClassId,
  type AdrkFormwertCode,
  type AdrkTitleOption,
} from "./adrk-template";
import { dogSexLabel, type DogSex } from "./class-division";
import { publicDogPhotoHref } from "./dog-photo";
import { approvedCritiqueForEntry } from "./entry-cascade";
import {
  canPublishSePdf,
  publicAwardPdfHref,
  publicCritiquePdfHref,
  publicSePdfHref,
} from "./public-pdf";
import { resolveSeEvaluationForPdf } from "./se-pdf-form";
import { formatDisplayDate } from "./show-day";
import type {
  AppStore,
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import {
  publicDogDocumentHref,
  type DogDocumentRecord,
} from "./dog-document";
import { dogKey, entriesForDog, photoSourceForDog } from "./dog-identity";
import {
  healthClearanceRows,
  mergeHealthClearances,
  type HealthClearanceRow,
} from "./health-clearances";
import { critiqueLetterForCertificate } from "./se-to-critique";

/** Public URL slug: lowercase, hyphenated, no leading/trailing hyphens. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function showResultsSlug(show: Pick<Show, "name" | "date">): string {
  const name = slugify(show.name) || "sieger-show";
  return `${name}-${show.date}`;
}

export function dogResultsSlug(
  entry: Pick<RosterEntryRecord, "armband" | "dog_name">,
): string {
  const dog = slugify(entry.dog_name) || "entry";
  return `${slugify(entry.armband) || "0"}-${dog}`;
}

export function showResultsPath(show: Pick<Show, "name" | "date">): string {
  return `/results/${showResultsSlug(show)}`;
}

export function dogResultsPath(
  show: Pick<Show, "name" | "date">,
  entry: Pick<RosterEntryRecord, "armband" | "dog_name">,
): string {
  return `${showResultsPath(show)}/${dogResultsSlug(entry)}`;
}

export function isShowResultsPublished(
  show: Pick<Show, "results_published_at">,
): boolean {
  return Boolean(show.results_published_at?.trim());
}

export interface PublicDogResult {
  slug: string;
  entryId: string;
  showId: string;
  armband: string;
  dogName: string;
  owner: string | null;
  sire: string | null;
  dam: string | null;
  breeder: string | null;
  zbNumber: string | null;
  dateOfBirth: string | null;
  classId: AdrkClassId;
  classLabel: string;
  sex: DogSex;
  sexLabel: string;
  formwert: AdrkFormwertCode | null;
  formwertLabel: string | null;
  placement: 1 | 2 | 3 | 4 | null;
  ratingPlacement: string | null;
  titles: AdrkTitleOption[];
  narrative: string | null;
  judge: string | null;
  photoPath: string | null;
  photoHref: string | null;
  documents: Array<{
    id: string;
    filename: string;
    href: string;
    contentType: string;
    label?: string;
    kind?: "critique" | "se" | "award" | "attachment";
  }>;
  health: HealthClearanceRow[];
  href: string;
}

export interface PublicDivisionResults {
  key: string;
  classId: AdrkClassId;
  classLabel: string;
  sex: DogSex;
  sexLabel: string;
  dogs: PublicDogResult[];
}

export interface PublicShowSummary {
  id: string;
  slug: string;
  name: string;
  date: string;
  displayDate: string;
  venue: string;
  judges: string[];
  href: string;
  publishedAt: string;
  dogCount: number;
  placedCount: number;
}

export interface PublicShowResults extends PublicShowSummary {
  definition: string;
  divisions: PublicDivisionResults[];
}

function optionalPublicText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function placementForEntry(
  placements: PlacementRecord[],
  entryId: string,
): PlacementRecord | null {
  return placements.find((placement) => placement.entry_id === entryId) ?? null;
}

export function ratingPlacementLabel(
  formwert: AdrkFormwertCode | null,
  placement: 1 | 2 | 3 | 4 | null,
): string | null {
  if (!formwert && !placement) return null;
  if (formwert && placement) return `${formwert}${placement}`;
  if (formwert) return formwert;
  return `Place ${placement}`;
}

function documentsForEntry(
  documents: DogDocumentRecord[],
  entry: RosterEntryRecord,
  entries: RosterEntryRecord[],
): PublicDogResult["documents"] {
  const keys = new Set<string>();
  for (const sibling of entriesForDog(entries, entry)) {
    if (sibling.dog_id?.trim()) keys.add(sibling.dog_id.trim());
    keys.add(dogKey(sibling));
    keys.add(sibling.id);
  }
  if (keys.size === 0) return [];
  return documents
    .filter(
      (document) =>
        document.show_id === entry.show_id && keys.has(document.dog_id),
    )
    .map((document) => ({
      id: document.id,
      filename: document.filename,
      href: publicDogDocumentHref(entry.show_id, document.id),
      contentType: document.content_type,
      label: document.filename,
      kind: "attachment" as const,
    }));
}

function officialDocumentsForEntry(
  show: Show,
  entry: RosterEntryRecord,
  critique: CritiqueRecord | null,
  placement: PlacementRecord | null,
  evaluations: SeEvaluationRecord[],
  entries: RosterEntryRecord[],
): PublicDogResult["documents"] {
  const docs: PublicDogResult["documents"] = [];
  if (critique) {
    docs.push({
      id: `pdf-critique-${critique.id}`,
      filename: `critique-${entry.armband}.pdf`,
      href: publicCritiquePdfHref(show.id, critique.id),
      contentType: "application/pdf",
      label: "Critique certificate",
      kind: "critique",
    });
  }
  const se = resolveSeEvaluationForPdf(evaluations, entries, entry);
  if (se && canPublishSePdf(se)) {
    docs.push({
      id: `pdf-se-${se.id}`,
      filename: `se-${entry.armband}.pdf`,
      href: publicSePdfHref(show.id, se.id),
      contentType: "application/pdf",
      label: "Standard Evaluation",
      kind: "se",
    });
  }
  if (placement) {
    docs.push({
      id: `pdf-award-${entry.id}`,
      filename: `award-${entry.armband}.pdf`,
      href: publicAwardPdfHref(show.id, entry.id),
      contentType: "application/pdf",
      label: "Award certificate",
      kind: "award",
    });
  }
  return docs;
}

function healthForEntry(
  entries: RosterEntryRecord[],
  entry: RosterEntryRecord,
): PublicDogResult["health"] {
  const siblings = entriesForDog(entries, entry);
  const merged = mergeHealthClearances(
    siblings.map((sibling) => sibling.health),
  );
  const rows = healthClearanceRows(merged);
  if (rows.length > 0) return rows;

  const legacy = siblings
    .map((sibling) => sibling.hd_ed_jlpp?.trim())
    .find(Boolean);
  return legacy ? [{ label: "Clearances", value: legacy }] : [];
}

function toPublicDog(
  show: Show,
  entry: RosterEntryRecord,
  critique: CritiqueRecord | null,
  placement: PlacementRecord | null,
  documents: DogDocumentRecord[],
  entries: RosterEntryRecord[],
  evaluations: SeEvaluationRecord[],
): PublicDogResult | null {
  const formwert = critique?.draft.formwert ?? null;
  const rank = placement?.placement ?? critique?.draft.placement ?? null;
  const narrative = critiqueLetterForCertificate(critique) || null;
  const hasResult = Boolean(formwert || rank || narrative || critique);
  if (!hasResult) return null;

  const photoSource = photoSourceForDog(entries, entry);
  const photoPath = optionalPublicText(photoSource?.photo_path);

  return {
    slug: dogResultsSlug(entry),
    entryId: entry.id,
    showId: show.id,
    armband: entry.armband,
    dogName: entry.dog_name,
    owner: optionalPublicText(entry.owner),
    sire: optionalPublicText(entry.sire),
    dam: optionalPublicText(entry.dam),
    breeder: optionalPublicText(entry.breeder),
    zbNumber: optionalPublicText(entry.zb_number),
    dateOfBirth: optionalPublicText(entry.wt),
    classId: entry.class_id,
    classLabel: getAdrkClassLabel(entry.class_id),
    sex: entry.sex,
    sexLabel: dogSexLabel(entry.sex, "full"),
    formwert,
    formwertLabel: formwert ? ADRK_FORMWERT_LABELS[formwert] : null,
    placement: rank,
    ratingPlacement: ratingPlacementLabel(formwert, rank),
    titles: critique?.draft.titles ?? [],
    narrative,
    judge: optionalPublicText(critique?.judge) ?? optionalPublicText(show.judge),
    photoPath,
    photoHref: photoPath && photoSource
      ? publicDogPhotoHref(show.id, photoSource.id, { cacheBust: photoPath })
      : null,
    documents: [
      ...officialDocumentsForEntry(
        show,
        entry,
        critique,
        placement,
        evaluations,
        entries,
      ),
      ...documentsForEntry(documents, entry, entries),
    ],
    health: healthForEntry(entries, entry),
    href: dogResultsPath(show, entry),
  };
}

function compareDogs(a: PublicDogResult, b: PublicDogResult): number {
  const aPlace = a.placement ?? 99;
  const bPlace = b.placement ?? 99;
  if (aPlace !== bPlace) return aPlace - bPlace;
  return a.armband.localeCompare(b.armband, undefined, { numeric: true });
}

function showJudges(show: Show): string[] {
  const names = (show.judges?.length ? show.judges : [show.judge])
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set(names)];
}

function projectShow(store: AppStore, show: Show): PublicShowResults | null {
  if (!isShowResultsPublished(show)) return null;

  const entries = store.entries.filter((entry) => entry.show_id === show.id);
  const critiques = store.critiques.filter(
    (critique) => critique.show_id === show.id,
  );
  const placements = store.placements.filter(
    (placement) => placement.show_id === show.id,
  );

  const evaluations = (store.se_evaluations ?? []).filter(
    (evaluation) => evaluation.show_id === show.id,
  );

  const dogs = entries
    .map((entry) =>
      toPublicDog(
        show,
        entry,
        approvedCritiqueForEntry(critiques, entry.id, show.id) ?? null,
        placementForEntry(placements, entry.id),
        store.dog_documents ?? [],
        entries,
        evaluations,
      ),
    )
    .filter((dog): dog is PublicDogResult => Boolean(dog));

  const divisionMap = new Map<string, PublicDivisionResults>();
  for (const dog of dogs) {
    const key = `${dog.classId}:${dog.sex}`;
    const existing = divisionMap.get(key);
    if (existing) {
      existing.dogs.push(dog);
      continue;
    }
    divisionMap.set(key, {
      key,
      classId: dog.classId,
      classLabel: dog.classLabel,
      sex: dog.sex,
      sexLabel: dog.sexLabel,
      dogs: [dog],
    });
  }

  const divisions = [...divisionMap.values()]
    .map((division) => ({
      ...division,
      dogs: division.dogs.toSorted(compareDogs),
    }))
    .toSorted((a, b) => {
      if (a.classLabel !== b.classLabel) {
        return a.classLabel.localeCompare(b.classLabel);
      }
      return a.sex.localeCompare(b.sex);
    });

  return {
    id: show.id,
    slug: showResultsSlug(show),
    name: show.name,
    date: show.date,
    displayDate: formatDisplayDate(show.date),
    venue: show.venue,
    judges: showJudges(show),
    href: showResultsPath(show),
    publishedAt: show.results_published_at!,
    dogCount: dogs.length,
    placedCount: dogs.filter((dog) => dog.placement != null).length,
    definition: publicShowDefinition(show),
    divisions,
  };
}

export function publicShowDefinition(show: Pick<Show, "name" | "date" | "venue">): string {
  return `${show.name} is a German-style (Sieger) breed show held ${formatDisplayDate(show.date)}${show.venue ? ` at ${show.venue}` : ""}. Official results include each dog's Formwert rating, class placement 1–4, and the judge's written critique (Richterbericht).`;
}

export function listPublishedShows(store: AppStore): PublicShowSummary[] {
  return store.shows
    .map((show) => projectShow(store, show))
    .filter((show): show is PublicShowResults => Boolean(show))
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .map(({ definition: _definition, divisions: _divisions, ...summary }) => summary);
}

export function getPublishedShow(
  store: AppStore,
  slug: string,
): PublicShowResults | null {
  return (
    store.shows
      .map((show) => projectShow(store, show))
      .find((show) => show?.slug === slug) ?? null
  );
}

export function getPublishedDog(
  store: AppStore,
  showSlug: string,
  dogSlug: string,
): { show: PublicShowResults; dog: PublicDogResult } | null {
  const show = getPublishedShow(store, showSlug);
  if (!show) return null;
  const dog = show.divisions
    .flatMap((division) => division.dogs)
    .find((item) => item.slug === dogSlug);
  if (!dog) return null;
  return { show, dog };
}

export function publicShowPaths(store: AppStore): string[] {
  return listPublishedShows(store).map((show) => show.href);
}

export function publicDogPaths(store: AppStore): string[] {
  return store.shows.flatMap((show) => {
    const published = projectShow(store, show);
    if (!published) return [];
    return published.divisions.flatMap((division) =>
      division.dogs.map((dog) => dog.href),
    );
  });
}

/** Facebook / clipboard post for a whole show. */
export function facebookShowPost(show: PublicShowResults, origin: string): string {
  const lines = [
    `${show.name} — official Sieger show results`,
    show.displayDate + (show.venue ? ` · ${show.venue}` : ""),
    "",
  ];
  for (const division of show.divisions) {
    const placed = division.dogs.filter((dog) => dog.placement != null);
    if (placed.length === 0) continue;
    lines.push(`${division.classLabel} — ${dogSexLabel(division.sex, "short")}`);
    for (const dog of placed) {
      lines.push(
        `${dog.ratingPlacement ?? `Place ${dog.placement}`}  ${dog.dogName}`,
      );
    }
    lines.push("");
  }
  lines.push(`Full results and critiques: ${origin}${show.href}`);
  lines.push("");
  lines.push("Results by Show Desk");
  return lines.join("\n");
}

/** Facebook / clipboard post for one dog. */
export function facebookDogPost(
  show: PublicShowSummary,
  dog: PublicDogResult,
  origin: string,
): string {
  const rating = dog.ratingPlacement ?? formatAdrkFormwert(dog.formwert);
  return [
    `${dog.dogName} — ${rating} · ${dog.classLabel}`,
    `${show.name} · ${show.displayDate}`,
    dog.narrative ? `\n${dog.narrative}\n` : "",
    `Critique: ${origin}${dog.href}`,
    "",
    "Results by Show Desk",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
}

export function dogResultHeadline(
  dog: PublicDogResult,
  show: Pick<PublicShowSummary, "name">,
): string {
  const rating = dog.ratingPlacement ?? dog.formwert ?? "Result";
  return `${dog.dogName} ${rating} — ${show.name} results`;
}

export function dogResultDescription(dog: PublicDogResult): string {
  const rating = dog.ratingPlacement ?? dog.formwertLabel ?? dog.formwert;
  const detail = [
    dog.formwertLabel,
    dog.placement != null ? `place ${dog.placement}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const bits = [
    rating
      ? `${dog.dogName} earned ${rating}${detail ? ` (${detail})` : ""}`
      : `${dog.dogName} was judged`,
    `in ${dog.classLabel} — ${dog.sexLabel}`,
    dog.judge ? `under ${dog.judge}` : null,
  ].filter(Boolean);
  const excerpt = critiqueExcerpt(dog.narrative, 180);
  const lead = `${bits.join(" ")}. The letter is the Formwert rating; the number is the class placement — they are separate.`;
  return excerpt ? `${lead} ${excerpt}` : lead;
}

/** Share-card / meta excerpt of the judge's critique. */
export function critiqueExcerpt(
  narrative: string | null | undefined,
  maxChars = 280,
): string | null {
  const text = narrative?.trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const clipped = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
  return `${clipped}…`;
}
