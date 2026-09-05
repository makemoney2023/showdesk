import {
  marketingOgAlt,
  marketingOgContentType,
  marketingOgImage,
  marketingOgSize,
} from "@/lib/og/marketing-card";

export const runtime = "edge";
export const alt = marketingOgAlt;
export const size = marketingOgSize;
export const contentType = marketingOgContentType;

export default function OpengraphImage() {
  return marketingOgImage();
}
