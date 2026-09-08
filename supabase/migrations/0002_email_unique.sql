-- Phase 1: enforce one-profile-per-email (case-insensitive).
-- Required for email-only sign-in to deterministically resolve a single profile.
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;
