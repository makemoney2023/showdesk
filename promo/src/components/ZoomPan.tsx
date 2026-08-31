import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { EASE_INOUT } from "../theme";

export type ZoomKey = { frame: number; scale: number; origin?: string };

/**
 * openvid-style smooth zoom: scales children toward a point of interest.
 * Keyframes are in scene-local frames; origin sticks to the previous key's.
 */
export const ZoomPan: React.FC<{
  keys: ZoomKey[];
  children: React.ReactNode;
}> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  const frames = keys.map((k) => k.frame);
  const scales = keys.map((k) => k.scale);
  const active =
    [...keys].reverse().find((k) => k.frame <= frame) ?? keys[0];

  return (
    <div
      style={{
        scale: String(
          interpolate(frame, frames, scales, {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...EASE_INOUT),
          }),
        ),
        transformOrigin: active.origin ?? "50% 50%",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};

/** Scene-level fade in/out against the dark stage. */
export const SceneFade: React.FC<{
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
  children: React.ReactNode;
}> = ({ duration, fadeIn = 12, fadeOut = 12, children }) => {
  const frame = useCurrentFrame();
  const fadeInOpacity = interpolate(frame, [0, Math.max(fadeIn, 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOutOpacity =
    fadeOut > 0
      ? interpolate(frame, [duration - fadeOut, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: Math.min(fadeInOpacity, fadeOutOpacity),
      }}
    >
      {children}
    </div>
  );
};
