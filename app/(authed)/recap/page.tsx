import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

interface MiniProfile {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  designation: string | null;
  company: string | null;
}

export const dynamic = "force-dynamic";

export default async function RecapPage() {
  let counts = { sessions: 0, questions: 0, answeredQuestions: 0, meetings: 0 };
  let people: MiniProfile[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return (
        <div className="px-4 py-16 text-center text-sm text-slate-500">
          Sign in to see your recap.
        </div>
      );
    }

    const [conns, sessionsCount, qCount, aCount, mCount] = await Promise.all([
      supabase
        .from("connections")
        .select(
          "user_a, user_b, ua:user_a(id, full_name, photo_url, designation, company), ub:user_b(id, full_name, photo_url, designation, company)"
        )
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      supabase
        .from("session_checkins")
        .select("session_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("session_questions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("session_questions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_answered", true),
      supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`),
    ]);

    counts = {
      sessions: sessionsCount.count ?? 0,
      questions: qCount.count ?? 0,
      answeredQuestions: aCount.count ?? 0,
      meetings: mCount.count ?? 0,
    };

    const rows = (conns.data as {
      user_a: string;
      user_b: string;
      ua: MiniProfile | null;
      ub: MiniProfile | null;
    }[] | null) ?? [];
    people = rows
      .map((r) => (r.user_a === user.id ? r.ub : r.ua))
      .filter((p): p is MiniProfile => !!p);
  } catch {
    /* env not configured */
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Your recap</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          People you met, sessions you attended, questions you asked.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="People met" value={people.length} />
        <Stat label="Sessions" value={counts.sessions} />
        <Stat label="Questions asked" value={counts.questions} />
        <Stat label="Meetings" value={counts.meetings} />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Export contacts
          </h2>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href="/recap/export?format=vcf"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download .vcf
          </a>
          <a
            href="/recap/export?format=csv"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5" />
            Download .csv
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          People you met
        </h2>
        {people.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nobody yet. Scan badges or accept meetings.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/attendees/${p.id}`}
                  className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center transition-colors hover:border-slate-300"
                >
                  <Avatar className="h-12 w-12">
                    {p.photo_url ? <AvatarImage src={p.photo_url} alt="" /> : null}
                    <AvatarFallback className="bg-brand-50 text-brand-800">
                      {initials(p.full_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 text-xs font-medium text-brand-900 line-clamp-2">
                    {p.full_name ?? "Attendee"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-brand-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
