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
import { AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { pushToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SectionCard } from "@/components/ui/section-card";
import { JudgeListFields } from "@/components/show/JudgeListFields";
import { syncShowJudges } from "@/lib/domain/show-judges";
import type { Show } from "@/lib/types";

export default function AdminSettingsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [activeShowId, setActiveShowId] = useState<string | null>(null);
  const [form, setForm] = useState<Show | null>(null);
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/shows");
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Session expired — sign in again"
          : "Could not load settings",
      );
      setLoaded(true);
      return;
    }
    const data = (await res.json()) as { shows: Show[]; active_show_id: string | null };
    setShows(data.shows);
    setActiveShowId(data.active_show_id);
    const active = data.shows.find((s) => s.id === data.active_show_id) ?? null;
    setForm(active ? { ...active, ...syncShowJudges(active) } : null);
    if (!active) {
      setMessage("No active show — create one on Roster.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveShow() {
    if (!form || busy) return;
    setBusy(true);
    const res = await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show: form }),
    });
    const ok = res.ok;
    setMessage(ok ? "Show settings saved" : "Save failed");
    pushToast(ok ? "Show settings saved" : "Save failed", ok ? "ok" : "error");
    setBusy(false);
    await load();
  }

  async function purgeShow() {
    if (!activeShowId || busy) return;
    setBusy(true);
    const res = await fetch("/api/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: activeShowId, confirm }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    const ok = Boolean(data.ok);
    setMessage(ok ? "Show data purged" : (data.error ?? "Purge failed"));
    pushToast(
      ok ? "Show data purged" : (data.error ?? "Purge failed"),
      ok ? "ok" : "error",
    );
    setConfirm("");
    setBusy(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        description="Show metadata and manual data retention purge."
      />
      {!loaded ? <PageSkeleton rows={3} /> : null}
      {loaded ? (
        <>
      {message ? (
        <p className="sss-tray px-3 py-2 text-sm">{message}</p>
      ) : null}

      {form ? (
        <SectionCard title="Active show">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>
            <JudgeListFields
              idPrefix="settings_judge"
              judges={form.judges ?? (form.judge ? [form.judge] : [""])}
              onChange={(judges) => {
                const primaryJudge =
                  judges.find((judge) => judge.trim())?.trim() ?? "";
                setForm({
                  ...form,
                  judges,
                  judge: primaryJudge,
                });
              }}
            />
            <div className="space-y-1">
              <Label>Rulebook</Label>
              <Select
                value={form.rulebook}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    rulebook: v as Show["rulebook"],
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
          </div>
          <Button disabled={busy} onClick={() => void saveShow()}>
            Save show settings
          </Button>
          {shows.length > 1 ? (
            <p className="text-xs text-sss-text-muted">
              Editing active show only ({shows.length} shows in store).
            </p>
          ) : null}
        </SectionCard>
      ) : (
        <p className="text-sm text-sss-text-muted">
          No active show — create one on Roster.
        </p>
      )}

      <section className="sss-paper space-y-3 border-sss-error/40 bg-sss-error-soft/30 p-5">
        <h2 className="inline-flex items-center gap-2 font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Purge show data
        </h2>
        <p className="text-sm text-sss-text-secondary">
          Deletes all entries, critiques, placements, SE evaluations, and audio for
          the active show. Type <strong>PURGE</strong> to confirm.
        </p>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="confirm">Confirmation</Label>
          <Input
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="PURGE"
          />
        </div>
          <Button
          variant="destructive"
          disabled={busy || confirm !== "PURGE" || !activeShowId}
          onClick={() => setPurgeOpen(true)}
        >
          Purge show data
        </Button>
        <p className="text-xs text-destructive">This cannot be undone.</p>
      </section>
      <ConfirmDialog
        open={purgeOpen}
        title="Permanently delete this show’s data?"
        body="This cannot be undone. All entries, critiques, SE forms, placements, and audio for the active show will be deleted."
        confirmLabel="Purge"
        destructive
        onConfirm={() => {
          setPurgeOpen(false);
          void purgeShow();
        }}
        onCancel={() => setPurgeOpen(false)}
      />
        </>
      ) : null}
    </div>
  );
}
