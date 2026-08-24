"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { CertificateCard } from "./certificate";

const EASE = [0.21, 0.65, 0.36, 1] as const;

export function Hero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Scroll parallax: copy drifts up, the certificate stack fans open.
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const stackY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fan = useTransform(scrollYProgress, [0, 0.8], [1, 2.1]);

  // Pointer tilt on the 3D stack.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), {
    stiffness: 120,
    damping: 18,
  });

  const backRotateZ = useTransform(fan, (v) => -7 * v);
  const backX = useTransform(fan, (v) => -34 * v);
  const midRotateZ = useTransform(fan, (v) => 6 * v);
  const midX = useTransform(fan, (v) => 30 * v);

  const headline = ["The judge speaks.", "The certificate arrives", "the same day."];

  return (
    <section
      ref={ref}
      aria-label="Show Desk introduction"
      className="relative overflow-hidden pt-32 pb-24 sm:pt-40 lg:min-h-screen"
      onPointerMove={(e) => {
        if (reduced) return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(196,163,90,0.16),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(166,124,82,0.1),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(247,244,237,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(247,244,237,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}>
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c4a35a]/30 bg-[#c4a35a]/10 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#d4b87a] uppercase"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#c4a35a]" />
            Show Desk · Sieger show secretary
          </motion.p>

          <h1 className="font-[family-name:var(--font-fraunces)] text-[2.6rem] leading-[1.06] font-semibold tracking-tight text-[#f7f4ed] sm:text-6xl lg:text-[4.2rem]">
            {headline.map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={reduced ? false : { opacity: 0, y: 34, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.12 + i * 0.14, ease: EASE }}
              >
                {i === 2 ? <span className="text-[#c4a35a]">{line}</span> : line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            className="mt-7 max-w-xl text-base leading-relaxed text-[#f7f4ed]/65 sm:text-lg"
          >
            Show Desk is show secretary software for German-style breed shows —
            Sieger shows, SE evaluations, and breed surveys. It records the
            judge&rsquo;s spoken critique ringside, transcribes it live, and
            emails the official critique certificate to the owner before they
            leave the grounds.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/login"
              className="group relative rounded-full bg-[#c4a35a] px-7 py-3.5 text-sm font-bold text-[#141210] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              Try the live demo
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-[#c4a35a] opacity-40 blur-xl transition-opacity group-hover:opacity-70"
              />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-[#f7f4ed]/85 transition-colors hover:border-[#c4a35a]/60 hover:text-[#f7f4ed]"
            >
              See how it works ↓
            </a>
          </motion.div>
        </motion.div>

        {/* 3D certificate stack */}
        <motion.div
          className="relative mx-auto hidden [perspective:1400px] sm:block"
          style={reduced ? undefined : { y: stackY }}
        >
          <motion.div
            className="relative h-[26rem] w-[22rem] [transform-style:preserve-3d]"
            style={reduced ? undefined : { rotateX, rotateY }}
            initial={reduced ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.35, ease: EASE }}
          >
            <motion.div
              className="absolute top-10 left-0 [transform-style:preserve-3d]"
              style={
                reduced
                  ? undefined
                  : { rotateZ: backRotateZ, x: backX, z: -110 }
              }
            >
              <CertificateCard
                dogName="Bella von Ostsee"
                armband="212"
                klass="Open Class — Female (Hündin)"
                rating="SG"
                ratingLabel="Sehr Gut · Very good"
              />
            </motion.div>
            <motion.div
              className="absolute top-5 left-6 [transform-style:preserve-3d]"
              style={
                reduced
                  ? undefined
                  : { rotateZ: midRotateZ, x: midX, z: -55 }
              }
            >
              <CertificateCard
                dogName="Axel vom Nordwald"
                armband="147"
                klass="Working Dog Class — Male (Rüde)"
                rating="V2"
                ratingLabel="Vorzüglich · Excellent"
              />
            </motion.div>
            <div className="absolute top-0 left-3 [transform:translateZ(0px)]">
              <CertificateCard
                dogName="Rex vom Blacksage"
                armband="101"
                klass="Youth Class I — Male (Rüde)"
                rating="V1"
                ratingLabel="Vorzüglich · Excellent"
              />
            </div>
            <div
              aria-hidden
              className="absolute -bottom-10 left-1/2 h-8 w-72 -translate-x-1/2 rounded-[100%] bg-black/60 blur-2xl"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
