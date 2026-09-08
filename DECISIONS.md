# DECISIONS

Running log of non-obvious choices made while implementing the build spec.

## 2026-05-15 · Phase 1

### Email-only sign-in: `generateLink` + server-side `verifyOtp`
The spec offered two candidate patterns: (a) `auth.admin.generateLink` then exchange the token server-side, or (b) hand-mint a JWT signed with Supabase's JWT secret and set the auth cookies directly.

We chose (a) because:
- `generateLink({ type: "magiclink" })` does **not** send an email — it returns the action link + raw OTP. The user never receives a magic link, satisfying the "type email, get signed in" UX.
- `verifyOtp({ type: "email", token: properties.email_otp, email })` on a Supabase SSR server client cleanly sets the session cookies via `@supabase/ssr`'s cookie handlers.
- We avoid hand-rolling JWT minting, which would diverge from Supabase token-format changes.

Cost: the `auth.users` row must already exist for the registered email. If `0001_init.sql` only seeded `profiles` without backfilling `auth.users`, sign-in will fail with `session_failed`. Follow-up: add an `admin.createUser` fallback path keyed on profile.id if we hit this in practice.

### Why `app/page.tsx` IS the sign-in (no `/login` route)
Spec demands `/` be the sign-in page. The page + client form live at the root; the server action is in `app/actions/sign-in.ts`. Already-authed users get bounced to `/agenda` server-side and via middleware.

### Cookie expiry
Supabase's access-token TTL is project-level (default 1h, refreshed). The spec wants 8h. We did **not** override this in code; the right knob is the Supabase dashboard → Authentication → JWT expiry.

### `profiles.email` partial unique index
`supabase/migrations/0002_email_unique.sql` — unique on `lower(email) where email is not null`. Makes the sign-in lookup deterministic.

### Inter only, no serif
Stripped Source_Serif_4 from layout. `tailwind.config.ts` declares only `font-sans` (Inter). Headings use `font-semibold tracking-tight`.

### Color tokens
`navy-*` and `gold-*` palettes removed. Replaced with `brand-*` (`#1B1464`) and `iit-*` (`#DD002B`). Slate is the only neutral.

### Bottom nav
5 tabs: Agenda · Network · Meetings · Map · Me. Sponsors lives off the Me tab.

### Onboarding wizard removed
Profiles are pre-seeded. Deleted `(public)/onboard/*`. Me tab is the editing surface.

## 2026-05-16 · Phase 2

### Network tab URL = `/attendees`
The spec uses `Network` for the nav label but `/attendees/*` for routes (the directory page is `app/(authed)/attendees/page.tsx`, profile is `[id]/page.tsx`). The BottomNav points to `/attendees`; the user-visible label stays "Network". A label is free to differ from the URL.

### Agenda realtime: `router.refresh()` on Supabase channel events
Cheaper than re-querying in client state and lets server components own the `sessions → venues` join shape. We subscribe to `session_checkins` only to *trigger* a 600ms-debounced router refresh, not to hydrate data client-side.

### Agenda filtering happens server-side in memory, not in SQL
The `?track=…&mine=1` filters run on the already-loaded `sessions` array rather than as Postgres `where` clauses. Rationale: there are ~24 sessions; the cost of one full fetch + bookmark fetch is lower than maintaining two query branches, and the My-Agenda toggle is essentially free.

### Capacity meter thresholds
`<60%` green, `<85%` amber, `≥85%` IIT red — per the spec. We treat `capacity = 0` (or null) as "no meter", which avoids divide-by-zero and lets non-capped sessions (workshops, drop-ins) render cleanly.

### Check-in window: 10 min before → 30 min after end
Spec says "10 min before start to 30 min after end". We hide the button entirely outside that window if the user hasn't checked in yet; if they're already checked in, we keep the "Checked in" pill visible regardless of time so they have feedback.

