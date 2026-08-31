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
import { SceneCopy, Reveal, Eyebrow, Gold } from "./components/text";
import { ZoomPan, SceneFade, type ZoomKey } from "./components/ZoomPan";
import { COLORS, EASE_OUT, FONT_SANS, FONT_SERIF } from "./theme";

const FPS = 30;

/* Scene schedule (frames) */
const S1 = { from: 0, dur: 120 };
const S2 = { from: 112, dur: 160 };
const S3 = { from: 264, dur: 300 };
const S4 = { from: 556, dur: 244 };
const S5 = { from: 792, dur: 200 };
const S6 = { from: 984, dur: 150 };
const S7 = { from: 1126, dur: 184 };
export const PROMO_DURATION = S7.from + S7.dur;

/* ------------------------------------------------------------------ */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    { text: "The judge speaks.", gold: false },
    { text: "The certificate arrives", gold: false },
    { text: "the same day.", gold: true },
  ];
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 42,
      }}
    >
      <Reveal delay={2}>
        <Eyebrow>Show Desk · Sieger show secretary</Eyebrow>
      </Reveal>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 108,
          lineHeight: 1.07,
          fontWeight: 600,
          color: COLORS.paper,
          margin: 0,
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {lines.map((line, i) => (
          <span
            key={line.text}
            style={{
              display: "block",
              color: line.gold ? COLORS.gold : COLORS.paper,
              opacity: interpolate(frame, [10 + i * 7, 30 + i * 7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...EASE_OUT),
              }),
              translate: `0px ${interpolate(
                frame,
                [10 + i * 7, 32 + i * 7],
                [40, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(...EASE_OUT),
                },
              )}px`,
              filter: `blur(${interpolate(
                frame,
                [10 + i * 7, 30 + i * 7],
                [10, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}px)`,
            }}
          >
            {line.text}
          </span>
        ))}
      </h1>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
const PhoneScene: React.FC<{
  copy: { eyebrow: string; title: React.ReactNode; sub: string };
  trimBeforeSec: number;
  playbackRate: number;
  zoomKeys: ZoomKey[];
  videoDelay?: number;
}> = ({ copy, trimBeforeSec, playbackRate, zoomKeys, videoDelay = 0 }) => {
  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: "0 90px",
        gap: 40,
      }}
    >
      <SceneCopy width={640} {...copy} />
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Reveal delay={6}>
          <div style={{ scale: "0.92" }}>
            <PhoneFrame width={430} height={932}>
              <ZoomPan keys={zoomKeys}>
                <Video
                  src={staticFile("footage/ringside.webm")}
                  trimBefore={Math.round(trimBeforeSec * FPS)}
                  playbackRate={playbackRate}
                  from={videoDelay}
                  style={{ width: 430, height: 932, objectFit: "cover" }}
                />
              </ZoomPan>
            </PhoneFrame>
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
const DesktopScene: React.FC<{
  copy: { eyebrow: string; title: React.ReactNode; sub: string };
  src: string;
  url: string;
  trimBeforeSec: number;
  playbackRate: number;
  zoomKeys: ZoomKey[];
}> = ({ copy, src, url, trimBeforeSec, playbackRate, zoomKeys }) => {
  const width = 1180;
  const height = Math.round((width / 1600) * 1000);
  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: "0 60px",
        gap: 56,
      }}
    >
      <SceneCopy width={560} {...copy} />
      <Reveal delay={6}>
        <BrowserFrame width={width} height={height} url={url}>
          <ZoomPan keys={zoomKeys}>
            <Video
              src={staticFile(src)}
              trimBefore={Math.round(trimBeforeSec * FPS)}
              playbackRate={playbackRate}
              style={{ width, height, objectFit: "cover" }}
            />
          </ZoomPan>
        </BrowserFrame>
      </Reveal>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 46 }}
    >
      <div
        style={{
          position: "absolute",
          bottom: -420,
          left: "50%",
          translate: "-50% 0",
          width: 1400,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(196,163,90,0.20), transparent 65%)",
        }}
      />
      <Reveal delay={4}>
        <h2
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 92,
            fontWeight: 600,
            color: COLORS.paper,
            margin: 0,
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          Run your next show
          <br />
          on <Gold>Show Desk</Gold>.
        </h2>
      </Reveal>
      <Reveal delay={16}>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.ink,
            background: COLORS.gold,
            borderRadius: 999,
            padding: "24px 62px",
            boxShadow: "0 0 80px rgba(196,163,90,0.55)",
            scale: String(
              interpolate(frame, [16, 40], [0.94, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...EASE_OUT),
              }),
            ),
          }}
        >
          Try the live demo
        </div>
      </Reveal>
      <Reveal delay={26}>
        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 21,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.textFaint,
            margin: 0,
          }}
        >
          CSV import → ringside critique → certificate in the inbox
        </p>
      </Reveal>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
