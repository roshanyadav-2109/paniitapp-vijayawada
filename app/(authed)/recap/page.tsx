import Link from "next/link";
import { emptied } from "@/lib/dev-empty";
import { EmptyArt } from "@/components/features/empty-art";
import { Download, FileText } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { EVENT_ID } from "@/lib/event-config";

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
        <div className="px-4 py-16 text-center text-sm text-brand-900/60">
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
        .eq("event_id", EVENT_ID)
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


  // Empty-state preview: DEV_EMPTY=1 blanks the page without
  // touching a row in the database.
  people = emptied(people);

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-900">Your recap</h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/70">
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
          <h2 className="eyebrow text-brand-900/60">
            Export contacts
          </h2>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href="/recap/export?format=vcf"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule-strong bg-white px-3 text-sm font-medium text-brand-900/80 hover:bg-paper"
          >
            <Download className="h-3.5 w-3.5" />
            Download .vcf
          </a>
          <a
            href="/recap/export?format=csv"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule-strong bg-white px-3 text-sm font-medium text-brand-900/80 hover:bg-paper"
          >
            <FileText className="h-3.5 w-3.5" />
            Download .csv
          </a>
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-brand-900/60">
          People you met
        </h2>
        {people.length === 0 ? (
          <div className="mt-3 flex flex-col items-center text-center">
            <EmptyArt name="empty-network" className="mb-3" />
            <p className="text-sm text-brand-950">
              Nobody yet. Scan badges or accept meetings.
            </p>
          </div>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/attendees/${p.id}`}
                  className="flex flex-col items-center rounded-lg border border-rule bg-white p-3 text-center transition-colors hover:border-rule-strong"
                >
                  <Avatar className="h-12 w-12">
                    {p.photo_url ? <AvatarImage src={p.photo_url} alt="" /> : null}
                    <AvatarFallback className="bg-paper-deep text-brand-800">
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
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="eyebrow text-brand-900/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-brand-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
