import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import { createEmptyDraft, isValidFormwert } from "@/lib/domain/adrk-template";
import type { AdrkFormwertCode } from "@/lib/domain/adrk-template";
import { hasDeepgramKey, transcribeWithDeepgram } from "@/lib/deepgram/client";
import {
  mergeLiveAndBatchTranscript,
  type TranscriptSource,
} from "@/lib/deepgram/transcript";

export interface ProcessCritiqueInput {
  audioBase64?: string;
  /** Final live transcript from ringside WebSocket (preferred when present). */
  liveTranscript?: string;
  entryId: string;
  showId: string;
}

export interface ProcessCritiqueResult {
  transcript: string;
  draft: DraftCritiqueSchema;
  mock: boolean;
  source: TranscriptSource;
}

const MOCK_TRANSCRIPT =
  "Arm band one oh one. Vorzüglicher Rüde. Kräftige Knochen. Gute Proportionen. Scissor bite. Bewegung frei und kraftvoll. Formwert V.";

function mapRatingToFormwert(text: string): AdrkFormwertCode | null {
  const lower = text.toLowerCase();
  if (lower.includes("vorzüglich") || /\bv1?\b/i.test(text)) return "V";
  if (lower.includes("sehr gut") || /\bsg\b/i.test(text)) return "Sg";
  if (lower.includes("gut") && !lower.includes("sehr")) return "G";
  if (lower.includes("disqualif")) return "disq.";
  return null;
}

function buildNarrativeFromTranscript(transcript: string): string {
  // Full STT text is the editable narrative; only strip noisy bookends.
  return transcript
    .replace(/Arm band \d+\.\s*/i, "")
    .replace(/Formwert [A-Za-z.]+\.\s*$/i, "")
    .trim();
}

export function structureDraftFromTranscript(
  transcript: string,
): DraftCritiqueSchema {
  const draft = createEmptyDraft();
  draft.narrative = buildNarrativeFromTranscript(transcript);
  draft.formwert = mapRatingToFormwert(transcript);
  draft.draftAssist = {
    note: "Draft assist only — not official ADRK form fields",
    raw_excerpt: transcript.slice(0, 200),
  };
  return draft;
}

/** Prefer existing narrative; otherwise seed from STT for the review textarea. */
export function ensureNarrativeFromTranscript(
  draft: DraftCritiqueSchema,
  transcript: string,
): DraftCritiqueSchema {
  if (draft.narrative.trim()) return draft;
  const fromStt = buildNarrativeFromTranscript(transcript);
  if (!fromStt) return draft;
  return { ...draft, narrative: fromStt };
}

export async function transcribeAudio(
  audioBase64: string | undefined,
): Promise<{ transcript: string; mock: boolean }> {
  if (!audioBase64) {
    return { transcript: MOCK_TRANSCRIPT, mock: true };
  }

  // Preferred: Deepgram prerecorded (batch backup after live, or sole path offline sync).
  if (hasDeepgramKey()) {
    try {
      const bytes = new Uint8Array(Buffer.from(audioBase64, "base64"));
      const text = await transcribeWithDeepgram(bytes, "audio/webm");
      if (text) return { transcript: text, mock: false };
    } catch {
      // fall through to AssemblyAI / mock
    }
  }

  // Legacy optional fallback.
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return { transcript: MOCK_TRANSCRIPT, mock: true };
  }

  try {
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
      body: Buffer.from(audioBase64, "base64"),
    });
    if (!uploadRes.ok) throw new Error("AssemblyAI upload failed");
    const { upload_url } = (await uploadRes.json()) as { upload_url: string };

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "en",
      }),
    });
    if (!transcriptRes.ok) throw new Error("AssemblyAI transcript request failed");
    const job = (await transcriptRes.json()) as { id: string; status: string };

    let status = job.status;
    let text = "";
    for (let i = 0; i < 30 && status !== "completed" && status !== "error"; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(
        `https://api.assemblyai.com/v2/transcript/${job.id}`,
        { headers: { authorization: apiKey } },
      );
      const data = (await poll.json()) as { status: string; text?: string };
      status = data.status;
      text = data.text ?? "";
    }

    if (!text) return { transcript: MOCK_TRANSCRIPT, mock: true };
    return { transcript: text, mock: false };
  } catch {
    return { transcript: MOCK_TRANSCRIPT, mock: true };
  }
}

export async function runLemurStructuring(
  transcript: string,
): Promise<DraftCritiqueSchema> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return structureDraftFromTranscript(transcript);
  }

  try {
    const res = await fetch("https://api.assemblyai.com/lemur/v3/generate/task", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Extract ADRK critique draft from this English ringside transcript. Return JSON with keys: narrative (free-form English prose), formwert (one of vv,V,vsp,Sg,wv,G,disq.,Ggd,oB,zgz,ne or null), placement (1-4 or null), titles (array of title strings). Do NOT use anatomical section keys as official fields.\n\nTranscript:\n${transcript}`,
        final_model: "anthropic/claude-3-5-sonnet",
      }),
    });
    if (!res.ok) throw new Error("LeMUR request failed");
    const data = (await res.json()) as { response?: string };
    const parsed = JSON.parse(data.response ?? "{}") as Partial<DraftCritiqueSchema>;
    const draft = createEmptyDraft();
    const fromStt = structureDraftFromTranscript(transcript).narrative;
    // Empty string from LeMUR must not wipe the STT narrative.
    draft.narrative = parsed.narrative?.trim() || fromStt;
    if (parsed.formwert && isValidFormwert(parsed.formwert)) {
      draft.formwert = parsed.formwert;
    } else {
      draft.formwert = mapRatingToFormwert(transcript);
    }
    draft.placement = parsed.placement ?? null;
    draft.titles = parsed.titles ?? [];
    return ensureNarrativeFromTranscript(draft, transcript);
  } catch {
    return structureDraftFromTranscript(transcript);
  }
}

export async function processCritique(
  input: ProcessCritiqueInput,
): Promise<ProcessCritiqueResult> {
  const batch = await transcribeAudio(input.audioBase64);
  const merged = mergeLiveAndBatchTranscript({
    live: input.liveTranscript,
    batch: batch.transcript,
    batchMock: batch.mock,
  });
  const draft = ensureNarrativeFromTranscript(
    await runLemurStructuring(merged.transcript),
    merged.transcript,
  );
  return {
    transcript: merged.transcript,
    draft,
    mock: merged.mock,
    source: merged.source,
  };
}
