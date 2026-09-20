import Link from "next/link";
import { EmptyArt } from "@/components/features/empty-art";

/**
 * The app had no not-found page at all, so a deleted session, a stale
 * attendee link or a mistyped URL landed on Next.js's stock 404 — no
 * navigation back, nothing that looks like this app.
 *
 * Every `notFound()` call in the app arrives here: agenda, attendees,
 * exhibitors, sponsors, chat and meetings all use it when a row is missing.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <EmptyArt name="not-found" className="size-24" />
      <h1 className="mt-5 font-display text-[19px] font-semibold text-brand-950">
        This page isn&apos;t here
      </h1>
      <Link
        href="/home"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
      >
        Back to home
      </Link>
    </div>
  );
}
