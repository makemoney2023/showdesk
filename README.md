# Sieger Show Secretary MVP

Phase 9 build — ADRK-first critique secretary for Blacksage Kennels Sieger shows.

**Brand:** Show Desk — Fraunces + Manrope, ADRK black/tan on light paper surfaces. Spec: `docs/.../business-idea/11-brand/MASTER.md`.

Admin and ringside require login. Mutating APIs and PDFs return 401 without a session.

## Quick start

```bash
npm install
npm run dev
```

Demo mode (no Supabase env vars): login `secretary@demo.local` / `demo1234`. Data persists to `.data/store.json`; critique audio under `.data/audio/`.

## Storage (production)

When Supabase env is set, critique recordings go in the private bucket `critique-audio`.

Object path: `{show_id}/{critique_id}.webm` (same layout as local `.data/audio/`).

Authenticated users may INSERT, SELECT, UPDATE (upsert), and DELETE objects in that bucket. Apply `supabase/migrations/20260818120100_critique_audio_bucket.sql` on project `emiwbvbytmfbonbnemli` if the bucket is not already present.

## Scripts

- `npm test` — vitest domain tests
- `npm run build` — production build
- `npm run test:e2e` — Playwright smoke

## Env (optional)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ASSEMBLYAI_API_KEY` | Real STT + LeMUR (mock when missing) |
| `RESEND_API_KEY` | Owner email on approve (mock when missing) |
| `RESEND_FROM_EMAIL` | Sender address |
