# PanIIT Andhra Pradesh Summit 2026 — Event PWA

Mobile-first event app for the **PanIIT Andhra Pradesh Summit 2026** —
*Andhra's Deeptech Decade: Anchored by PanIIT* — **3 October 2026**,
Dr. B. R. Ambedkar Kala Vedika, Buckingham Peta, **Vijayawada**.

> **Fork note.** This repo is the Andhra Pradesh / Vijayawada edition, forked
> from the Bangalore summit app. Everything city-specific lives in
> [`lib/event-config.ts`](lib/event-config.ts) — name, theme, date, venue,
> delegate count. A future city edition should be a one-file change.
>
> **`EVENT_DATE_ISO` is not cosmetic**: `lib/slots.ts` builds the whole
> meeting-availability grid from it.

## Before launch

| Item | Status |
| --- | --- |
| Event name, theme, date, venue, delegate count | ✅ set from the official brochure |
| `EVENT_VIDEO_URL` in `lib/event-config.ts` | ⚠️ still the Bangalore promo video — upload an AP video and swap it |
| Supabase `event_id` scoping | ⚠️ **not done** — see below |
| App icons in `public/icons/` | ⚠️ still the Bangalore artwork — re-run `npm run generate-icons` with AP source art |
| Google OAuth client + redirect URI | ⚠️ must be created for the new domain |

### Shared backend — read this

This app points at the **same Supabase project as the Bangalore edition**
(`fncnndrexzmqqengbkvi`). The schema currently has no per-event scoping, so
sessions, venues, sponsors, exhibitors and announcements are **global**: this
app will show Bangalore's rows, and any row seeded here will appear in the
Bangalore app.

Before seeding real AP content, add an `events` table plus an `event_id`
column on the content tables, backfill existing rows to the Bangalore event,
and filter every content query by it — in **both** repos.

Built with Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase, shipped as an installable PWA.

> **Status: Phase 1 complete.** Email-only sign-in, profile read/edit, shell + 5-tab nav, PWA assets. Phases 2–6 follow per the build spec.

---

## Quick start

```bash
git clone https://github.com/roshanyadav-2109/paniitapp-vijayawada.git
cd paniitapp-vijayawada
npm install --legacy-peer-deps

# Set env vars (see "Environment variables" below)
cp .env.local.example .env.local
# fill values in

# Apply migrations against the Supabase project
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql        # owner-provided seed
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_email_unique.sql # this repo, Phase 1

npm run dev   # http://localhost:3000
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://fncnndrexzmqqengbkvi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://app.vja.paniit.space
GOOGLE_CLIENT_ID=1076635361002-gtk11i99pcdc97j5uectb3ov1hgv7ifi.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1076635361002-gtk11i99pcdc97j5uectb3ov1hgv7ifi.apps.googleusercontent.com
GOOGLE_OAUTH_REDIRECT_URI=https://app.vja.paniit.space/auth/google/callback
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tech@paniit.org
```

The service-role key is **server-only** and never reaches the client bundle. It's used by `lib/supabase/server.ts → createServiceRoleClient()` solely inside server actions and route handlers.

For direct app-domain Google sign-in, configure the OAuth client in Google Cloud Console with:

- Authorized JavaScript origin: `https://app.vja.paniit.space`
- Authorized redirect URI: `https://app.vja.paniit.space/auth/google/callback`

The Google redirect stays on the app domain. Supabase Auth is only used after the app receives the Google ID token, so the existing Supabase Google provider can keep storing the provider login configuration.

## Migrations

| File | What it does | Run when |
| --- | --- | --- |
| `supabase/migrations/0001_init.sql` | Owner-provided seed: profiles (with 2,000 pre-registered attendees), sessions, venues, sponsors, announcements, etc. | Already applied |
| `supabase/migrations/0002_email_unique.sql` | Partial unique index on `lower(email)` so the sign-in lookup deterministically resolves one profile. | **Run before testing sign-in.** Paste into Supabase SQL editor or `psql` against the DB URL. |

