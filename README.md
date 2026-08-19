# Sieger Show Secretary MVP

Phase 9 build — ADRK-first critique secretary for Blacksage Kennels Sieger shows.

**Brand:** Show Desk — Fraunces + Manrope, ADRK black/tan on light paper surfaces. Spec: `docs/.../business-idea/11-brand/MASTER.md`.

Admin and ringside require login. Mutating APIs and PDFs return 401 without a session.

**Supabase project:** `https://emiwbvbytmfbonbnemli.supabase.co` (ref `emiwbvbytmfbonbnemli`).

## Quick start

```bash
npm install
npm run dev
```

With no public Supabase env, the app stays in DEMO MODE (see below).

## DEMO MODE

`isDemoMode()` is true when **either** `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

| Behavior | Demo | Production (both public vars set) |
|----------|------|-----------------------------------|
| Login | Cookie `sss-demo-session`; form prefills `secretary@demo.local` / `demo1234` | Supabase Auth sign-in + **Create account** at `/login` |
| Data | `.data/store.json` | Postgres (`shows`, `app_state`, `entries`, `critiques`, `placements`, `se_evaluations`) |
| Critique audio | `.data/audio/{show_id}/{critique_id}.webm` | Private Storage bucket `critique-audio` |
| `SUPABASE_SERVICE_ROLE_KEY` | Unused | Server-only (signup confirm, Storage). Never `NEXT_PUBLIC_` |

Demo session cookie is `httpOnly`, `sameSite=lax`, `path=/`, and `secure` on HTTPS / production.

## Env

| Variable | Required for production | Purpose |
|----------|-------------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL: `https://emiwbvbytmfbonbnemli.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Publishable / anon key (Dashboard → Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (server) | Service role key. **Server only** — never prefix `NEXT_PUBLIC_` |
| `DEEPGRAM_API_KEY` | yes (for real STT) | Live + batch English STT (`nova-3`, `en-US`). Server only — never `NEXT_PUBLIC_` |
| `ASSEMBLYAI_API_KEY` | no | Legacy STT fallback + optional LeMUR draft structuring |
| `RESEND_API_KEY` | no | Owner email on approve (mock when missing) |
| `RESEND_FROM_EMAIL` | no | Sender address |

Local file: `.env.local` in this app directory (not committed). Missing public vars = DEMO MODE.

### Transcription (Deepgram)

Ringside recording uses **live** Deepgram WebSocket STT while the mic is open, and still uploads the WebM for **batch** prerecorded transcription as backup.

| Path | How |
|------|-----|
| Live | Browser gets a short-lived JWT from `POST /api/deepgram/token` (session required), then streams audio to `wss://api.deepgram.com/v1/listen` (`model=nova-3`, `language=en-US`). The long-lived `DEEPGRAM_API_KEY` never reaches the client. |
| Batch backup | After stop, `POST /api/critiques` saves audio and calls Deepgram prerecorded listen. If `live_transcript` is non-empty it is preferred; otherwise batch (or mock) is used. |
| Offline queue sync | Audio only → batch path (no live transcript). |

Without `DEEPGRAM_API_KEY`, live STT is skipped and processing falls back to AssemblyAI (if set) or an English mock transcript.

## Apply migrations

SQL lives under `supabase/migrations/`. Apply **in order** on project `emiwbvbytmfbonbnemli` (Dashboard → SQL Editor, or `supabase db push` / MCP `apply_migration` from an account that can see this project):

1. `supabase/migrations/20260818120000_showdesk_mvp.sql` — tables, indexes, A1 RLS (`authenticated` CRUD; no anon), seed `app_state` (`id = 1`).
2. `supabase/migrations/20260818120100_critique_audio_bucket.sql` — private bucket `critique-audio` + authenticated Storage policies.
3. `supabase/migrations/20260818120200_show_judges_and_critique_judge.sql` — `shows.judges` jsonb + `critiques.judge` text.

**Status:** applied on project `emiwbvbytmfbonbnemli` (schema + Storage + judges columns).

## Auth (self-serve signup)

A1: any authenticated user can use secretary + ringside (no role gates).

Users **create their own account** on `/login` → **Create account** (email + password, min 6 chars). The API is `POST /api/auth/signup`, which uses the service-role admin client to create an already-confirmed user, then `signInWithPassword` so session cookies are set immediately. No Dashboard “Add user” step.

Requirements for signup on Vercel:
1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (required for signup confirm).
2. Redeploy.
3. Open `/login` → **Create account** with a real email. Do **not** use `secretary@demo.local` in production.

Existing users use **Sign in**. Duplicate emails return a clear error (409).

## Storage (production)

Private bucket: `critique-audio`.

Object path: `{show_id}/{critique_id}.webm` (same layout as local `.data/audio/`).

Authenticated users may INSERT, SELECT, UPDATE (upsert), and DELETE objects in that bucket. `/api/audio/[critiqueId]` streams via the session (or service role when needed).

**Cascade:** Deleting an entry (or a show) CASCADE-deletes its critiques, SE evaluations, and placements. That is intentional for the cloud store — roster DELETE is a wipe of child rows, not a soft unlink.

## Vercel

Set env on the Show Desk Vercel project (Production and Preview). Then redeploy so `NEXT_PUBLIC_*` is baked into the client bundle.

| Name | Environment | Notes |
|------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://emiwbvbytmfbonbnemli.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Server only. Do not expose to the browser |
| `DEEPGRAM_API_KEY` | Production, Preview | Live WebSocket + batch backup STT. Server only |
| `ASSEMBLYAI_API_KEY` | optional | Legacy STT / LeMUR if Deepgram unset |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional | Mock email if unset |

If public env is missing on Vercel, the deploy stays in DEMO MODE (file store + demo cookie). After env is set (including service role): **Create account** on `/login`, then create a show; import CSV; run SE / critique / review.

Operator checklist: `docs/orgs/velocity-agency/customers/blacksage-kennels/initiatives/sieger-show-secretary/business-idea/WIRE/phase-9-mvp.md`.

## Scripts

- `npm test` — vitest domain tests
- `npm run build` — production build
- `npm run test:e2e` — Playwright smoke
