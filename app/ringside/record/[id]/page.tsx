"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  enqueueRecording,
  listQueuedRecordings,
  removeQueuedRecording,
} from "@/lib/offline/queue";
import { formatElapsed, nextDogAfter } from "@/lib/domain/show-day";
import { canRecordWithJudge, syncShowJudges } from "@/lib/domain/show-judges";
import { stickyJudgeForShow } from "@/lib/client/sticky-judge";
import type { RosterEntryRecord, Show } from "@/lib/types";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { VuMeter } from "@/components/desk/VuMeter";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function RecordPage() {
  const params = useParams();
  const router = useRouter();
  const entryId = params.id as string;
  const [entry, setEntry] = useState<RosterEntryRecord | null>(null);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [showId, setShowId] = useState<string | null>(null);
  const [judge, setJudge] = useState<string | null>(null);
  const [judges, setJudges] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supportsPause, setSupportsPause] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [queueCount, setQueueCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickStartedAtRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef(0);

  const refreshQueue = useCallback(async () => {
    const items = await listQueuedRecordings();
    setQueueCount(items.length);
  }, []);

  useEffect(() => {
    void refreshQueue();
    async function loadEntry() {
      const showRes = await fetch("/api/shows");
      if (!showRes.ok) return;
      const showData = (await showRes.json()) as {
        shows: Show[];
        active_show_id: string | null;
      };
      if (!showData.active_show_id) return;
      setShowId(showData.active_show_id);
      const active =
        showData.shows.find((s) => s.id === showData.active_show_id) ?? null;
      const names = syncShowJudges(active ?? {}).judges;
      setJudges(names);
      setJudge(stickyJudgeForShow(showData.active_show_id, names));
      const res = await fetch(`/api/entries?show_id=${showData.active_show_id}`);
      const data = (await res.json()) as { entries: RosterEntryRecord[] };
      setEntries(data.entries);
      setEntry(data.entries.find((e) => e.id === entryId) ?? null);
    }
    void loadEntry();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [entryId, refreshQueue]);

  useEffect(() => {
    if (!recording || paused) return;
    tickStartedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const started = tickStartedAtRef.current ?? Date.now();
      setElapsed(
        elapsedBaseRef.current + Math.floor((Date.now() - started) / 1000),
      );
    }, 250);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (recording) stopRecording();
      else void startRecording();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function updateVuMeter() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setVuLevel(Math.min(100, Math.round((avg / 255) * 100)));
    animationRef.current = requestAnimationFrame(updateVuMeter);
  }

  async function startRecording() {
    if (!canRecordWithJudge(judge, judges)) {
      setStatus("Select a judge");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      updateVuMeter();

      const recorder = new MediaRecorder(stream);
      setSupportsPause(typeof recorder.pause === "function");
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void handleStop();
      recorder.start();
      mediaRecorderRef.current = recorder;
      elapsedBaseRef.current = 0;
      tickStartedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      setPaused(false);
      setStatus("Recording…");
    } catch {
      setStatus("Microphone access denied");
    }
  }

  function pauseRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording" && typeof rec.pause === "function") {
      rec.pause();
      const started = tickStartedAtRef.current ?? Date.now();
      elapsedBaseRef.current += Math.floor((Date.now() - started) / 1000);
      setElapsed(elapsedBaseRef.current);
      setPaused(true);
      setStatus("Paused");
    }
  }

  function resumeRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "paused" && typeof rec.resume === "function") {
      rec.resume();
      setPaused(false);
      setStatus("Recording…");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current?.state === "recording" ||
      mediaRecorderRef.current?.state === "paused"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setPaused(false);
    setVuLevel(0);
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (!showId || !entryId) return;

    if (!navigator.onLine) {
      const id = `offline-${Date.now()}`;
      await enqueueRecording({
        id,
        entryId,
        showId,
        blob,
        createdAt: new Date().toISOString(),
        judge: judge ?? undefined,
      });
      setStatus("Saved to offline queue");
      await refreshQueue();
      const nextId = nextDogAfter(entries, entryId);
      router.push(nextId ? `/ringside/record/${nextId}` : "/ringside");
      return;
    }

    setStatus("Uploading & processing…");
    const audioBase64 = await blobToBase64(blob);
    const res = await fetch("/api/critiques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        entry_id: entryId,
        audio_base64: audioBase64,
        judge: judge ?? undefined,
      }),
    });
    if (res.ok) {
      setStatus("Sent to review queue");
      const nextId = nextDogAfter(entries, entryId);
      router.push(nextId ? `/ringside/record/${nextId}` : "/ringside");
    } else {
      const id = `offline-${Date.now()}`;
      await enqueueRecording({
        id,
        entryId,
        showId,
        blob,
        createdAt: new Date().toISOString(),
        judge: judge ?? undefined,
      });
      setStatus("Upload failed — queued offline");
      await refreshQueue();
    }
  }

  async function syncQueue() {
    if (!navigator.onLine) {
      setStatus("Still offline");
      return;
    }
    const items = await listQueuedRecordings();
    for (const item of items) {
      const audioBase64 = await blobToBase64(item.blob);
      const res = await fetch("/api/critiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: item.showId,
          entry_id: item.entryId,
          audio_base64: audioBase64,
          judge: item.judge,
        }),
      });
      if (res.ok) await removeQueuedRecording(item.id);
    }
    await refreshQueue();
    setStatus("Queue sync complete");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Record critique
        </h1>
        {entry ? (
          <p className="text-sm text-sss-text-secondary">
            #{entry.armband} {entry.dog_name} · Space starts or stops
          </p>
        ) : null}
      </div>

      {!canRecordWithJudge(judge, judges) ? (
        <EmptyDesk variant="select-judge" />
      ) : null}

      <div className="sss-paper space-y-3 p-4">
        <VuMeter
          level={vuLevel}
          label={
            recording || elapsed > 0
              ? `${status} · ${formatElapsed(elapsed)}`
              : status
          }
        />
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <Button
              disabled={!canRecordWithJudge(judge, judges)}
              onClick={() => void startRecording()}
            >
              Start recording
            </Button>
          ) : (
            <>
              {supportsPause ? (
                paused ? (
                  <Button variant="outline" onClick={resumeRecording}>
                    Resume
                  </Button>
                ) : (
                  <Button variant="outline" onClick={pauseRecording}>
                    Pause
                  </Button>
                )
              ) : null}
              <Button variant="destructive" onClick={stopRecording}>
                Stop &amp; process
              </Button>
            </>
          )}
        </div>
      </div>

      {queueCount > 0 ? (
        <div className="space-y-2 border border-sss-border bg-sss-lifted p-4">
          <p className="text-sm">
            {queueCount} recording(s) waiting to sync
          </p>
          <Button variant="outline" onClick={() => void syncQueue()}>
            Sync queue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
