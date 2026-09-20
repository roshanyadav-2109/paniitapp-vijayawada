import { createClient } from "@/lib/supabase/server";
import { EmptyArt } from "@/components/features/empty-art";
import { MyQr } from "@/components/features/my-qr";
import { QrScanner } from "@/components/features/qr-scanner";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  let token: string | null = null;
  let fullName: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("qr_token, full_name")
        .eq("id", user.id)
        .maybeSingle();
      token = data?.qr_token ?? null;
      fullName = data?.full_name ?? null;
    }
  } catch {
    /* env missing */
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-brand-900">
          My QR badge
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          Show this to swap contacts with another attendee, or scan theirs.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {token ? (
          <>
            <MyQr token={token} />
            <p className="text-xs font-medium text-brand-900/60">
              {fullName ?? "Your badge"}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <EmptyArt name="empty-badge" className="mb-3" />
            <p className="text-sm text-brand-950">
              Your badge token isn&apos;t set yet. Contact the organizers if
              this persists.
            </p>
          </div>
        )}
      </div>

      <div className="pt-6">
        <h2 className="eyebrow text-brand-900/60">
          Scan another badge
        </h2>
        <div className="mt-3">
          <QrScanner />
        </div>
      </div>
    </div>
  );
}
