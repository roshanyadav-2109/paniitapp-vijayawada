import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { OnboardingForm, type OnboardingInitial } from "./onboarding-form";
import { EVENT_SHORT_NAME } from "@/lib/event-config";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/home";

  const initial: OnboardingInitial = {
    full_name: "",
    designation: "",
    company: "",
    iit_campus: "",
    graduation_year: null,
    branch: "",
    bio: "",
    linkedin_url: "",
    twitter_url: "",
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/?next=${encodeURIComponent(`/onboarding?next=${next}`)}`);

    const { data } = await supabase
      .from("profiles")
      .select(
        "full_name, designation, company, iit_campus, graduation_year, branch, bio, linkedin_url, twitter_url"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as Partial<OnboardingInitial>;
      Object.assign(initial, {
        full_name: d.full_name ?? "",
        designation: d.designation ?? "",
        company: d.company ?? "",
        iit_campus: d.iit_campus ?? "",
        graduation_year: d.graduation_year ?? null,
        branch: d.branch ?? "",
        bio: d.bio ?? "",
        linkedin_url: d.linkedin_url ?? "",
        twitter_url: d.twitter_url ?? "",
      });

      // Already onboarded — bounce them onward. Gate only on the three
      // mandatory fields the user must fill in to enter the app.
      const complete =
        !!d.full_name?.trim() &&
        !!d.designation?.trim() &&
        !!d.company?.trim();
      if (complete) redirect(next);
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <main className="min-h-[100svh] bg-paper px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center lg:p-12">
      <div className="mx-auto w-full max-w-xl space-y-6 lg:w-[70vw] lg:max-w-3xl lg:space-y-0">
        {/* Mobile header — desktop tucks the lockup inside the modal card */}
        <header className="flex items-center gap-3 lg:hidden">
          <Image
            src="/logo/paniit.png"
            alt="PAN IIT Alumni India"
            width={512}
            height={220}
            priority
            className="h-8 w-auto"
          />
          <div className="h-6 w-px bg-rule" aria-hidden />
          <p className="eyebrow text-brand-800/75">
            {EVENT_SHORT_NAME} · Setup
          </p>
        </header>

        <section className="rounded-lg border border-rule bg-white p-5 lg:p-10">
          <div className="hidden items-center gap-3 lg:flex">
            <Image
              src="/logo/paniit.png"
              alt="PAN IIT Alumni India"
              width={512}
              height={220}
              priority
              className="h-9 w-auto"
            />
            <div className="h-6 w-px bg-rule" aria-hidden />
            <p className="eyebrow text-brand-800/75">
              {EVENT_SHORT_NAME} · Setup
            </p>
          </div>
          <h1 className="mt-0 font-display text-2xl font-semibold text-brand-950 lg:mt-6 lg:text-[28px]">
            Tell us about you
          </h1>
          <p className="mt-1 text-sm leading-6 text-brand-900/75">
            We&apos;ll show this to other attendees so they can find you in
            the Networking tab. All starred fields are required.
          </p>

          <div className="mt-5 lg:mt-7">
            <OnboardingForm initial={initial} next={next} />
          </div>
        </section>
      </div>
    </main>
  );
}
