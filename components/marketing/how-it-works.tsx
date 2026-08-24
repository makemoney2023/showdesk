"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { DictationCard, ReviewCard, DeliveryCard } from "./certificate";

const STEPS = [
  {
    kicker: "Step 1",
    title: "Speak",
    body: "The judge critiques the dog aloud, as at any Sieger show. Show Desk records at ringside and transcribes the dictation live, dog by dog, keyed to the armband number. No connection? The recording queues on the device and syncs later.",
    visual: <DictationCard />,
  },
  {
    kicker: "Step 2",
    title: "Review",
    body: "The show secretary sees each transcript as an editable draft — narrative, Formwert rating, and placement — beside the dog's catalog entry. Approve it, and the draft becomes the official critique. SE evaluations flow into the same queue.",
    visual: <ReviewCard />,
  },
  {
    kicker: "Step 3",
    title: "Deliver",
    body: "On release, Show Desk generates the signed critique certificate as a PDF and emails it to the owner on file — the same document, the same day, for every dog in the catalog. Placements, awards, and SE forms print from the same screen.",
    visual: <DeliveryCard />,
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)));
  });

  if (reduced) {
    return (
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
          How Show Desk works
        </h2>
        <div className="mt-12 grid gap-12 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title}>
              <p className="text-xs font-bold tracking-[0.2em] text-[#c4a35a] uppercase">
                {step.kicker}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#f7f4ed]/60">
                {step.body}
              </p>
              <div className="mt-6">{step.visual}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="how-it-works" aria-label="How Show Desk works">
      {/* Mobile: steps in normal flow */}
      <div className="mx-auto max-w-6xl px-6 py-20 lg:hidden">
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed]">
          How Show Desk works
        </h2>
        <div className="mt-10 space-y-14">
          {STEPS.map((step) => (
            <div key={step.title}>
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#c4a35a] uppercase">
                {step.kicker}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#f7f4ed]/60">
                {step.body}
              </p>
              <div className="mt-6 flex justify-center">{step.visual}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: pinned scrollytelling */}
      <div ref={ref} className="relative hidden h-[320vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/4 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(196,163,90,0.08),transparent_65%)]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
                How Show Desk works
              </h2>
              <div className="mt-10 space-y-2">
                {STEPS.map((step, i) => {
                  const isActive = i === active;
                  return (
                    <div
                      key={step.title}
                      className={`relative rounded-xl border p-5 transition-all duration-500 ${
                        isActive
                          ? "border-[#c4a35a]/40 bg-white/[0.04]"
                          : "border-transparent opacity-40"
                      }`}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="hiw-marker"
                          className="absolute top-5 bottom-5 left-0 w-[3px] rounded-full bg-[#c4a35a]"
                        />
                      ) : null}
                      <p className="text-[11px] font-bold tracking-[0.2em] text-[#c4a35a] uppercase">
                        {step.kicker}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#f7f4ed]/60">
                        {step.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative hidden h-[30rem] items-center justify-center [perspective:1200px] lg:flex">
              {STEPS.map((step, i) => {
                const isActive = i === active;
                const isPast = i < active;
                return (
                  <motion.div
                    key={step.title}
                    className="absolute [transform-style:preserve-3d]"
                    initial={false}
                    animate={
                      isActive
                        ? { opacity: 1, rotateY: 0, scale: 1, y: 0, z: 0 }
                        : isPast
                          ? { opacity: 0, rotateY: -35, scale: 0.9, y: -60, z: -160 }
                          : { opacity: 0, rotateY: 35, scale: 0.9, y: 60, z: -160 }
                    }
                    transition={{ duration: 0.65, ease: [0.21, 0.65, 0.36, 1] }}
                  >
                    {step.visual}
                  </motion.div>
                );
              })}
              <div
                aria-hidden
                className="absolute bottom-10 left-1/2 h-6 w-64 -translate-x-1/2 rounded-[100%] bg-black/60 blur-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
