"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "@/components/icons";
import {
  addModerator,
  deleteSession,
  removeModerator,
  saveSession,
  type SessionInput,
} from "@/app/actions/admin";
import { dayIST, timeIST } from "@/lib/date";

export interface AdminSession {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  venue_id: string | null;
  session_type: string | null;
  track: string | null;
  is_featured: boolean | null;
  moderators: string[];
}

export interface AdminVenue {
  id: string;
  name: string;
}

const TYPES: { value: string; label: string }[] = [
  { value: "keynote", label: "Keynote" },
  { value: "panel", label: "Panel" },
  { value: "workshop", label: "Workshop" },
  { value: "networking", label: "Networking" },
  { value: "meal", label: "Meal" },
  { value: "break", label: "Break" },
  { value: "exhibit", label: "Exhibit" },
];

/** A time as the summit's clocks show it, split for the form's inputs. */
function istParts(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

const FIELD =
  "h-10 w-full rounded-md border border-rule bg-white px-3 text-[14px] text-brand-950 outline-none focus:border-brand-300";
const BUTTON = "h-10 rounded-md px-4 text-[13.5px] transition-colors disabled:opacity-50";

export function AgendaAdmin({ sessions, venues }: { sessions: AdminSession[]; venues: AdminVenue[] }) {
  const [adding, setAdding] = useState(false);
  const days = new Map<string, AdminSession[]>();
  for (const s of sessions) days.set(dayIST(s.start_at), [...(days.get(dayIST(s.start_at)) ?? []), s]);

  return (
    <div className="mt-5 space-y-6">
      {adding ? (
        <SessionEditor venues={venues} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${BUTTON} w-full bg-brand-800 font-medium text-white hover:bg-brand-900`}
        >
          Add a session
        </button>
      )}

      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-brand-900/55">{day}</h2>
          <ul className="mt-2 space-y-2">
            {list.map((s) => (
              <SessionRow key={s.id} s={s} venues={venues} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionRow({ s, venues }: { s: AdminSession; venues: AdminVenue[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const venue = venues.find((v) => v.id === s.venue_id)?.name;

  if (editing) return <SessionEditor s={s} venues={venues} onDone={() => setEditing(false)} />;

  function run(fn: () => Promise<{ ok: true } | { error: string }>, then?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else {
        then?.();
        router.refresh();
      }
    });
  }

  return (
    <li className="rounded-lg border border-rule bg-white p-3.5">
      <p className="text-[12px] tabular-nums text-brand-900/60">
        {timeIST(s.start_at)} – {timeIST(s.end_at)}
        {venue ? ` · ${venue}` : ""}
        {s.session_type ? ` · ${TYPES.find((t) => t.value === s.session_type)?.label ?? s.session_type}` : ""}
      </p>
      <p className="mt-0.5 text-[15px] font-medium leading-snug text-brand-950">{s.title}</p>

      <div className="mt-3">
        <p className="text-[11.5px] font-medium text-brand-900/60">Moderators</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {s.moderators.length === 0 ? (
            <span className="text-[12.5px] text-brand-900/45">None yet</span>
          ) : (
            s.moderators.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 rounded-full bg-paper py-1 pl-2.5 pr-1 text-[12.5px] text-brand-950"
              >
                {m}
                <button
                  type="button"
                  aria-label={`Remove ${m}`}
                  disabled={pending}
                  onClick={() => run(() => removeModerator(s.id, m))}
                  className="grid size-5 place-items-center rounded-full text-brand-900/60 hover:bg-white"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) run(() => addModerator(s.id, email), () => setEmail(""));
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="moderator@email.com"
            className={FIELD}
          />
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className={`${BUTTON} shrink-0 border border-brand-800 bg-white text-brand-800 hover:bg-paper`}
          >
            Add
          </button>
        </form>
      </div>

      {error ? <p className="mt-2 text-[12.5px] text-iit-600">{error}</p> : null}

      <div className="mt-3 flex gap-2 border-t border-rule pt-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${BUTTON} border border-rule bg-white text-brand-900 hover:bg-paper`}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                `Delete "${s.title}"? Its questions, bookmarks, check-ins and moderators go with it.`
              )
            )
              run(() => deleteSession(s.id));
          }}
          className={`${BUTTON} border border-iit-200 bg-white text-iit-700 hover:bg-iit-50`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function SessionEditor({
  s,
  venues,
  onDone,
}: {
  s?: AdminSession;
  venues: AdminVenue[];
  onDone: () => void;
}) {
  const router = useRouter();
  const from = s ? istParts(s.start_at) : { date: "2026-10-03", time: "10:00" };
  const to = s ? istParts(s.end_at) : { date: "2026-10-03", time: "11:00" };
  const [f, setF] = useState<SessionInput>({
    id: s?.id,
    title: s?.title ?? "",
    description: s?.description ?? "",
    date: from.date,
    start: from.time,
    end: to.time,
    venue_id: s?.venue_id ?? "",
    session_type: s?.session_type ?? "panel",
    track: s?.track ?? "",
    is_featured: !!s?.is_featured,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <form
      className="space-y-3 rounded-lg border border-brand-300 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await saveSession(f);
          if ("error" in r) setError(r.error);
          else {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <p className="text-[14px] font-medium text-brand-950">{s ? "Edit session" : "New session"}</p>
      <Labelled label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} className={FIELD} required />
      </Labelled>
      <div className="grid grid-cols-3 gap-2">
        <Labelled label="Day">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={FIELD} />
        </Labelled>
        <Labelled label="Starts">
          <input type="time" value={f.start} onChange={(e) => set("start", e.target.value)} className={FIELD} />
        </Labelled>
        <Labelled label="Ends">
          <input type="time" value={f.end} onChange={(e) => set("end", e.target.value)} className={FIELD} />
        </Labelled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labelled label="Where">
          <select value={f.venue_id} onChange={(e) => set("venue_id", e.target.value)} className={FIELD}>
            <option value="">Not set</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Kind">
          <select value={f.session_type} onChange={(e) => set("session_type", e.target.value)} className={FIELD}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Labelled>
      </div>
      <Labelled label="Track (optional)">
        <input value={f.track} onChange={(e) => set("track", e.target.value)} className={FIELD} />
      </Labelled>
      <Labelled label="About (optional)">
        <textarea
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[14px] text-brand-950 outline-none focus:border-brand-300"
        />
      </Labelled>
      <label className="flex items-center gap-2 text-[13px] text-brand-900">
        <input
          type="checkbox"
          checked={f.is_featured}
          onChange={(e) => set("is_featured", e.target.checked)}
          className="size-4 accent-brand-800"
        />
        Featured on the agenda
      </label>
      {error ? <p className="text-[12.5px] text-iit-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`${BUTTON} bg-brand-800 font-medium text-white hover:bg-brand-900`}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className={`${BUTTON} border border-rule bg-white text-brand-900`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-brand-900/60">{label}</span>
      {children}
    </label>
  );
}
