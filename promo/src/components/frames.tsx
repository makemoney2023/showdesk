import React from "react";
import { COLORS, FONT_SANS } from "../theme";

/**
 * Safari-style dark browser chrome, openvid-style device mockup.
 * `width` is the content width; footage keeps its own aspect ratio below the bar.
 */
export const BrowserFrame: React.FC<{
  width: number;
  height: number;
  url: string;
  children: React.ReactNode;
}> = ({ width, height, url, children }) => {
  const bar = 58;
  return (
    <div
      style={{
        width,
        height: height + bar,
        borderRadius: 20,
        background: COLORS.chrome,
        border: `1px solid ${COLORS.chromeBorder}`,
        boxShadow:
          "0 50px 140px rgba(0,0,0,0.6), 0 0 90px rgba(196,163,90,0.10)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: bar,
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          gap: 8,
          borderBottom: `1px solid rgba(247,244,237,0.07)`,
        }}
      >
        <span style={dot("#ff5f57")} />
        <span style={dot("#febc2e")} />
        <span style={dot("#28c840")} />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 17,
              fontWeight: 500,
              color: "rgba(247,244,237,0.55)",
              background: "rgba(247,244,237,0.06)",
              borderRadius: 999,
              padding: "7px 26px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: COLORS.gold, fontSize: 13 }}>●</span>
            {url}
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>
      <div style={{ width, height, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

const dot = (color: string): React.CSSProperties => ({
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: color,
  flexShrink: 0,
});

/** Minimal modern phone mockup around 430x932 footage. */
export const PhoneFrame: React.FC<{
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ width, height, children }) => {
  const bezel = 15;
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        borderRadius: 64,
        background: "linear-gradient(160deg, #23201a, #0d0c0a)",
        border: "1px solid rgba(247,244,237,0.16)",
        padding: bezel,
        boxShadow:
          "0 50px 140px rgba(0,0,0,0.65), 0 0 90px rgba(196,163,90,0.12)",
        position: "relative",
      }}
    >
      <div
        style={{
          width,
          height,
          borderRadius: 50,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
        {/* Dynamic island */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            translate: "-50% 0",
            width: 118,
            height: 32,
            borderRadius: 999,
            background: "#0a0908",
            opacity: 0.92,
          }}
        />
      </div>
    </div>
  );
};
