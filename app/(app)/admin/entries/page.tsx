"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADRK_CLASSES } from "@/lib/domain/adrk-template";
import { formatDisplayDate } from "@/lib/domain/show-day";
import {
  divisionLabel,
  divisionsWithDogs,
} from "@/lib/domain/class-division";
import {
  CATALOG_CLASSES,
  catalogMetadataError,
  type CatalogClassId,
  type CatalogEventKind,
} from "@/lib/domain/catalog-competition";
import {
  entriesForRosterTab,
  rosterEmptyMessage,
  sanitizeRosterDivisionFilter,
  seRosterNote,
  visibleRosterEntries,
  type RosterSort,
  type RosterTab,
} from "@/lib/domain/roster-view";
import { DivisionFilterChips } from "@/components/desk/DivisionFilterChips";
import { showWeekendDays } from "@/lib/domain/show-weekend";
import { classEligibilityWarning } from "@/lib/domain/class-eligibility";
import {
  emptyHealthClearances,
  HEALTH_REGISTRY_OPTIONS,
} from "@/lib/domain/health-clearances";
import { CsvImportDialog } from "@/components/roster/CsvImportDialog";
import {
  DogDocumentsField,
  fileToBase64,
} from "@/components/roster/DogDocumentsField";
import { TrophyOrderActions } from "@/components/roster/TrophyOrderActions";
import type { RulebookTemplate } from "@/lib/domain/adrk-template";
import {
  createEntryRequirementError,
  validateRosterEntry,
} from "@/lib/domain/roster";
import {
  formatTitlesLine,
  splitRegisteredName,
} from "@/lib/domain/registered-name";
import { blankRosterEntryDraft } from "@/lib/domain/roster-draft";
import { blankShowDraft, validateShowCreate } from "@/lib/domain/show-draft";
import type { ShowCreateInput } from "@/lib/domain/show-draft";
import { DogPhotoField } from "@/components/roster/DogPhotoField";
import { Checkbox } from "@/components/ui/checkbox";
import { dogPhotoHrefForEntry } from "@/lib/domain/dog-photo";
import { photoSourceForDog } from "@/lib/domain/dog-identity";
import { JudgeListFields } from "@/components/show/JudgeListFields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { pushToast } from "@/components/feedback/toast";
import { DogAvatar } from "@/components/desk/DogAvatar";
import { DogSearchField } from "@/components/desk/DogSearchField";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { RosterEntryRecord, Show } from "@/lib/types";

type EntryFormMode = "create" | "edit";

