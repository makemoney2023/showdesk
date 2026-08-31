import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import { Backdrop } from "./components/Backdrop";
import { BrowserFrame, PhoneFrame } from "./components/frames";
import { ZoomPan, type ZoomKey } from "./components/ZoomPan";
import { COLORS, EASE_OUT, FONT_SANS } from "./theme";

const FPS = 30;

/** Caption chip that swaps its label over time, pinned to a corner. */
const Captions: React.FC<{
  items: { at: number; text: string }[];
  side?: "left" | "bottom";
}> = ({ items, side = "left" }) => {
  const frame = useCurrentFrame();
  const idx = items.reduce((acc, item, i) => (frame >= item.at ? i : acc), 0);
  const current = items[idx];
  const appeared = frame - current.at;
  return (
    <div
      style={{
        position: "absolute",
        ...(side === "left"
          ? { left: 84, top: "50%", translate: "0 -50%", maxWidth: 430 }
          : { left: "50%", bottom: 56, translate: "-50% 0" }),
        display: "flex",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.35,
          color: COLORS.paper,
          background: "rgba(20,18,16,0.82)",
          border: `1px solid rgba(196,163,90,0.4)`,
          borderRadius: 20,
          padding: "22px 32px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
          opacity: interpolate(appeared, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0px ${interpolate(appeared, [0, 14], [18, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...EASE_OUT),
          })}px`,
        }}
      >
        <span style={{ color: COLORS.goldSoft, marginRight: 12 }}>●</span>
        {current.text}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
export const DEMO_RINGSIDE_DURATION = 540;

export const DemoRingside: React.FC = () => {
  const zoomKeys: ZoomKey[] = [
    { frame: 0, scale: 1 },
    { frame: 210, scale: 1 },
    { frame: 250, scale: 1.4, origin: "50% 78%" },
    { frame: 430, scale: 1.4 },
    { frame: 470, scale: 1 },
  ];
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ scale: "0.93" }}>
          <PhoneFrame width={430} height={932}>
            <ZoomPan keys={zoomKeys}>
              <Video
                src={staticFile("footage/ringside.webm")}
                trimBefore={Math.round(1.2 * FPS)}
                playbackRate={1.5}
                style={{ width: 430, height: 932, objectFit: "cover" }}
              />
            </ZoomPan>
          </PhoneFrame>
        </div>
      </AbsoluteFill>
      <Captions
        items={[
          { at: 8, text: "Ringside runs on the steward's phone" },
          { at: 130, text: "One tap starts the critique recording" },
          { at: 250, text: "Live transcript while the judge speaks" },
          { at: 470, text: "Stop — it's off to the review queue" },
        ]}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
export const DEMO_REVIEW_DURATION = 280;

export const DemoReview: React.FC = () => {
  const width = 1500;
  const height = Math.round((width / 1600) * 1000);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ scale: "0.94" }}>
          <BrowserFrame width={width} height={height} url="showdesk.app/admin/review">
            <ZoomPan
              keys={[
                { frame: 0, scale: 1 },
                { frame: 55, scale: 1.22, origin: "58% 42%" },
                { frame: 130, scale: 1.22 },
                { frame: 152, scale: 1, origin: "58% 42%" },
                { frame: 160, scale: 1, origin: "42% 84%" },
                { frame: 190, scale: 1.26, origin: "42% 84%" },
                { frame: 245, scale: 1.26 },
                { frame: 272, scale: 1 },
              ]}
            >
              <Video
                src={staticFile("footage/review.webm")}
                trimBefore={Math.round(0.5 * FPS)}
                playbackRate={1.3}
                style={{ width, height, objectFit: "cover" }}
              />
            </ZoomPan>
          </BrowserFrame>
        </div>
      </AbsoluteFill>
      <Captions
        side="bottom"
        items={[
          { at: 8, text: "The narrative is pre-filled from speech-to-text" },
          { at: 160, text: "Approve & release — the certificate is emailed" },
        ]}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
export const DEMO_DESK_DURATION = 375;

export const DemoDesk: React.FC = () => {
  const width = 1500;
  const height = Math.round((width / 1600) * 1000);
  const SPLIT = 222;
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ scale: "0.94" }}>
          <Sequence durationInFrames={SPLIT} layout="none" name="Placements">
            <BrowserFrame
              width={width}
              height={height}
              url="showdesk.app/ringside/placements"
            >
              <ZoomPan
                keys={[
                  { frame: 0, scale: 1 },
                  { frame: 55, scale: 1.16, origin: "62% 48%" },
                  { frame: 175, scale: 1.16 },
                  { frame: 210, scale: 1 },
                ]}
              >
                <Video
                  src={staticFile("footage/placements.webm")}
                  trimBefore={Math.round(1.0 * FPS)}
                  playbackRate={1.6}
                  style={{ width, height, objectFit: "cover" }}
                />
              </ZoomPan>
            </BrowserFrame>
          </Sequence>
          <Sequence from={SPLIT} layout="none" name="Reports">
            <BrowserFrame
              width={width}
              height={height}
              url="showdesk.app/admin/reports"
            >
              <ZoomPan
                keys={[
                  { frame: 0, scale: 1 },
                  { frame: 45, scale: 1.12, origin: "50% 55%" },
                  { frame: 120, scale: 1.12 },
                  { frame: 148, scale: 1 },
                ]}
              >
                <Video
                  src={staticFile("footage/reports.webm")}
                  trimBefore={Math.round(0.5 * FPS)}
                  playbackRate={1.4}
                  style={{ width, height, objectFit: "cover" }}
                />
              </ZoomPan>
            </BrowserFrame>
          </Sequence>
        </div>
      </AbsoluteFill>
      <Captions
        side="bottom"
        items={[
          { at: 8, text: "Placements by day, class, and sex division" },
          { at: SPLIT + 8, text: "Every dog's documents — print or download" },
        ]}
      />
    </AbsoluteFill>
  );
};