export const Promo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop />

      <Sequence from={S1.from} durationInFrames={S1.dur} name="Intro">
        <SceneFade duration={S1.dur}>
          <Intro />
        </SceneFade>
      </Sequence>

      <Sequence from={S2.from} durationInFrames={S2.dur} name="Ringside — open">
        <SceneFade duration={S2.dur}>
          <PhoneScene
            copy={{
              eyebrow: "Ringside · any phone",
              title: (
                <>
                  Tap the dog.
                  <br />
                  <Gold>Tap record.</Gold>
                </>
              ),
              sub: "The steward's phone becomes the ring clipboard — armband order, SE forms, and one-tap critique recording.",
            }}
            trimBeforeSec={1.4}
            playbackRate={1.35}
            zoomKeys={[
              { frame: 0, scale: 1 },
              { frame: 60, scale: 1.06, origin: "50% 42%" },
              { frame: 150, scale: 1.06 },
            ]}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={S3.from} durationInFrames={S3.dur} name="Ringside — live STT">
        <SceneFade duration={S3.dur}>
          <PhoneScene
            copy={{
              eyebrow: "Live transcription",
              title: (
                <>
                  The judge speaks.
                  <br />
                  <Gold>Show Desk writes.</Gold>
                </>
              ),
              sub: "Live English speech-to-text fills the critique narrative while the judge is still talking. Offline? Recordings queue and sync.",
            }}
            trimBeforeSec={9.2}
            playbackRate={1.65}
            zoomKeys={[
              { frame: 0, scale: 1 },
              { frame: 55, scale: 1 },
              { frame: 100, scale: 1.42, origin: "50% 78%" },
              { frame: 225, scale: 1.42 },
              { frame: 262, scale: 1 },
            ]}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={S4.from} durationInFrames={S4.dur} name="Review">
        <SceneFade duration={S4.dur}>
          <DesktopScene
            copy={{
              eyebrow: "Review queue",
              title: (
                <>
                  Approve.
                  <br />
                  <Gold>It&rsquo;s in the inbox.</Gold>
                </>
              ),
              sub: "The secretary polishes the draft, previews the TNRK certificate, and releases it to the owner — before they leave the grounds.",
            }}
            src="footage/review.webm"
            url="showdesk.app/admin/review"
            trimBeforeSec={1.3}
            playbackRate={1.4}
            zoomKeys={[
              { frame: 0, scale: 1 },
              { frame: 45, scale: 1.24, origin: "58% 40%" },
              { frame: 115, scale: 1.24 },
              { frame: 140, scale: 1, origin: "58% 40%" },
              { frame: 150, scale: 1, origin: "42% 82%" },
              { frame: 180, scale: 1.28, origin: "42% 82%" },
              { frame: 218, scale: 1.28 },
              { frame: 240, scale: 1.06 },
            ]}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={S5.from} durationInFrames={S5.dur} name="Placements">
        <SceneFade duration={S5.dur}>
          <DesktopScene
            copy={{
              eyebrow: "Placements",
              title: (
                <>
                  Places 1–4,
                  <br />
                  <Gold>division-safe.</Gold>
                </>
              ),
              sub: "Saturday and Sunday stay independent competitions. Male and female pools each keep their own placements — sorted by rating.",
            }}
            src="footage/placements.webm"
            url="showdesk.app/ringside/placements"
            trimBeforeSec={1.2}
            playbackRate={1.85}
            zoomKeys={[
              { frame: 0, scale: 1 },
              { frame: 50, scale: 1.18, origin: "62% 48%" },
              { frame: 150, scale: 1.18 },
              { frame: 185, scale: 1 },
            ]}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={S6.from} durationInFrames={S6.dur} name="Reports">
        <SceneFade duration={S6.dur}>
          <DesktopScene
            copy={{
              eyebrow: "Reports",
              title: (
                <>
                  Every document,
                  <br />
                  <Gold>ready to print.</Gold>
                </>
              ),
              sub: "Critique certificates, SE forms, award PDFs, photos, and ringside audio — organized per dog, per show.",
            }}
            src="footage/reports.webm"
            url="showdesk.app/admin/reports"
            trimBeforeSec={0.7}
            playbackRate={1.5}
            zoomKeys={[
              { frame: 0, scale: 1 },
              { frame: 45, scale: 1.14, origin: "50% 55%" },
              { frame: 120, scale: 1.14 },
              { frame: 145, scale: 1 },
            ]}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={S7.from} durationInFrames={S7.dur} name="Outro">
        <SceneFade duration={S7.dur} fadeOut={0}>
          <Outro />
        </SceneFade>
      </Sequence>
    </AbsoluteFill>
  );
};
