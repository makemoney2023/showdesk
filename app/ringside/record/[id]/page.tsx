"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enqueueRecording, listQueuedRecordings } from "@/lib/offline/queue";
import {
  blobToBase64,
  formatQueueSyncStatus,
  syncQueuedRecordings,
} from "@/lib/offline/sync";
import { formatElapsed } from "@/lib/domain/show-day";
import {
  divisionKey,
  divisionLabel,
  nextDogInDivision,
} from "@/lib/domain/class-division";
import { canRecordWithJudge, syncShowJudges } from "@/lib/domain/show-judges";
import { stickyJudgeForShow } from "@/lib/client/sticky-judge";
import { useRingsideJudge } from "@/components/ringside/RingsideJudgeContext";
import { startDeepgramLiveSession } from "@/lib/client/deepgram-live";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeLock,
} from "@/lib/client/screen-wake-lock";
import { microphoneErrorLabel } from "@/lib/domain/recording-readiness";
import type { RosterEntryRecord, Show } from "@/lib/types";
import {
  CheckCircle2,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  Square,
  TriangleAlert,
} from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { VuMeter } from "@/components/desk/VuMeter";

export default function RecordPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = params.id as string;
  const ringsideJudge = useRingsideJudge();
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
  const [micCheck, setMicCheck] = useState<
    "unknown" | "checking" | "ready" | "error"
  >("unknown");
  const [micMessage, setMicMessage] = useState(
    "Test the microphone before the class starts.",
  );
  const [wakeLockActive, setWakeLockActive] = useState(false);
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
  const wakeLockRef = useRef<ScreenWakeLock | null>(null);
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
      if (!showRes.ok) {
        setEntryLoaded(true);
        return;
      }
      const showData = (await showRes.json()) as {
        shows: Show[];
        active_show_id: string | null;
      };
      if (!showData.active_show_id) {
        setEntryLoaded(true);
        return;
      }
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
      void releaseScreenWakeLock(wakeLockRef.current);
    };
  }, [entryId, refreshQueue]);

  useEffect(() => {
    if (!ringsideJudge.available) return;
    setJudge(ringsideJudge.judge || null);
    setJudges(ringsideJudge.judges);
  }, [ringsideJudge.available, ringsideJudge.judge, ringsideJudge.judges]);

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

  const acquireWakeLock = useCallback(async () => {
    if (wakeLockRef.current) return;
    const lock = await requestScreenWakeLock();
    wakeLockRef.current = lock;
    setWakeLockActive(Boolean(lock));
    lock?.addEventListener?.(
      "release",
      () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      },
      { once: true },
    );
  }, []);

  async function checkMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicCheck("error");
      setMicMessage("This browser cannot access a microphone");
      return;
    }
    setMicCheck("checking");
    setMicMessage("Checking microphone…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      stream.getTracks().forEach((item) => item.stop());
      setMicCheck("ready");
      setMicMessage(track?.label ? `Ready · ${track.label}` : "Microphone ready");
    } catch (error) {
      setMicCheck("error");
      setMicMessage(microphoneErrorLabel(error));
    }
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
      setMicCheck("ready");
      setMicMessage("Microphone ready");
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
      await acquireWakeLock();
      if (!liveSessionRef.current) {
        setStatus("Recording… (batch STT on stop)");
      }
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const message = microphoneErrorLabel(error);
      setMicCheck("error");
      setMicMessage(message);
      setStatus(message);
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
    void releaseScreenWakeLock(wakeLockRef.current);
    wakeLockRef.current = null;
    setWakeLockActive(false);
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
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A"
      ) {
        return;
      }
      e.preventDefault();
      if (recordingRef.current) stopRecordingRef.current();
      else void startRecordingRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!recording) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function guardNavigation(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]");
      if (!link) return;
      if (
        !window.confirm(
          "Recording is still running. Leave anyway and discard it?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && recordingRef.current) {
        void acquireWakeLock();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", guardNavigation, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", guardNavigation, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [acquireWakeLock, recording]);

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
      router.push(nextRecordingHref());
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
      router.push(nextRecordingHref());
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

  function nextRecordingHref(): string {
    if (!entry) return "/ringside";
    const division = divisionKey(entry);
    const nextId = nextDogInDivision(entries, entry.id);
    return nextId
      ? `/ringside/record/${nextId}?division=${encodeURIComponent(division)}`
      : `/ringside?division=${encodeURIComponent(division)}&division_complete=${encodeURIComponent(division)}`;
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

  const canStart = Boolean(entry && canRecordWithJudge(judge, judges));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <BackLink
          href={
            searchParams.get("division")
              ? `/ringside?division=${encodeURIComponent(searchParams.get("division")!)}`
              : "/ringside"
          }
        >
          Back to dogs
        </BackLink>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Record critique
        </h1>
        {entry ? (
          <p className="text-sm text-sss-text-secondary">
            #{entry.armband} {entry.dog_name} · {divisionLabel(entry)} · Space
            starts or stops
          </p>
        ) : null}
      </div>

      {entryLoaded && !entry ? <EmptyDesk variant="no-entry" /> : null}
      {entry && !canRecordWithJudge(judge, judges) ? (
        <EmptyDesk variant="select-judge" />
      ) : null}

      <div className="sss-tray flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          {micCheck === "checking" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : micCheck === "ready" ? (
            <CheckCircle2 className="h-4 w-4 text-sss-success" aria-hidden />
          ) : micCheck === "error" ? (
            <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden />
          ) : (
            <Mic className="h-4 w-4 text-sss-text-muted" aria-hidden />
          )}
          <div>
            <p className="text-sm font-medium">Audio readiness</p>
            <p className="text-xs text-sss-text-muted">{micMessage}</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={micCheck === "checking" || recording}
          onClick={() => void checkMicrophone()}
        >
          {micCheck === "ready" ? "Test again" : "Test microphone"}
        </Button>
      </div>

      <div className="sss-paper space-y-5 p-5">
        <p className="text-center font-mono text-4xl tabular-nums tracking-tight">
          {formatElapsed(elapsed)}
        </p>
        <VuMeter
          level={vuLevel}
          label={status}
        />
        <div className="flex flex-col items-center gap-3">
          {!recording ? (
            <Button
              disabled={!canStart}
              onClick={() => void startRecording()}
              className="h-[4.5rem] w-[4.5rem] rounded-full px-0 shadow-sss-card disabled:opacity-40"
              aria-label="Start recording"
            >
              <Mic className="h-7 w-7" />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {supportsPause ? (
                paused ? (
                  <Button
                    variant="outline"
                    onClick={resumeRecording}
                    className="h-14 w-14 rounded-full px-0"
                    aria-label="Resume"
                  >
                    <Play className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={pauseRecording}
                    className="h-14 w-14 rounded-full px-0"
                    aria-label="Pause"
                  >
                    <Pause className="h-5 w-5" />
                  </Button>
                )
              ) : null}
              <Button
                variant="destructive"
                onClick={stopRecording}
                className="sss-record-pulse h-[4.5rem] w-[4.5rem] rounded-full px-0"
                aria-label="Stop & process"
              >
                <Square className="h-6 w-6" />
              </Button>
            </div>
          )}
          <p className="text-sm font-medium">
            {!recording
              ? "Start recording"
              : paused
                ? "Resume · Stop & process"
                : "Stop & process"}
          </p>
          {recording ? (
            <p className="text-xs text-sss-text-muted">
              {wakeLockActive
                ? "Screen will stay awake while recording."
                : "Keep this screen open while recording."}
            </p>
          ) : null}
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
