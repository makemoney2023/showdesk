import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SIZES = new Set([192, 512]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await context.params;
  const size = Number(raw);
  if (!SIZES.has(size)) {
    return NextResponse.json({ error: "Unsupported icon size" }, { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1612",
          color: "#C4A35A",
          fontSize: Math.round(size * 0.55),
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { width: size, height: size },
  );
}
