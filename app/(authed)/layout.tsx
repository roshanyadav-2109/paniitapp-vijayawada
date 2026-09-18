import { redirect } from "next/navigation";
import { TopBar } from "@/components/features/top-bar";
import { BottomNav } from "@/components/features/bottom-nav";
import { ChatFab } from "@/components/features/chat/chat-fab";
import { GatePassFab } from "@/components/features/gatepass-fab";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { devAuthBypass } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Local review only — see lib/dev-auth.ts. Wraps the whole guard so both
  // the sign-in redirect and the onboarding-completeness redirect are skipped.
  if (!devAuthBypass()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, designation, company")
        .eq("id", user.id)
        .maybeSingle();
      const p = (data as {
        full_name: string | null;
        designation: string | null;
        company: string | null;
      } | null) ?? null;
      const complete =
        !!p?.full_name?.trim() &&
        !!p?.designation?.trim() &&
        !!p?.company?.trim();
      if (!complete) redirect("/onboarding");
    } catch (err) {
      rethrowIfRedirect(err);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-32 sm:px-6 lg:px-8 lg:pb-12">
        {children}
      </main>
      <BottomNav />
      <ChatFab />
      <GatePassFab />
    </div>
  );
}
