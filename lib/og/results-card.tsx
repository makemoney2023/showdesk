import { ImageResponse } from "next/og";

export const resultsOgSize = { width: 1200, height: 630 };
export const resultsOgContentType = "image/png";

export function photoToDataUri(bytes: Buffer, contentType: string): string {
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export function dogResultOgImage(input: {
  showName: string;
  dogName: string;
  classLabel: string;
  badge?: string | null;
  critique?: string | null;
  photoSrc?: string | null;
}) {
  const frameStyle = {
    width: 1200,
    height: 630,
    display: "flex",
    position: "relative" as const,
    backgroundColor: "#070707",
    ...(input.photoSrc
      ? {}
      : {
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,163,90,0.25), rgba(7,7,7,0) 60%)",
        }),
  };

  return new ImageResponse(
    (
      <div style={frameStyle}>
        {input.photoSrc ? (
          // ImageResponse only accepts <img>; next/image is not available here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={input.photoSrc}
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 210,
            width: 1200,
            height: 420,
            display: "flex",
            backgroundImage:
              "linear-gradient(to top, rgba(7,7,7,0.96) 0%, rgba(7,7,7,0.78) 42%, rgba(7,7,7,0) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "48px 56px 44px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#d4b87a",
                  fontSize: 20,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#c4a35a",
                  }}
                />
                {input.showName}
              </div>
              <div
                style={{
                  display: "flex",
                  color: "#f7f4ed",
                  fontSize: 54,
                  fontWeight: 600,
                  lineHeight: 1.1,
                  marginTop: 8,
                }}
              >
                {input.dogName}
              </div>
              <div
                style={{
                  display: "flex",
                  color: "rgba(247,244,237,0.62)",
                  fontSize: 22,
                  marginTop: 8,
                }}
              >
                {input.classLabel}
              </div>
            </div>
            {input.badge ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 96,
                  height: 96,
                  padding: "0 20px",
                  borderRadius: 999,
                  background: "#c4a35a",
                  color: "#141210",
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {input.badge}
              </div>
            ) : null}
          </div>
          {input.critique ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                color: "rgba(247,244,237,0.9)",
                fontSize: 24,
                lineHeight: 1.35,
                maxWidth: 1040,
              }}
            >
              {input.critique}
            </div>
          ) : null}
        </div>
      </div>
    ),
    resultsOgSize,
  );
}

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
