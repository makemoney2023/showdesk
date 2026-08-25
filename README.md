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
| Offline queue sync | Stores `live_transcript` with the blob; sync from the record page or the ringside **Queue** dialog. |

Without `DEEPGRAM_API_KEY`, live STT is skipped and processing falls back to AssemblyAI (if set) or an English mock transcript.

## Apply migrations

SQL lives under `supabase/migrations/`. Apply **in order** on project `emiwbvbytmfbonbnemli` (Dashboard → SQL Editor, or `supabase db push` / MCP `apply_migration` from an account that can see this project):

1. `supabase/migrations/20260818120000_showdesk_mvp.sql` — tables, indexes, A1 RLS (`authenticated` CRUD; no anon), seed `app_state` (`id = 1`).
2. `supabase/migrations/20260818120100_critique_audio_bucket.sql` — private bucket `critique-audio` + authenticated Storage policies.
3. `supabase/migrations/20260818120200_show_judges_and_critique_judge.sql` — `shows.judges` jsonb + `critiques.judge` text.
4. `supabase/migrations/20260820010000_critique_status_checks.sql` — CHECK constraints on `critiques.status` and `delivery_status`.
5. `supabase/migrations/20260820020000_dog_photos.sql` — `entries.photo_path` + private bucket `dog-photos`.
6. `supabase/migrations/20260821160000_entry_pedigree_fields.sql` — optional roster pedigree fields (`sire`, `dam`, `breeder`, `address`, `hd_ed_jlpp`) used to seed TNRK SE forms.
7. `supabase/migrations/20260822020423_placement_sex_divisions.sql` — sex-aware placement divisions, canonical placement trigger, and one rank per class/sex division.
8. `supabase/migrations/20260822035122_day_aware_placement_constraints.sql` — Friday SE / Saturday / Sunday metadata, exact published classes, and one rank per day/class/sex pool.
9. `supabase/migrations/20260824180000_show_results_published.sql` — public results publish timestamp.
10. `supabase/migrations/20260825010000_dog_identity_and_documents.sql` — shared `dog_id`, identity/health fields, and optional public clearance documents.

**Status:** migration status must match the live project before entering placements.

Roster CSV required headers: `armband,dog_name,zb_number,wt,owner,sex,class_id,email`. Optional columns: `sire,dam,breeder,address,hd_ed_jlpp,event_kind,competition_day,catalog_class,dog_id,date_of_birth,prefix_titles,suffix_titles,microchip,registration_club,co_owner,kennel_name`. CSV upserts by armband + event + day so SE and conformation can share a number.

Competition placement pools are `(competition_day, catalog_class, sex)`.
Saturday and Sunday are independent, and Male (`R` / Rüde) and female
(`H` / Hündin) dogs have independent Place 1–4 pools. CSV sex also accepts
`male`/`female`, `M`/`F`, and `Ruede`/`Huendin`; unknown values are rejected.

## Auth (self-serve signup)

A1: any authenticated user can use secretary + ringside (no role gates).

Users **create their own account** on `/login` → **Create account** (email + password, min 6 chars). The API is `POST /api/auth/signup`, which uses the service-role admin client to create an already-confirmed user, then `signInWithPassword` so session cookies are set immediately. No Dashboard “Add user” step.

Requirements for signup on Vercel:
1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (required for signup confirm).
2. Redeploy.
3. Open `/login` → **Create account** with a real email. Do **not** use `secretary@demo.local` in production.

Existing users use **Sign in**. Duplicate emails return a clear error (409).

## Storage (production)

Private buckets:

| Bucket | Object path | Local demo |
|--------|-------------|------------|
| `critique-audio` | `{show_id}/{critique_id}.webm` | `.data/audio/` |
| `dog-photos` | `{show_id}/{entry_id}.{jpg\|png\|webp}` | `.data/photos/` |

Authenticated users may INSERT, SELECT, UPDATE (upsert), and DELETE objects in those buckets. `/api/audio/[critiqueId]` and `/api/photos/[entryId]` stream via the session (`show_id` required).

Roster and SE share one dog photo on `entries.photo_path`. JPEG, PNG, or WebP, 5 MB max.

**Cascade:** Deleting an entry (or a show) CASCADE-deletes its critiques, SE evaluations, placements, ringside audio, and dog photo. Demo file-store matches that wipe. Roster DELETE is not a soft unlink.

CSV import **upserts by armband** on the active show (re-import updates existing dogs instead of duplicating).

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

## Review queue (`/admin/review`)

- Default filter is **Needs attention**: `PENDING_REVIEW` plus `ERROR` (failed processing stays visible so retry is reachable).
- Selecting a dog opens the draft editor **directly beneath that row** (single-column queue).
- **TNRK PDF Preview** is a primary action on the open editor (not under More actions). ADRK draft PDF and save/rerun stay under More actions.
- When an SE form exists for the dog, **SE PDF Preview** appears beside the TNRK button.
- Certificate narrative prefers secretary draft → live/batch STT transcript → SE-derived text.
- Approve then release emails the **TNRK critique certificate** (same PDF as preview), using the ringside judge when set. Failed email shows an error and **Retry email**.
- Approved drafts cannot be edited.

## Class placements (`/ringside/placements`)

- Dogs within each class are listed by **rating** (best Formwert first; unrated last).
- **Auto-sort by rating** fills placements 1–4 from rating order per class (review, then Save). Unrated dogs are cleared.
- Ratings still come from Review drafts; placement ranks stay editable and separate.

## Language

UI copy, class labels, and ADRK draft PDF text are **English**. Official Formwert codes (V, Sg, …) and title abbreviations stay as on the form, with English glosses in Review / placements. Speech-to-text is `en-US`.

## Reports (`/admin/reports`)

Per dog on the active show roster:
- **View** / **Download** for each generated document that exists: TNRK critique PDF, SE PDF, ADRK draft PDF, Award PDF (when the dog has a class placement), ringside recording (when audio was retained), and the dog photo (when uploaded on roster or SE).
- Missing documents stay listed as “Not generated yet” (photos say “No photo yet”).
- PDF and photo routes accept `download=1` to force an attachment download; View opens inline in a new tab.
- Audio and photo streams require `show_id` (`/api/audio/{critiqueId}?show_id=`, `/api/photos/{entryId}?show_id=`).

## Scripts

- `npm test` — vitest domain tests
- `npm run build` — production build
- `npm run test:e2e` — Playwright smoke
