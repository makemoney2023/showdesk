import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

const fraunces = loadFraunces("normal", { weights: ["500", "600", "700"] });
const manrope = loadManrope("normal", { weights: ["400", "500", "600", "700", "800"] });

export const FONT_SERIF = fraunces.fontFamily;
export const FONT_SANS = manrope.fontFamily;

export const COLORS = {
  bg: "#070707",
  paper: "#f7f4ed",
  gold: "#c4a35a",
  goldSoft: "#d4b87a",
  ink: "#141210",
  chrome: "#17140f",
  chromeBorder: "rgba(247,244,237,0.12)",
  textDim: "rgba(247,244,237,0.62)",
  textFaint: "rgba(247,244,237,0.4)",
};

export const EASE_OUT = [0.21, 0.65, 0.36, 1] as const;
export const EASE_INOUT = [0.45, 0, 0.18, 1] as const;
