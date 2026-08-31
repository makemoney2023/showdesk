import "./index.css";
import { Composition } from "remotion";
import { Promo, PROMO_DURATION } from "./Promo";
import {
  DemoRingside,
  DemoReview,
  DemoDesk,
  DEMO_RINGSIDE_DURATION,
  DEMO_REVIEW_DURATION,
  DEMO_DESK_DURATION,
} from "./Demos";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={PROMO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoRingside"
        component={DemoRingside}
        durationInFrames={DEMO_RINGSIDE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoReview"
        component={DemoReview}
        durationInFrames={DEMO_REVIEW_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoDesk"
        component={DemoDesk}
        durationInFrames={DEMO_DESK_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