export default function AdminEntriesPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [sort, setSort] = useState<RosterSort>("class");
  const [rosterTab, setRosterTab] = useState<RosterTab>("all");
  const [entryDays, setEntryDays] = useState({
    se: false,
    saturday: true,
    sunday: false,
  });
  const [armbandMode, setArmbandMode] = useState<"sequential" | "random">(
    "sequential",
  );
  const [entryFormMode, setEntryFormMode] = useState<EntryFormMode | null>(null);
  const [entryDraft, setEntryDraft] = useState<RosterEntryRecord | null>(null);
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [showDraft, setShowDraft] = useState<ShowCreateInput>(() => blankShowDraft());
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setMessage(
        showRes.status === 401
          ? "Session expired — sign in again at /login"
          : "Could not load shows",
      );
      return;
    }
    const showData = (await showRes.json()) as {
      shows: Show[];
      active_show_id: string | null;
    };
    setShows(showData.shows);
    const activeInList = showData.shows.some((s) => s.id === showData.active_show_id)
      ? showData.active_show_id
      : null;
    const active = activeInList ?? showData.shows[0]?.id ?? null;
    setShowId(active);
    if (active) {
      const entryRes = await fetch(`/api/entries?show_id=${active}`);
      if (!entryRes.ok) {
        setMessage("Could not load roster entries");
        setEntries([]);
        return;
      }
      const entryData = (await entryRes.json()) as { entries: RosterEntryRecord[] };
      setEntries(entryData.entries);
    } else {
      setEntries([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showFormOpen) {
      document.getElementById("new-show-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showFormOpen]);

  useEffect(() => {
    if (entryFormMode && entryDraft) {
      document.getElementById("entry-profile-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [entryFormMode, entryDraft]);

  function openNewShowForm() {
    setMessage("");
    setShowDraft(blankShowDraft());
    setShowFormOpen(true);
    setEntryFormMode(null);
    setEntryDraft(null);
  }

  async function createShow() {
    const validation = validateShowCreate(showDraft);
    if (!validation.valid) {
      setMessage(validation.error);
      return;
    }
    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(showDraft),
    });
    const data = (await res.json()) as { show?: Show; error?: string };
    if (!res.ok || !data.show?.id) {
      setMessage(data.error ?? "Could not create show");
      return;
    }
    setMessage(`Show created: ${data.show.name}`);
    setShowFormOpen(false);
    setShowId(data.show.id);
    await load();
  }

  async function selectShow(id: string) {
    setShowId(id);
    setMessage("");
    setSwitching(true);
    try {
      await fetch("/api/shows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_show_id: id }),
      });
      const res = await fetch(`/api/entries?show_id=${id}`);
      const data = (await res.json()) as { entries: RosterEntryRecord[] };
      setEntries(data.entries);
    } finally {
      setSwitching(false);
    }
  }

  function openCsvImport() {
    if (!showId) {
      setMessage("Create a show first, then import the CSV");
      openNewShowForm();
      return;
    }
    setCsvModalOpen(true);
  }

  async function importCsvText(csv: string) {
    if (!showId) {
      throw new Error("Create or select a show before importing CSV");
    }
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import_csv", show_id: showId, csv }),
    });
    const data = (await res.json()) as {
      imported?: number;
      added?: number;
      updated?: number;
      placements_cleared?: number;
      errors?: string[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? data.errors?.[0] ?? "Import failed");
    }
    const added = data.added ?? data.imported ?? 0;
    const updated = data.updated ?? 0;
    setMessage(
      `Imported ${added} new${updated ? `, updated ${updated}` : ""}${data.placements_cleared ? `; cleared ${data.placements_cleared} placement${data.placements_cleared === 1 ? "" : "s"} after division changes` : ""}${data.errors?.length ? ` (${data.errors.length} row warnings)` : ""}`,
    );
    await load();
  }

  function openCreateProfile() {
    setMessage("");
    if (!showId) {
      setMessage("Create a show first, then add entries");
      openNewShowForm();
      return;
    }
    setShowFormOpen(false);
    setEntryFormMode("create");
    setPendingDocuments([]);
    setEntryDays({ se: false, saturday: true, sunday: false });
    setArmbandMode("sequential");
    const showDate = shows.find((show) => show.id === showId)?.date ?? "";
    setEntryDraft(
      blankRosterEntryDraft(
        showId,
        String(100 + entries.length + 1),
        showDate,
      ),
    );
  }

  function openEditProfile(entry: RosterEntryRecord) {
    setMessage("");
    setShowFormOpen(false);
    setEntryFormMode("edit");
    setPendingDocuments([]);
    setEntryDraft({ ...entry });
  }

  function closeEntryForm() {
    setEntryFormMode(null);
    setEntryDraft(null);
    setPendingDocuments([]);
  }

  async function readApiError(res: Response, fallback: string) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? fallback;
  }

  function showEntryError(error: string) {
    setMessage(error);
    pushToast(error, "error");
  }

  async function saveEntryForm() {
    if (!entryDraft || !entryFormMode) return;
    const activeShow = entryDraft.show_id || showId;
    if (!activeShow) {
      setMessage("Create or select a show first");
      openNewShowForm();
      return;
    }

    const named = splitRegisteredName(entryDraft);
    const draft = { ...entryDraft, ...named };
    setEntryDraft(draft);

    if (
      entryFormMode === "create" &&
      !entryDays.se &&
      !entryDays.saturday &&
      !entryDays.sunday
    ) {
      showEntryError("Select at least one date");
      return;
    }
    if (entryFormMode === "create") {
      const createError = createEntryRequirementError({
        microchip: draft.microchip,
        se: entryDays.se,
        health: draft.health,
        documentFilenames: pendingDocuments.map((file) => file.name),
        documentTypes: pendingDocuments.map((file) => file.type),
      });
      if (createError) {
        showEntryError(createError);
        return;
      }
    }
    const validation = validateRosterEntry(draft);
    if (!validation.valid) {
      showEntryError(validation.error);
      return;
    }
    const catalogError = catalogMetadataError(draft);
    if (catalogError) {
      showEntryError(catalogError);
      return;
    }

    if (entryFormMode === "create") {
      try {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            show_id: activeShow,
            entry: {
              armband: draft.armband,
              dog_name: draft.dog_name,
              zb_number: draft.zb_number,
              wt: draft.date_of_birth || draft.wt,
              date_of_birth: draft.date_of_birth || draft.wt,
              owner: draft.owner,
              co_owner: draft.co_owner ?? "",
              sex: draft.sex,
              class_id: draft.class_id,
              event_kind: draft.event_kind,
              competition_day: draft.competition_day,
              catalog_class: draft.catalog_class,
              email: draft.email,
              sire: draft.sire ?? "",
              dam: draft.dam ?? "",
              breeder: draft.breeder ?? "",
              kennel_name: draft.kennel_name ?? "",
              address: draft.address ?? "",
              hd_ed_jlpp: draft.hd_ed_jlpp ?? "",
              prefix_titles: draft.prefix_titles ?? "",
              suffix_titles: draft.suffix_titles ?? "",
              microchip: draft.microchip ?? "",
              registration_club: draft.registration_club ?? "",
              health: draft.health ?? emptyHealthClearances(),
            },
            days: entryDays,
            armband_mode: armbandMode,
            documents: await Promise.all(
              pendingDocuments.map(async (file) => ({
                file_base64: await fileToBase64(file),
                filename: file.name,
                mime: file.type,
              })),
            ),
          }),
        });
        if (!res.ok) {
          showEntryError(await readApiError(res, "Create failed"));
          return;
        }
        const created = (await res.json()) as { entry?: RosterEntryRecord };
        setMessage("Entry created — add a photo if you have one");
        pushToast("Entry created — add a photo if you have one");
        if (created.entry) {
          setPendingDocuments([]);
          setEntryDraft(created.entry);
          setEntryFormMode("edit");
        } else {
          closeEntryForm();
        }
        await load();
      } catch {
        showEntryError("Create failed");
      }
      return;
    }

    const original = entries.find((entry) => entry.id === draft.id);
    const divisionChanged = Boolean(
      original &&
        (original.class_id !== draft.class_id ||
          original.sex !== draft.sex ||
          original.event_kind !== draft.event_kind ||
          original.competition_day !== draft.competition_day ||
          original.catalog_class !== draft.catalog_class),
    );
    if (
      divisionChanged &&
      !window.confirm(
        "Changing event, day, class, or sex moves this entry to another placement pool and clears its placement. Continue?",
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: activeShow, entry: draft }),
      });
      if (!res.ok) {
        showEntryError(await readApiError(res, "Save failed"));
        return;
      }
      setMessage("Entry saved");
      pushToast("Entry saved");
      closeEntryForm();
      await load();
    } catch {
      showEntryError("Save failed");
    }
  }

  async function deleteEntry(entryId: string) {
    if (!showId) return;
    const res = await fetch(`/api/entries?id=${entryId}&show_id=${showId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error ?? "Delete failed");
      return;
    }
    setMessage("Entry deleted — critiques, SE, and placements for this dog were removed");
    if (entryDraft?.id === entryId) closeEntryForm();
    setDeleteEntryId(null);
    await load();
  }

  const weekend = showWeekendDays(
    shows.find((show) => show.id === showId)?.date ?? "",
  );
  const tabEntries = entriesForRosterTab(entries, rosterTab, weekend);
  const divisions = divisionsWithDogs(tabEntries);
  const activeDivisionFilter = sanitizeRosterDivisionFilter(
    divisionFilter,
    tabEntries,
  );
  const filtered = visibleRosterEntries(tabEntries, {
    search,
    divisionFilter: activeDivisionFilter,
    sort,
  });
  const emptyMessage = rosterEmptyMessage({
    entryCount: tabEntries.length,
    visibleCount: filtered.length,
    search,
    divisionFilter: activeDivisionFilter,
    tab: rosterTab,
  });
  const classWarning =
    entryDraft &&
    classEligibilityWarning({
      catalogClass: entryDraft.catalog_class,
      dateOfBirth: entryDraft.date_of_birth || entryDraft.wt,
      onDate: weekend.saturday,
      prefixTitles: entryDraft.prefix_titles,
      suffixTitles: entryDraft.suffix_titles,
    });

  const selectValue = shows.some((s) => s.id === showId) ? showId! : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roster entries"
        description={
          showId
            ? "Import a CSV or add a scratch entry for this show."
            : "Create a show, then import or add dog profiles for that show."
        }
      />

      {message ? (
        <p
          role="status"
          className="sss-tray px-3 py-2 text-sm text-sss-text-primary"
        >
          {message}
        </p>
      ) : null}

      <div className="sss-paper flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[16rem] flex-1 space-y-1">
          <Label>Active show</Label>
          {shows.length > 0 ? (
            <Select value={selectValue} onValueChange={(v) => void selectShow(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select show" />
              </SelectTrigger>
              <SelectContent>
                {shows.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {formatDisplayDate(s.date)} ({s.rulebook.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-sss-text-muted">
              No shows yet — click New show to create one.
            </p>
          )}
          {switching ? (
            <p className="text-xs text-sss-text-muted">Switching show…</p>
          ) : null}
        </div>
        <Button variant="outline" onClick={openNewShowForm}>
          <Plus className="h-4 w-4" />
          New show
        </Button>
      </div>

      <Dialog open={showFormOpen} onOpenChange={setShowFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New show</DialogTitle>
          </DialogHeader>
          <section id="new-show-form" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="show_name">Show name</Label>
              <Input
                id="show_name"
                value={showDraft.name}
                onChange={(e) => setShowDraft({ ...showDraft, name: e.target.value })}
                placeholder="e.g. Blacksage Sieger 2026"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="show_date">Date</Label>
              <Input
                id="show_date"
                type="date"
                value={showDraft.date}
                onChange={(e) => setShowDraft({ ...showDraft, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Rulebook</Label>
              <Select
                value={showDraft.rulebook}
                onValueChange={(v) =>
                  setShowDraft({
                    ...showDraft,
                    rulebook: v as RulebookTemplate,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adrk">ADRK</SelectItem>
                  <SelectItem value="usrc">USRC (stub)</SelectItem>
                  <SelectItem value="rkna">RKNA (stub)</SelectItem>
                  <SelectItem value="other">Other (stub)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="show_venue">Venue</Label>
              <Input
                id="show_venue"
                value={showDraft.venue}
                onChange={(e) => setShowDraft({ ...showDraft, venue: e.target.value })}
                placeholder="Ground / city"
              />
            </div>
            <JudgeListFields
              idPrefix="show_judge"
              judges={showDraft.judges}
              onChange={(judges) =>
                setShowDraft({
                  ...showDraft,
                  judges,
                  judge: judges[0] ?? "",
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void createShow()}>Create show</Button>
            <Button variant="outline" onClick={() => setShowFormOpen(false)}>
              Cancel
            </Button>
          </div>
          </section>
        </DialogContent>
      </Dialog>

      <CsvImportDialog
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onImport={importCsvText}
        disabled={!showId}
      />

      <SectionCard
        title={`Entries (${filtered.length} of ${entries.length})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DogSearchField
              value={search}
              onChange={setSearch}
              aria-label="Search roster"
            />
            <div className="space-y-1">
              <Label htmlFor="roster-sort" className="sr-only">
                Sort roster
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as RosterSort)}
              >
                <SelectTrigger id="roster-sort" aria-label="Sort roster">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Sort by division</SelectItem>
                  <SelectItem value="armband">Sort by armband</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TrophyOrderActions
              showName={
                shows.find((show) => show.id === showId)?.name ?? "Show"
              }
              displayDate={formatDisplayDate(
                shows.find((show) => show.id === showId)?.date ?? "",
              )}
              tab={rosterTab}
              entries={filtered}
            />
            <Button onClick={openCsvImport} disabled={!showId}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={openCreateProfile}>
              <Plus className="h-4 w-4" />
              Add scratch entry
            </Button>
          </div>
        }
      >
        {!showId ? (
          <p className="text-xs text-sss-text-muted">
            Select or create a show to enable import.
          </p>
        ) : null}
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Roster day"
        >
          {(
            [
              ["all", "All days"],
              ["se", "SE Division"],
              ["saturday", `Saturday ${formatDisplayDate(weekend.saturday)}`],
              ["sunday", `Sunday ${formatDisplayDate(weekend.sunday)}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={rosterTab === value}
              className={`min-h-11 rounded-sss-md px-3 text-sm ${
                rosterTab === value
                  ? "bg-sss-ink text-[var(--sss-paper)]"
                  : "sss-paper text-sss-text-secondary"
              }`}
              onClick={() => {
                setRosterTab(value);
                setDivisionFilter("all");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {divisions.length > 0 ? (
          <div className="mb-3">
            <DivisionFilterChips
              divisions={divisions}
              value={activeDivisionFilter}
              onChange={setDivisionFilter}
            />
          </div>
        ) : null}
        {!loaded ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
        <>
        <ul className="space-y-2 md:hidden">
          {filtered.map((e) => (
            <li key={e.id} className="sss-tray space-y-2 p-3">
              <div className="flex items-start gap-3">
                <DogAvatar
                  size="sm"
                  src={dogPhotoHrefForEntry(showId, entries, e) ?? null}
                />
                <div className="min-w-0">
                  <p className="font-medium">{e.dog_name}</p>
                  {formatTitlesLine(e) ? (
                    <p className="text-xs text-sss-text-muted">
                      {formatTitlesLine(e)}
                    </p>
                  ) : null}
                  <p className="text-xs text-sss-text-muted">
                    #{e.armband}
                    {seRosterNote(e, entries, weekend) ? " *" : ""} · {e.owner} ·{" "}
                    {divisionLabel(e)}
                  </p>
                  {seRosterNote(e, entries, weekend) ? (
                    <p className="text-xs text-sss-text-muted">
                      * {seRosterNote(e, entries, weekend)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEditProfile(e)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteEntryId(e.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {emptyMessage ? (
            <li className="text-sm text-sss-text-muted">{emptyMessage}</li>
          ) : null}
        </ul>
        <div className="hidden overflow-x-auto rounded-sss-md border border-sss-border md:block">
          <table className="w-full text-sm">
            <thead className="bg-sss-lifted text-left">
              <tr>
                <th className="p-3 font-medium">
                  <button
                    type="button"
                    className="text-left hover:text-sss-accent-deep"
                    aria-pressed={sort === "armband"}
                    onClick={() => setSort("armband")}
                  >
                    Armband{sort === "armband" ? " · sorted" : ""}
                  </button>
                </th>
                <th className="p-3 font-medium">Dog</th>
                <th className="p-3 font-medium">Owner</th>
                <th className="p-3 font-medium">
                  <button
                    type="button"
                    className="text-left hover:text-sss-accent-deep"
                    aria-pressed={sort === "class"}
                    onClick={() => setSort("class")}
                  >
                    Division{sort === "class" ? " · sorted" : ""}
                  </button>
                </th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-sm text-sss-text-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-sss-border transition-colors hover:bg-sss-lifted/70"
                >
                  <td className="p-3 font-[family-name:var(--font-fraunces)] font-semibold">
                    #{e.armband}
                    {seRosterNote(e, entries, weekend) ? " *" : ""}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <DogAvatar
                        size="sm"
                        src={dogPhotoHrefForEntry(showId, entries, e) ?? null}
                      />
                      <span>
                        {e.dog_name}
                        {formatTitlesLine(e) ? (
                          <span className="block text-xs font-normal text-sss-text-muted">
                            {formatTitlesLine(e)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="p-3">{e.owner}</td>
                  <td className="p-3">
                    {divisionLabel(e)}
                    {seRosterNote(e, entries, weekend) ? (
                      <span className="block text-xs text-sss-text-muted">
                        * {seRosterNote(e, entries, weekend)}
                      </span>
                    ) : null}
                  </td>
                  <td className="space-x-2 p-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditProfile(e)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteEntryId(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </SectionCard>

      <Dialog
        open={Boolean(entryFormMode && entryDraft)}
        onOpenChange={(open) => {
          if (!open) closeEntryForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {entryFormMode === "create" ? "Create entry profile" : "Edit entry"}
            </DialogTitle>
          </DialogHeader>
          {message ? (
            <p
              role="status"
              className="rounded-sss-md border border-sss-border bg-sss-lifted px-3 py-2 text-sm"
            >
              {message}
            </p>
          ) : null}
          {entryDraft ? (
        <section id="entry-profile-form" className="space-y-3">
          {showId ? (
            <DogPhotoField
              showId={entryDraft.show_id || showId}
              entryId={entryDraft.id || undefined}
              photoPath={entryDraft.photo_path}
              previewPath={
                photoSourceForDog(entries, entryDraft)?.photo_path
              }
              onChanged={(photo_path) =>
                setEntryDraft({ ...entryDraft, photo_path })
              }
            />
          ) : null}
          {entryFormMode === "create" ? (
            <div className="space-y-2 rounded-sss-md border border-sss-border p-3">
              <Label>Date(s) entered</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={entryDays.se}
                  onCheckedChange={(checked) =>
                    setEntryDays((days) => ({ ...days, se: checked === true }))
                  }
                />
                Friday {formatDisplayDate(weekend.se)} — SE only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={entryDays.saturday}
                  onCheckedChange={(checked) =>
                    setEntryDays((days) => ({
                      ...days,
                      saturday: checked === true,
                    }))
                  }
                />
                Saturday {formatDisplayDate(weekend.saturday)}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={entryDays.sunday}
                  onCheckedChange={(checked) =>
                    setEntryDays((days) => ({
                      ...days,
                      sunday: checked === true,
                    }))
                  }
                />
                Sunday {formatDisplayDate(weekend.sunday)}
              </label>
              <div className="space-y-1 pt-2">
                <Label>Armband assignment</Label>
                <Select
                  value={armbandMode}
                  onValueChange={(value) =>
                    setArmbandMode(value as "sequential" | "random")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">
                      Sequential (show-wide, Saturday then Sunday)
                    </SelectItem>
                    <SelectItem value="random">
                      Random in the show range
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-sss-text-muted">
                  Both conformation days get different numbers. SE reuses the
                  Saturday number when the dog is also in conformation.
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="armband">Armband</Label>
              <Input
                id="armband"
                value={entryDraft.armband}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, armband: e.target.value })
                }
                disabled={entryFormMode === "create"}
              />
              {entryFormMode === "create" ? (
                <p className="text-xs text-sss-text-muted">
                  Assigned on save from the selected dates.
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dog_name">Registered name</Label>
              <Input
                id="dog_name"
                value={entryDraft.dog_name}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, dog_name: e.target.value })
                }
                onBlur={() =>
                  setEntryDraft((current) =>
                    current
                      ? { ...current, ...splitRegisteredName(current) }
                      : current,
                  )
                }
                placeholder="Rex vom Blacksage"
              />
              <p className="text-xs text-sss-text-muted">
                Registered name only. Titles belong in Prefix / Suffix.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={entryDraft.owner}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, owner: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={entryDraft.email}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="co_owner">Co-owner</Label>
              <Input
                id="co_owner"
                value={entryDraft.co_owner ?? ""}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, co_owner: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zb">Registration #</Label>
              <Input
                id="zb"
                value={entryDraft.zb_number}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, zb_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="registration_club">Registration club</Label>
              <Input
                id="registration_club"
                value={entryDraft.registration_club ?? ""}
                onChange={(e) =>
                  setEntryDraft({
                    ...entryDraft,
                    registration_club: e.target.value,
                  })
                }
                placeholder="AKC, CKC, ADRK…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="microchip">Microchip # (required)</Label>
              <Input
                id="microchip"
                value={entryDraft.microchip ?? ""}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, microchip: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={entryDraft.date_of_birth || entryDraft.wt}
                onChange={(e) =>
                  setEntryDraft({
                    ...entryDraft,
                    date_of_birth: e.target.value,
                    wt: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prefix_titles">Prefix titles (conformation)</Label>
              <Input
                id="prefix_titles"
                value={entryDraft.prefix_titles ?? ""}
                onChange={(e) =>
                  setEntryDraft({
                    ...entryDraft,
                    prefix_titles: e.target.value,
                  })
                }
                placeholder="CH, AM CH, Sieger…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="suffix_titles">Suffix titles (performance)</Label>
              <Input
                id="suffix_titles"
                value={entryDraft.suffix_titles ?? ""}
                onChange={(e) =>
                  setEntryDraft({
                    ...entryDraft,
                    suffix_titles: e.target.value,
                  })
                }
                placeholder="IGP1, BH, FH…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kennel_name">Breeder / kennel name</Label>
              <Input
                id="kennel_name"
                value={entryDraft.kennel_name || entryDraft.breeder || ""}
                onChange={(e) =>
                  setEntryDraft({
                    ...entryDraft,
                    kennel_name: e.target.value,
                    breeder: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Sex / division</Label>
              <Select
                value={
                  entryDraft.sex === "R" || entryDraft.sex === "H"
                    ? entryDraft.sex
                    : undefined
                }
                onValueChange={(v) =>
                  setEntryDraft({ ...entryDraft, sex: v as "R" | "H" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select male or female" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">Male (Rüde / R)</SelectItem>
                  <SelectItem value="H">Female (Hündin / H)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Select
                value={entryDraft.class_id}
                onValueChange={(v) =>
                  setEntryDraft({
                    ...entryDraft,
                    class_id: v as RosterEntryRecord["class_id"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADRK_CLASSES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entryFormMode === "edit" ? (
              <>
                <div className="space-y-1">
                  <Label>Catalog event</Label>
                  <Select
                    value={entryDraft.event_kind || undefined}
                    onValueChange={(value) => {
                      const eventKind = value as CatalogEventKind;
                      setEntryDraft({
                        ...entryDraft,
                        event_kind: eventKind,
                        catalog_class:
                          eventKind === "se"
                            ? "standard-evaluation"
                            : entryDraft.catalog_class === "standard-evaluation"
                              ? "youth-i"
                              : entryDraft.catalog_class,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="se">Standard Evaluation (SE)</SelectItem>
                      <SelectItem value="conformation">Conformation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="competition_day">Competition day (required)</Label>
                  <Input
                    id="competition_day"
                    type="date"
                    value={entryDraft.competition_day ?? ""}
                    onChange={(event) =>
                      setEntryDraft({
                        ...entryDraft,
                        competition_day: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            ) : null}
            {entryDraft.event_kind !== "se" ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Published catalog class</Label>
                <Select
                  value={
                    entryDraft.catalog_class &&
                    entryDraft.catalog_class !== "standard-evaluation"
                      ? entryDraft.catalog_class
                      : undefined
                  }
                  onValueChange={(value) =>
                    setEntryDraft({
                      ...entryDraft,
                      catalog_class: value as CatalogClassId,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select published class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATALOG_CLASSES.map((catalogClass) => (
                      <SelectItem
                        key={catalogClass.id}
                        value={catalogClass.id}
                      >
                        {catalogClass.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classWarning ? (
                  <p className="text-sm text-amber-800">{classWarning}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          {entryDays.se || entryDraft.event_kind === "se" ? (
            <div className="grid gap-3 rounded-sss-md border border-sss-border p-3 sm:grid-cols-2">
              <p className="text-sm font-medium sm:col-span-2">
                SE health clearances (optional)
              </p>
              {(
                [
                  ["hd", "HD"],
                  ["ed", "ED"],
                  ["eye", "Eye"],
                  ["heart", "Heart"],
                  ["jlpp", "JLPP"],
                  ["nad", "NAD"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`health_${key}`}>{label}</Label>
                  <Input
                    id={`health_${key}`}
                    value={entryDraft.health?.[key] ?? ""}
                    onChange={(e) =>
                      setEntryDraft({
                        ...entryDraft,
                        health: {
                          ...(entryDraft.health ?? emptyHealthClearances()),
                          [key]: e.target.value,
                        },
                      })
                    }
                    placeholder="clear / passing"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>Registry</Label>
                <Select
                  value={entryDraft.health?.registry || undefined}
                  onValueChange={(value) =>
                    setEntryDraft({
                      ...entryDraft,
                      health: {
                        ...(entryDraft.health ?? emptyHealthClearances()),
                        registry: value as (typeof HEALTH_REGISTRY_OPTIONS)[number],
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="OFA, ADRK, or Other" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_REGISTRY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="health_registry_status">Registry status</Label>
                <Input
                  id="health_registry_status"
                  value={entryDraft.health?.registry_status ?? ""}
                  onChange={(e) =>
                    setEntryDraft({
                      ...entryDraft,
                      health: {
                        ...(entryDraft.health ?? emptyHealthClearances()),
                        registry_status: e.target.value,
                      },
                    })
                  }
                  placeholder="passing"
                />
              </div>
            </div>
          ) : null}
          <DogDocumentsField
            showId={entryDraft.show_id || showId || ""}
            entryId={entryDraft.id || undefined}
            dogId={entryDraft.dog_id}
            pendingFiles={pendingDocuments}
            onPendingFilesChange={setPendingDocuments}
          />
          <div className="flex gap-2">
            <Button onClick={() => void saveEntryForm()}>
              {entryFormMode === "create" ? "Create entry" : "Save entry"}
            </Button>
            <Button variant="outline" onClick={closeEntryForm}>
              Cancel
            </Button>
          </div>
        </section>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteEntryId)}
        title="Delete this dog from the roster?"
        body="This also removes critiques, SE forms, placements, and the ringside recording for this dog."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteEntryId) void deleteEntry(deleteEntryId);
        }}
        onCancel={() => setDeleteEntryId(null)}
      />
    </div>
  );
}
