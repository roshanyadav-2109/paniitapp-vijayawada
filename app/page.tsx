import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { SignInForm } from "./sign-in-form";
import { GreetingRotator } from "./greeting-rotator";
import {
  EVENT_ATTENDEE_COUNT,
  EVENT_CITY,
  EVENT_DATE_STAT,
  EVENT_DATE_TEXT,
  EVENT_SHORT_NAME,
  EVENT_TAGLINE,
  EVENT_VENUE_STAT,
} from "@/lib/event-config";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/home");
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-visible">
      {/* HERO PANEL — fills 60svh on mobile so the white card overlaps it
          starting around the 50svh line (≈ 10% below the logo block). */}
      <section className="relative isolate flex h-[60svh] shrink-0 flex-col overflow-hidden bg-brand-800 px-5 pt-[20svh] lg:h-auto lg:p-12 lg:pt-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-iit-500" aria-hidden />

        <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center lg:max-w-md lg:my-auto">
          <div className="w-full rounded-lg bg-paper px-5 py-4 lg:px-7 lg:py-5">
            <Image
              src="/logo/paniit.png"
              alt="PAN IIT Alumni India"
              width={512}
              height={220}
              priority
              className="mx-auto h-11 w-auto lg:h-12"
            />
            <div className="mt-3 border-t border-rule pt-2.5 text-center">
              <p className="eyebrow text-brand-800">
                {EVENT_SHORT_NAME}
              </p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-brand-900">
                {EVENT_TAGLINE}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-brand-800/80">
                {EVENT_DATE_TEXT} · {EVENT_CITY}
              </p>
            </div>
          </div>

          {/* Desktop-only tagline + stats */}
          <div className="hidden text-center lg:mt-10 lg:block">
            <h1 className="font-display text-3xl font-semibold leading-[1.15] text-paper xl:text-[36px]">
              India&apos;s deepest network of
              <br className="hidden xl:block" /> builders, investors &amp; policy minds.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/75">
              One day. {EVENT_ATTENDEE_COUNT} attendees across 23 IITs. The
              official PAN IIT {EVENT_SHORT_NAME} app, in your pocket.
            </p>
            <dl className="mx-auto mt-9 grid max-w-md grid-cols-3 divide-x divide-white/10 text-center">
              <Stat
                label="Date"
                value={EVENT_DATE_STAT.value}
                hint={EVENT_DATE_STAT.hint}
              />
              <Stat
                label="Venue"
                value={EVENT_VENUE_STAT.value}
                hint={EVENT_VENUE_STAT.hint}
              />
              <Stat
                label="Attendees"
                value={EVENT_ATTENDEE_COUNT}
                hint="across 23 IITs"
              />
            </dl>
          </div>
        </div>
      </section>

      {/* FORM PANEL — overlaps the hero by ~10svh from below */}
      <section className="relative z-10 -mt-[10svh] flex min-h-0 flex-1 flex-col lg:mt-0 lg:min-h-screen lg:bg-paper">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col rounded-t-2xl bg-paper px-6 pb-3 pt-6 shadow-[0_-20px_50px_-25px_rgba(13,9,48,0.35)] sm:px-8 lg:my-auto lg:h-auto lg:min-h-[32rem] lg:max-w-sm lg:rounded-lg lg:p-9 lg:shadow-none">
          {/* Top spacer — smaller so the greeting sits a touch above
              vertical centre and the sign-in stack reads as a single
              grouped block (greeting → button). */}
          <div className="basis-[12%] shrink-0" aria-hidden />

          {/* Form group (greeting + button) */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center text-center">
              <GreetingRotator />
              <p className="mt-3 text-sm leading-6 text-brand-900">
                Sign in with the email registered
              </p>
            </div>

            <div className="mt-6">
              <SignInForm />
            </div>
          </div>

          {/* Bottom spacer absorbs remaining height */}
          <div className="flex-1" aria-hidden />

          {/* Neural AI footer pinned to bottom */}
          <a
            href="https://neuralai.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 pt-2 text-center transition-opacity hover:opacity-80"
          >
            <span className="eyebrow text-brand-800/70">
              Proudly built by
            </span>
            <Image
              src="https://res.cloudinary.com/dkywjijpv/image/upload/v1774203864/useneuralai_logo-Photoroom_1_crpglq.png"
              alt="Neural AI"
              width={120}
              height={32}
              className="h-6 w-auto object-contain"
            />
            <span className="font-sans text-[15px] font-semibold tracking-[0.04em] text-brand-900">
              Neural AI
            </span>
          </a>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <dt className="eyebrow text-white/55">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold tracking-tight text-white">
        {value}
      </dd>
      <dd className="mt-0.5 text-[11px] font-medium text-white/60">{hint}</dd>
    </div>
  );
}
