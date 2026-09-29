import Image from "next/image";
import Link from "next/link";
import { EmptyArt } from "@/components/features/empty-art";
import { EVENT_ID } from "@/lib/event-config";
import { organizerClient, Restricted } from "./guard";

export const dynamic = "force-dynamic";

/**
 * The organisers' control room: how the summit is going, and the four
 * things they run from here.
 *
 * The artwork is one supplied scene (header.webp), and each tool and each
 * number wears a piece cut from it, so the page reads as one set.
 */
export default async function AdminPage() {
  const supabase = await organizerClient();
  if (!supabase) return <Restricted message="Admins only. Sign in with an admin account." />;

  const [registered, checkedIn, posts, stalls, busiest, waitingRows] = await Promise.all([
    supabase
      .from("event_participants")
      .select("profile_id", { count: "exact", head: true })
      .eq("event_id", EVENT_ID),
    supabase.from("session_checkins").select("user_id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("event_id", EVENT_ID),
    supabase.from("exhibitors").select("id, is_published").eq("event_id", EVENT_ID),
    supabase
      .from("sessions")
      .select("id, title, current_checkins")
      .eq("event_id", EVENT_ID)
      .gt("current_checkins", 0)
      .order("current_checkins", { ascending: false })
      .limit(5),
    // Every question still waiting, with its session, to count per session.
    supabase
      .from("session_questions")
      .select("session_id, sessions!inner(title, event_id)")
      .eq("status", "open")
      .eq("sessions.event_id", EVENT_ID),
  ]);

  const stallRows = (stalls.data as { id: string; is_published: boolean | null }[] | null) ?? [];
  const waitingBySession = new Map<string, { title: string; count: number }>();
  for (const r of (waitingRows.data as unknown as
    | { session_id: string; sessions: { title: string } | { title: string }[] }[]
    | null) ?? []) {
    const title = Array.isArray(r.sessions) ? r.sessions[0]?.title : r.sessions?.title;
    const was = waitingBySession.get(r.session_id);
    waitingBySession.set(r.session_id, { title: title ?? "Session", count: (was?.count ?? 0) + 1 });
  }
  const waiting = [...waitingBySession.entries()].sort((a, b) => b[1].count - a[1].count);
  const waitingTotal = waiting.reduce((n, [, v]) => n + v.count, 0);
  const busy = (busiest.data as { id: string; title: string; current_checkins: number | null }[] | null) ?? [];

  const numbers = [
    { label: "Registered", value: registered.count ?? 0, art: "registered" },
    { label: "Check-ins", value: checkedIn.count ?? 0, art: "checkedin" },
    { label: "Questions waiting", value: waitingTotal, art: "questions" },
    { label: "Discussion posts", value: posts.count ?? 0, art: "posts" },
    {
      label: "Expo stalls",
      value: stallRows.length,
      art: "stalls",
      note: `${stallRows.filter((s) => s.is_published).length} showing`,
    },
  ];

  const tools = [
    {
      href: "/admin/agenda",
      title: "Agenda & moderators",
      sub: "Sessions, and who moderates each one",
      art: "agenda",
    },
    {
      href: "/moderate",
      title: "Session questions",
      sub: "Every question sent to the panels",
      art: "questions",
      badge: waitingTotal,
    },
    { href: "/admin/expo", title: "Expo stalls", sub: "Exhibitors, stall numbers and logos", art: "stalls" },
    { href: "/admin/announce", title: "Announcements", sub: "Tell everyone at once", art: "announce" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10 pt-4 lg:max-w-5xl lg:pt-8">
      {/* The scene, with the day's one number worth acting on beside it. */}
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEF3FD] to-[#E3ECFB] ring-1 ring-[#D6E2F8]">
        <div className="grid items-center gap-2 lg:grid-cols-[1fr_1.35fr]">
          <div className="px-5 pt-5 lg:py-7 lg:pl-8">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-800/70">
              Control room
            </p>
            <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight text-brand-950 lg:text-[32px]">
              Admin
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-5 text-brand-900/70">
              {waitingTotal > 0
                ? `${waitingTotal} question${waitingTotal === 1 ? "" : "s"} waiting for the panels.`
                : "No questions waiting for the panels."}
            </p>
          </div>
          <Image
            src="/ui/admin/header.webp"
            alt=""
            width={1400}
            height={640}
            priority
            sizes="(max-width: 1024px) 100vw, 560px"
            className="h-auto w-full px-3 pb-2 lg:px-4 lg:py-3"
          />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {numbers.map((n, i) => (
          <div
            key={n.label}
            className={`flex items-center gap-3 rounded-xl border border-rule bg-white p-3 ${
              i === numbers.length - 1 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <Image
              src={`/ui/admin/${n.art}.webp`}
              alt=""
              width={512}
              height={512}
              sizes="48px"
              className="size-12 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-[22px] font-semibold leading-none tabular-nums text-brand-950">
                {n.value.toLocaleString()}
              </span>
              <span className="mt-1 block text-[11.5px] leading-4 text-brand-900/60">
                {n.label}
                {n.note ? ` · ${n.note}` : ""}
              </span>
            </span>
          </div>
        ))}
      </section>

      <nav className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative flex flex-col rounded-xl border border-rule bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(13,9,48,0.35)]"
          >
            {t.badge ? (
              <span className="absolute right-3 top-3 rounded-full bg-iit-500 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-white">
                {t.badge}
              </span>
            ) : null}
            <Image
              src={`/ui/admin/${t.art}.webp`}
              alt=""
              width={512}
              height={512}
              sizes="88px"
              className="size-[76px] lg:size-[88px]"
            />
            <span className="mt-2 text-[15px] font-semibold leading-snug text-brand-950">{t.title}</span>
            <span className="mt-0.5 text-[12px] leading-4 text-brand-900/60">{t.sub}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-rule bg-white p-4">
          <h2 className="text-[13px] font-semibold text-brand-950">Questions waiting</h2>
          {waiting.length === 0 ? (
            <div className="flex flex-col items-center py-5 text-center">
              <EmptyArt name="empty-questions" className="mb-2 size-14" />
              <span className="text-[13px] text-brand-900/70">None waiting right now.</span>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {waiting.slice(0, 6).map(([id, v]) => (
                <li key={id}>
                  <Link
                    href={`/moderate?session=${id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-[13.5px] text-brand-950 hover:text-brand-800"
                  >
                    <span className="line-clamp-1">{v.title}</span>
                    <span className="shrink-0 rounded-full bg-iit-50 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-iit-700">
                      {v.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-rule bg-white p-4">
          <h2 className="text-[13px] font-semibold text-brand-950">Busiest sessions</h2>
          {busy.length === 0 ? (
            <div className="flex flex-col items-center py-5 text-center">
              <EmptyArt name="empty-checkins" className="mb-2 size-14" />
              <span className="text-[13px] text-brand-900/70">No check-ins yet.</span>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {busy.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/agenda/${s.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-[13.5px] text-brand-950 hover:text-brand-800"
                  >
                    <span className="line-clamp-1">{s.title}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-brand-900/60">
                      {(s.current_checkins ?? 0).toLocaleString()} in
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
