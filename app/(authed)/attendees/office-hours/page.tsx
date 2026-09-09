import Link from "next/link";
import { Users } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/features/empty-state";
import { initials } from "@/lib/utils";
import { EVENT_ID } from "@/lib/event-config";

interface Row {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
  role: string | null;
  iit_campus: string | null;
}

export const dynamic = "force-dynamic";

export default async function OfficeHoursPage() {
  let rows: Row[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, designation, company, photo_url, role, iit_campus, event_participants!inner(event_id)"
      )
      .eq("event_participants.event_id", EVENT_ID)
      .eq("office_hours_enabled", true)
      .in("role", ["vc", "alumni"])
      .order("full_name", { ascending: true, nullsFirst: false });
    rows = (data as Row[] | null) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-brand-900">
          Office Hours
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
          VCs and senior alumni open to a 15-minute meeting today.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody open right now"
          description="Check back later — people turn this on and off through the day."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/attendees/${p.id}`}
                className="flex items-center gap-3 rounded-lg border border-rule bg-white p-3 transition-colors hover:border-rule-strong"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {p.photo_url ? <AvatarImage src={p.photo_url} alt="" /> : null}
                  <AvatarFallback className="bg-paper-deep text-brand-800">
                    {initials(p.full_name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-brand-900 truncate">
                    {p.full_name ?? "Attendee"}
                  </div>
                  <div className="text-xs text-brand-900/60 truncate">
                    {[p.designation, p.company].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {p.role ? (
                  <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-medium uppercase text-brand-900/80">
                    {p.role}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
