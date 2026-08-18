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
| Login | Cookie `sss-demo-session`; form prefills `secretary@demo.local` / `demo1234` | Supabase Auth `signInWithPassword` |
| Data | `.data/store.json` | Postgres (`shows`, `app_state`, `entries`, `critiques`, `placements`, `se_evaluations`) |
| Critique audio | `.data/audio/{show_id}/{critique_id}.webm` | Private Storage bucket `critique-audio` |
| `SUPABASE_SERVICE_ROLE_KEY` | Unused | Server-only (Storage / privileged ops). Never `NEXT_PUBLIC_` |

Demo session cookie is `httpOnly`, `sameSite=lax`, `path=/`, and `secure` on HTTPS / production.

## Env

| Variable | Required for production | Purpose |
|----------|-------------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL: `https://emiwbvbytmfbonbnemli.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Publishable / anon key (Dashboard → Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (server) | Service role key. **Server only** — never prefix `NEXT_PUBLIC_` |
| `ASSEMBLYAI_API_KEY` | no | Real STT + LeMUR (mock when missing) |
| `RESEND_API_KEY` | no | Owner email on approve (mock when missing) |
| `RESEND_FROM_EMAIL` | no | Sender address |

Local file: `.env.local` in this app directory (not committed). Missing public vars = DEMO MODE.

## Apply migrations

SQL lives under `supabase/migrations/`. Apply **in order** on project `emiwbvbytmfbonbnemli` (Dashboard → SQL Editor, or `supabase db push` / MCP `apply_migration` from an account that can see this project):

1. `supabase/migrations/20260818120000_showdesk_mvp.sql` — tables, indexes, A1 RLS (`authenticated` CRUD; no anon), seed `app_state` (`id = 1`).
2. `supabase/migrations/20260818120100_critique_audio_bucket.sql` — private bucket `critique-audio` + authenticated Storage policies.

**Status:** files are in-repo. Remote apply is still an operator step if the connected MCP/CLI session cannot see this project (wrong org).

## Auth users

A1: any authenticated user can use secretary + ringside (no role gates). Create named accounts in the Dashboard:

1. Open `https://emiwbvbytmfbonbnemli.supabase.co` → **Authentication → Users → Add user**.
2. Choose **Create new user** (email + password). Confirm the user (auto-confirm if email is not wired).
3. Create at least one **secretary** and one **steward** (example: `secretary@blacksage.local`, `steward@blacksage.local`).
4. Sign in at `/login` with those credentials after Vercel env is set. Do **not** use `secretary@demo.local` in production.

## Storage (production)

Private bucket: `critique-audio`.

Object path: `{show_id}/{critique_id}.webm` (same layout as local `.data/audio/`).

Authenticated users may INSERT, SELECT, UPDATE (upsert), and DELETE objects in that bucket. `/api/audio/[critiqueId]` streams via the session (or service role when needed).

## Vercel

Set env on the Show Desk Vercel project (Production and Preview). Then redeploy so `NEXT_PUBLIC_*` is baked into the client bundle.

| Name | Environment | Notes |
|------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://emiwbvbytmfbonbnemli.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Server only. Do not expose to the browser |
| `ASSEMBLYAI_API_KEY` | optional | Mock STT if unset |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional | Mock email if unset |

If public env is missing on Vercel, the deploy stays in DEMO MODE (file store + demo cookie). After env is set: login with a Dashboard Auth user; create a show; import CSV; run SE / critique / review.

Operator checklist: `docs/orgs/velocity-agency/customers/blacksage-kennels/initiatives/sieger-show-secretary/business-idea/WIRE/phase-9-mvp.md`.

## Scripts

- `npm test` — vitest domain tests
- `npm run build` — production build
- `npm run test:e2e` — Playwright smoke
