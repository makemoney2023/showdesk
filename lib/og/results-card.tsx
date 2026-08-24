import { ImageResponse } from "next/og";

export const resultsOgSize = { width: 1200, height: 630 };
export const resultsOgContentType = "image/png";

export function resultsOgImage(input: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: string;
}) {
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
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#d4b87a",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#c4a35a",
            }}
          />
          {input.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#f7f4ed",
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          {input.title}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(247,244,237,0.6)",
            fontSize: 24,
          }}
        >
          <span>{input.subtitle}</span>
          {input.badge ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 88,
                height: 88,
                padding: "0 18px",
                borderRadius: 999,
                background: "#c4a35a",
                color: "#141210",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {input.badge}
            </span>
          ) : null}
        </div>
      </div>
    ),
    resultsOgSize,
  );
}
