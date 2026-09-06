import { NextResponse } from "next/server";

/** Tiny same-origin ping so ringside can tell show Wi-Fi from a real outage. */
export async function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
