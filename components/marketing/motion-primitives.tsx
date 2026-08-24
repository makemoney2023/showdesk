"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import type { ReactNode } from "react";

/** Thin tan progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[#c4a35a]"
      style={{ scaleX }}
    />
  );
}

/** Fade-and-rise reveal when the element scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.65, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Pointer-tracked 3D tilt card with a tan glow that follows the cursor. */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), {
    stiffness: 180,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), {
    stiffness: 180,
    damping: 20,
  });
  const glow = useMotionTemplate`radial-gradient(220px circle at ${useTransform(mx, (v) => v * 100)}% ${useTransform(my, (v) => v * 100)}%, rgba(196,163,90,0.14), transparent 70%)`;

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="[perspective:900px]">
      <motion.div
        className={`group relative [transform-style:preserve-3d] ${className ?? ""}`}
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - rect.left) / rect.width);
          my.set((e.clientY - rect.top) / rect.height);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
        {children}
      </motion.div>
    </div>
  );
}

/** Horizontal marquee of breed-show terms, used as a section divider. */
export function TermMarquee() {
  const terms = [
    "V1 · Vorzüglich",
    "SG · Sehr Gut",
    "Sieger",
    "Siegerin",
    "Richterbericht",
    "Formwert",
    "Körung",
    "SE · Standard Evaluation",
    "ZTP",
    "Anwartschaft",
    "Gekört",
    "BOB · BOS",
  ];
  const row = terms.map((t) => (
    <span
      key={t}
      className="mx-6 inline-flex items-center gap-6 text-sm font-medium tracking-[0.18em] text-[#f7f4ed]/25 uppercase"
    >
      {t}
      <span aria-hidden className="text-[#c4a35a]/40">
        ✦
      </span>
    </span>
  ));
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-4"
    >
      <div className="mk-marquee flex w-max">
        <div className="flex shrink-0 items-center">{row}</div>
        <div className="flex shrink-0 items-center">{row}</div>
      </div>
    </div>
  );
}
