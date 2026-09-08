import { createClient } from "@/lib/supabase/server";
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
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">
          My QR badge
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Show this to swap contacts with another attendee, or scan theirs.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {token ? (
          <>
            <MyQr token={token} />
            <p className="text-xs font-medium text-slate-500">
              {fullName ?? "Your badge"}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Your badge token isn't set yet. Contact the organizers if this persists.
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Scan another badge
        </h2>
        <div className="mt-3">
          <QrScanner />
        </div>
      </div>
    </div>
  );
}
