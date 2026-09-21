import { redirect } from "next/navigation";
import { TopBar } from "@/components/features/top-bar";
import { BottomNav } from "@/components/features/bottom-nav";
import { AppPromptSheet } from "@/components/features/app-prompt-sheet";
import { getViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { devAuthBypass } from "@/lib/dev-auth";
import { syncProfileForUser } from "@/lib/auth/sync-profile";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed out is a supported way to use this app now: a guest can browse
  // the programme, the sectors and the expo, and is asked to sign in at the
  // point where the app needs to know who they are. So no redirect on a
  // missing session — only the onboarding check, which applies to someone
  // who has signed in but not finished their profile.
  //
  // Local review only — see lib/dev-auth.ts.
  if (!devAuthBypass()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return <Shell>{children}</Shell>;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, designation, company")
        .eq("id", user.id)
        .maybeSingle();
      let p = (data as {
        full_name: string | null;
        designation: string | null;
        company: string | null;
      } | null) ?? null;

      // No row at all is a different thing from an unfinished one, and it
      // used to be treated the same: bounced to a form that loaded empty,
      // saved nothing and sent them back here. It happens when the sync at
      // sign-in failed — it warns and carries on — or when the row is
      // removed while somebody is still signed in. Rebuild it and continue.
      if (!p) {
        await syncProfileForUser(user);
        const { data: healed } = await supabase
          .from("profiles")
          .select("full_name, designation, company")
          .eq("id", user.id)
          .maybeSingle();
        p = (healed as typeof p) ?? null;
      }

      const complete =
        !!p?.full_name?.trim() &&
        !!p?.designation?.trim() &&
        !!p?.company?.trim();
      if (!complete) redirect("/onboarding");
    } catch (err) {
      rethrowIfRedirect(err);
    }
  }

  return <Shell>{children}</Shell>;
}

/** The chrome every screen sits in, signed in or not. */
async function Shell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto w-full max-w-screen-2xl px-3 pb-32 sm:px-5 lg:px-6 lg:pb-12">
        {children}
      </main>
      <BottomNav />
      {/* Slides up a few seconds in, at most once a visit: install the app,
          then — once installed — turn notifications on. The public VAPID key
          is public by definition; the private half stays on the server. */}
      <AppPromptSheet
        vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null}
        signedIn={viewer.signedIn}
        pushRegistered={viewer.pushRegistered}
        scope={viewer.userId}
      />
      {/* Nothing floats over the page any more. Chat moved into the header
          beside WhatsApp and the bell; the gate pass is a banner on the home
          screen. Both old FABs are still on disk —
          components/features/gatepass-fab.tsx and chat/chat-fab.tsx — if
          either needs to come back. */}
    </div>
  );
}
