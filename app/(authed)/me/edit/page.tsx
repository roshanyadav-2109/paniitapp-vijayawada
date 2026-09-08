import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { EditProfileForm } from "./edit-form";
import { ProfilePhotoUpload } from "@/components/features/profile-photo-upload";

export const dynamic = "force-dynamic";

interface InitialProfile {
  full_name: string;
  designation: string;
  company: string;
  iit_campus: string;
  graduation_year: number | null;
  branch: string;
  bio: string;
  linkedin_url: string;
  twitter_url: string;
  asks: string[] | null;
  offers: string[] | null;
  interests: string[] | null;
}

export default async function MeEditPage() {
  const initial: InitialProfile = {
    full_name: "",
    designation: "",
    company: "",
    iit_campus: "",
    graduation_year: null,
    branch: "",
    bio: "",
    linkedin_url: "",
    twitter_url: "",
    asks: null,
    offers: null,
    interests: null,
  };
  let userId: string | null = null;
  let photoUrl: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");
    userId = user.id;

    const { data } = await supabase
      .from("profiles")
      .select(
        "full_name, designation, company, iit_campus, graduation_year, branch, bio, linkedin_url, twitter_url, asks, offers, interests, photo_url"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as Partial<InitialProfile> & { photo_url?: string | null };
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
        asks: d.asks ?? null,
        offers: d.offers ?? null,
        interests: d.interests ?? null,
      });
      photoUrl = d.photo_url ?? null;
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 pt-5 lg:max-w-4xl lg:pt-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">
          Edit profile
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Other attendees see this when they find you in the Networking tab.
        </p>
      </header>

      <section className="rounded-lg border border-brand-100 bg-white p-5">
        <h2 className="text-[13px] font-semibold tracking-tight text-brand-950">
          Profile photo
        </h2>
        {userId ? (
          <div className="mt-3">
            <ProfilePhotoUpload
              userId={userId}
              initialPhotoUrl={photoUrl}
              fallbackName={initial.full_name || null}
            />
          </div>
        ) : null}
      </section>

      <EditProfileForm initial={initial} />
    </div>
  );
}
