import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sieger Show Secretary",
    short_name: "Show Desk",
    description:
      "Ringside critique capture and secretary review for Sieger shows.",
    start_url: "/ringside",
    display: "standalone",
    background_color: "#F7F4ED",
    theme_color: "#1A1612",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