## Bulk-importing the attendee registration CSV

The Supabase `profiles` table expects one row per registered attendee, with `email` populated (used for sign-in). Use the Supabase SQL editor's CSV import tool or `psql \copy`:

```sql
-- via psql
\copy public.profiles (id, email, full_name, role, iit_campus, graduation_year, branch, company, designation, interests)
  from 'attendees.csv' csv header;
```

After importing, run migration `0002_email_unique.sql` if it hasn't been run yet — it will fail loudly if there are duplicate emails, which is what you want.

## Auth: app-domain Google sign-in

Current sign-in uses a custom-domain Google ID-token flow:

1. User opens the app → lands on `/` (the sign-in page).
2. User clicks **Continue with Google** → app redirects to Google from `/auth/google/start`.
3. Google redirects back to `https://app.vja.paniit.space/auth/google/callback`.
4. The app posts the Google ID token to `/api/auth/google/id-token`.
5. The API creates the existing Supabase SSR session, syncs the profile row by `auth.uid()`, and redirects to onboarding or `/home`.

Supabase still stores the session and powers RLS, but it is not used as the OAuth redirect callback.

See `DECISIONS.md` for the design choice.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run `next lint` |
| `npm run generate-icons` | Regenerate `public/icons/*.png` |
| `npm run sync-sponsors -- --dry-run` | Preview sponsor rows from the `logos` storage bucket folders |

## File structure (Phase 1)

```
app/
  page.tsx                     ← sign-in page (the entry point — NOT a marketing landing)
  sign-in-form.tsx             ← client form (email + Continue)
  actions/
    sign-in.ts                 ← server action: lookup → generateLink → verifyOtp
    update-profile.ts          ← server action: update profile row
  (authed)/
    layout.tsx                 ← auth gate + TopBar/BottomNav chrome
    agenda/page.tsx            ← seeded sessions, time + venue + track
    network/page.tsx           ← Phase 2 placeholder
    meetings/page.tsx          ← Phase 3 placeholder
    map/page.tsx               ← venue list grouped by floor
    sponsors/page.tsx          ← seeded sponsors grouped by tier
    me/page.tsx                ← read-only profile
    me/edit/page.tsx           ← editable form
  api/auth/signout/route.ts
  layout.tsx                   ← Inter font, SW registration
  globals.css                  ← PAN IIT design tokens
components/
  ui/                          ← shadcn primitives
  features/
    top-bar.tsx                ← 56px, brand-800 lockup + bell
    bottom-nav.tsx             ← 64px, 5 tabs
    empty-state.tsx
lib/
  supabase/{client,server,middleware,types}.ts
  utils.ts, constants.ts, date.ts, redirect.ts
public/
  manifest.json, sw.js, icons/
scripts/
  generate-icons.js
supabase/
  migrations/0001_init.sql       ← owner-provided
  migrations/0002_email_unique.sql
middleware.ts                  ← refreshes session, gates (authed)
vercel.json                    ← install/build/region/headers
```

## Design tokens

- **Brand navy** `#1B1464` — primary. Used for headings (`text-brand-900`), primary buttons (`bg-brand-800`), nav active states.
- **IIT red** `#DD002B` — accent. Used sparingly: error states, destructive actions, urgent announcement banners.
- **Slate** for all neutrals.
- **Inter** font only. No serif anywhere.

Tighter radius (`--radius: 0.5rem`) for an institutional feel.

## Deploying to Vercel

1. Connect the GitHub repo at vercel.com/new.
2. Add env vars (Production scope) — at minimum `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `vercel.json` pins install command, build region (`bom1`), and security headers.
4. Deploy. Hard-refresh after first build to clear any stale service worker from earlier deployments.

See `DECISIONS.md` for engineering judgement calls per phase.
