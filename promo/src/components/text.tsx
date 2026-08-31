import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, EASE_OUT, FONT_SANS, FONT_SERIF } from "../theme";

export const Reveal: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        opacity: interpolate(frame, [delay, delay + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(...EASE_OUT),
        }),
        translate: `0px ${interpolate(frame, [delay, delay + 22], [26, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(...EASE_OUT),
        })}px`,
        filter: `blur(${interpolate(frame, [delay, delay + 18], [7, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      borderRadius: 999,
      border: "1px solid rgba(196,163,90,0.32)",
      background: "rgba(196,163,90,0.10)",
      padding: "9px 20px",
      fontFamily: FONT_SANS,
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: COLORS.goldSoft,
    }}
  >
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: COLORS.gold,
      }}
    />
    {children}
  </div>
);

export const SceneCopy: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  width?: number;
}> = ({ eyebrow, title, sub, width = 560 }) => (
  <div style={{ width, display: "flex", flexDirection: "column", gap: 26 }}>
    <Reveal delay={4}>
      <Eyebrow>{eyebrow}</Eyebrow>
    </Reveal>
    <Reveal delay={10}>
      <h2
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 62,
          lineHeight: 1.08,
          fontWeight: 600,
          color: COLORS.paper,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
    </Reveal>
    <Reveal delay={18}>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontSize: 25,
          lineHeight: 1.55,
          color: COLORS.textDim,
          margin: 0,
          maxWidth: 520,
        }}
      >
        {sub}
      </p>
    </Reveal>
  </div>
);

/** Gold accent span for headlines. */
export const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: COLORS.gold }}>{children}</span>
);
