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
import type { RulebookTemplate } from "@/lib/domain/adrk-template";
import { validateRosterEntry } from "@/lib/domain/roster";
import { blankRosterEntryDraft } from "@/lib/domain/roster-draft";
import { blankShowDraft, validateShowCreate } from "@/lib/domain/show-draft";
import type { ShowCreateInput } from "@/lib/domain/show-draft";
import { CsvImportDialog } from "@/components/roster/CsvImportDialog";
import { DogPhotoField } from "@/components/roster/DogPhotoField";
import { dogPhotoHref } from "@/lib/domain/dog-photo";
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
import { dogRecordMatchesSearch } from "@/lib/domain/dog-search";
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
  const [entryFormMode, setEntryFormMode] = useState<EntryFormMode | null>(null);
  const [entryDraft, setEntryDraft] = useState<RosterEntryRecord | null>(null);
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [showDraft, setShowDraft] = useState<ShowCreateInput>(() => blankShowDraft());
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
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
      errors?: string[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? data.errors?.[0] ?? "Import failed");
    }
    const added = data.added ?? data.imported ?? 0;
    const updated = data.updated ?? 0;
    setMessage(
      `Imported ${added} new${updated ? `, updated ${updated}` : ""}${data.errors?.length ? ` (${data.errors.length} row warnings)` : ""}`,
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
    setEntryDraft(blankRosterEntryDraft(showId, String(100 + entries.length + 1)));
  }

  function openEditProfile(entry: RosterEntryRecord) {
    setMessage("");
    setShowFormOpen(false);
    setEntryFormMode("edit");
    setEntryDraft({ ...entry });
  }

  function closeEntryForm() {
    setEntryFormMode(null);
    setEntryDraft(null);
  }

  async function saveEntryForm() {
    if (!entryDraft || !entryFormMode) return;
    const activeShow = entryDraft.show_id || showId;
    if (!activeShow) {
      setMessage("Create or select a show first");
      openNewShowForm();
      return;
    }

    const validation = validateRosterEntry(entryDraft);
    if (!validation.valid) {
      setMessage(validation.error);
      return;
    }

    if (entryFormMode === "create") {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          show_id: activeShow,
          entry: {
            armband: entryDraft.armband,
            dog_name: entryDraft.dog_name,
            zb_number: entryDraft.zb_number,
            wt: entryDraft.wt,
            owner: entryDraft.owner,
            sex: entryDraft.sex,
            class_id: entryDraft.class_id,
            email: entryDraft.email,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error ?? "Create failed");
        return;
      }
      const created = (await res.json()) as { entry?: RosterEntryRecord };
      setMessage("Entry created — add a photo if you have one");
      pushToast("Entry created — add a photo if you have one");
      if (created.entry) {
        setEntryDraft(created.entry);
        setEntryFormMode("edit");
      } else {
        closeEntryForm();
      }
      await load();
      return;
    }

    const res = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: activeShow, entry: entryDraft }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMessage(data.error ?? "Save failed");
      return;
    }
    setMessage("Entry saved");
    closeEntryForm();
    await load();
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

  const filtered = entries.filter((e) => dogRecordMatchesSearch(search, e));

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
                  src={
                    e.photo_path && showId
                      ? dogPhotoHref(showId, e.id, { cacheBust: e.photo_path })
                      : null
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium">{e.dog_name}</p>
                  <p className="text-xs text-sss-text-muted">
                    #{e.armband} · {e.owner} ·{" "}
                    {ADRK_CLASSES.find((c) => c.id === e.class_id)?.label ?? e.class_id}
                  </p>
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
          {filtered.length === 0 ? (
            <li className="text-sm text-sss-text-muted">
              {entries.length === 0
                ? "No dogs on this roster yet."
                : "No dogs match this search."}
            </li>
          ) : null}
        </ul>
        <div className="hidden overflow-x-auto rounded-sss-md border border-sss-border md:block">
          <table className="w-full text-sm">
            <thead className="bg-sss-lifted text-left">
              <tr>
                <th className="p-3 font-medium">Armband</th>
                <th className="p-3 font-medium">Dog</th>
                <th className="p-3 font-medium">Owner</th>
                <th className="p-3 font-medium">Class</th>
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
                    {entries.length === 0
                      ? "No dogs on this roster yet."
                      : "No dogs match this search."}
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
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <DogAvatar
                        size="sm"
                        src={
                          e.photo_path && showId
                            ? dogPhotoHref(showId, e.id, { cacheBust: e.photo_path })
                            : null
                        }
                      />
                      {e.dog_name}
                    </span>
                  </td>
                  <td className="p-3">{e.owner}</td>
                  <td className="p-3">
                    {ADRK_CLASSES.find((c) => c.id === e.class_id)?.label ?? e.class_id}
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
          {entryDraft ? (
        <section id="entry-profile-form" className="space-y-3">
          {showId ? (
            <DogPhotoField
              showId={entryDraft.show_id || showId}
              entryId={entryDraft.id || undefined}
              photoPath={entryDraft.photo_path}
              onChanged={(photo_path) =>
                setEntryDraft({ ...entryDraft, photo_path })
              }
            />
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
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dog_name">Dog name</Label>
              <Input
                id="dog_name"
                value={entryDraft.dog_name}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, dog_name: e.target.value })
                }
              />
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
              <Label htmlFor="zb">ZB number</Label>
              <Input
                id="zb"
                value={entryDraft.zb_number}
                onChange={(e) =>
                  setEntryDraft({ ...entryDraft, zb_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wt">WT</Label>
              <Input
                id="wt"
                value={entryDraft.wt}
                onChange={(e) => setEntryDraft({ ...entryDraft, wt: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Sex</Label>
              <Select
                value={entryDraft.sex}
                onValueChange={(v) =>
                  setEntryDraft({ ...entryDraft, sex: v as "R" | "H" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">R (male)</SelectItem>
                  <SelectItem value="H">H (female)</SelectItem>
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
          </div>
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
