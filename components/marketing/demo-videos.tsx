"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import { Reveal } from "./motion-primitives";

const CLIPS = [
  {
    src: "/videos/demo-ringside.mp4",
    poster: "/videos/demo-ringside-poster.jpg",
    title: "Ringside on any phone",
    body: "One tap starts the critique — live transcription while the judge speaks, offline queue when the Wi-Fi drops.",
  },
  {
    src: "/videos/demo-review.mp4",
    poster: "/videos/demo-review-poster.jpg",
    title: "Review → certificate",
    body: "The narrative arrives pre-filled from speech-to-text. Approve & release emails the TNRK certificate.",
  },
  {
    src: "/videos/demo-desk.mp4",
    poster: "/videos/demo-desk-poster.jpg",
    title: "Placements & reports",
    body: "Division-safe places 1–4 per day, class, and sex — and every document per dog, ready to print.",
  },
] as const;

/** Muted clip that plays while on screen and pauses off screen. */
function AutoPlayClip({ src, poster }: { src: string; poster: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      controls={Boolean(reduced)}
      aria-hidden={!reduced}
      className="aspect-video w-full object-cover"
    />
  );
}

/** Featured promo with a poster + play overlay, then native controls. */
function PromoPlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      <video
        ref={ref}
        src="/videos/showdesk-promo.mp4"
        poster="/videos/showdesk-promo-poster.jpg"
        playsInline
        preload="metadata"
        controls={started}
        className="aspect-video w-full"
      />
      {!started ? (
        <button
          type="button"
          aria-label="Play the Show Desk promo video"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/10"
          onClick={() => {
            setStarted(true);
            void ref.current?.play().catch(() => undefined);
          }}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#c4a35a] text-[#141210] shadow-[0_0_60px_rgba(196,163,90,0.55)] transition-transform duration-200 group-hover:scale-110">
            <Play className="ml-1 h-8 w-8 fill-current" />
          </span>
          <span className="absolute bottom-5 left-6 rounded-full bg-black/55 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-[#f7f4ed]/85 uppercase backdrop-blur-sm">
            Watch the 45-second tour
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function DemoVideosSection() {
  return (
    <section
      id="demo"
      aria-label="Show Desk demo videos"
      className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c4a35a]/25 to-transparent"
      />
      <Reveal>
        <p className="text-xs font-semibold tracking-[0.22em] text-[#c4a35a] uppercase">
          See it in action
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-fraunces)] text-3xl leading-tight font-semibold text-[#f7f4ed] sm:text-4xl">
          From the first bark to the last certificate —{" "}
          <span className="text-[#c4a35a]">in under a minute</span>
        </h2>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#f7f4ed]/60">
          Real footage from the live demo: the steward records ringside, the
          transcript writes itself, the secretary approves, and the owner has
          the certificate before they leave the grounds.
        </p>
      </Reveal>

      <Reveal delay={0.2} className="mt-12">
        <PromoPlayer />
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {CLIPS.map((clip, i) => (
          <Reveal key={clip.src} delay={0.1 + i * 0.1}>
            <figure className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] transition-colors hover:border-[#c4a35a]/35">
              <AutoPlayClip src={clip.src} poster={clip.poster} />
              <figcaption className="p-6">
                <p className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#f7f4ed]">
                  {clip.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#f7f4ed]/55">
                  {clip.body}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
