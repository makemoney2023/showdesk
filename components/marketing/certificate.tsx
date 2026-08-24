/** Presentational paper mocks used as the 3D objects on the marketing page. */

function TextLine({ w }: { w: string }) {
  return <div className="h-1.5 rounded-full bg-[#141210]/12" style={{ width: w }} />;
}

export function CertificateCard({
  dogName,
  armband,
  klass,
  rating,
  ratingLabel,
}: {
  dogName: string;
  armband: string;
  klass: string;
  rating: string;
  ratingLabel: string;
}) {
  return (
    <div className="w-64 rounded-lg bg-[#f7f4ed] p-4 text-[#141210] shadow-[0_24px_60px_rgba(0,0,0,0.55)] ring-1 ring-black/10 sm:w-72">
      <div className="rounded-md border border-[#141210]/25 p-4">
        <div className="border-b border-[#141210]/15 pb-3 text-center">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#a67c52] text-[10px] font-bold tracking-widest text-[#a67c52]">
            SD
          </div>
          <p className="font-[family-name:var(--font-fraunces)] text-sm font-semibold tracking-wide">
            Critique Certificate
          </p>
          <p className="mt-0.5 text-[9px] tracking-[0.22em] text-[#141210]/50 uppercase">
            Sieger Show · Richterbericht
          </p>
        </div>
        <div className="space-y-2.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-[family-name:var(--font-fraunces)] text-base font-semibold">
              {dogName}
            </p>
            <span className="rounded-sm bg-[#141210] px-1.5 py-0.5 text-[9px] font-bold text-[#f7f4ed]">
              #{armband}
            </span>
          </div>
          <p className="text-[10px] tracking-wide text-[#141210]/60">{klass}</p>
          <div className="space-y-1.5 pt-1">
            <TextLine w="100%" />
            <TextLine w="92%" />
            <TextLine w="97%" />
            <TextLine w="84%" />
            <TextLine w="95%" />
            <TextLine w="60%" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#141210]/15 pt-3">
          <div>
            <p className="text-[8px] tracking-[0.18em] text-[#141210]/50 uppercase">
              Formwert
            </p>
            <p className="text-[10px] text-[#141210]/70">{ratingLabel}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c4a35a] font-[family-name:var(--font-fraunces)] text-sm font-bold text-[#141210]">
            {rating}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Step 1 visual — live ringside dictation. */
export function DictationCard() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111]/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <span className="rounded-sm bg-[#f7f4ed] px-2 py-0.5 text-[10px] font-bold text-[#141210]">
          #101 · Youth Class I — Male
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-[#e25c4a] uppercase">
          <span className="mk-blink inline-block h-2 w-2 rounded-full bg-[#e25c4a]" />
          Rec 2:41
        </span>
      </div>
      <div className="my-5 flex h-12 items-end justify-center gap-[3px]">
        {[4, 9, 6, 12, 8, 14, 10, 16, 9, 13, 7, 11, 5, 9, 12, 8, 14, 6, 10, 4].map(
          (h, i) => (
            <span
              key={i}
              className="mk-wave w-1 rounded-full bg-[#c4a35a]"
              style={{ height: `${h * 3}px`, animationDelay: `${i * 70}ms` }}
            />
          ),
        )}
      </div>
      <div className="space-y-2 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-[#f7f4ed]/80">
        <p>
          “Correct medium size, strong and typey head, dark eye, scissor bite
          complete…”
        </p>
        <p className="text-[#f7f4ed]/45">
          “…very good angulation, moves with powerful drive —{" "}
          <span className="text-[#c4a35a]">vorzüglich</span>.”
        </p>
      </div>
      <p className="mt-3 text-right text-[10px] tracking-widest text-[#f7f4ed]/40 uppercase">
        Live transcription · offline queue ready
      </p>
    </div>
  );
}

/** Step 2 visual — secretary review draft. */
export function ReviewCard() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111]/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#f7f4ed]">
          Rex vom Blacksage <span className="text-[#f7f4ed]/40">· #101</span>
        </p>
        <span className="rounded-full border border-[#c4a35a]/50 px-2 py-0.5 text-[10px] font-semibold text-[#c4a35a]">
          Pending review
        </span>
      </div>
      <div className="mt-4 space-y-1.5 rounded-lg bg-white/5 p-3">
        <p className="text-[9px] tracking-[0.18em] text-[#f7f4ed]/40 uppercase">
          Narrative (draft)
        </p>
        <div className="space-y-1.5 pt-1">
          {["100%", "94%", "97%", "88%", "52%"].map((w, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full bg-[#f7f4ed]/20"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-[#c4a35a] px-2.5 py-1 text-xs font-bold text-[#141210]">
          V · Excellent
        </span>
        <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-[#f7f4ed]/70">
          Place 1
        </span>
      </div>
      <div className="mt-4 rounded-lg bg-[#f7f4ed] py-2 text-center text-xs font-bold text-[#141210]">
        Approve &amp; release
      </div>
    </div>
  );
}

/** Step 3 visual — certificate delivered to the owner. */
export function DeliveryCard() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111]/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
      <div className="space-y-2 border-b border-white/10 pb-3 text-xs">
        <p className="text-[#f7f4ed]/50">
          To: <span className="text-[#f7f4ed]">owner@kennel.com</span>
        </p>
        <p className="font-semibold text-[#f7f4ed]">
          Your critique certificate — Rex vom Blacksage
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/5 p-3">
        <div className="flex h-11 w-9 flex-col items-center justify-center rounded-sm bg-[#f7f4ed] text-[#141210]">
          <span className="text-[8px] font-bold">PDF</span>
          <span className="font-[family-name:var(--font-fraunces)] text-[10px] font-bold text-[#a67c52]">
            V1
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#f7f4ed]">
            critique-certificate.pdf
          </p>
          <p className="text-[10px] text-[#f7f4ed]/45">
            Signed · Youth Class I — Male
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-[#7ec98f] uppercase">
          <span className="inline-block h-2 w-2 rounded-full bg-[#7ec98f]" />
          Delivered · same day
        </span>
        <span className="text-[10px] text-[#f7f4ed]/40">16:42 ringside</span>
      </div>
    </div>
  );
}
