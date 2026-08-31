import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/** Dark stage matching the Show Desk marketing site: gold glows + faint grid. */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div
        style={{
          position: "absolute",
          top: -340,
          left: "50%",
          width: 1500,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(196,163,90,0.17), transparent 60%)",
          translate: `${-750 + Math.sin(frame / 210) * 40}px 0px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 320,
          right: -320,
          width: 820,
          height: 820,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(166,124,82,0.11), transparent 65%)",
          translate: `0px ${Math.cos(frame / 260) * 30}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(247,244,237,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(247,244,237,0.028) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 40%, black, transparent)",
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />
    </AbsoluteFill>
  );
};
