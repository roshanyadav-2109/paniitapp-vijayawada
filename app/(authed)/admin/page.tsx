import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementComposer } from "./announcement-composer";

interface Stat {
  label: string;
  value: string | number;
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let allowed = false;
  let stats: Stat[] = [];
  let topSessions: { id: string; title: string; current_checkins: number | null }[] = [];
  let topQuestions: { id: string; session_id: string; question: string; upvotes: number }[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return (
        <Forbidden message="You need to sign in as an organizer or admin." />
      );
    }
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    allowed = me?.role === "organizer" || me?.role === "admin";
    if (!allowed) return <Forbidden message="Admins only." />;

    const [{ count: registered }, { count: checkedIn }, { count: meetingsCount }, { count: acceptedCount }, ts, tq] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("session_checkins")
        .select("user_id", { count: "exact", head: true }),
      supabase.from("meetings").select("id", { count: "exact", head: true }),
      supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted"),
      supabase
        .from("sessions")
        .select("id, title, current_checkins")
        .order("current_checkins", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from("session_questions")
        .select("id, session_id, question, upvotes, is_answered")
        .eq("is_answered", false)
        .order("upvotes", { ascending: false })
        .limit(5),
    ]);

    stats = [
      { label: "Registered", value: registered ?? 0 },
      { label: "Checked in", value: checkedIn ?? 0 },
      { label: "Meetings", value: meetingsCount ?? 0 },
      { label: "Accepted", value: acceptedCount ?? 0 },
    ];
    topSessions = (ts.data as typeof topSessions | null) ?? [];
    topQuestions = (tq.data as typeof topQuestions | null) ?? [];
  } catch {
    return <Forbidden message="Could not load admin data." />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:max-w-4xl lg:pt-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Admin</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Live event operations dashboard.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {s.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-brand-900">
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </div>
          </div>
        ))}
      </section>

      <AnnouncementComposer />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Top sessions by check-ins
        </h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {topSessions.length === 0 ? (
            <li className="py-3 text-sm text-slate-500">No check-ins yet.</li>
          ) : (
            topSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <Link
                  href={`/agenda/${s.id}`}
                  className="text-sm text-brand-900 hover:underline"
                >
                  {s.title}
                </Link>
                <span className="text-xs tabular-nums text-slate-500">
                  {(s.current_checkins ?? 0).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Hot unanswered questions
        </h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {topQuestions.length === 0 ? (
            <li className="py-3 text-sm text-slate-500">No open questions right now.</li>
          ) : (
            topQuestions.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 py-2.5">
                <Link
                  href={`/agenda/${q.session_id}`}
                  className="line-clamp-2 text-sm text-brand-900 hover:underline"
                >
                  {q.question}
                </Link>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  ▲ {q.upvotes}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Forbidden({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Shield className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
      <h1 className="mt-4 text-lg font-semibold text-brand-900">Restricted</h1>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
