"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  enqueueRecording,
  listQueuedRecordings,
  removeQueuedRecording,
} from "@/lib/offline/queue";
import type { RosterEntryRecord } from "@/lib/types";
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
  const [showId, setShowId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supportsPause, setSupportsPause] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [queueCount, setQueueCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshQueue = useCallback(async () => {
    const items = await listQueuedRecordings();
    setQueueCount(items.length);
  }, []);

  useEffect(() => {
    void refreshQueue();
    async function loadEntry() {
      const showRes = await fetch("/api/shows");
      if (!showRes.ok) return;
      const showData = (await showRes.json()) as { active_show_id: string | null };
      if (!showData.active_show_id) return;
      setShowId(showData.active_show_id);
      const res = await fetch(`/api/entries?show_id=${showData.active_show_id}`);
      const data = (await res.json()) as { entries: RosterEntryRecord[] };
      setEntry(data.entries.find((e) => e.id === entryId) ?? null);
    }
    void loadEntry();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [entryId, refreshQueue]);

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
      });
      setStatus("Saved to offline queue");
      await refreshQueue();
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
      }),
    });
    if (res.ok) {
      setStatus("Sent to review queue");
      router.push("/ringside");
    } else {
      const id = `offline-${Date.now()}`;
      await enqueueRecording({
        id,
        entryId,
        showId,
        blob,
        createdAt: new Date().toISOString(),
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
            #{entry.armband} {entry.dog_name}
          </p>
        ) : null}
      </div>

      <div className="sss-paper space-y-3 p-4">
        <VuMeter level={vuLevel} label={status} />
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <Button onClick={() => void startRecording()}>Start recording</Button>
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
            {queueCount} recording(s) in offline queue (IndexedDB)
          </p>
          <Button variant="outline" onClick={() => void syncQueue()}>
            Sync queue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