### Attendees search: client-side debounce, server-side `or(name.ilike, company.ilike)`
300ms debounce on input → re-key on filter object → server query with pagination. Supabase's `.or()` is sensitive to comma-injection, so we strip `% _ ,` from the input before composing the query.

### Attendees filter: `available_for_meetings OR office_hours_enabled`
The seed schema may have either or both. We OR them to avoid false negatives until the schema is clarified. If only one column exists, the other's clause is a no-op against missing data.

### Year range slider: two sliders, not one dual-handle
Native dual-handle is non-trivial; two single sliders (From / To) give the same UX with zero dependencies and clamp each side against the other.

### Floor map: SVG positioned by `venue.map_x` / `map_y`
Normalized 0–100. If any venue lacks coords we fall back to a 2-column grid for the whole floor — keeps the spatial story consistent rather than mixing free-positioned with grid-positioned.

### Floor count is data-driven
Two floors are mentioned in the spec, but the toggle just lists every distinct `floor` value present in the venues table. Adding a third floor later requires no UI change.

## 2026-05-17 · Phase 3

### Sign-in no longer queries profiles.email
You told me `profiles.email` does not exist. The "registered attendee" check
now relies on `auth.admin.generateLink({type:'magiclink', email})` — Supabase
errors with "user not found" if the email isn't in `auth.users`. We translate
that to `not_registered` for the UI. As long as the seeded attendee list is
mirrored into `auth.users` (same UUID as `profiles.id`), sign-in works.

### Q&A schema is its own migration: 0003_qa_replies.sql
Idempotent: `create table if not exists`, `drop policy if exists` before
`create policy`, and a `do $$ … $$` guard around the `alter publication`.
Safe to re-run.

### Anonymous-question pseudonym
Deterministic hash of `user_id` → `Attendee #NNNN`. Same poster shows the same
label across the session. Moderators still see the real `user_id` server-side.

### Meeting accept: RPC first, in-app fallback
`/api/meetings/accept` tries `supabase.rpc('accept_meeting', …)` for race-safe
transactional accept. If the RPC is missing or errors, it falls back to:
load → ownership check → conflict scan → UPDATE guarded by status='pending'.
The fallback is best-effort against races; the RPC is preferred.

### `available_for_meetings` OR `office_hours_enabled`
The attendee filter accepts either column being true. Pick one and drop the
other in the cleanup migration if you want a single source of truth.

### QR token prefix `paniit2026:`
The scanner accepts either the prefixed form or the raw token (back-compat).
Prefix prevents accidental scans of unrelated QR codes from creating
connections.

## 2026-05-17 · Phase 4

### Push subscription stored on profiles.push_subscription as JSON
`/api/push/subscribe` writes the whole `PushSubscription` JSON. Sending uses
the standard `web-push` library from a server route or the Deno Edge Function
(`supabase/functions/send-push`). 410-Gone responses null-out the dead
subscription automatically.

### Announcements: realtime sheet + urgent banner
`NotificationsBell` subscribes to the `announcements` table and shows an
in-bell red dot. Urgent-priority announcements also render a top-of-screen
red banner via the TopBar.

## 2026-05-17 · Phase 5

### Admin role-gated at page level
`/admin` reads `profiles.role` and renders the dashboard only for `organizer`
or `admin`. The `/api/push/send` route does the same check server-side to
prevent direct API abuse.

### Recap counts use Postgres count(*) head requests
Cheap and consistent. The People-You-Met list comes from `connections` rows
that include the current user.

## 2026-05-17 · Phase 6

### `supabase/migrations-candidate-0004_cleanup.sql`
Lives **outside** the `migrations/` directory so it won't be auto-applied by
`supabase db push`. It's a review document — you should comment out anything
you still need before pasting into the SQL editor.

### TypeScript `Database = any` still
We left `lib/supabase/types.ts` as a placeholder. After the cleanup migration,
run `supabase gen types typescript --project-id <id> --schema public > lib/supabase/types.ts`
to replace it with the real generated types.
