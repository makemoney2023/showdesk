import { resultsOgContentType, resultsOgImage, resultsOgSize } from "@/lib/og/results-card";

export const runtime = "edge";
export const alt = "Sieger show results on Show Desk";
export const size = resultsOgSize;
export const contentType = resultsOgContentType;

export default function Image() {
  return resultsOgImage({
    eyebrow: "Show Desk · Official archive",
    title: "Sieger show results",
    subtitle: "Ratings · Placements · Richterbericht",
  });
}
