"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enqueueRecording, listQueuedRecordings } from "@/lib/offline/queue";
import {
  blobToBase64,
  formatQueueSyncStatus,
  syncQueuedRecordings,
} from "@/lib/offline/sync";
import { formatElapsed, nextDogAfter } from "@/lib/domain/show-day";
import { canRecordWithJudge, syncShowJudges } from "@/lib/domain/show-judges";
import { stickyJudgeForShow } from "@/lib/client/sticky-judge";
import { startDeepgramLiveSession } from "@/lib/client/deepgram-live";
import type { RosterEntryRecord, Show } from "@/lib/types";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { VuMeter } from "@/components/desk/VuMeter";

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
  const [liveTranscript, setLiveTranscript] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [entryLoaded, setEntryLoaded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickStartedAtRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef(0);
  const liveSessionRef = useRef<Awaited<
    ReturnType<typeof startDeepgramLiveSession>
  > | null>(null);
  const liveFinalRef = useRef("");
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  const startRecordingRef = useRef<() => Promise<void> | void>(() => undefined);
  const stopRecordingRef = useRef<() => void>(() => undefined);

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
      if (!res.ok) {
        setEntryLoaded(true);
        return;
      }
      const data = (await res.json()) as { entries: RosterEntryRecord[] };
      setEntries(data.entries);
      setEntry(data.entries.find((e) => e.id === entryId) ?? null);
      setEntryLoaded(true);
    }
    void loadEntry();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void liveSessionRef.current?.stop();
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
    if (!entry) {
      setStatus("Dog not on this show");
      return;
    }
    if (!canRecordWithJudge(judge, judges)) {
      setStatus("Select a judge");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          // AEC + mic routed through Web Audio can mute the track mid-recording.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      updateVuMeter();

      setLiveTranscript("");
      liveFinalRef.current = "";
      liveSessionRef.current = await startDeepgramLiveSession({
        onDisplay: (text) => {
          setLiveTranscript(text);
          if (text.trim()) setStatus("Transcribing…");
        },
        onStatus: setStatus,
      });
      if (liveSessionRef.current) {
        await liveSessionRef.current.attachAudio({ stream, audioContext });
      }

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      setSupportsPause(typeof recorder.pause === "function");
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          liveSessionRef.current?.feedWebmChunk(e.data);
        }
      };
      recorder.onstop = () => void handleStop();
      // timeslice: accumulate full recording AND feed live webm fallback
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      elapsedBaseRef.current = 0;
      tickStartedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      setPaused(false);
      if (!liveSessionRef.current) {
        setStatus("Recording… (batch STT on stop)");
      }
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

  startRecordingRef.current = startRecording;
  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (recordingRef.current) stopRecordingRef.current();
      else void startRecordingRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (!showId || !entryId || !entry) return;

    const live = liveSessionRef.current
      ? await liveSessionRef.current.stop()
      : "";
    liveSessionRef.current = null;
    liveFinalRef.current = live || liveTranscript.trim();

    if (!navigator.onLine) {
      const id = `offline-${Date.now()}`;
      await enqueueRecording({
        id,
        entryId,
        showId,
        blob,
        createdAt: new Date().toISOString(),
        judge: judge ?? undefined,
        liveTranscript: liveFinalRef.current || undefined,
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
        live_transcript: liveFinalRef.current || undefined,
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
        liveTranscript: liveFinalRef.current || undefined,
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
    const result = await syncQueuedRecordings();
    await refreshQueue();
    setStatus(formatQueueSyncStatus(result));
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

      {entryLoaded && !entry ? <EmptyDesk variant="no-entry" /> : null}
      {entry && !canRecordWithJudge(judge, judges) ? (
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
              disabled={!entry || !canRecordWithJudge(judge, judges)}
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

      {(recording || liveTranscript) && (
        <div className="sss-paper space-y-2 p-4">
          <p className="text-xs uppercase tracking-wide text-sss-text-secondary">
            Live transcript
          </p>
          <p className="text-xs text-sss-text-muted">
            Live STT (English). Continues while you speak — fills Narrative on
            Review after stop.
          </p>
          <p className="min-h-[4.5rem] whitespace-pre-wrap text-sm leading-relaxed text-sss-text">
            {liveTranscript || "Listening…"}
          </p>
        </div>
      )}

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
