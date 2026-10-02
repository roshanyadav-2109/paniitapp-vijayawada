"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAdminAccess } from "@/app/actions/admin";

export interface AdminRow {
  email: string;
  full_name: string | null;
  signed_in: boolean;
}

export function AdminsClient({ admins, me }: { admins: AdminRow[]; me: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setNote(null);
    startTransition(async () => {
      const res = await setAdminAccess(value, true);
      if ("error" in res) {
        setNote({ ok: false, text: res.error });
        return;
      }
      setEmail("");
      setNote({
        ok: true,
        text:
          res.state === "pending"
            ? `${value} becomes an admin when they first sign in.`
            : `${value} is now an admin.`,
      });
      router.refresh();
    });
  }

  function remove(target: string) {
    setNote(null);
    setConfirming(null);
    startTransition(async () => {
      const res = await setAdminAccess(target, false);
      if ("error" in res) {
        setNote({ ok: false, text: res.error });
        return;
      }
      setNote({ ok: true, text: `${target} is no longer an admin.` });
      router.refresh();
    });
  }

  return (
    <div className="mt-5 space-y-5">
      <form onSubmit={add} className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email to make an admin"
          className="h-11 min-w-0 flex-1 rounded-md border border-rule bg-white px-3 text-[14px] text-brand-950 outline-none focus:border-brand-300"
        />
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="h-11 shrink-0 rounded-md bg-brand-800 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-50"
        >
          Make admin
        </button>
      </form>

      {note ? (
        <p className={`text-[13px] ${note.ok ? "text-brand-800" : "text-iit-600"}`} role="status">
          {note.text}
        </p>
      ) : null}

      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
        {admins.map((a) => {
          const isMe = a.email === me;
          return (
            <li key={a.email} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-brand-950">
                  {a.full_name && a.signed_in ? a.full_name : a.email}
                  {isMe ? <span className="ml-1.5 text-[12px] font-normal text-brand-900/55">(you)</span> : null}
                </p>
                <p className="truncate text-[12px] text-brand-900/60">
                  {a.signed_in ? a.email : "Not signed in yet"}
                </p>
              </div>
              {isMe ? null : confirming === a.email ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => remove(a.email)}
                    disabled={pending}
                    className="h-9 rounded-md bg-iit-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="h-9 rounded-md border border-rule px-3 text-[12.5px] text-brand-900"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(a.email)}
                  disabled={pending}
                  className="h-9 shrink-0 rounded-md border border-rule px-3 text-[12.5px] text-brand-900 hover:bg-paper disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
