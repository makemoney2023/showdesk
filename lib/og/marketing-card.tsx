import { ImageResponse } from "next/og";
import {
  marketingOgSize,
} from "./marketing-og";

export {
  marketingOgAlt,
  marketingOgContentType,
  marketingOgSize,
} from "./marketing-og";

/** 1200×630 card for the marketing homepage and site-wide share preview. */
export function marketingOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070707",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,163,90,0.25), rgba(7,7,7,0) 60%)",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#d4b87a",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#c4a35a",
            }}
          />
          Show Desk · Sieger Show Secretary
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#f7f4ed",
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: -1,
          }}
        >
          <span>The judge speaks.</span>
          <span>The certificate arrives</span>
          <span style={{ color: "#c4a35a" }}>the same day.</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(247,244,237,0.55)",
            fontSize: 26,
          }}
        >
          <span>Ringside critiques · SE forms · Placements · Official PDFs</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 999,
              background: "#c4a35a",
              color: "#141210",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            V1
          </span>
        </div>
      </div>
    ),
    marketingOgSize,
  );
}
