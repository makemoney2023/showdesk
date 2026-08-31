# Show Desk promo & demo videos

Tooling that produces the videos in `/public/videos` shown on the marketing
homepage (`components/marketing/demo-videos.tsx`). The approach is modeled on
[openvid](https://github.com/CristianOlivera1/openvid)-style product demos:
real screen footage inside device mockups on a dark branded stage, with
smooth zooms into points of interest and text overlays.

## Pipeline

1. **Capture** — `capture/record-footage.mjs` (Playwright)
   - Resets the demo store (`.data/`), then seeds a realistic Sieger show
     through the API: roster CSV, judges, pre-approved critiques.
   - Records five segments as `public/footage/*.webm`: roster (desktop),
     ringside recording (phone viewport), review queue, placements, reports.
   - Live transcription is mocked (Deepgram token route + WebSocket) so the
     real UI behaviour renders without an API key. A fake gold cursor is
     injected so viewers can follow the pointer.
2. **Compose** — Remotion project in `src/`
   - `Promo` — the ~44 s homepage tour (intro → ringside → review →
     placements → reports → CTA).
   - `DemoRingside`, `DemoReview`, `DemoDesk` — short looping feature clips.
3. **Render** — H.264 MP4s + poster JPEGs, copied to `/public/videos`.

## Regenerating

```bash
# from the repo root — demo mode dev server must be running
npm run dev &
node promo/capture/record-footage.mjs

# render (from promo/)
cd promo
npm install
npx remotion render Promo out/showdesk-promo.mp4 --codec=h264 --crf=22
npx remotion render DemoRingside out/demo-ringside.mp4 --codec=h264 --crf=23
npx remotion render DemoReview out/demo-review.mp4 --codec=h264 --crf=23
npx remotion render DemoDesk out/demo-desk.mp4 --codec=h264 --crf=23
npx remotion still Promo --frame=100 out/showdesk-promo-poster.jpg
npx remotion still DemoRingside --frame=45 out/demo-ringside-poster.jpg
npx remotion still DemoReview --frame=40 out/demo-review-poster.jpg
npx remotion still DemoDesk --frame=45 out/demo-desk-poster.jpg
cp out/*.mp4 out/*-poster.jpg ../public/videos/

# preview compositions interactively
npx remotion studio
```

Raw footage (`public/footage/`) and renders (`out/`) are gitignored — only
the final MP4s/posters in `/public/videos` are committed.
